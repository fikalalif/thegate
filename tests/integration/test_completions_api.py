"""Integration tests for OpenAI-compatible chat completions endpoint (Milestone 7)."""

import asyncio
from collections.abc import AsyncGenerator, Generator
from typing import Any

import pytest
from app.adapters.mock import MockProviderAdapter
from app.api.deps import get_db_session, get_provider_adapter
from app.core.exceptions import ProviderRateLimitError
from app.core.security import hash_api_key
from app.db.base import Base
from app.db.models.api_keys import ApiKey
from app.main import create_app
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

VALID_TEST_KEY = "tg_live_abcdef1234567890abcdef1234567890"


@pytest.fixture
def completions_test_client() -> Generator[TestClient, None, None]:
    """Provide a TestClient with initialized DB and seeded active API key."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    session_factory = async_sessionmaker(bind=engine, expire_on_commit=False)

    app = create_app()

    async def override_get_db_session() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    mock_adapter = MockProviderAdapter(default_response_text="Hello from TheGate mock!")

    app.dependency_overrides[get_db_session] = override_get_db_session
    app.dependency_overrides[get_provider_adapter] = lambda: mock_adapter

    async def setup_db() -> None:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        async with session_factory() as session:
            key_record = ApiKey(
                name="Inference Test Key",
                key_prefix=VALID_TEST_KEY[:10],
                key_hash=hash_api_key(VALID_TEST_KEY),
                status="active",
            )
            session.add(key_record)
            await session.commit()

    asyncio.run(setup_db())

    with TestClient(app) as test_client:
        yield test_client

    async def teardown_db() -> None:
        await engine.dispose()

    asyncio.run(teardown_db())


def test_completions_non_streaming(completions_test_client: TestClient) -> None:
    """Assert POST /v1/chat/completions returns valid OpenAI response."""
    payload: dict[str, Any] = {
        "model": "gpt-4o",
        "messages": [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Tell me a joke."},
        ],
        "temperature": 0.7,
        "max_tokens": 50,
        "stream": False,
    }

    response = completions_test_client.post(
        "/v1/chat/completions",
        json=payload,
        headers={"Authorization": f"Bearer {VALID_TEST_KEY}"},
    )

    assert response.status_code == 200
    assert "x-request-id" in response.headers

    data = response.json()
    assert data["object"] == "chat.completion"
    assert data["model"] == "gpt-4o"
    assert len(data["choices"]) == 1
    assert data["choices"][0]["finish_reason"] == "stop"
    assert "Echo: Tell me a joke." in data["choices"][0]["message"]["content"]
    assert data["usage"]["total_tokens"] > 0


def test_completions_streaming_sse(completions_test_client: TestClient) -> None:
    """Assert POST /v1/chat/completions streams SSE chunks ending in [DONE]."""
    payload: dict[str, Any] = {
        "model": "gpt-4o",
        "messages": [{"role": "user", "content": "Stream response"}],
        "stream": True,
    }

    response = completions_test_client.post(
        "/v1/chat/completions",
        json=payload,
        headers={"Authorization": f"Bearer {VALID_TEST_KEY}"},
    )

    assert response.status_code == 200
    assert "text/event-stream" in response.headers["Content-Type"]
    assert "x-request-id" in response.headers

    lines = [line.strip() for line in response.text.split("\n") if line.strip()]
    assert len(lines) > 2
    assert lines[-1] == "data: [DONE]"

    # Verify at least one data chunk is parseable JSON
    data_lines = [line for line in lines if line.startswith("data:") and line != "data: [DONE]"]
    assert len(data_lines) >= 1
    import json
    first_chunk = json.loads(data_lines[0][len("data:"):].strip())
    assert first_chunk["object"] == "chat.completion.chunk"
    assert first_chunk["model"] == "gpt-4o"


def test_completions_unauthorized(completions_test_client: TestClient) -> None:
    """Assert request without API key receives HTTP 401 with OpenAI error envelope."""
    payload = {
        "model": "gpt-4o",
        "messages": [{"role": "user", "content": "Hi"}],
    }

    # Missing authorization header
    response = completions_test_client.post("/v1/chat/completions", json=payload)
    assert response.status_code == 401
    data = response.json()
    assert "error" in data
    assert data["error"]["type"] == "authentication_error"
    assert data["error"]["code"] == "invalid_api_key"

    # Invalid token
    response_invalid = completions_test_client.post(
        "/v1/chat/completions",
        json=payload,
        headers={"Authorization": "Bearer tg_live_nonexistentkey1234567890"},
    )
    assert response_invalid.status_code == 401
    assert "error" in response_invalid.json()


def test_completions_malformed_payload(completions_test_client: TestClient) -> None:
    """Assert invalid request returns HTTP 422 with OpenAI error envelope."""
    # Missing required 'messages' field
    response = completions_test_client.post(
        "/v1/chat/completions",
        json={"model": "gpt-4o"},
        headers={"Authorization": f"Bearer {VALID_TEST_KEY}"},
    )

    assert response.status_code == 422
    data = response.json()
    assert "error" in data
    assert data["error"]["type"] == "invalid_request_error"
    assert "messages" in data["error"]["message"]


def test_completions_preserves_custom_request_id(
    completions_test_client: TestClient,
) -> None:
    """Assert incoming X-Request-ID header is echoed back on response."""
    custom_id = "custom-trace-uuid-98765"
    payload = {
        "model": "gpt-4o",
        "messages": [{"role": "user", "content": "Test trace"}],
    }

    response = completions_test_client.post(
        "/v1/chat/completions",
        json=payload,
        headers={
            "Authorization": f"Bearer {VALID_TEST_KEY}",
            "X-Request-ID": custom_id,
        },
    )

    assert response.status_code == 200
    assert response.headers.get("x-request-id") == custom_id


def test_completions_upstream_domain_error_mapping() -> None:
    """Assert upstream domain error maps cleanly to OpenAI error format."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    session_factory = async_sessionmaker(bind=engine, expire_on_commit=False)

    app = create_app()

    async def override_get_db_session() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            yield session
            await session.commit()

    failing_adapter = MockProviderAdapter(
        exception_to_raise=ProviderRateLimitError("Upstream 9Router rate limit hit")
    )

    app.dependency_overrides[get_db_session] = override_get_db_session
    app.dependency_overrides[get_provider_adapter] = lambda: failing_adapter

    async def setup_db() -> None:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        async with session_factory() as session:
            key_record = ApiKey(
                name="Error Test Key",
                key_prefix=VALID_TEST_KEY[:10],
                key_hash=hash_api_key(VALID_TEST_KEY),
                status="active",
            )
            session.add(key_record)
            await session.commit()

    asyncio.run(setup_db())

    with TestClient(app) as client:
        response = client.post(
            "/v1/chat/completions",
            json={"model": "gpt-4o", "messages": [{"role": "user", "content": "Hi"}]},
            headers={"Authorization": f"Bearer {VALID_TEST_KEY}"},
        )

        assert response.status_code == 429
        data = response.json()
        assert "error" in data
        assert "rate limit" in data["error"]["message"].lower()

    asyncio.run(engine.dispose())

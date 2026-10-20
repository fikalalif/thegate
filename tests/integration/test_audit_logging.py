"""Integration tests for Request Attempts & Decision Audit Logging (Milestone 9).

Validates:
- Records created in requests, routing_decisions, and request_attempts (ADR-008).
- Privacy enforcement: zero prompt or completion text persisted (ADR-004).
- Latency metrics tracking (routing_latency_ms, provider_latency_ms, total_duration_ms).
- Streaming completions audit logging.
- Background persistence failure does not disrupt client response.
"""

import asyncio
import uuid
from collections.abc import AsyncGenerator, Generator
from typing import Any
from unittest.mock import patch

import pytest
from app.adapters.mock import MockProviderAdapter
from app.api.deps import get_db_session, get_provider_adapter
from app.core.security import hash_api_key
from app.db.base import Base
from app.db.models.api_keys import ApiKey
from app.db.models.models_registry import ModelRegistry
from app.db.models.request_attempts import RequestAttempt
from app.db.models.requests import Request
from app.db.models.routing_decisions import RoutingDecision
from app.main import create_app
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import StaticPool

VALID_TEST_KEY = "tg_live_audittestkey9876543210fedcba"


@pytest.fixture
def audit_test_env() -> Generator[tuple[TestClient, async_sessionmaker[AsyncSession]], None, None]:
    """Provide a TestClient and session factory connected to an in-memory database."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False,
    )
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

    mock_adapter = MockProviderAdapter(default_response_text="Audited assistant response")

    app.dependency_overrides[get_db_session] = override_get_db_session
    app.dependency_overrides[get_provider_adapter] = lambda: mock_adapter

    async def setup_db() -> None:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        async with session_factory() as session:
            # Seed active API Key
            key_record = ApiKey(
                name="Audit Test Key",
                key_prefix=VALID_TEST_KEY[:10],
                key_hash=hash_api_key(VALID_TEST_KEY),
                status="active",
            )
            session.add(key_record)

            # Seed model registry for model resolution
            model_record = ModelRegistry(
                internal_name="gpt-4o",
                backend_model_id="openai/gpt-4o",
                provider_adapter="mock",
                capabilities={"tier": 3, "tools": True},
                context_limit=128000,
                enabled=True,
            )
            session.add(model_record)
            await session.commit()

    asyncio.run(setup_db())

    with TestClient(app) as test_client:
        yield test_client, session_factory

    async def teardown_db() -> None:
        await engine.dispose()

    asyncio.run(teardown_db())


def test_request_persistence_creates_records(
    audit_test_env: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    """Assert completion request populates requests, routing_decisions, and request_attempts."""
    client, session_factory = audit_test_env

    request_id_str = str(uuid.uuid4())
    payload: dict[str, Any] = {
        "model": "gpt-4o",
        "messages": [
            {"role": "system", "content": "You are a test assistant."},
            {"role": "user", "content": "Audit this completion."},
        ],
        "temperature": 0.5,
        "stream": False,
    }

    res = client.post(
        "/v1/chat/completions",
        json=payload,
        headers={
            "Authorization": f"Bearer {VALID_TEST_KEY}",
            "X-Request-ID": request_id_str,
        },
    )
    assert res.status_code == 200
    assert res.headers.get("x-request-id") == request_id_str

    req_uuid = uuid.UUID(request_id_str)

    async def verify_db() -> None:
        async with session_factory() as session:
            # 1. Verify requests table record
            req_stmt = select(Request).where(Request.id == req_uuid)
            req_record = (await session.execute(req_stmt)).scalar_one_or_none()
            assert req_record is not None
            assert req_record.status == "completed"
            assert req_record.stream_enabled is False
            assert req_record.selected_model_id is not None
            assert req_record.input_tokens is not None
            assert req_record.output_tokens is not None

            # 2. Verify routing_decisions table record
            dec_stmt = select(RoutingDecision).where(RoutingDecision.request_id == req_uuid)
            dec_record = (await session.execute(dec_stmt)).scalar_one_or_none()
            assert dec_record is not None
            assert dec_record.strategy_name == "direct"
            assert dec_record.decision_reason is not None

            # 3. Verify request_attempts table record
            att_stmt = select(RequestAttempt).where(RequestAttempt.request_id == req_uuid)
            att_record = (await session.execute(att_stmt)).scalar_one_or_none()
            assert att_record is not None
            assert att_record.attempt_number == 1
            assert att_record.status == "success"
            assert att_record.usage_metadata is not None

    asyncio.run(verify_db())


def test_privacy_enforcement_no_prompt_stored(
    audit_test_env: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    """Assert zero prompt or completion content is written to database (ADR-004)."""
    client, session_factory = audit_test_env

    secret_prompt = "CONFIDENTIAL_TOP_SECRET_PROMPT_XYZ_999"
    request_id_str = str(uuid.uuid4())
    payload: dict[str, Any] = {
        "model": "gpt-4o",
        "messages": [{"role": "user", "content": secret_prompt}],
        "stream": False,
    }

    res = client.post(
        "/v1/chat/completions",
        json=payload,
        headers={
            "Authorization": f"Bearer {VALID_TEST_KEY}",
            "X-Request-ID": request_id_str,
        },
    )
    assert res.status_code == 200

    req_uuid = uuid.UUID(request_id_str)

    async def verify_privacy() -> None:
        async with session_factory() as session:
            # Check Request model columns & values
            req = (
                await session.execute(select(Request).where(Request.id == req_uuid))
            ).scalar_one_or_none()
            assert req is not None

            # Column verification: schemas must not define prompt or completion text columns
            request_col_names = {col.name for col in Request.__table__.columns}
            assert "prompt" not in request_col_names
            assert "prompt_text" not in request_col_names
            assert "completion" not in request_col_names
            assert "completion_text" not in request_col_names
            assert "content" not in request_col_names
            assert "messages" not in request_col_names

            # Content verification: secret prompt must not appear in any column of requests
            for col_name in request_col_names:
                val = str(getattr(req, col_name, ""))
                assert secret_prompt not in val

            # Check RoutingDecision
            dec = (
                await session.execute(
                    select(RoutingDecision).where(RoutingDecision.request_id == req_uuid)
                )
            ).scalar_one_or_none()
            assert dec is not None
            for col in RoutingDecision.__table__.columns:
                val = str(getattr(dec, col.name, ""))
                assert secret_prompt not in val

            # Check RequestAttempt
            att = (
                await session.execute(
                    select(RequestAttempt).where(RequestAttempt.request_id == req_uuid)
                )
            ).scalar_one_or_none()
            assert att is not None
            for col in RequestAttempt.__table__.columns:
                val = str(getattr(att, col.name, ""))
                assert secret_prompt not in val

    asyncio.run(verify_privacy())


def test_latency_metrics_recorded(
    audit_test_env: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    """Assert latency breakdown metrics are recorded and non-negative."""
    client, session_factory = audit_test_env

    request_id_str = str(uuid.uuid4())
    payload = {
        "model": "gpt-4o",
        "messages": [{"role": "user", "content": "Latency test"}],
        "stream": False,
    }

    res = client.post(
        "/v1/chat/completions",
        json=payload,
        headers={
            "Authorization": f"Bearer {VALID_TEST_KEY}",
            "X-Request-ID": request_id_str,
        },
    )
    assert res.status_code == 200

    req_uuid = uuid.UUID(request_id_str)

    async def verify_latencies() -> None:
        async with session_factory() as session:
            req = (
                await session.execute(select(Request).where(Request.id == req_uuid))
            ).scalar_one_or_none()
            assert req is not None
            assert req.routing_latency_ms is not None
            assert req.routing_latency_ms >= 0
            assert req.provider_latency_ms is not None
            assert req.provider_latency_ms >= 0
            assert req.total_duration_ms is not None
            assert req.total_duration_ms >= 0

            dec = (
                await session.execute(
                    select(RoutingDecision).where(RoutingDecision.request_id == req_uuid)
                )
            ).scalar_one_or_none()
            assert dec is not None
            assert dec.decision_latency_ms >= 0

    asyncio.run(verify_latencies())


def test_streaming_request_persistence(
    audit_test_env: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    """Assert streaming completions correctly persist audit records with stream_enabled=True."""
    client, session_factory = audit_test_env

    request_id_str = str(uuid.uuid4())
    payload = {
        "model": "gpt-4o",
        "messages": [{"role": "user", "content": "Stream audit test"}],
        "stream": True,
    }

    with client.stream(
        "POST",
        "/v1/chat/completions",
        json=payload,
        headers={
            "Authorization": f"Bearer {VALID_TEST_KEY}",
            "X-Request-ID": request_id_str,
        },
    ) as res:
        assert res.status_code == 200
        lines = list(res.iter_lines())
        assert any("[DONE]" in line for line in lines)

    req_uuid = uuid.UUID(request_id_str)

    async def verify_stream_audit() -> None:
        async with session_factory() as session:
            req = (
                await session.execute(select(Request).where(Request.id == req_uuid))
            ).scalar_one_or_none()
            assert req is not None
            assert req.stream_enabled is True
            assert req.status == "completed"
            assert req.provider_latency_ms is not None
            assert req.total_duration_ms is not None

            dec = (
                await session.execute(
                    select(RoutingDecision).where(RoutingDecision.request_id == req_uuid)
                )
            ).scalar_one_or_none()
            assert dec is not None

            att = (
                await session.execute(
                    select(RequestAttempt).where(RequestAttempt.request_id == req_uuid)
                )
            ).scalar_one_or_none()
            assert att is not None
            assert att.status == "success"

    asyncio.run(verify_stream_audit())


def test_routed_completion_persistence(
    audit_test_env: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    """Assert policy-routed request records strategy name and candidates considered."""
    client, session_factory = audit_test_env

    request_id_str = str(uuid.uuid4())
    payload = {
        "model": "thegate-economy",
        "messages": [{"role": "user", "content": "Route to economy"}],
        "stream": False,
    }

    res = client.post(
        "/v1/chat/completions",
        json=payload,
        headers={
            "Authorization": f"Bearer {VALID_TEST_KEY}",
            "X-Request-ID": request_id_str,
        },
    )
    assert res.status_code == 200

    req_uuid = uuid.UUID(request_id_str)

    async def verify_routed_audit() -> None:
        async with session_factory() as session:
            dec = (
                await session.execute(
                    select(RoutingDecision).where(RoutingDecision.request_id == req_uuid)
                )
            ).scalar_one_or_none()
            assert dec is not None
            assert dec.strategy_name == "rule_based"
            assert "economy" in dec.decision_reason.lower()
            assert dec.candidate_summary is not None
            assert "candidates_considered" in dec.candidate_summary

    asyncio.run(verify_routed_audit())


def test_persistence_db_error_does_not_crash_request(
    audit_test_env: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    """Assert background database write failure does not disrupt HTTP response (ADR-008)."""
    client, _ = audit_test_env

    payload = {
        "model": "gpt-4o",
        "messages": [{"role": "user", "content": "Testing failure isolation"}],
        "stream": False,
    }

    with patch(
        "app.engine.persistence.Request",
        side_effect=RuntimeError("Simulated database model persistence error"),
    ):
        res = client.post(
            "/v1/chat/completions",
            json=payload,
            headers={"Authorization": f"Bearer {VALID_TEST_KEY}"},
        )
        # Client must still receive clean 200 OK
        assert res.status_code == 200
        assert "choices" in res.json()

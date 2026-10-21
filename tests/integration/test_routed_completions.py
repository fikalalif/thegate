"""Integration tests for Policy CRUD and policy-routed chat completions (Milestone 8)."""

import asyncio
from collections.abc import AsyncGenerator, Generator
from decimal import Decimal
from typing import Any

import pytest
from app.adapters.mock import MockProviderAdapter
from app.api.deps import get_db_session, get_provider_adapter
from app.core.security import hash_api_key
from app.db.base import Base
from app.db.models.api_keys import ApiKey
from app.db.models.model_pricing import ModelPricing
from app.db.models.models_registry import ModelRegistry
from app.main import create_app
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

VALID_TEST_KEY = "tg_live_routedtestkey1234567890abcdef"


@pytest.fixture
def routed_app_client() -> Generator[TestClient, None, None]:
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

    mock_adapter = MockProviderAdapter(default_response_text="Routed response")

    app.dependency_overrides[get_db_session] = override_get_db_session
    app.dependency_overrides[get_provider_adapter] = lambda: mock_adapter

    async def setup_db() -> None:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        async with session_factory() as session:
            key_record = ApiKey(
                name="Policy Routing Key",
                key_prefix=VALID_TEST_KEY[:10],
                key_hash=hash_api_key(VALID_TEST_KEY),
                status="active",
            )
            session.add(key_record)

            # Seed models into registry
            m1 = ModelRegistry(
                internal_name="gpt-4o-mini",
                backend_model_id="openai/gpt-4o-mini",
                capabilities={"tier": 1, "tools": True, "json_mode": True, "vision": True},
                context_limit=128000,
                enabled=True,
            )
            m2 = ModelRegistry(
                internal_name="claude-3-5-sonnet",
                backend_model_id="anthropic/claude-3-5-sonnet",
                capabilities={"tier": 2, "tools": True, "json_mode": True, "vision": True},
                context_limit=200000,
                enabled=True,
            )
            m3 = ModelRegistry(
                internal_name="gpt-4o",
                backend_model_id="openai/gpt-4o",
                capabilities={"tier": 3, "tools": True, "json_mode": True, "vision": True},
                context_limit=128000,
                enabled=True,
            )
            session.add_all([m1, m2, m3])
            await session.flush()

            session.add_all([
                ModelPricing(
                    model_id=m1.id,
                    input_price_per_million=Decimal("0.15"),
                    output_price_per_million=Decimal("0.60"),
                ),
                ModelPricing(
                    model_id=m2.id,
                    input_price_per_million=Decimal("3.00"),
                    output_price_per_million=Decimal("15.00"),
                ),
                ModelPricing(
                    model_id=m3.id,
                    input_price_per_million=Decimal("5.00"),
                    output_price_per_million=Decimal("15.00"),
                ),
            ])
            await session.commit()

    asyncio.run(setup_db())

    with TestClient(app) as test_client:
        yield test_client

    async def teardown_db() -> None:
        await engine.dispose()

    asyncio.run(teardown_db())


def test_policy_crud_endpoints(routed_app_client: TestClient) -> None:
    """Assert Routing Policy CRUD endpoints work correctly."""
    # 1. Create Policy
    create_payload: dict[str, Any] = {
        "name": "Production Economy",
        "mode": "economy",
        "configuration": {"max_price": 1.0},
        "is_active": True,
    }
    create_res = routed_app_client.post("/api/v1/policies", json=create_payload)
    assert create_res.status_code == 201
    policy_data = create_res.json()
    assert policy_data["name"] == "Production Economy"
    assert policy_data["mode"] == "economy"
    policy_id = policy_data["id"]

    # 2. Get Policy
    get_res = routed_app_client.get(f"/api/v1/policies/{policy_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == policy_id

    # 3. List Policies
    list_res = routed_app_client.get("/api/v1/policies")
    assert list_res.status_code == 200
    assert len(list_res.json()["policies"]) >= 1

    # 4. Update Policy
    update_res = routed_app_client.put(
        f"/api/v1/policies/{policy_id}",
        json={"mode": "quality", "name": "Production Quality"},
    )
    assert update_res.status_code == 200
    assert update_res.json()["mode"] == "quality"
    assert update_res.json()["version"] == 2

    # 5. Delete (Deactivate) Policy
    del_res = routed_app_client.delete(f"/api/v1/policies/{policy_id}")
    assert del_res.status_code == 200
    assert del_res.json()["is_active"] is False


def test_routed_completion_economy(routed_app_client: TestClient) -> None:
    """Assert thegate-economy routes to lowest-cost candidate (gpt-4o-mini)."""
    payload = {
        "model": "thegate-economy",
        "messages": [{"role": "user", "content": "Simple economy query"}],
        "stream": False,
    }

    response = routed_app_client.post(
        "/v1/chat/completions",
        json=payload,
        headers={"Authorization": f"Bearer {VALID_TEST_KEY}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["model"] == "gpt-4o-mini"
    assert "x-request-id" in response.headers


def test_routed_completion_quality(routed_app_client: TestClient) -> None:
    """Assert thegate-quality routes to highest tier candidate (gpt-4o)."""
    payload = {
        "model": "thegate-quality",
        "messages": [{"role": "user", "content": "Complex reasoning query"}],
        "stream": False,
    }

    response = routed_app_client.post(
        "/v1/chat/completions",
        json=payload,
        headers={"Authorization": f"Bearer {VALID_TEST_KEY}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["model"] == "gpt-4o"


def test_routed_completion_custom_named_policy(routed_app_client: TestClient) -> None:
    """Assert specifying a custom policy name resolves and routes accordingly."""
    # Create custom policy named 'dev-heavy-reasoning' with quality mode
    routed_app_client.post(
        "/api/v1/policies",
        json={"name": "dev-heavy-reasoning", "mode": "quality", "is_active": True},
    )

    payload = {
        "model": "dev-heavy-reasoning",
        "messages": [{"role": "user", "content": "Architect a database system"}],
        "stream": False,
    }

    response = routed_app_client.post(
        "/v1/chat/completions",
        json=payload,
        headers={"Authorization": f"Bearer {VALID_TEST_KEY}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["model"] == "gpt-4o"


def test_routed_completion_explicit_model_preserved(
    routed_app_client: TestClient,
) -> None:
    """Assert specifying an explicit model bypasses policy routing."""
    payload = {
        "model": "claude-3-5-sonnet",
        "messages": [{"role": "user", "content": "Direct model call"}],
        "stream": False,
    }

    response = routed_app_client.post(
        "/v1/chat/completions",
        json=payload,
        headers={"Authorization": f"Bearer {VALID_TEST_KEY}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["model"] == "claude-3-5-sonnet"


def test_routed_completion_no_models_registered_returns_503() -> None:
    """Assert routing fails with 503 when no models are registered in database."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    session_factory = async_sessionmaker(bind=engine, expire_on_commit=False)
    app = create_app()

    async def override_db() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            yield session
            await session.commit()

    mock_adapter = MockProviderAdapter()
    app.dependency_overrides[get_db_session] = override_db
    app.dependency_overrides[get_provider_adapter] = lambda: mock_adapter

    async def init_db() -> None:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        async with session_factory() as session:
            session.add(
                ApiKey(
                    name="Test Key",
                    key_prefix=VALID_TEST_KEY[:10],
                    key_hash=hash_api_key(VALID_TEST_KEY),
                    status="active",
                )
            )
            await session.commit()

    asyncio.run(init_db())

    with TestClient(app) as client:
        response = client.post(
            "/v1/chat/completions",
            json={"model": "thegate-auto", "messages": [{"role": "user", "content": "Hi"}]},
            headers={"Authorization": f"Bearer {VALID_TEST_KEY}"},
        )
        assert response.status_code == 503
        data = response.json()
        assert data["error"]["type"] == "no_eligible_model"
        assert "No active models registered" in data["error"]["message"]

    asyncio.run(engine.dispose())


def test_routed_completion_slash_format(routed_app_client: TestClient) -> None:
    """Assert slash virtual formats like thegate/balanced and thegate/economy route properly."""
    for model_name in ["thegate/balanced", "thegate/economy", "thegate/quality"]:
        response = routed_app_client.post(
            "/v1/chat/completions",
            json={
                "model": model_name,
                "messages": [{"role": "user", "content": f"Test {model_name}"}],
                "stream": False,
            },
            headers={"Authorization": f"Bearer {VALID_TEST_KEY}"},
        )
        assert response.status_code == 200
        assert "choices" in response.json()


def test_routed_completion_fallback_chain(routed_app_client: TestClient) -> None:
    """Assert that when primary candidate fails, ingress falls back to runner-up candidate."""
    from app.core.exceptions import ProviderResponseError
    from app.schemas.provider import ChatChoice, ChatMessage, TokenUsage, UnifiedChatResponse

    class FallbackTestingAdapter(MockProviderAdapter):
        def __init__(self) -> None:
            super().__init__()
            self.attempt_models: list[str] = []

        async def execute(self, request: Any) -> UnifiedChatResponse:
            self.attempt_models.append(request.model)
            # Fail on first candidate, succeed on fallback candidate
            if len(self.attempt_models) == 1:
                raise ProviderResponseError("Upstream simulated failure on primary")
            return UnifiedChatResponse(
                id="chatcmpl-fallback-test",
                model=request.model,
                choices=[
                    ChatChoice(
                        index=0,
                        message=ChatMessage(role="assistant", content="Fallback success"),
                        finish_reason="stop",
                    )
                ],
                usage=TokenUsage(prompt_tokens=10, completion_tokens=20, total_tokens=30),
            )

    test_adapter = FallbackTestingAdapter()
    routed_app_client.app.dependency_overrides[get_provider_adapter] = lambda: test_adapter

    try:
        response = routed_app_client.post(
            "/v1/chat/completions",
            json={
                "model": "thegate/balanced",
                "messages": [{"role": "user", "content": "Trigger fallback chain"}],
                "stream": False,
            },
            headers={"Authorization": f"Bearer {VALID_TEST_KEY}"},
        )
        assert response.status_code == 200
        # Check that multiple attempts were made
        assert len(test_adapter.attempt_models) >= 2
    finally:
        routed_app_client.app.dependency_overrides[get_provider_adapter] = lambda: MockProviderAdapter(
            default_response_text="Routed response"
        )


def test_seed_initial_defaults() -> None:
    """Assert seed_initial_defaults correctly seeds dev keys and policies when empty."""
    from app.db.seed import seed_initial_defaults
    from app.db.models.api_keys import ApiKey
    from app.db.models.routing_policies import RoutingPolicy
    from sqlalchemy import select

    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    session_factory = async_sessionmaker(bind=engine, expire_on_commit=False)

    async def run_seed_test() -> None:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        async with session_factory() as session:
            stats = await seed_initial_defaults(session)
            assert stats["keys_seeded"] == 3
            assert stats["policies_seeded"] == 3

            # Check that seeded keys exist
            keys = (await session.execute(select(ApiKey))).scalars().all()
            assert len(keys) == 3
            key_names = [k.name for k in keys]
            assert "Developer Admin Key" in key_names
            assert "Local CLI Key" in key_names

            # Idempotency check: running seed again should seed 0
            stats2 = await seed_initial_defaults(session)
            assert stats2["keys_seeded"] == 0
            assert stats2["policies_seeded"] == 0

        await engine.dispose()

    asyncio.run(run_seed_test())



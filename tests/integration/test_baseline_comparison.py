"""Integration tests for Model Registry CRUD and Baseline Savings (Milestone 10)."""

import asyncio
import uuid
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
from app.db.models.requests import Request
from app.main import create_app
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import StaticPool

VALID_TEST_KEY = "tg_live_m10baselinetestkey123456789"

BaselineFixture = Generator[tuple[TestClient, async_sessionmaker[AsyncSession]], None, None]


@pytest.fixture
def baseline_test_env() -> BaselineFixture:
    """Provide a TestClient with an in-memory DB and seeded baseline models."""
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

    mock_adapter = MockProviderAdapter(default_response_text="Baseline comparison test response")

    app.dependency_overrides[get_db_session] = override_get_db_session
    app.dependency_overrides[get_provider_adapter] = lambda: mock_adapter

    async def setup_db() -> None:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        async with session_factory() as session:
            # 1. Seed API key
            key_record = ApiKey(
                name="Baseline Test Key",
                key_prefix=VALID_TEST_KEY[:10],
                key_hash=hash_api_key(VALID_TEST_KEY),
                status="active",
            )
            session.add(key_record)

            # 2. Seed Baseline Model (gpt-4o) with pricing ($5.00 in, $15.00 out)
            baseline_model = ModelRegistry(
                internal_name="gpt-4o",
                backend_model_id="openai/gpt-4o",
                provider_adapter="mock",
                capabilities={"tier": 3, "tools": True},
                context_limit=128000,
                enabled=True,
            )
            session.add(baseline_model)
            await session.flush()

            baseline_pricing = ModelPricing(
                model_id=baseline_model.id,
                input_price_per_million=Decimal("5.00"),
                output_price_per_million=Decimal("15.00"),
                currency="USD",
            )
            session.add(baseline_pricing)

            # 3. Seed Economy Model (gpt-4o-mini) with pricing ($0.15 in, $0.60 out)
            economy_model = ModelRegistry(
                internal_name="gpt-4o-mini",
                backend_model_id="openai/gpt-4o-mini",
                provider_adapter="mock",
                capabilities={"tier": 1, "tools": True},
                context_limit=128000,
                enabled=True,
            )
            session.add(economy_model)
            await session.flush()

            economy_pricing = ModelPricing(
                model_id=economy_model.id,
                input_price_per_million=Decimal("0.15"),
                output_price_per_million=Decimal("0.60"),
                currency="USD",
            )
            session.add(economy_pricing)

            # 4. Seed Unpriced Model (test-unpriced)
            unpriced_model = ModelRegistry(
                internal_name="test-unpriced",
                backend_model_id="mock/test-unpriced",
                provider_adapter="mock",
                capabilities={"tier": 1},
                context_limit=32000,
                enabled=True,
            )
            session.add(unpriced_model)

            await session.commit()

    asyncio.run(setup_db())

    with TestClient(app) as test_client:
        yield test_client, session_factory

    async def teardown_db() -> None:
        await engine.dispose()

    asyncio.run(teardown_db())


def test_models_crud_endpoints(
    baseline_test_env: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    """Assert Model Registry CRUD and versioned pricing endpoints work properly."""
    client, _ = baseline_test_env

    # 1. Register a new model with initial pricing
    create_payload: dict[str, Any] = {
        "internal_name": "claude-3-5-sonnet",
        "backend_model_id": "anthropic/claude-3-5-sonnet",
        "provider_adapter": "mock",
        "capabilities": {"tier": 2, "tools": True, "vision": True},
        "context_limit": 200000,
        "enabled": True,
        "initial_pricing": {
            "input_price_per_million": "3.00",
            "output_price_per_million": "15.00",
            "currency": "USD",
            "source": "Anthropic Official",
        },
    }
    res = client.post("/api/v1/models", json=create_payload)
    assert res.status_code == 201
    model_data = res.json()
    assert model_data["internal_name"] == "claude-3-5-sonnet"
    assert model_data["active_pricing"] is not None
    assert Decimal(model_data["active_pricing"]["input_price_per_million"]) == Decimal("3.00")
    model_id = model_data["id"]

    # 2. Get registered model by ID
    get_res = client.get(f"/api/v1/models/{model_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == model_id

    # 3. List registered models
    list_res = client.get("/api/v1/models")
    assert list_res.status_code == 200
    assert list_res.json()["total"] >= 4

    # 4. Add a new pricing tier (versioning existing active rate)
    pricing_payload = {
        "input_price_per_million": "2.50",
        "output_price_per_million": "12.50",
        "currency": "USD",
        "source": "Anthropic Price Cut",
    }
    pricing_res = client.post(f"/api/v1/models/{model_id}/pricing", json=pricing_payload)
    assert pricing_res.status_code == 201
    assert Decimal(pricing_res.json()["input_price_per_million"]) == Decimal("2.50")

    # 5. List pricing history for model (should show 2 entries now)
    history_res = client.get(f"/api/v1/models/{model_id}/pricing")
    assert history_res.status_code == 200
    history = history_res.json()
    assert len(history) == 2

    # 6. Update model details
    update_res = client.put(f"/api/v1/models/{model_id}", json={"context_limit": 250000})
    assert update_res.status_code == 200
    assert update_res.json()["context_limit"] == 250000

    # 7. Delete model
    del_res = client.delete(f"/api/v1/models/{model_id}")
    assert del_res.status_code == 204
    assert client.get(f"/api/v1/models/{model_id}").status_code == 404


def test_completion_cost_accounting_and_baseline_savings(
    baseline_test_env: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    """Assert inference request computes and persists exact costs and baseline savings."""
    client, session_factory = baseline_test_env

    request_id_str = str(uuid.uuid4())
    payload = {
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": "You are a test assistant."},
            {"role": "user", "content": "Calculate financial savings against baseline."},
        ],
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

    async def verify_costs() -> None:
        async with session_factory() as session:
            stmt = select(Request).where(Request.id == req_uuid)
            req = (await session.execute(stmt)).scalar_one_or_none()
            assert req is not None
            assert req.status == "completed"

            # Both input and output tokens must be positive
            assert req.input_tokens is not None and req.input_tokens > 0
            assert req.output_tokens is not None and req.output_tokens > 0

            # Cost amount must be non-zero Decimal
            assert req.cost_amount is not None
            assert req.cost_amount > Decimal("0")
            assert req.cost_type == "ESTIMATED"
            assert req.cost_currency == "USD"

            # Baseline cost against gpt-4o must be computed
            assert req.baseline_cost_amount is not None
            assert req.baseline_cost_amount > req.cost_amount

            # Estimated savings percentage must be calculated and > 80% (gpt-4o-mini vs gpt-4o)
            assert req.estimated_savings_percent is not None
            assert req.estimated_savings_percent > Decimal("80.00")

    asyncio.run(verify_costs())


def test_completion_unpriced_model_yields_unknown_cost(
    baseline_test_env: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    """Assert requests for unpriced models remain UNKNOWN without defaulting to zero (ADR-005)."""
    client, session_factory = baseline_test_env

    request_id_str = str(uuid.uuid4())
    payload = {
        "model": "test-unpriced",
        "messages": [{"role": "user", "content": "Unpriced model request."}],
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

    async def verify_unpriced() -> None:
        async with session_factory() as session:
            stmt = select(Request).where(Request.id == req_uuid)
            req = (await session.execute(stmt)).scalar_one_or_none()
            assert req is not None
            assert req.status == "completed"

            # Never default missing pricing to zero!
            assert req.cost_amount is None
            assert req.cost_type == "UNKNOWN"
            assert req.estimated_savings_percent is None

    asyncio.run(verify_unpriced())

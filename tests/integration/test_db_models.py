"""Integration tests for SQLAlchemy database models and entity relationships."""

from collections.abc import AsyncGenerator
from decimal import Decimal

import pytest
import pytest_asyncio
from app.db.base import Base
from app.db.models import (
    ApiKey,
    ModelPricing,
    ModelRegistry,
    Request,
    RequestAttempt,
    RoutingDecision,
    RoutingPolicy,
)
from sqlalchemy import inspect, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Create a temporary in-memory SQLite database session for integration tests."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    sessionmaker = async_sessionmaker(bind=engine, expire_on_commit=False)
    async with sessionmaker() as session:
        yield session

    await engine.dispose()


@pytest.mark.asyncio
async def test_create_and_query_api_key(db_session: AsyncSession) -> None:
    """Assert ApiKey can be created, saved, and queried by key_hash."""
    api_key = ApiKey(
        name="Test Client",
        key_prefix="tg_live_12",
        key_hash="hash_1234567890abcdef",
        status="active",
    )
    db_session.add(api_key)
    await db_session.commit()

    stmt = select(ApiKey).where(ApiKey.key_hash == "hash_1234567890abcdef")
    result = await db_session.execute(stmt)
    retrieved = result.scalar_one()

    assert retrieved.id is not None
    assert retrieved.name == "Test Client"
    assert retrieved.key_prefix == "tg_live_12"
    assert retrieved.status == "active"
    assert retrieved.created_at is not None


@pytest.mark.asyncio
async def test_create_and_query_routing_policy(db_session: AsyncSession) -> None:
    """Assert RoutingPolicy can be stored with JSON configuration."""
    policy = RoutingPolicy(
        name="Default Economy",
        mode="economy",
        configuration={"max_budget_per_req": 0.05, "allowed_models": ["gpt-4o-mini"]},
        version=1,
        is_active=True,
    )
    db_session.add(policy)
    await db_session.commit()

    stmt = select(RoutingPolicy).where(RoutingPolicy.mode == "economy")
    result = await db_session.execute(stmt)
    retrieved = result.scalar_one()

    assert retrieved.name == "Default Economy"
    assert retrieved.configuration["allowed_models"] == ["gpt-4o-mini"]
    assert retrieved.version == 1
    assert retrieved.is_active is True


@pytest.mark.asyncio
async def test_models_registry_and_pricing_relationship(
    db_session: AsyncSession,
) -> None:
    """Assert ModelRegistry and ModelPricing relationship and cascade behavior."""
    model = ModelRegistry(
        internal_name="gpt-4o-mini",
        backend_model_id="openai/gpt-4o-mini",
        provider_adapter="9router",
        capabilities={"tools": True, "json": True},
        context_limit=128000,
        enabled=True,
    )
    db_session.add(model)
    await db_session.flush()

    pricing = ModelPricing(
        model_id=model.id,
        input_price_per_million=Decimal("0.150000"),
        output_price_per_million=Decimal("0.600000"),
        currency="USD",
        source="openai_official",
    )
    db_session.add(pricing)
    await db_session.commit()

    stmt = select(ModelRegistry).where(ModelRegistry.internal_name == "gpt-4o-mini")
    result = await db_session.execute(stmt)
    retrieved = result.scalar_one()

    assert len(retrieved.pricing_entries) == 1
    assert retrieved.pricing_entries[0].input_price_per_million == Decimal("0.150000")
    assert retrieved.pricing_entries[0].output_price_per_million == Decimal("0.600000")


@pytest.mark.asyncio
async def test_request_decision_and_attempt_relationships(
    db_session: AsyncSession,
) -> None:
    """Assert Request, RoutingDecision, and RequestAttempt relationship consistency."""
    model = ModelRegistry(
        internal_name="claude-3-5-sonnet",
        backend_model_id="anthropic/claude-3-5-sonnet",
        capabilities={"tools": True},
        enabled=True,
    )
    policy = RoutingPolicy(name="Quality Mode", mode="quality", configuration={})
    db_session.add_all([model, policy])
    await db_session.flush()

    req = Request(
        routing_policy_id=policy.id,
        status="completed",
        selected_model_id=model.id,
        input_tokens=100,
        output_tokens=250,
        cost_amount=Decimal("0.004050"),
        cost_type="ESTIMATED",
        baseline_cost_amount=Decimal("0.005000"),
        estimated_savings_percent=Decimal("19.00"),
        routing_latency_ms=4,
        provider_latency_ms=350,
        total_duration_ms=355,
        stream_enabled=True,
    )
    db_session.add(req)
    await db_session.flush()

    decision = RoutingDecision(
        request_id=req.id,
        strategy_name="rule_based",
        strategy_version="1.0.0",
        selected_model_id=model.id,
        decision_reason="Quality policy prioritized high evaluation score",
        decision_latency_ms=4,
    )
    attempt = RequestAttempt(
        request_id=req.id,
        attempt_number=1,
        model_id=model.id,
        status="success",
        usage_metadata={"prompt_tokens": 100, "completion_tokens": 250},
    )
    db_session.add_all([decision, attempt])
    await db_session.commit()

    stmt = select(Request).where(Request.id == req.id)
    result = await db_session.execute(stmt)
    retrieved_req = result.scalar_one()

    assert retrieved_req.status == "completed"
    assert retrieved_req.routing_decision is not None
    assert retrieved_req.routing_decision.decision_reason is not None
    assert len(retrieved_req.attempts) == 1
    assert retrieved_req.attempts[0].status == "success"


def test_privacy_enforcement_no_prompt_columns() -> None:
    """Privacy by Default: assert no columns for prompt or completion content exist."""
    mapper_request = inspect(Request)
    column_names = {col.key for col in mapper_request.columns}

    forbidden_names = {
        "prompt",
        "messages",
        "completion",
        "response",
        "content",
        "prompt_text",
    }
    intersect = column_names.intersection(forbidden_names)
    assert not intersect, f"Forbidden privacy-violating columns found in Request model: {intersect}"

"""Integration tests for Developer Analytics & Request Log Explorer (Milestone 11)."""

import asyncio
from collections.abc import AsyncGenerator, Generator
from datetime import datetime, timezone
from decimal import Decimal
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db_session
from app.db.base import Base
from app.db.models.models_registry import ModelRegistry
from app.db.models.request_attempts import RequestAttempt
from app.db.models.requests import Request
from app.db.models.routing_decisions import RoutingDecision
from app.db.models.routing_policies import RoutingPolicy
from app.main import create_app

AnalyticsFixture = Generator[tuple[TestClient, async_sessionmaker[AsyncSession]], None, None]


@pytest.fixture
def analytics_test_env() -> AnalyticsFixture:
    """Provide a TestClient with an in-memory DB and seeded analytics data."""
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

    app.dependency_overrides[get_db_session] = override_get_db_session

    async def setup_db() -> None:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        async with session_factory() as session:
            policy = RoutingPolicy(
                name="economy-default",
                mode="economy",
                is_active=True,
                configuration={"priority": ["gpt-4o-mini"]},
            )
            session.add(policy)
            await session.flush()

            model1 = ModelRegistry(
                internal_name="gpt-4o-mini",
                backend_model_id="gpt-4o-mini",
                provider_adapter="mock",
                capabilities={"supports_streaming": True},
                context_limit=128000,
                enabled=True,
            )
            model2 = ModelRegistry(
                internal_name="claude-3-5-sonnet",
                backend_model_id="claude-3-5-sonnet",
                provider_adapter="mock",
                capabilities={"supports_streaming": True},
                context_limit=200000,
                enabled=True,
            )
            session.add_all([model1, model2])
            await session.flush()

            # Seed 3 requests
            now = datetime.now(timezone.utc)
            r1 = Request(
                id=uuid.uuid4(),
                timestamp=now,
                status="completed",
                selected_model_id=model1.id,
                routing_policy_id=policy.id,
                input_tokens=100,
                output_tokens=50,
                cost_amount=Decimal("0.000045"),
                cost_currency="USD",
                cost_type="ESTIMATED",
                baseline_cost_amount=Decimal("0.000750"),
                estimated_savings_percent=Decimal("94.00"),
                routing_latency_ms=1.5,
                provider_latency_ms=120.0,
                total_duration_ms=125.0,
                stream_enabled=False,
            )
            r2 = Request(
                id=uuid.uuid4(),
                timestamp=now,
                status="completed",
                selected_model_id=model2.id,
                routing_policy_id=policy.id,
                input_tokens=200,
                output_tokens=100,
                cost_amount=Decimal("0.002100"),
                cost_currency="USD",
                cost_type="ESTIMATED",
                baseline_cost_amount=Decimal("0.001500"),
                estimated_savings_percent=Decimal("-40.00"),
                routing_latency_ms=2.0,
                provider_latency_ms=250.0,
                total_duration_ms=260.0,
                stream_enabled=True,
            )
            r3 = Request(
                id=uuid.uuid4(),
                timestamp=now,
                status="failed",
                selected_model_id=model1.id,
                routing_policy_id=policy.id,
                input_tokens=50,
                output_tokens=0,
                cost_amount=Decimal("0.000000"),
                cost_currency="USD",
                cost_type="ESTIMATED",
                baseline_cost_amount=Decimal("0.000000"),
                estimated_savings_percent=None,
                routing_latency_ms=1.0,
                provider_latency_ms=50.0,
                total_duration_ms=55.0,
                stream_enabled=False,
                error_category="UPSTREAM_5XX",
            )
            session.add_all([r1, r2, r3])
            await session.flush()

            # Add decision and attempt to r1
            decision = RoutingDecision(
                request_id=r1.id,
                strategy_name="RuleBasedStrategy",
                strategy_version="1.0.0",
                selected_model_id=model1.id,
                decision_reason="Lowest unit cost candidate selected",
                decision_latency_ms=1.2,
            )
            attempt = RequestAttempt(
                request_id=r1.id,
                attempt_number=1,
                model_id=model1.id,
                status="success",
                usage_metadata={"prompt_tokens": 100, "completion_tokens": 50},
            )
            session.add_all([decision, attempt])
            await session.commit()

    asyncio.run(setup_db())

    with TestClient(app) as client:
        yield client, session_factory


def test_get_analytics_overview(
    analytics_test_env: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    """Test GET /api/v1/analytics/overview metrics aggregation."""
    client, _ = analytics_test_env
    response = client.get("/api/v1/analytics/overview")

    assert response.status_code == 200
    data = response.json()
    assert data["total_requests"] == 3
    assert data["successful_requests"] == 2
    assert data["failed_requests"] == 1
    assert Decimal(data["total_cost"]) > Decimal("0")
    assert Decimal(data["baseline_cost"]) > Decimal("0")
    assert data["avg_latency_ms"] > 0
    assert data["p95_latency_ms"] > 0


def test_get_model_analytics(
    analytics_test_env: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    """Test GET /api/v1/analytics/models traffic distribution."""
    client, _ = analytics_test_env
    response = client.get("/api/v1/analytics/models")

    assert response.status_code == 200
    data = response.json()
    assert data["total_requests"] == 3
    assert len(data["items"]) == 2
    names = [item["model_name"] for item in data["items"]]
    assert "gpt-4o-mini" in names
    assert "claude-3-5-sonnet" in names


def test_get_cost_time_series(
    analytics_test_env: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    """Test GET /api/v1/analytics/costs daily time-series."""
    client, _ = analytics_test_env
    response = client.get("/api/v1/analytics/costs")

    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) >= 1
    assert data["items"][0]["request_count"] == 3


def test_list_requests_and_pagination(
    analytics_test_env: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    """Test GET /api/v1/requests paginated log query."""
    client, _ = analytics_test_env
    response = client.get("/api/v1/requests?limit=2&offset=0")

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 3
    assert len(data["items"]) == 2
    assert data["limit"] == 2
    assert data["offset"] == 0

    # Test filtering by status
    resp_failed = client.get("/api/v1/requests?status=failed")
    assert resp_failed.status_code == 200
    failed_data = resp_failed.json()
    assert failed_data["total"] == 1
    assert failed_data["items"][0]["status"] == "failed"


def test_get_request_detail(
    analytics_test_env: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    """Test GET /api/v1/requests/{id} with attempts and decision rationale."""
    client, _ = analytics_test_env
    list_resp = client.get("/api/v1/requests")
    req_id = list_resp.json()["items"][0]["id"]

    response = client.get(f"/api/v1/requests/{req_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == req_id
    assert "routing_policy_name" in data

    # Test 404 for nonexistent UUID
    random_id = str(uuid.uuid4())
    resp_404 = client.get(f"/api/v1/requests/{random_id}")
    assert resp_404.status_code == 404

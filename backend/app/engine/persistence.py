"""Non-blocking persistence for request audit logging and routing decisions (ADR-004, ADR-008)."""

import logging
import uuid
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from app.db.models.api_keys import ApiKey
from app.db.models.models_registry import ModelRegistry
from app.db.models.request_attempts import RequestAttempt
from app.db.models.requests import Request
from app.db.models.routing_decisions import RoutingDecision
from app.db.models.routing_policies import RoutingPolicy
from app.db.session import get_sessionmaker
from app.engine.accounting import calculate_request_accounting

logger = logging.getLogger(__name__)


@dataclass
class AuditLogPayload:
    """Encapsulates request execution metadata for asynchronous database audit logging.

    Enforces Privacy by Default (ADR-004): zero prompt or completion content fields.
    """

    request_id: uuid.UUID
    model_name: str
    api_key_id: uuid.UUID | None = None
    routing_policy_id: uuid.UUID | None = None
    routing_policy_version: int | None = None
    status: str = "completed"  # completed, failed, cancelled
    stream_enabled: bool = False
    input_tokens: int | None = None
    output_tokens: int | None = None
    routing_latency_ms: int | None = None
    provider_latency_ms: int | None = None
    total_duration_ms: int | None = None
    error_category: str | None = None

    # Financial cost and baseline comparison fields (ADR-005)
    cost_amount: Decimal | None = None
    cost_currency: str = "USD"
    cost_type: str = "UNKNOWN"
    baseline_cost_amount: Decimal | None = None
    estimated_savings_percent: Decimal | None = None
    baseline_model: str | None = None

    # Routing decision audit fields
    strategy_name: str = "direct"
    strategy_version: str = "1.0.0"
    decision_reason: str | None = None
    candidate_summary: dict[str, Any] | None = field(default_factory=dict)
    estimated_cost: Decimal | None = None
    decision_latency_ms: int = 0

    # Request attempt audit fields
    attempt_status: str = "success"  # success, failed, aborted
    attempt_error_category: str | None = None
    usage_metadata: dict[str, Any] | None = None


async def record_request_audit(
    payload: AuditLogPayload,
    engine: AsyncEngine | None = None,
) -> None:
    """Asynchronously persist request metadata, routing decision, and attempt log.

    Runs as a non-blocking background task. Catches and logs all persistence
    errors to ensure database failures never disrupt client responses (ADR-008).
    Strictly excludes prompt and completion text (ADR-004).
    """
    if engine is not None:
        session_factory = async_sessionmaker(
            bind=engine, class_=AsyncSession, expire_on_commit=False
        )
    else:
        session_factory = get_sessionmaker()

    async with session_factory() as session:
        try:
            # 1. Resolve selected model from registry if registered
            stmt = select(ModelRegistry).where(
                (ModelRegistry.internal_name == payload.model_name)
                | (ModelRegistry.backend_model_id == payload.model_name)
            )
            model_record = (await session.execute(stmt)).scalar_one_or_none()
            selected_model_id = model_record.id if model_record else None

            # 2. Validate API key foreign key reference if provided
            valid_api_key_id: uuid.UUID | None = None
            if payload.api_key_id is not None:
                key_exists = (
                    await session.execute(
                        select(ApiKey.id).where(ApiKey.id == payload.api_key_id)
                    )
                ).scalar_one_or_none()
                if key_exists:
                    valid_api_key_id = payload.api_key_id

            # 3. Validate routing policy foreign key reference if provided
            valid_policy_id: uuid.UUID | None = None
            if payload.routing_policy_id is not None:
                policy_exists = (
                    await session.execute(
                        select(RoutingPolicy.id).where(
                            RoutingPolicy.id == payload.routing_policy_id
                        )
                    )
                ).scalar_one_or_none()
                if policy_exists:
                    valid_policy_id = payload.routing_policy_id

            # 4. Evaluate Cost Accounting & Baseline Comparison (ADR-005)
            cost_amount = payload.cost_amount
            cost_currency = payload.cost_currency
            cost_type = payload.cost_type
            baseline_cost_amount = payload.baseline_cost_amount
            estimated_savings_percent = payload.estimated_savings_percent

            if (
                cost_amount is None
                and payload.status == "completed"
                and payload.input_tokens is not None
                and payload.output_tokens is not None
            ):
                accounting = await calculate_request_accounting(
                    session=session,
                    model_name=payload.model_name,
                    input_tokens=payload.input_tokens,
                    output_tokens=payload.output_tokens,
                    baseline_model_name=payload.baseline_model,
                )
                cost_amount = accounting.cost_amount
                cost_currency = accounting.cost_currency
                cost_type = accounting.cost_type
                baseline_cost_amount = accounting.baseline_cost_amount
                estimated_savings_percent = accounting.estimated_savings_percent

            # 5. Insert Request record
            request_record = Request(
                id=payload.request_id,
                api_key_id=valid_api_key_id,
                routing_policy_id=valid_policy_id,
                routing_policy_version=payload.routing_policy_version,
                status=payload.status,
                selected_model_id=selected_model_id,
                input_tokens=payload.input_tokens,
                output_tokens=payload.output_tokens,
                cost_amount=cost_amount,
                cost_currency=cost_currency,
                cost_type=cost_type,
                baseline_cost_amount=baseline_cost_amount,
                estimated_savings_percent=estimated_savings_percent,
                routing_latency_ms=payload.routing_latency_ms,
                provider_latency_ms=payload.provider_latency_ms,
                total_duration_ms=payload.total_duration_ms,
                stream_enabled=payload.stream_enabled,
                error_category=payload.error_category,
            )
            session.add(request_record)
            await session.flush()

            # 5. Insert RoutingDecision record
            decision_record = RoutingDecision(
                request_id=payload.request_id,
                strategy_name=payload.strategy_name,
                strategy_version=payload.strategy_version,
                selected_model_id=selected_model_id,
                decision_reason=payload.decision_reason,
                candidate_summary=payload.candidate_summary,
                estimated_cost=payload.estimated_cost,
                decision_latency_ms=payload.decision_latency_ms,
            )
            session.add(decision_record)

            # 6. Insert RequestAttempt record
            attempt_record = RequestAttempt(
                request_id=payload.request_id,
                attempt_number=1,
                model_id=selected_model_id,
                status=payload.attempt_status,
                error_category=payload.attempt_error_category,
                usage_metadata=payload.usage_metadata,
            )
            session.add(attempt_record)

            await session.commit()
            logger.debug("Successfully persisted audit log for request_id=%s", payload.request_id)

        except Exception as exc:
            logger.error(
                "Background persistence error for request_id=%s: %s",
                payload.request_id,
                exc,
                exc_info=True,
            )
            await session.rollback()

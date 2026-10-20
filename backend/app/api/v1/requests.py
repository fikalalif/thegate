"""Request log explorer endpoints with server-side pagination and filters (Milestone 11)."""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.models_registry import ModelRegistry
from app.db.models.requests import Request
from app.db.session import get_db_session
from app.schemas.analytics import (
    RequestAttemptItem,
    RequestDetailResponse,
    RequestLogItem,
    RequestLogListResponse,
    RoutingDecisionItem,
)

router = APIRouter(prefix="/requests")


@router.get(
    "",
    response_model=RequestLogListResponse,
    summary="List requests with filters and pagination",
)
async def list_requests(
    limit: int = Query(default=20, ge=1, le=100, description="Items per page"),
    offset: int = Query(default=0, ge=0, description="Pagination offset"),
    model: str | None = Query(default=None, description="Filter by model name"),
    status: str | None = Query(
        default=None, description="Filter by status (completed, failed, cancelled)"
    ),
    policy_id: uuid.UUID | None = Query(default=None, description="Filter by routing policy ID"),
    start_date: datetime | None = Query(default=None, description="Filter requests after date"),
    end_date: datetime | None = Query(default=None, description="Filter requests before date"),
    session: AsyncSession = Depends(get_db_session),
) -> RequestLogListResponse:
    """Retrieve paginated list of request audit records with optional filters."""
    query = (
        select(Request)
        .options(
            selectinload(Request.selected_model),
            selectinload(Request.routing_policy),
        )
        .order_by(Request.timestamp.desc())
    )

    if status:
        query = query.where(Request.status == status)
    if policy_id:
        query = query.where(Request.routing_policy_id == policy_id)
    if start_date:
        query = query.where(Request.timestamp >= start_date)
    if end_date:
        query = query.where(Request.timestamp <= end_date)
    if model:
        query = query.join(Request.selected_model).where(ModelRegistry.internal_name == model)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = (await session.execute(count_query)).scalar_one()

    # Paginate
    paged_query = query.limit(limit).offset(offset)
    result = await session.execute(paged_query)
    records = result.scalars().all()

    items = [
        RequestLogItem(
            id=r.id,
            timestamp=r.timestamp,
            status=r.status,
            model_name=r.selected_model.internal_name if r.selected_model else "unregistered",
            routing_policy_name=r.routing_policy.name if r.routing_policy else None,
            input_tokens=r.input_tokens,
            output_tokens=r.output_tokens,
            total_duration_ms=r.total_duration_ms,
            cost_amount=r.cost_amount,
            cost_type=r.cost_type,
            baseline_cost_amount=r.baseline_cost_amount,
            estimated_savings_percent=r.estimated_savings_percent,
            stream_enabled=r.stream_enabled,
            error_category=r.error_category,
        )
        for r in records
    ]

    return RequestLogListResponse(items=items, total=total, limit=limit, offset=offset)


@router.get(
    "/{request_id}",
    response_model=RequestDetailResponse,
    summary="Get request detail by ID",
)
async def get_request_detail(
    request_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
) -> RequestDetailResponse:
    """Retrieve full request execution metadata, routing rationale, and attempts."""
    query = (
        select(Request)
        .options(
            selectinload(Request.selected_model),
            selectinload(Request.routing_policy),
            selectinload(Request.routing_decision),
            selectinload(Request.attempts),
        )
        .where(Request.id == request_id)
    )
    result = await session.execute(query)
    req = result.scalar_one_or_none()

    if req is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Request with ID {request_id} not found",
        )

    decision_item: RoutingDecisionItem | None = None
    if req.routing_decision:
        decision_item = RoutingDecisionItem(
            strategy_name=req.routing_decision.strategy_name,
            strategy_version=req.routing_decision.strategy_version,
            decision_reason=req.routing_decision.decision_reason,
            candidate_summary=req.routing_decision.candidate_summary,
            decision_latency_ms=req.routing_decision.decision_latency_ms,
        )

    attempt_items = [
        RequestAttemptItem(
            attempt_number=a.attempt_number,
            status=a.status,
            error_category=a.error_category,
            usage_metadata=a.usage_metadata,
        )
        for a in req.attempts
    ]

    return RequestDetailResponse(
        id=req.id,
        timestamp=req.timestamp,
        status=req.status,
        model_name=req.selected_model.internal_name if req.selected_model else "unregistered",
        selected_model_id=req.selected_model_id,
        routing_policy_id=req.routing_policy_id,
        routing_policy_name=req.routing_policy.name if req.routing_policy else None,
        routing_policy_version=req.routing_policy_version,
        input_tokens=req.input_tokens,
        output_tokens=req.output_tokens,
        cost_amount=req.cost_amount,
        cost_currency=req.cost_currency,
        cost_type=req.cost_type,
        baseline_cost_amount=req.baseline_cost_amount,
        estimated_savings_percent=req.estimated_savings_percent,
        routing_latency_ms=req.routing_latency_ms,
        provider_latency_ms=req.provider_latency_ms,
        total_duration_ms=req.total_duration_ms,
        stream_enabled=req.stream_enabled,
        error_category=req.error_category,
        routing_decision=decision_item,
        attempts=attempt_items,
    )

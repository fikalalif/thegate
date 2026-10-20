"""Pydantic schemas for analytics aggregations and request log explorer."""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class AnalyticsOverviewResponse(BaseModel):
    """High-level performance and financial cost savings overview."""

    total_requests: int
    successful_requests: int
    failed_requests: int
    total_cost: Decimal
    baseline_cost: Decimal
    net_savings_amount: Decimal
    net_savings_percent: Decimal | None = None
    avg_latency_ms: float
    p95_latency_ms: float


class ModelAnalyticsItem(BaseModel):
    """Aggregate volume and financial metrics for a single model candidate."""

    model_name: str
    model_id: uuid.UUID | None = None
    request_count: int
    percentage: float = Field(ge=0.0, le=100.0)
    total_cost: Decimal
    total_tokens: int


class ModelAnalyticsResponse(BaseModel):
    """Model traffic distribution and cost breakdown."""

    items: list[ModelAnalyticsItem]
    total_requests: int


class CostTimeSeriesItem(BaseModel):
    """Aggregated financial costs within a specific time bucket."""

    timestamp: str  # ISO date or datetime string for bucket
    total_cost: Decimal
    baseline_cost: Decimal
    request_count: int


class CostTimeSeriesResponse(BaseModel):
    """Time-series financial cost aggregations."""

    items: list[CostTimeSeriesItem]


class RequestAttemptItem(BaseModel):
    """Metadata for an individual execution attempt."""

    attempt_number: int
    status: str
    error_category: str | None = None
    usage_metadata: dict[str, Any] | None = None

    model_config = ConfigDict(from_attributes=True)


class RoutingDecisionItem(BaseModel):
    """Routing rationale and candidates considered (zero prompt content)."""

    strategy_name: str
    strategy_version: str
    decision_reason: str | None = None
    candidate_summary: dict[str, Any] | None = None
    decision_latency_ms: int

    model_config = ConfigDict(from_attributes=True)


class RequestLogItem(BaseModel):
    """Summary item for the paginated request log explorer table."""

    id: uuid.UUID
    timestamp: datetime
    status: str
    model_name: str
    routing_policy_name: str | None = None
    input_tokens: int | None = None
    output_tokens: int | None = None
    total_duration_ms: int | None = None
    cost_amount: Decimal | None = None
    cost_type: str
    baseline_cost_amount: Decimal | None = None
    estimated_savings_percent: Decimal | None = None
    stream_enabled: bool = False
    error_category: str | None = None

    model_config = ConfigDict(from_attributes=True)


class RequestLogListResponse(BaseModel):
    """Paginated request log items."""

    items: list[RequestLogItem]
    total: int
    limit: int
    offset: int


class RequestDetailResponse(BaseModel):
    """Detailed request execution record with decision rationale and attempt history."""

    id: uuid.UUID
    timestamp: datetime
    status: str
    model_name: str
    selected_model_id: uuid.UUID | None = None
    routing_policy_id: uuid.UUID | None = None
    routing_policy_name: str | None = None
    routing_policy_version: int | None = None
    input_tokens: int | None = None
    output_tokens: int | None = None
    cost_amount: Decimal | None = None
    cost_currency: str = "USD"
    cost_type: str
    baseline_cost_amount: Decimal | None = None
    estimated_savings_percent: Decimal | None = None
    routing_latency_ms: int | None = None
    provider_latency_ms: int | None = None
    total_duration_ms: int | None = None
    stream_enabled: bool = False
    error_category: str | None = None
    routing_decision: RoutingDecisionItem | None = None
    attempts: list[RequestAttemptItem] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)

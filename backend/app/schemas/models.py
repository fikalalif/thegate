"""Pydantic schemas for Model Registry and versioned pricing."""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ModelPricingCreate(BaseModel):
    """Payload to create a new versioned pricing entry for a model."""

    input_price_per_million: Decimal = Field(
        ge=0,
        description="Price in currency per 1 million input prompt tokens",
    )
    output_price_per_million: Decimal = Field(
        ge=0,
        description="Price in currency per 1 million output completion tokens",
    )
    currency: str = Field(default="USD", max_length=8, description="ISO currency code")
    effective_from: datetime | None = Field(
        default=None,
        description="Timestamp when pricing becomes active (defaults to current time)",
    )
    effective_until: datetime | None = Field(
        default=None,
        description="Timestamp when pricing is retired/superseded",
    )
    source: str | None = Field(
        default=None, max_length=128, description="Pricing source / reference"
    )


class ModelPricingResponse(BaseModel):
    """Representation of a versioned model pricing record."""

    id: uuid.UUID
    model_id: uuid.UUID
    input_price_per_million: Decimal | None = None
    output_price_per_million: Decimal | None = None
    currency: str
    effective_from: datetime
    effective_until: datetime | None = None
    source: str | None = None
    validated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class ModelCreateRequest(BaseModel):
    """Payload to register a new model candidate in the registry."""

    internal_name: str = Field(
        min_length=1,
        max_length=128,
        description="Canonical unique internal identifier (e.g. gpt-4o, claude-3-5-sonnet)",
    )
    backend_model_id: str = Field(
        min_length=1,
        max_length=128,
        description="Upstream backend provider model identifier (e.g. openai/gpt-4o)",
    )
    provider_adapter: str = Field(
        default="9router",
        max_length=64,
        description="Adapter handling this model",
    )
    capabilities: dict[str, Any] = Field(
        default_factory=dict,
        description="Model capabilities (e.g. tier, tools, vision, json_mode)",
    )
    context_limit: int | None = Field(
        default=None,
        ge=1,
        description="Maximum token context window limit",
    )
    enabled: bool = Field(default=True, description="Whether this model is eligible for routing")
    initial_pricing: ModelPricingCreate | None = Field(
        default=None,
        description="Optional initial active pricing rates",
    )


class ModelUpdateRequest(BaseModel):
    """Payload to update an existing registered model."""

    backend_model_id: str | None = Field(default=None, min_length=1, max_length=128)
    provider_adapter: str | None = Field(default=None, min_length=1, max_length=64)
    capabilities: dict[str, Any] | None = None
    context_limit: int | None = Field(default=None, ge=1)
    enabled: bool | None = None


class ModelResponse(BaseModel):
    """Representation of a registered model entity with active pricing."""

    id: uuid.UUID
    internal_name: str
    backend_model_id: str
    provider_adapter: str
    capabilities: dict[str, Any]
    context_limit: int | None = None
    enabled: bool
    created_at: datetime
    updated_at: datetime
    pricing_entries: list[ModelPricingResponse] = Field(default_factory=list)
    active_pricing: ModelPricingResponse | None = None

    model_config = ConfigDict(from_attributes=True)


class ModelListResponse(BaseModel):
    """List response envelope for registered models."""

    models: list[ModelResponse]
    total: int

"""Pydantic schemas for routing policy management."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class RoutingPolicyCreateRequest(BaseModel):
    """Payload to create a new routing policy."""

    name: str = Field(min_length=1, max_length=255, description="Unique policy name")
    mode: str = Field(
        default="balanced",
        description="Routing policy mode: economy, balanced, or quality",
    )
    configuration: dict[str, Any] = Field(
        default_factory=dict,
        description="Policy-specific parameters (e.g. candidate pool, fallback order)",
    )
    is_active: bool = Field(default=True, description="Whether the policy is active")

    @field_validator("mode")
    @classmethod
    def validate_mode(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"economy", "balanced", "quality"}:
            raise ValueError("Mode must be one of: economy, balanced, quality")
        return normalized


class RoutingPolicyUpdateRequest(BaseModel):
    """Payload to update an existing routing policy."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    mode: str | None = Field(default=None)
    configuration: dict[str, Any] | None = Field(default=None)
    is_active: bool | None = Field(default=None)

    @field_validator("mode")
    @classmethod
    def validate_mode(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().lower()
        if normalized not in {"economy", "balanced", "quality"}:
            raise ValueError("Mode must be one of: economy, balanced, quality")
        return normalized


class RoutingPolicyResponse(BaseModel):
    """Representation of a routing policy entity."""

    id: uuid.UUID = Field(description="Unique policy identifier")
    name: str = Field(description="Policy name")
    mode: str = Field(description="Routing mode (economy, balanced, quality)")
    configuration: dict[str, Any] = Field(description="Policy configuration")
    version: int = Field(description="Policy version")
    is_active: bool = Field(description="Whether the policy is active")
    created_at: datetime = Field(description="Creation timestamp")
    updated_at: datetime = Field(description="Last update timestamp")

    model_config = ConfigDict(from_attributes=True)


class RoutingPolicyListResponse(BaseModel):
    """Container for list of routing policies."""

    policies: list[RoutingPolicyResponse] = Field(description="List of registered routing policies")

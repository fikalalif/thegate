"""Pydantic schemas for API key management."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ApiKeyCreateRequest(BaseModel):
    """Payload to generate a new API key."""

    name: str = Field(min_length=1, max_length=255, description="Friendly name for the key")


class ApiKeyCreatedResponse(BaseModel):
    """Response returned upon creation, containing the plaintext key exactly once."""

    id: uuid.UUID = Field(description="Unique key identifier")
    name: str = Field(description="Key friendly name")
    key: str = Field(description="Plaintext API key (only displayed once upon creation)")
    key_prefix: str = Field(description="First 10 characters of the key for identification")
    status: str = Field(default="active", description="Key status")
    created_at: datetime = Field(description="Creation timestamp in UTC")

    model_config = ConfigDict(from_attributes=True)


class ApiKeyResponse(BaseModel):
    """Metadata response for an existing API key (plaintext key is not included)."""

    id: uuid.UUID = Field(description="Unique key identifier")
    name: str = Field(description="Key friendly name")
    key_prefix: str = Field(description="First 10 characters of the key")
    status: str = Field(description="Key status (active, revoked)")
    created_at: datetime = Field(description="Creation timestamp in UTC")
    last_used_at: datetime | None = Field(default=None, description="Last authenticated timestamp")
    revoked_at: datetime | None = Field(default=None, description="Revocation timestamp")

    model_config = ConfigDict(from_attributes=True)


class ApiKeyListResponse(BaseModel):
    """List container of API key metadata."""

    keys: list[ApiKeyResponse] = Field(description="List of registered API keys")

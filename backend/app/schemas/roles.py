"""Pydantic schemas for team roles and autonomous agent personas."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class RoleCreate(BaseModel):
    """Payload to create a new team role."""

    name: str = Field(..., min_length=2, max_length=128, description="Role title, e.g. Mobile Developer")
    role_key: str | None = Field(default=None, description="Unique slug; auto-generated if omitted")
    department: str = Field(..., min_length=2, max_length=128, description="Department name, e.g. Mobile Engineering")
    context_behavior: str = Field(..., min_length=10, description="Behavioral prompt guidelines and heuristics")
    preferred_model_id: str | None = Field(default=None, description="Preferred model ID from catalog")
    hair_color: str = Field(default="#4B2E1E", description="Avatar hair color hex")
    shirt_color: str = Field(default="#2B5278", description="Avatar shirt color hex")
    tie_color: str | None = Field(default=None, description="Avatar tie color hex")
    has_glasses: bool = Field(default=False, description="Whether avatar wears glasses")
    has_headset: bool = Field(default=False, description="Whether avatar wears headset")
    is_default: bool = Field(default=False, description="Whether this role is primary default")


class RoleUpdate(BaseModel):
    """Payload to update an existing role."""

    name: str | None = Field(default=None)
    department: str | None = Field(default=None)
    context_behavior: str | None = Field(default=None)
    preferred_model_id: str | None = Field(default=None)
    hair_color: str | None = Field(default=None)
    shirt_color: str | None = Field(default=None)
    tie_color: str | None = Field(default=None)
    has_glasses: bool | None = Field(default=None)
    has_headset: bool | None = Field(default=None)
    is_default: bool | None = Field(default=None)
    current_activity: str | None = Field(default=None)


class RoleResponse(BaseModel):
    """Schema for returning role details."""

    id: uuid.UUID
    name: str
    role_key: str
    department: str
    context_behavior: str
    preferred_model_id: str | None
    hair_color: str
    shirt_color: str
    tie_color: str | None
    has_glasses: bool
    has_headset: bool
    is_default: bool
    current_activity: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GenerateContextRequest(BaseModel):
    """Payload to generate AI behavioral context for a role."""

    role_name: str = Field(..., min_length=2, description="Target role title, e.g. Mobile Dev")
    department: str = Field(default="Engineering", description="Department name")
    key_focus: str | None = Field(default=None, description="Specialized focus or keywords")


class GenerateContextResponse(BaseModel):
    """Generated context behavior with model and appearance recommendations."""

    role_name: str
    department: str
    generated_context: str
    suggested_models: list[str] = Field(default_factory=list)
    suggested_appearance: dict[str, Any] = Field(default_factory=dict)

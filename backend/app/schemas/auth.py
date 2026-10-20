"""Pydantic schemas for authentication and password management."""

from pydantic import BaseModel, ConfigDict, Field


class LoginRequest(BaseModel):
    """Payload to authenticate into TheGate console."""

    password: str = Field(..., min_length=1, max_length=256, description="Access password")


class LoginResponse(BaseModel):
    """Successful login response."""

    success: bool = True
    token: str
    message: str = "Authenticated"
    is_default_password: bool = False

    model_config = ConfigDict(from_attributes=True)


class AuthStatusResponse(BaseModel):
    """Authentication status check response."""

    authenticated: bool
    is_default_password: bool

    model_config = ConfigDict(from_attributes=True)


class ChangePasswordRequest(BaseModel):
    """Payload to change access password."""

    current_password: str = Field(..., min_length=1, description="Current access password")
    new_password: str = Field(..., min_length=6, max_length=256, description="New access password")


class ChangePasswordResponse(BaseModel):
    """Response returned upon successful password update."""

    success: bool = True
    token: str
    message: str = "Password changed successfully"

    model_config = ConfigDict(from_attributes=True)

"""Health and readiness response schemas."""

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Liveness probe response model."""

    status: str = Field(default="ok", description="Liveness status")
    app: str = Field(default="TheGate", description="Application name")
    version: str = Field(default="0.1.0", description="Application version")
    environment: str = Field(default="development", description="Current deployment environment")


class ReadinessResponse(BaseModel):
    """Readiness probe response model."""

    status: str = Field(default="ready", description="Readiness status")
    database: str = Field(default="not_configured", description="Database connection health")
    app: str = Field(default="TheGate", description="Application name")

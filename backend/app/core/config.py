"""Centralized configuration management for TheGate."""

from functools import lru_cache
from typing import Any

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment variable loading and validation."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application & Environment
    app_name: str = Field(default="TheGate", description="Application name")
    environment: str = Field(
        default="development",
        description="Deployment environment (development, test, staging, production)",
    )
    debug: bool = Field(default=False, description="Debug mode")
    log_level: str = Field(default="INFO", description="Log level (DEBUG, INFO, WARNING, ERROR)")
    secret_key: str = Field(
        default="change-this-in-production-use-a-secure-random-32-char-string",
        description="Internal encryption and signature secret key",
    )

    # Server Gateway
    host: str = Field(default="0.0.0.0", description="Bind host")
    port: int = Field(default=8000, ge=1, le=65535, description="Bind port")
    allowed_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:3000", "http://127.0.0.1:3000"],
        description="Allowed CORS origins",
    )

    # Database (Defaults to zero-config SQLite for instant plug-and-play CLI)
    postgres_user: str = Field(default="thegate", description="PostgreSQL user")
    postgres_password: str = Field(
        default="thegate_secret_password", description="PostgreSQL password"
    )
    postgres_db: str = Field(default="thegate_db", description="PostgreSQL database name")
    postgres_host: str = Field(default="db", description="PostgreSQL host")
    postgres_port: int = Field(default=5432, ge=1, le=65535, description="PostgreSQL port")
    database_url: str = Field(
        default="sqlite+aiosqlite:///thegate_dev.db",
        description="Full asynchronous SQLAlchemy database URL (defaults to zero-config SQLite)",
    )

    # Downstream Initial Provider Integration (9Router)
    ninerouter_base_url: str = Field(
        default="http://localhost:8080/v1",
        description="Base URL for downstream 9Router instance",
    )
    ninerouter_api_key: str | None = Field(
        default=None,
        description="API key for 9Router upstream authentication",
    )
    ninerouter_timeout_seconds: float = Field(
        default=60.0,
        gt=0.0,
        description="Timeout for upstream 9Router requests in seconds",
    )
    provider_adapter: str = Field(
        default="mock",
        description="Active provider adapter (mock for testing/dev, 9router for upstream)",
    )

    # Routing & Cost Defaults
    default_routing_policy_mode: str = Field(
        default="balanced",
        description="Default routing policy mode (economy, balanced, quality)",
    )
    default_baseline_model: str = Field(
        default="gpt-4o",
        description="Default counterfactual baseline model for savings comparison",
    )
    max_request_body_bytes: int = Field(
        default=2097152,  # 2MB
        gt=0,
        description="Maximum allowed request body size in bytes",
    )
    rate_limit_per_minute: int = Field(
        default=120,
        gt=0,
        description="Default API key rate limit per minute",
    )

    # Privacy & Logging
    log_metadata_only: bool = Field(
        default=True,
        description="Ensure only metadata is logged, never prompt or completion text",
    )
    store_prompt_content: bool = Field(
        default=False,
        description="Strictly disallow storing prompt and completion content",
    )

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_allowed_origins(cls, value: Any) -> list[str]:
        """Parse comma-separated strings or list of strings for CORS origins."""
        if isinstance(value, str):
            origins = [origin.strip() for origin in value.split(",") if origin.strip()]
            return origins if origins else ["*"]
        if isinstance(value, list):
            return [str(item).strip() for item in value if str(item).strip()]
        return ["*"]

    @field_validator("environment")
    @classmethod
    def validate_environment(cls, value: str) -> str:
        """Validate environment string."""
        normalized = value.strip().lower()
        allowed = {"development", "test", "staging", "production"}
        if normalized not in allowed:
            raise ValueError(f"Environment must be one of: {', '.join(sorted(allowed))}")
        return normalized

    @field_validator("default_routing_policy_mode")
    @classmethod
    def validate_routing_mode(cls, value: str) -> str:
        """Validate default routing policy mode."""
        normalized = value.strip().lower()
        allowed = {"economy", "balanced", "quality"}
        if normalized not in allowed:
            modes_str = ", ".join(sorted(allowed))
            raise ValueError(f"Default routing policy mode must be one of: {modes_str}")
        return normalized


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached application settings instance."""
    return Settings()

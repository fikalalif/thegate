"""Unit tests for configuration loading and validation."""

import pytest
from app.core.config import Settings
from pydantic import ValidationError


def test_config_loads_defaults() -> None:
    """Assert default settings values when environment variables are omitted."""
    settings = Settings(_env_file=None)

    assert settings.app_name == "TheGate"
    assert settings.environment == "development"
    assert settings.debug is False
    assert settings.port == 8000
    assert settings.postgres_user == "thegate"
    assert settings.postgres_db == "thegate_db"
    assert settings.default_routing_policy_mode == "balanced"
    assert settings.default_baseline_model == "gpt-4o"
    assert settings.max_request_body_bytes == 2097152
    assert settings.log_metadata_only is True
    assert settings.store_prompt_content is False
    assert settings.provider_adapter == "mock"


def test_config_rejects_invalid_types() -> None:
    """Assert validation error when integer field receives non-numeric value."""
    with pytest.raises(ValidationError) as exc_info:
        Settings(port="not-a-port")  # type: ignore[arg-type]

    errors = exc_info.value.errors()
    assert any(error["loc"] == ("port",) for error in errors)


def test_config_rejects_out_of_range_port() -> None:
    """Assert validation error when port is out of range."""
    with pytest.raises(ValidationError):
        Settings(port=70000)

    with pytest.raises(ValidationError):
        Settings(port=0)


def test_config_rejects_invalid_environment() -> None:
    """Assert validation error when environment string is unknown."""
    with pytest.raises(ValidationError) as exc_info:
        Settings(environment="invalid_env")

    assert "Environment must be one of" in str(exc_info.value)


def test_config_rejects_invalid_routing_mode() -> None:
    """Assert validation error when routing mode is unknown."""
    with pytest.raises(ValidationError) as exc_info:
        Settings(default_routing_policy_mode="super_fast")

    assert "Default routing policy mode must be one of" in str(exc_info.value)


def test_allowed_origins_parsing_comma_separated() -> None:
    """Assert comma-separated string is properly parsed into a list."""
    settings = Settings(allowed_origins="http://example.com, https://app.example.com")  # type: ignore[arg-type]
    assert settings.allowed_origins == ["http://example.com", "https://app.example.com"]


def test_allowed_origins_parsing_list() -> None:
    """Assert list is preserved as list."""
    settings = Settings(allowed_origins=["http://localhost:3000", "http://localhost:8000"])
    assert settings.allowed_origins == [
        "http://localhost:3000",
        "http://localhost:8000",
    ]

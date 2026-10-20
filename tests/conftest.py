"""Pytest test configuration and shared fixtures."""

import sys
from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Ensure backend directory is in sys.path
backend_path = Path(__file__).parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.core.config import Settings, get_settings  # noqa: E402
from app.main import create_app  # noqa: E402


@pytest.fixture(autouse=True)
def test_environment_cleanup() -> Generator[None, None, None]:
    """Ensure clean test environment by clearing settings cache."""
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def test_settings() -> Settings:
    """Return test settings instance with test environment configured."""
    return Settings(
        app_name="TheGate-Test",
        environment="test",
        debug=True,
        database_url="sqlite+aiosqlite:///:memory:",
    )


@pytest.fixture
def client(test_settings: Settings) -> Generator[TestClient, None, None]:
    """Return FastAPI TestClient with test settings injected."""

    def get_test_settings() -> Settings:
        return test_settings

    app = create_app()
    app.dependency_overrides[get_settings] = get_test_settings
    with TestClient(app) as test_client:
        yield test_client

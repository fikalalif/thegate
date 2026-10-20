"""Unit tests for health and readiness endpoints."""

from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient


def test_health_endpoint_returns_200(client: TestClient) -> None:
    """Assert GET /health returns HTTP 200 and conforms to HealthResponse schema."""
    response = client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["app"] == "TheGate-Test"
    assert data["version"] == "0.1.0"
    assert data["environment"] == "test"


def test_readiness_endpoint_connected(client: TestClient) -> None:
    """Assert GET /ready returns HTTP 200 when database connectivity is verified."""
    with patch("app.api.v1.health.check_db_connectivity", new_callable=AsyncMock) as mock_check:
        mock_check.return_value = True
        response = client.get("/ready")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ready"
        assert data["database"] == "connected"
        assert data["app"] == "TheGate-Test"


def test_readiness_endpoint_disconnected(client: TestClient) -> None:
    """Assert GET /ready returns HTTP 503 when database is unreachable."""
    with patch("app.api.v1.health.check_db_connectivity", new_callable=AsyncMock) as mock_check:
        mock_check.return_value = False
        response = client.get("/ready")

        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "not_ready"
        assert data["database"] == "disconnected"
        assert data["app"] == "TheGate-Test"


def test_cors_headers_handling(client: TestClient) -> None:
    """Assert CORS headers respond to Origin header."""
    response = client.options(
        "/health",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert "access-control-allow-origin" in response.headers

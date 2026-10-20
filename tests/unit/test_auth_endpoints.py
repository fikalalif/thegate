"""Unit tests for authentication and password management endpoints."""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_auth_login_with_default_password() -> None:
    """Verify login with default password '12345678'."""
    res = client.post("/api/v1/auth/login", json={"password": "12345678"})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "token" in data
    assert data["is_default_password"] is True


def test_auth_login_with_invalid_password() -> None:
    """Verify login failure with wrong password."""
    res = client.post("/api/v1/auth/login", json={"password": "wrong_password_999"})
    assert res.status_code == 401
    assert "Invalid access password" in res.json()["detail"]


def test_auth_status_check() -> None:
    """Verify auth status check endpoint."""
    # First login to get token
    login_res = client.post("/api/v1/auth/login", json={"password": "12345678"})
    token = login_res.json()["token"]

    # Status check with valid token
    status_res = client.get("/api/v1/auth/status", headers={"Authorization": f"Bearer {token}"})
    assert status_res.status_code == 200
    assert status_res.json()["authenticated"] is True

    # Status check with invalid token
    bad_res = client.get("/api/v1/auth/status", headers={"Authorization": "Bearer bad_token_xyz"})
    assert bad_res.status_code == 200
    assert bad_res.json()["authenticated"] is False


def test_auth_change_password_workflow() -> None:
    """Verify changing password and verifying new credentials."""
    # 1. Login with 12345678
    login_res = client.post("/api/v1/auth/login", json={"password": "12345678"})
    token = login_res.json()["token"]

    # 2. Change password to new password
    change_res = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "12345678", "new_password": "newSecurePassword2026!"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert change_res.status_code == 200
    new_token = change_res.json()["token"]
    assert new_token

    # 3. Old password should fail now
    old_fail = client.post("/api/v1/auth/login", json={"password": "12345678"})
    assert old_fail.status_code == 401

    # 4. New password should succeed
    new_success = client.post("/api/v1/auth/login", json={"password": "newSecurePassword2026!"})
    assert new_success.status_code == 200
    assert new_success.json()["is_default_password"] is False

    # 5. Restore default password so other tests or sessions remain predictable
    restore_res = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "newSecurePassword2026!", "new_password": "12345678"},
        headers={"Authorization": f"Bearer {new_token}"},
    )
    assert restore_res.status_code == 200

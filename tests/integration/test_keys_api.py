"""Integration tests for API key management and authentication dependency."""

import uuid
from collections.abc import AsyncGenerator, Generator

import pytest
from app.api.deps import get_current_api_key
from app.db.base import Base
from app.db.models.api_keys import ApiKey
from app.db.session import get_db_session
from app.main import create_app
from fastapi import Depends
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


@pytest.fixture
def auth_test_app() -> Generator[tuple[TestClient, async_sessionmaker[AsyncSession]], None, None]:
    """Provide a TestClient with an isolated in-memory SQLite database
    and a test protected endpoint.
    """
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    session_factory = async_sessionmaker(bind=engine, expire_on_commit=False)

    app = create_app()

    # Add a dummy protected route to test get_current_api_key
    @app.get("/api/v1/test-protected")
    async def protected_route(
        api_key: ApiKey = Depends(get_current_api_key),
    ) -> dict[str, str]:
        return {"name": api_key.name, "prefix": api_key.key_prefix}

    # Override database session dependency to use in-memory SQLite
    async def override_get_db_session() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db_session] = override_get_db_session

    import asyncio

    async def init_tables() -> None:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    asyncio.run(init_tables())

    with TestClient(app) as client:
        yield client, session_factory

    async def dispose() -> None:
        await engine.dispose()

    asyncio.run(dispose())


def test_create_api_key_returns_plaintext_key_once(
    auth_test_app: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    """Assert POST /api/v1/keys generates key and saves only hash in database."""
    client, session_factory = auth_test_app

    response = client.post("/api/v1/keys", json={"name": "Production App"})
    assert response.status_code == 201

    data = response.json()
    assert data["name"] == "Production App"
    assert "key" in data
    assert data["key"].startswith("tg_live_")
    assert data["key_prefix"] == data["key"][:10]
    assert data["status"] == "active"

    key_id = uuid.UUID(data["id"])

    # Directly inspect database to verify plaintext key is not stored
    import asyncio

    async def check_db() -> None:
        async with session_factory() as session:
            stmt = select(ApiKey).where(ApiKey.id == key_id)
            result = await session.execute(stmt)
            record = result.scalar_one()

            assert record.name == "Production App"
            assert record.key_hash != data["key"]
            assert len(record.key_hash) == 64  # SHA-256 hex string

    asyncio.run(check_db())


def test_list_api_keys_omits_plaintext_key(
    auth_test_app: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    """Assert GET /api/v1/keys returns metadata without plaintext keys or hashes."""
    client, _ = auth_test_app

    client.post("/api/v1/keys", json={"name": "Service A"})
    client.post("/api/v1/keys", json={"name": "Service B"})

    response = client.get("/api/v1/keys")
    assert response.status_code == 200

    data = response.json()
    assert "keys" in data
    assert len(data["keys"]) >= 2

    for key_meta in data["keys"]:
        assert "key" not in key_meta
        assert "key_hash" not in key_meta
        assert "key_prefix" in key_meta
        assert key_meta["key_prefix"].startswith("tg_live_")


def test_revoke_api_key(
    auth_test_app: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    """Assert DELETE /api/v1/keys/{id} revokes the key."""
    client, _ = auth_test_app

    create_res = client.post("/api/v1/keys", json={"name": "Key to Revoke"})
    key_id = create_res.json()["id"]

    revoke_res = client.delete(f"/api/v1/keys/{key_id}")
    assert revoke_res.status_code == 200
    assert revoke_res.json()["status"] == "revoked"
    assert revoke_res.json()["revoked_at"] is not None


def test_revoke_nonexistent_key_returns_404(
    auth_test_app: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    """Assert DELETE with non-existent UUID returns HTTP 404."""
    client, _ = auth_test_app
    random_id = uuid.uuid4()

    response = client.delete(f"/api/v1/keys/{random_id}")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_auth_dependency_with_valid_key(
    auth_test_app: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    """Assert authentication succeeds with valid key and updates last_used_at."""
    client, session_factory = auth_test_app

    create_res = client.post("/api/v1/keys", json={"name": "Client Gateway"})
    raw_key = create_res.json()["key"]
    key_id = uuid.UUID(create_res.json()["id"])

    response = client.get(
        "/api/v1/test-protected",
        headers={"Authorization": f"Bearer {raw_key}"},
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Client Gateway"

    # Verify last_used_at was updated in DB
    import asyncio

    async def check_last_used() -> None:
        async with session_factory() as session:
            stmt = select(ApiKey).where(ApiKey.id == key_id)
            result = await session.execute(stmt)
            record = result.scalar_one()
            assert record.last_used_at is not None

    asyncio.run(check_last_used())


def test_auth_dependency_with_revoked_key_fails(
    auth_test_app: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    """Assert authentication fails with HTTP 401 when key is revoked."""
    client, _ = auth_test_app

    create_res = client.post("/api/v1/keys", json={"name": "Compromised Key"})
    raw_key = create_res.json()["key"]
    key_id = create_res.json()["id"]

    # Revoke key
    client.delete(f"/api/v1/keys/{key_id}")

    response = client.get(
        "/api/v1/test-protected",
        headers={"Authorization": f"Bearer {raw_key}"},
    )
    assert response.status_code == 401
    assert "revoked" in response.json()["detail"].lower()


def test_auth_dependency_with_missing_header_fails(
    auth_test_app: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    """Assert authentication fails with HTTP 401 when header is missing."""
    client, _ = auth_test_app

    response = client.get("/api/v1/test-protected")
    assert response.status_code == 401
    assert "missing" in response.json()["detail"].lower()


def test_auth_dependency_with_invalid_token_fails(
    auth_test_app: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    """Assert authentication fails with HTTP 401 when token is invalid."""
    client, _ = auth_test_app

    response = client.get(
        "/api/v1/test-protected",
        headers={"Authorization": "Bearer tg_live_fakekeythatdoesntexist1234"},
    )
    assert response.status_code == 401
    assert "invalid" in response.json()["detail"].lower()

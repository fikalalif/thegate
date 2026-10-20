"""FastAPI dependencies for authentication and database sessions."""

from datetime import datetime, timezone

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.base import BaseProviderAdapter
from app.adapters.ninerouter import NineRouterAdapter
from app.core.config import get_settings
from app.core.security import hash_api_key
from app.db.models.api_keys import ApiKey
from app.db.session import get_db_session


async def get_current_api_key(
    request: Request,
    session: AsyncSession = Depends(get_db_session),
) -> ApiKey:
    """Validate Bearer API key from Authorization header and return ApiKey entity."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    raw_key = auth_header.split(" ", 1)[1].strip()
    if not raw_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Empty API key token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    computed_hash = hash_api_key(raw_key)

    stmt = select(ApiKey).where(ApiKey.key_hash == computed_hash)
    result = await session.execute(stmt)
    api_key = result.scalar_one_or_none()

    if api_key is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if api_key.status != "active":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key has been revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Record usage timestamp
    api_key.last_used_at = datetime.now(timezone.utc)
    session.add(api_key)

    return api_key


def get_provider_adapter() -> BaseProviderAdapter:
    """Return configured provider adapter instance."""
    settings = get_settings()
    if settings.provider_adapter.lower() == "mock":
        from app.adapters.mock import MockProviderAdapter

        return MockProviderAdapter(
            default_response_text=(
                "Hello from TheGate! This response was intelligently routed and cost-optimized."
            )
        )

    return NineRouterAdapter(
        base_url=settings.ninerouter_base_url,
        api_key=settings.ninerouter_api_key,
        timeout_seconds=settings.ninerouter_timeout_seconds,
    )

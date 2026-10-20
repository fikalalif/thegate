"""API key administrative management endpoints."""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import extract_key_prefix, generate_api_key, hash_api_key
from app.db.models.api_keys import ApiKey
from app.db.session import get_db_session
from app.schemas.keys import (
    ApiKeyCreatedResponse,
    ApiKeyCreateRequest,
    ApiKeyListResponse,
    ApiKeyResponse,
)

router = APIRouter(prefix="/keys")


@router.post(
    "",
    response_model=ApiKeyCreatedResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new API key",
    description=(
        "Generate a new API key. The plaintext key is returned exactly once in the response."
    ),
)
async def create_api_key(
    payload: ApiKeyCreateRequest,
    session: AsyncSession = Depends(get_db_session),
) -> ApiKeyCreatedResponse:
    """Generate and persist a new API key."""
    raw_key = generate_api_key()
    prefix = extract_key_prefix(raw_key)
    key_hash = hash_api_key(raw_key)

    api_key = ApiKey(
        name=payload.name,
        key_prefix=prefix,
        key_hash=key_hash,
        status="active",
    )
    session.add(api_key)
    await session.flush()

    return ApiKeyCreatedResponse(
        id=api_key.id,
        name=api_key.name,
        key=raw_key,
        key_prefix=api_key.key_prefix,
        status=api_key.status,
        created_at=api_key.created_at,
    )


@router.get(
    "",
    response_model=ApiKeyListResponse,
    status_code=status.HTTP_200_OK,
    summary="List API keys",
    description="List all registered API keys and metadata. Plaintext keys are never returned.",
)
async def list_api_keys(
    session: AsyncSession = Depends(get_db_session),
) -> ApiKeyListResponse:
    """Retrieve metadata for all existing API keys."""
    stmt = select(ApiKey).order_by(ApiKey.created_at.desc())
    result = await session.execute(stmt)
    records = result.scalars().all()

    return ApiKeyListResponse(keys=[ApiKeyResponse.model_validate(record) for record in records])


@router.delete(
    "/{key_id}",
    response_model=ApiKeyResponse,
    status_code=status.HTTP_200_OK,
    summary="Revoke an API key",
    description=(
        "Instantly revoke an API key by ID. Revoked keys cannot authenticate inference requests."
    ),
)
async def revoke_api_key(
    key_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
) -> ApiKeyResponse:
    """Revoke an active API key."""
    stmt = select(ApiKey).where(ApiKey.id == key_id)
    result = await session.execute(stmt)
    api_key = result.scalar_one_or_none()

    if api_key is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"API key with ID {key_id} not found",
        )

    api_key.status = "revoked"
    api_key.revoked_at = datetime.now(timezone.utc)
    await session.flush()

    return ApiKeyResponse.model_validate(api_key)

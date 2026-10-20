"""Routing Policy CRUD management endpoints."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.routing_policies import RoutingPolicy
from app.db.session import get_db_session
from app.schemas.policies import (
    RoutingPolicyCreateRequest,
    RoutingPolicyListResponse,
    RoutingPolicyResponse,
    RoutingPolicyUpdateRequest,
)

router = APIRouter(prefix="/policies")


@router.post(
    "",
    response_model=RoutingPolicyResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create routing policy",
    description="Register a new routing policy (Economy, Balanced, Quality).",
)
async def create_policy(
    payload: RoutingPolicyCreateRequest,
    session: AsyncSession = Depends(get_db_session),
) -> RoutingPolicyResponse:
    """Create and persist a new routing policy."""
    policy = RoutingPolicy(
        name=payload.name,
        mode=payload.mode,
        configuration=payload.configuration,
        is_active=payload.is_active,
    )
    session.add(policy)
    await session.flush()
    await session.refresh(policy)

    return RoutingPolicyResponse.model_validate(policy)


@router.get(
    "",
    response_model=RoutingPolicyListResponse,
    summary="List routing policies",
    description="Retrieve all routing policies.",
)
async def list_policies(
    session: AsyncSession = Depends(get_db_session),
) -> RoutingPolicyListResponse:
    """List all registered routing policies sorted by creation time."""
    stmt = select(RoutingPolicy).order_by(RoutingPolicy.created_at.desc())
    result = await session.execute(stmt)
    policies = result.scalars().all()

    return RoutingPolicyListResponse(
        policies=[RoutingPolicyResponse.model_validate(p) for p in policies]
    )


@router.get(
    "/{policy_id}",
    response_model=RoutingPolicyResponse,
    summary="Get routing policy by ID",
)
async def get_policy(
    policy_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
) -> RoutingPolicyResponse:
    """Retrieve details of a specific routing policy."""
    stmt = select(RoutingPolicy).where(RoutingPolicy.id == policy_id)
    result = await session.execute(stmt)
    policy = result.scalar_one_or_none()

    if policy is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Routing policy with ID {policy_id} not found",
        )

    return RoutingPolicyResponse.model_validate(policy)


@router.put(
    "/{policy_id}",
    response_model=RoutingPolicyResponse,
    summary="Update routing policy",
)
async def update_policy(
    policy_id: uuid.UUID,
    payload: RoutingPolicyUpdateRequest,
    session: AsyncSession = Depends(get_db_session),
) -> RoutingPolicyResponse:
    """Update an existing routing policy and increment its version."""
    stmt = select(RoutingPolicy).where(RoutingPolicy.id == policy_id)
    result = await session.execute(stmt)
    policy = result.scalar_one_or_none()

    if policy is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Routing policy with ID {policy_id} not found",
        )

    if payload.name is not None:
        policy.name = payload.name
    if payload.mode is not None:
        policy.mode = payload.mode
    if payload.configuration is not None:
        policy.configuration = payload.configuration
    if payload.is_active is not None:
        policy.is_active = payload.is_active

    policy.version += 1
    await session.flush()
    await session.refresh(policy)

    return RoutingPolicyResponse.model_validate(policy)


@router.delete(
    "/{policy_id}",
    response_model=RoutingPolicyResponse,
    summary="Delete / deactivate routing policy",
)
async def delete_policy(
    policy_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
) -> RoutingPolicyResponse:
    """Soft-delete (deactivate) a routing policy."""
    stmt = select(RoutingPolicy).where(RoutingPolicy.id == policy_id)
    result = await session.execute(stmt)
    policy = result.scalar_one_or_none()

    if policy is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Routing policy with ID {policy_id} not found",
        )

    policy.is_active = False
    await session.flush()
    await session.refresh(policy)

    return RoutingPolicyResponse.model_validate(policy)

"""Model Registry and versioned pricing CRUD management endpoints."""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.model_pricing import ModelPricing
from app.db.models.models_registry import ModelRegistry
from app.db.session import get_db_session
from app.schemas.models import (
    ModelCreateRequest,
    ModelListResponse,
    ModelPricingCreate,
    ModelPricingResponse,
    ModelResponse,
    ModelUpdateRequest,
)

router = APIRouter(prefix="/models")


def to_model_response(model: ModelRegistry) -> ModelResponse:
    """Format ModelRegistry SQLAlchemy entity into ModelResponse with active pricing."""
    now = datetime.now(timezone.utc)
    pricing_entries = [
        ModelPricingResponse.model_validate(p) for p in (model.pricing_entries or [])
    ]

    active_p: ModelPricingResponse | None = None
    for p in pricing_entries:
        if p.effective_until is None:
            active_p = p
            break
        eff = p.effective_until
        eff_utc = eff if eff.tzinfo is not None else eff.replace(tzinfo=timezone.utc)
        if eff_utc >= now:
            active_p = p
            break
    if active_p is None and pricing_entries:
        active_p = pricing_entries[0]

    return ModelResponse(
        id=model.id,
        internal_name=model.internal_name,
        backend_model_id=model.backend_model_id,
        provider_adapter=model.provider_adapter,
        capabilities=model.capabilities or {},
        context_limit=model.context_limit,
        enabled=model.enabled,
        created_at=model.created_at,
        updated_at=model.updated_at,
        pricing_entries=pricing_entries,
        active_pricing=active_p,
    )


@router.post(
    "",
    response_model=ModelResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register new model",
    description="Add a new model candidate to the registry with optional initial pricing.",
)
async def register_model(
    payload: ModelCreateRequest,
    session: AsyncSession = Depends(get_db_session),
) -> ModelResponse:
    """Register a new model candidate."""
    # Check if internal_name already registered
    existing_stmt = select(ModelRegistry).where(
        ModelRegistry.internal_name == payload.internal_name
    )
    existing = (await session.execute(existing_stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Model with internal_name '{payload.internal_name}' already exists",
        )

    model = ModelRegistry(
        internal_name=payload.internal_name,
        backend_model_id=payload.backend_model_id,
        provider_adapter=payload.provider_adapter,
        capabilities=payload.capabilities,
        context_limit=payload.context_limit,
        enabled=payload.enabled,
    )
    session.add(model)
    await session.flush()

    if payload.initial_pricing:
        effective_from = payload.initial_pricing.effective_from or datetime.now(timezone.utc)
        pricing = ModelPricing(
            model_id=model.id,
            input_price_per_million=payload.initial_pricing.input_price_per_million,
            output_price_per_million=payload.initial_pricing.output_price_per_million,
            currency=payload.initial_pricing.currency,
            effective_from=effective_from,
            effective_until=payload.initial_pricing.effective_until,
            source=payload.initial_pricing.source,
        )
        session.add(pricing)
        await session.flush()

    await session.refresh(model, attribute_names=["pricing_entries", "created_at", "updated_at"])
    return to_model_response(model)


@router.get(
    "",
    response_model=ModelListResponse,
    summary="List registered models",
    description="Retrieve all registered models, optionally filtering by eligibility.",
)
async def list_models(
    enabled_only: bool = Query(default=False, description="Filter only enabled models"),
    session: AsyncSession = Depends(get_db_session),
) -> ModelListResponse:
    """List all registered models with their active pricing."""
    stmt = (
        select(ModelRegistry)
        .options(selectinload(ModelRegistry.pricing_entries))
        .order_by(ModelRegistry.internal_name.asc())
    )
    if enabled_only:
        stmt = stmt.where(ModelRegistry.enabled == True)  # noqa: E712

    result = await session.execute(stmt)
    models = result.scalars().all()

    return ModelListResponse(
        models=[to_model_response(m) for m in models],
        total=len(models),
    )


@router.get(
    "/{model_id}",
    response_model=ModelResponse,
    summary="Get model details by ID",
)
async def get_model(
    model_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
) -> ModelResponse:
    """Retrieve details and versioned pricing history for a specific model."""
    stmt = (
        select(ModelRegistry)
        .options(selectinload(ModelRegistry.pricing_entries))
        .where(ModelRegistry.id == model_id)
    )
    model = (await session.execute(stmt)).scalar_one_or_none()
    if model is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Model with ID {model_id} not found",
        )

    return to_model_response(model)


@router.put(
    "/{model_id}",
    response_model=ModelResponse,
    summary="Update registered model",
)
async def update_model(
    model_id: uuid.UUID,
    payload: ModelUpdateRequest,
    session: AsyncSession = Depends(get_db_session),
) -> ModelResponse:
    """Update capabilities, limits, or status of a registered model."""
    stmt = (
        select(ModelRegistry)
        .options(selectinload(ModelRegistry.pricing_entries))
        .where(ModelRegistry.id == model_id)
    )
    model = (await session.execute(stmt)).scalar_one_or_none()
    if model is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Model with ID {model_id} not found",
        )

    if payload.backend_model_id is not None:
        model.backend_model_id = payload.backend_model_id
    if payload.provider_adapter is not None:
        model.provider_adapter = payload.provider_adapter
    if payload.capabilities is not None:
        model.capabilities = payload.capabilities
    if payload.context_limit is not None:
        model.context_limit = payload.context_limit
    if payload.enabled is not None:
        model.enabled = payload.enabled

    await session.flush()
    await session.refresh(model, attribute_names=["updated_at", "pricing_entries"])
    return to_model_response(model)


@router.delete(
    "/{model_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete registered model",
)
async def delete_model(
    model_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
) -> None:
    """Remove a model from the registry."""
    stmt = select(ModelRegistry).where(ModelRegistry.id == model_id)
    model = (await session.execute(stmt)).scalar_one_or_none()
    if model is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Model with ID {model_id} not found",
        )

    await session.delete(model)
    await session.flush()


@router.post(
    "/{model_id}/pricing",
    response_model=ModelPricingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add versioned model pricing",
    description="Add a new pricing tier for a model, versioning previous active pricing.",
)
async def add_model_pricing(
    model_id: uuid.UUID,
    payload: ModelPricingCreate,
    session: AsyncSession = Depends(get_db_session),
) -> ModelPricingResponse:
    """Add a new versioned pricing rate for a model."""
    model_stmt = (
        select(ModelRegistry)
        .options(selectinload(ModelRegistry.pricing_entries))
        .where(ModelRegistry.id == model_id)
    )
    model = (await session.execute(model_stmt)).scalar_one_or_none()
    if model is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Model with ID {model_id} not found",
        )

    now = datetime.now(timezone.utc)
    effective_from = payload.effective_from or now

    # Retire previous active pricing entries that had no effective_until
    for existing_pricing in (model.pricing_entries or []):
        if existing_pricing.effective_until is None:
            existing_pricing.effective_until = effective_from

    pricing = ModelPricing(
        model_id=model_id,
        input_price_per_million=payload.input_price_per_million,
        output_price_per_million=payload.output_price_per_million,
        currency=payload.currency,
        effective_from=effective_from,
        effective_until=payload.effective_until,
        source=payload.source,
    )
    session.add(pricing)
    await session.flush()
    await session.refresh(pricing)

    return ModelPricingResponse.model_validate(pricing)


@router.get(
    "/{model_id}/pricing",
    response_model=list[ModelPricingResponse],
    summary="List pricing history for a model",
)
async def list_model_pricing(
    model_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
) -> list[ModelPricingResponse]:
    """Retrieve full chronological pricing history for a model."""
    model_stmt = select(ModelRegistry).where(ModelRegistry.id == model_id)
    model = (await session.execute(model_stmt)).scalar_one_or_none()
    if model is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Model with ID {model_id} not found",
        )

    stmt = (
        select(ModelPricing)
        .where(ModelPricing.model_id == model_id)
        .order_by(ModelPricing.effective_from.desc())
    )
    result = await session.execute(stmt)
    entries = result.scalars().all()

    return [ModelPricingResponse.model_validate(p) for p in entries]

"""Cost accounting and counterfactual baseline comparison engine (ADR-005).

Provides high-precision token usage pricing calculations using Decimal arithmetic,
tracks explicit cost estimation states (PROVIDER_REPORTED, ESTIMATED, UNKNOWN),
and computes counterfactual baseline savings against reference models.
"""

import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.db.models.model_pricing import ModelPricing
from app.db.models.models_registry import ModelRegistry

logger = logging.getLogger(__name__)

ONE_MILLION = Decimal("1000000")
PRECISION_COST = Decimal("0.000001")  # NUMERIC(12, 6)
PRECISION_PERCENT = Decimal("0.01")   # NUMERIC(6, 2)


@dataclass
class CostBreakdown:
    """Detailed financial cost breakdown and counterfactual baseline metrics."""

    cost_amount: Decimal | None
    cost_currency: str
    cost_type: str  # PROVIDER_REPORTED, ESTIMATED, UNKNOWN
    input_cost: Decimal | None
    output_cost: Decimal | None
    baseline_model: str | None
    baseline_cost_amount: Decimal | None
    estimated_savings_percent: Decimal | None


def compute_token_cost(
    input_tokens: int | None,
    output_tokens: int | None,
    input_price_per_million: Decimal | None,
    output_price_per_million: Decimal | None,
) -> tuple[Decimal | None, Decimal | None, Decimal | None, str]:
    """Calculate input, output, and total costs using Decimal arithmetic.

    Returns:
        (input_cost, output_cost, total_cost, cost_type)
        If pricing or tokens are missing, returns None for costs and 'UNKNOWN' cost_type.
    """
    if (
        input_tokens is None
        or output_tokens is None
        or input_price_per_million is None
        or output_price_per_million is None
    ):
        return None, None, None, "UNKNOWN"

    in_tokens_dec = Decimal(input_tokens)
    out_tokens_dec = Decimal(output_tokens)

    input_cost = (in_tokens_dec * input_price_per_million / ONE_MILLION).quantize(
        PRECISION_COST, rounding=ROUND_HALF_UP
    )
    output_cost = (out_tokens_dec * output_price_per_million / ONE_MILLION).quantize(
        PRECISION_COST, rounding=ROUND_HALF_UP
    )
    total_cost = (input_cost + output_cost).quantize(
        PRECISION_COST, rounding=ROUND_HALF_UP
    )

    return input_cost, output_cost, total_cost, "ESTIMATED"


def compute_baseline_savings(
    actual_cost: Decimal | None,
    baseline_cost: Decimal | None,
) -> Decimal | None:
    """Calculate savings percentage against counterfactual baseline.

    Formula:
        savings_percent = ((baseline_cost - actual_cost) / baseline_cost) * 100

    Returns None if either cost is uncomputable (None) or if baseline_cost <= 0.
    """
    if actual_cost is None or baseline_cost is None or baseline_cost <= Decimal("0"):
        return None

    savings = ((baseline_cost - actual_cost) / baseline_cost) * Decimal("100")
    return savings.quantize(PRECISION_PERCENT, rounding=ROUND_HALF_UP)


async def get_active_model_pricing(
    session: AsyncSession,
    model_identifier: str,
) -> tuple[ModelRegistry | None, ModelPricing | None]:
    """Retrieve ModelRegistry record and its currently active pricing entry."""
    stmt = (
        select(ModelRegistry)
        .options(selectinload(ModelRegistry.pricing_entries))
        .where(
            (ModelRegistry.internal_name == model_identifier)
            | (ModelRegistry.backend_model_id == model_identifier)
        )
    )
    model = (await session.execute(stmt)).scalar_one_or_none()
    if not model or not model.pricing_entries:
        return model, None

    now = datetime.now(timezone.utc)
    # Prefer pricing entries where effective_until is None or in the future
    active_pricing: ModelPricing | None = None
    for pricing in model.pricing_entries:
        if pricing.effective_until is None:
            active_pricing = pricing
            break
        eff = pricing.effective_until
        eff_utc = eff if eff.tzinfo is not None else eff.replace(tzinfo=timezone.utc)
        if eff_utc >= now:
            active_pricing = pricing
            break

    if active_pricing is None and model.pricing_entries:
        active_pricing = model.pricing_entries[0]

    return model, active_pricing


async def calculate_request_accounting(
    session: AsyncSession,
    model_name: str,
    input_tokens: int | None,
    output_tokens: int | None,
    baseline_model_name: str | None = None,
    provider_cost: Decimal | None = None,
) -> CostBreakdown:
    """Compute financial accounting and baseline savings for a completed request.

    Enforces ADR-005: Never defaults unknown costs to zero.
    """
    if baseline_model_name is None:
        settings = get_settings()
        baseline_model_name = settings.default_baseline_model

    # 1. Resolve selected model pricing
    _, active_pricing = await get_active_model_pricing(session, model_name)

    cost_currency = "USD"
    if active_pricing and active_pricing.currency:
        cost_currency = active_pricing.currency

    if provider_cost is not None:
        cost_amount = provider_cost.quantize(PRECISION_COST, rounding=ROUND_HALF_UP)
        cost_type = "PROVIDER_REPORTED"
        input_cost = None
        output_cost = None
    elif (
        active_pricing
        and active_pricing.input_price_per_million is not None
        and active_pricing.output_price_per_million is not None
    ):
        input_cost, output_cost, cost_amount, cost_type = compute_token_cost(
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            input_price_per_million=active_pricing.input_price_per_million,
            output_price_per_million=active_pricing.output_price_per_million,
        )
    else:
        cost_amount = None
        cost_type = "UNKNOWN"
        input_cost = None
        output_cost = None

    # 2. Resolve baseline model pricing and counterfactual cost
    baseline_cost_amount: Decimal | None = None
    if baseline_model_name and input_tokens is not None and output_tokens is not None:
        _, base_pricing = await get_active_model_pricing(session, baseline_model_name)
        if (
            base_pricing
            and base_pricing.input_price_per_million is not None
            and base_pricing.output_price_per_million is not None
        ):
            _, _, baseline_cost_amount, _ = compute_token_cost(
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                input_price_per_million=base_pricing.input_price_per_million,
                output_price_per_million=base_pricing.output_price_per_million,
            )

    # 3. Calculate counterfactual baseline savings percentage
    savings_percent = compute_baseline_savings(
        actual_cost=cost_amount,
        baseline_cost=baseline_cost_amount,
    )

    return CostBreakdown(
        cost_amount=cost_amount,
        cost_currency=cost_currency,
        cost_type=cost_type,
        input_cost=input_cost,
        output_cost=output_cost,
        baseline_model=baseline_model_name,
        baseline_cost_amount=baseline_cost_amount,
        estimated_savings_percent=savings_percent,
    )

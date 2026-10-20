"""Unit tests for Cost Accounting & Baseline Comparison Engine (Milestone 10, ADR-005)."""

from decimal import Decimal

from app.engine.accounting import (
    compute_baseline_savings,
    compute_token_cost,
)


def test_cost_calculation_exact() -> None:
    """Assert mathematical precision with fractional cents using Decimal (NUMERIC(12, 6))."""
    # Example: gpt-4o-mini rates
    # Input: $0.15 per million tokens
    # Output: $0.60 per million tokens
    input_tokens = 1500
    output_tokens = 800
    input_rate = Decimal("0.15")
    output_rate = Decimal("0.60")

    in_cost, out_cost, total_cost, cost_type = compute_token_cost(
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        input_price_per_million=input_rate,
        output_price_per_million=output_rate,
    )

    # 1500 * 0.15 / 1,000,000 = 0.000225
    expected_in = Decimal("0.000225")
    # 800 * 0.60 / 1,000,000 = 0.000480
    expected_out = Decimal("0.000480")
    expected_total = Decimal("0.000705")

    assert in_cost == expected_in
    assert out_cost == expected_out
    assert total_cost == expected_total
    assert cost_type == "ESTIMATED"


def test_unknown_pricing_not_zero() -> None:
    """Assert missing pricing or missing token usage NEVER defaults to $0.00 (ADR-005)."""
    # 1. Missing input pricing
    in_c, out_c, total_c, cost_type = compute_token_cost(
        input_tokens=1000,
        output_tokens=500,
        input_price_per_million=None,
        output_price_per_million=Decimal("1.50"),
    )
    assert in_c is None
    assert out_c is None
    assert total_c is None
    assert cost_type == "UNKNOWN"

    # 2. Missing output pricing
    _, _, total_c2, cost_type2 = compute_token_cost(
        input_tokens=1000,
        output_tokens=500,
        input_price_per_million=Decimal("0.50"),
        output_price_per_million=None,
    )
    assert total_c2 is None
    assert cost_type2 == "UNKNOWN"

    # 3. Missing tokens
    _, _, total_c3, cost_type3 = compute_token_cost(
        input_tokens=None,
        output_tokens=500,
        input_price_per_million=Decimal("0.50"),
        output_price_per_million=Decimal("1.50"),
    )
    assert total_c3 is None
    assert cost_type3 == "UNKNOWN"


def test_baseline_savings_calculation() -> None:
    """Assert counterfactual savings percentage computation against baseline model."""
    # Actual cost for gpt-4o-mini: $0.000705
    actual_cost = Decimal("0.000705")
    # Counterfactual cost for baseline (gpt-4o): $0.019500
    baseline_cost = Decimal("0.019500")

    # (0.019500 - 0.000705) / 0.019500 * 100 = 0.018795 / 0.019500 * 100 = 96.3846...%
    savings = compute_baseline_savings(actual_cost, baseline_cost)
    assert savings == Decimal("96.38")


def test_baseline_savings_aborts_on_uncomputable_state() -> None:
    """Assert savings calculation is aborted (None) when baseline or actual is unknown or zero."""
    # 1. Unknown actual cost
    assert compute_baseline_savings(None, Decimal("0.015000")) is None

    # 2. Unknown baseline cost
    assert compute_baseline_savings(Decimal("0.005000"), None) is None

    # 3. Zero baseline cost (avoid division by zero)
    assert compute_baseline_savings(Decimal("0.005000"), Decimal("0.000000")) is None

    # 4. Negative baseline cost
    assert compute_baseline_savings(Decimal("0.005000"), Decimal("-0.010000")) is None


def test_negative_savings_when_routed_model_is_more_expensive() -> None:
    """Assert negative savings is correctly computed when routed model exceeds baseline cost."""
    # Actual cost: $0.030000
    # Baseline cost: $0.020000
    # Savings: (0.020000 - 0.030000) / 0.020000 * 100 = -50.00%
    actual_cost = Decimal("0.030000")
    baseline_cost = Decimal("0.020000")

    savings = compute_baseline_savings(actual_cost, baseline_cost)
    assert savings == Decimal("-50.00")

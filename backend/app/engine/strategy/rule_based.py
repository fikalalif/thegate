"""Deterministic rule-based routing strategy supporting Economy, Balanced, and Quality modes."""

import time
from decimal import Decimal
from typing import Any

from app.core.exceptions import TheGateError
from app.engine.analyzer import RequestAnalysis
from app.engine.strategy.base import BaseRoutingStrategy, RoutingResult
from app.schemas.provider import ModelCandidate, UnifiedChatRequest


class NoEligibleModelError(TheGateError):
    """Raised when no candidate models satisfy technical or context constraints."""

    def __init__(
        self,
        message: str = "No eligible models available matching request constraints",
    ) -> None:
        super().__init__(
            message=message,
            status_code=503,
            error_type="routing_error",
            code="no_eligible_model",
        )


class RuleBasedStrategy(BaseRoutingStrategy):
    """Deterministic, low-latency (< 5ms) rule-based heuristic routing strategy."""

    strategy_name: str = "rule_based"
    strategy_version: str = "1.0.0"

    async def select_model(
        self,
        request: UnifiedChatRequest,
        analysis: RequestAnalysis,
        eligible_candidates: list[ModelCandidate],
        policy_mode: str,
        pricing_map: dict[str, tuple[Decimal, Decimal]] | None = None,
        policy_config: dict[str, Any] | None = None,
    ) -> RoutingResult:
        """Evaluate eligible candidates against the requested policy mode."""
        start_time = time.perf_counter()

        if not eligible_candidates:
            raise NoEligibleModelError(
                "All candidate models were excluded by technical or context constraints"
            )

        candidates_considered = [c.internal_name for c in eligible_candidates]
        mode = policy_mode.strip().lower()

        if mode == "economy":
            selected, reason = self._select_economy(eligible_candidates, pricing_map)
        elif mode == "quality":
            selected, reason = self._select_quality(eligible_candidates)
        else:
            # Default to 'balanced'
            selected, reason = self._select_balanced(
                eligible_candidates, analysis, pricing_map
            )

        latency_ms = max(0, int((time.perf_counter() - start_time) * 1000))

        return RoutingResult(
            selected_model=selected,
            strategy_name=self.strategy_name,
            strategy_version=self.strategy_version,
            decision_reason=reason,
            candidates_considered=candidates_considered,
            decision_latency_ms=latency_ms,
        )

    def _select_economy(
        self,
        candidates: list[ModelCandidate],
        pricing_map: dict[str, tuple[Decimal, Decimal]] | None,
    ) -> tuple[ModelCandidate, str]:
        """Select model with the lowest token pricing rates."""
        if pricing_map:
            # Sort by sum of (input_price + output_price) per million tokens
            def cost_key(c: ModelCandidate) -> Decimal:
                if c.internal_name in pricing_map:
                    inp, out = pricing_map[c.internal_name]
                    return inp + out
                return Decimal("999999.00")

            sorted_candidates = sorted(candidates, key=cost_key)
            best = sorted_candidates[0]
            if best.internal_name in pricing_map:
                inp, out = pricing_map[best.internal_name]
                return (
                    best,
                    f"Selected {best.internal_name} as lowest-cost eligible model "
                    f"(${inp + out}/M tokens) under Economy policy",
                )

        # Fallback to capability tier (lowest tier first) if pricing not loaded
        sorted_by_tier = sorted(
            candidates, key=lambda c: c.capabilities.get("tier", 1)
        )
        best = sorted_by_tier[0]
        return best, f"Selected {best.internal_name} under Economy policy"

    def _select_quality(
        self,
        candidates: list[ModelCandidate],
    ) -> tuple[ModelCandidate, str]:
        """Select candidate with highest quality tier."""
        # Sort by tier descending, then by context limit descending
        def quality_key(c: ModelCandidate) -> tuple[int, int]:
            tier = int(c.capabilities.get("tier", 1))
            ctx = c.context_limit or 0
            return (tier, ctx)

        sorted_candidates = sorted(candidates, key=quality_key, reverse=True)
        best = sorted_candidates[0]
        tier = best.capabilities.get("tier", 1)
        return (
            best,
            f"Selected {best.internal_name} as highest quality tier ({tier}) under Quality policy",
        )

    def _select_balanced(
        self,
        candidates: list[ModelCandidate],
        analysis: RequestAnalysis,
        pricing_map: dict[str, tuple[Decimal, Decimal]] | None,
    ) -> tuple[ModelCandidate, str]:
        """Select optimal trade-off based on request complexity and pricing."""
        # Simple requests (< 1000 tokens, no tools, no json) -> economy tier
        is_simple = (
            analysis.estimated_tokens < 1000
            and not analysis.requires_tools
            and not analysis.requires_json_mode
        )

        if is_simple:
            best, _ = self._select_economy(candidates, pricing_map)
            return (
                best,
                f"Selected {best.internal_name} for simple query ({analysis.estimated_tokens} "
                f"tokens) under Balanced policy",
            )

        # Complex requests (tools, json, or long context) -> tier >= 2
        high_tier_candidates = [
            c for c in candidates if int(c.capabilities.get("tier", 1)) >= 2
        ]
        pool = high_tier_candidates if high_tier_candidates else candidates

        # From the qualified pool, pick the most cost-effective candidate
        best, _ = self._select_economy(pool, pricing_map)
        return (
            best,
            f"Selected {best.internal_name} balancing capability and cost for "
            f"complex request ({analysis.estimated_tokens} tokens) under Balanced policy",
        )

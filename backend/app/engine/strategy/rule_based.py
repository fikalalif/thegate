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


def _is_preferred_model(name: str) -> bool:
    """Check if model name belongs to a verified upstream provider rather than internal dummy/combo."""
    lower = name.lower()
    if lower.startswith(("combo-", "combo/", "dummy-", "test-")):
        return False
    return "/" in name or any(
        kw in lower
        for kw in ["gpt", "claude", "llama", "gemini", "deepseek", "qwen", "mistral", "command", "ag/"]
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
            selected, reason, fallbacks = self._select_economy(eligible_candidates, pricing_map)
        elif mode == "quality":
            selected, reason, fallbacks = self._select_quality(eligible_candidates)
        else:
            # Default to 'balanced'
            selected, reason, fallbacks = self._select_balanced(
                eligible_candidates, analysis, pricing_map
            )

        latency_ms = max(0, int((time.perf_counter() - start_time) * 1000))

        return RoutingResult(
            selected_model=selected,
            strategy_name=self.strategy_name,
            strategy_version=self.strategy_version,
            decision_reason=reason,
            candidates_considered=candidates_considered,
            fallback_candidates=fallbacks,
            decision_latency_ms=latency_ms,
        )

    def _select_economy(
        self,
        candidates: list[ModelCandidate],
        pricing_map: dict[str, tuple[Decimal, Decimal]] | None,
    ) -> tuple[ModelCandidate, str, list[ModelCandidate]]:
        """Select model with the lowest token pricing rates and populate fallback candidates."""
        if pricing_map:
            def cost_key(c: ModelCandidate) -> tuple[int, Decimal]:
                pref_score = 0 if _is_preferred_model(c.internal_name) else 1
                if c.internal_name in pricing_map:
                    inp, out = pricing_map[c.internal_name]
                    return (pref_score, inp + out)
                return (pref_score, Decimal("999999.00"))

            sorted_candidates = sorted(candidates, key=cost_key)
            best = sorted_candidates[0]
            fallbacks = sorted_candidates[1:4]
            if best.internal_name in pricing_map:
                inp, out = pricing_map[best.internal_name]
                return (
                    best,
                    f"Selected {best.internal_name} as lowest-cost eligible model "
                    f"(${inp + out}/M tokens) under Economy policy",
                    fallbacks,
                )

        def tier_key(c: ModelCandidate) -> tuple[int, int]:
            pref_score = 0 if _is_preferred_model(c.internal_name) else 1
            tier = int(c.capabilities.get("tier", 1))
            return (pref_score, tier)

        sorted_by_tier = sorted(candidates, key=tier_key)
        best = sorted_by_tier[0]
        fallbacks = sorted_by_tier[1:4]
        return best, f"Selected {best.internal_name} under Economy policy", fallbacks

    def _select_quality(
        self,
        candidates: list[ModelCandidate],
    ) -> tuple[ModelCandidate, str, list[ModelCandidate]]:
        """Select candidate with highest quality tier and populate fallback candidates."""
        def quality_key(c: ModelCandidate) -> tuple[int, int, int]:
            pref_score = 1 if _is_preferred_model(c.internal_name) else 0
            tier = int(c.capabilities.get("tier", 1))
            ctx = c.context_limit or 0
            return (pref_score, tier, ctx)

        sorted_candidates = sorted(candidates, key=quality_key, reverse=True)
        best = sorted_candidates[0]
        fallbacks = sorted_candidates[1:4]
        tier = best.capabilities.get("tier", 1)
        return (
            best,
            f"Selected {best.internal_name} as highest quality tier ({tier}) under Quality policy",
            fallbacks,
        )

    def _select_balanced(
        self,
        candidates: list[ModelCandidate],
        analysis: RequestAnalysis,
        pricing_map: dict[str, tuple[Decimal, Decimal]] | None,
    ) -> tuple[ModelCandidate, str, list[ModelCandidate]]:
        """Select optimal trade-off based on request complexity and pricing."""
        is_simple = (
            analysis.estimated_tokens < 1000
            and not analysis.requires_tools
            and not analysis.requires_json_mode
        )

        if is_simple:
            best, _, fallbacks = self._select_economy(candidates, pricing_map)
            return (
                best,
                f"Selected {best.internal_name} for simple query ({analysis.estimated_tokens} "
                f"tokens) under Balanced policy",
                fallbacks,
            )

        high_tier_candidates = [
            c for c in candidates if int(c.capabilities.get("tier", 1)) >= 2
        ]
        pool = high_tier_candidates if high_tier_candidates else candidates

        best, _, fallbacks = self._select_economy(pool, pricing_map)
        return (
            best,
            f"Selected {best.internal_name} balancing capability and cost for "
            f"complex request ({analysis.estimated_tokens} tokens) under Balanced policy",
            fallbacks,
        )

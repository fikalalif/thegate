"""Abstract base strategy for routing decisions."""

from abc import ABC, abstractmethod
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field

from app.engine.analyzer import RequestAnalysis
from app.schemas.provider import ModelCandidate, UnifiedChatRequest


class RoutingResult(BaseModel):
    """Container holding selected model and routing rationale."""

    selected_model: ModelCandidate
    strategy_name: str
    strategy_version: str
    decision_reason: str
    candidates_considered: list[str] = Field(default_factory=list)
    decision_latency_ms: int = Field(default=0, ge=0)


class BaseRoutingStrategy(ABC):
    """Abstract interface for all model routing strategies."""

    strategy_name: str = "base"
    strategy_version: str = "1.0.0"

    @abstractmethod
    async def select_model(
        self,
        request: UnifiedChatRequest,
        analysis: RequestAnalysis,
        eligible_candidates: list[ModelCandidate],
        policy_mode: str,
        pricing_map: dict[str, tuple[Decimal, Decimal]] | None = None,
        policy_config: dict[str, Any] | None = None,
    ) -> RoutingResult:
        """Select optimal model from eligible candidates based on policy mode."""
        ...

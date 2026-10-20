"""Policy evaluation and hard constraint model eligibility filtering."""

from pydantic import BaseModel

from app.engine.analyzer import RequestAnalysis
from app.schemas.provider import ModelCandidate


class EligibilityResult(BaseModel):
    """Detailed evaluation result for an individual model candidate."""

    candidate: ModelCandidate
    eligible: bool
    rejection_reason: str | None = None


class PolicyEvaluator:
    """Evaluates candidate models against hard technical and context constraints."""

    @staticmethod
    def evaluate_candidate(
        candidate: ModelCandidate,
        analysis: RequestAnalysis,
        requested_max_tokens: int | None = None,
    ) -> EligibilityResult:
        """Verify whether a single model candidate satisfies all technical constraints."""
        if not candidate.enabled:
            return EligibilityResult(
                candidate=candidate,
                eligible=False,
                rejection_reason="Model is disabled in registry",
            )

        # Context Window Constraint
        total_tokens_needed = analysis.estimated_tokens + (requested_max_tokens or 0)
        if candidate.context_limit is not None and candidate.context_limit < total_tokens_needed:
            return EligibilityResult(
                candidate=candidate,
                eligible=False,
                rejection_reason=(
                    f"Context limit exceeded: model supports {candidate.context_limit} tokens, "
                    f"request requires estimated {total_tokens_needed} tokens"
                ),
            )

        # Tool / Function Calling Constraint
        if analysis.requires_tools:
            has_tools = bool(
                candidate.capabilities.get("tools")
                or candidate.capabilities.get("function_calling")
            )
            if not has_tools:
                return EligibilityResult(
                    candidate=candidate,
                    eligible=False,
                    rejection_reason=(
                        "Request specifies tools but model lacks tool-calling capability"
                    ),
                )

        # JSON Object / Schema Constraint
        if analysis.requires_json_mode:
            has_json = bool(
                candidate.capabilities.get("json_mode")
                or candidate.capabilities.get("json_object")
                or candidate.capabilities.get("tools")
            )
            if not has_json:
                return EligibilityResult(
                    candidate=candidate,
                    eligible=False,
                    rejection_reason=(
                        "Request requires structured JSON but model lacks json capability"
                    ),
                )

        # Vision Constraint
        if analysis.requires_vision:
            has_vision = bool(candidate.capabilities.get("vision"))
            if not has_vision:
                return EligibilityResult(
                    candidate=candidate,
                    eligible=False,
                    rejection_reason=(
                        "Request contains image inputs but model lacks vision capability"
                    ),
                )

        return EligibilityResult(candidate=candidate, eligible=True, rejection_reason=None)

    @classmethod
    def filter_eligible(
        cls,
        candidates: list[ModelCandidate],
        analysis: RequestAnalysis,
        requested_max_tokens: int | None = None,
    ) -> tuple[list[ModelCandidate], list[EligibilityResult]]:
        """Filter candidate models into eligible pool and record evaluation reasons."""
        eligible_candidates: list[ModelCandidate] = []
        evaluations: list[EligibilityResult] = []

        for candidate in candidates:
            res = cls.evaluate_candidate(candidate, analysis, requested_max_tokens)
            evaluations.append(res)
            if res.eligible:
                eligible_candidates.append(candidate)

        return eligible_candidates, evaluations

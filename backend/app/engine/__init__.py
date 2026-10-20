"""TheGate Routing Engine package."""

from app.engine.accounting import (
    CostBreakdown,
    calculate_request_accounting,
    compute_baseline_savings,
    compute_token_cost,
)
from app.engine.analyzer import RequestAnalysis, analyze_request
from app.engine.persistence import AuditLogPayload, record_request_audit
from app.engine.policy import EligibilityResult, PolicyEvaluator
from app.engine.strategy import (
    BaseRoutingStrategy,
    NoEligibleModelError,
    RoutingResult,
    RuleBasedStrategy,
)

__all__ = [
    "AuditLogPayload",
    "BaseRoutingStrategy",
    "CostBreakdown",
    "EligibilityResult",
    "NoEligibleModelError",
    "PolicyEvaluator",
    "RequestAnalysis",
    "RoutingResult",
    "RuleBasedStrategy",
    "analyze_request",
    "calculate_request_accounting",
    "compute_baseline_savings",
    "compute_token_cost",
    "record_request_audit",
]


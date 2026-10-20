"""Unit tests for Request Analyzer, Policy Evaluator, and RuleBasedStrategy (Milestone 8)."""

import time
import uuid
from decimal import Decimal

import pytest
from app.engine.analyzer import analyze_request
from app.engine.policy import PolicyEvaluator
from app.engine.strategy.rule_based import NoEligibleModelError, RuleBasedStrategy
from app.schemas.provider import (
    ChatMessage,
    ModelCandidate,
    UnifiedChatRequest,
)

SAMPLE_CANDIDATES = [
    ModelCandidate(
        id=uuid.uuid4(),
        internal_name="gpt-4o-mini",
        backend_model_id="openai/gpt-4o-mini",
        capabilities={"tier": 1, "tools": True, "json_mode": True, "vision": True},
        context_limit=128000,
        enabled=True,
    ),
    ModelCandidate(
        id=uuid.uuid4(),
        internal_name="claude-3-5-sonnet",
        backend_model_id="anthropic/claude-3-5-sonnet",
        capabilities={"tier": 2, "tools": True, "json_mode": True, "vision": True},
        context_limit=200000,
        enabled=True,
    ),
    ModelCandidate(
        id=uuid.uuid4(),
        internal_name="gpt-4o",
        backend_model_id="openai/gpt-4o",
        capabilities={"tier": 3, "tools": True, "json_mode": True, "vision": True},
        context_limit=128000,
        enabled=True,
    ),
    ModelCandidate(
        id=uuid.uuid4(),
        internal_name="simple-legacy-model",
        backend_model_id="legacy/simple",
        capabilities={"tier": 1, "tools": False, "json_mode": False, "vision": False},
        context_limit=2048,
        enabled=True,
    ),
    ModelCandidate(
        id=uuid.uuid4(),
        internal_name="disabled-model",
        backend_model_id="disabled/model",
        capabilities={"tier": 3, "tools": True},
        context_limit=128000,
        enabled=False,
    ),
]

PRICING_MAP = {
    "gpt-4o-mini": (Decimal("0.15"), Decimal("0.60")),      # sum = 0.75
    "claude-3-5-sonnet": (Decimal("3.00"), Decimal("15.00")), # sum = 18.00
    "gpt-4o": (Decimal("5.00"), Decimal("15.00")),           # sum = 20.00
    "simple-legacy-model": (Decimal("0.05"), Decimal("0.10")), # sum = 0.15
}


def test_analyzer_detects_tools_and_context() -> None:
    """Assert analyze_request extracts character/token counts and technical constraints."""
    req_with_tools = UnifiedChatRequest(
        model="auto",
        messages=[
            ChatMessage(role="system", content="System instruction."),
            ChatMessage(role="user", content="Call calculator tool."),
        ],
        tools=[{"type": "function", "function": {"name": "calculator"}}],
        response_format={"type": "json_object"},
    )

    analysis = analyze_request(req_with_tools)
    assert analysis.requires_tools is True
    assert analysis.requires_json_mode is True
    assert analysis.requires_vision is False
    assert analysis.message_count == 2
    assert analysis.estimated_tokens > 5


def test_analyzer_detects_vision() -> None:
    """Assert analyzer detects image blocks in multimodal user content."""
    req_vision = UnifiedChatRequest(
        model="auto",
        messages=[
            ChatMessage(
                role="user",
                content=[
                    {"type": "text", "text": "What is in this picture?"},
                    {"type": "image_url", "image_url": {"url": "https://example.com/cat.jpg"}},
                ],
            )
        ],
    )

    analysis = analyze_request(req_vision)
    assert analysis.requires_vision is True


def test_eligibility_filter_excludes_ineligible() -> None:
    """Assert PolicyEvaluator rejects models lacking required capabilities or context."""
    req = UnifiedChatRequest(
        model="auto",
        messages=[ChatMessage(role="user", content="Test tool call")],
        tools=[{"type": "function", "function": {"name": "search"}}],
    )
    analysis = analyze_request(req)

    eligible, evaluations = PolicyEvaluator.filter_eligible(SAMPLE_CANDIDATES, analysis)

    names = [c.internal_name for c in eligible]
    assert "gpt-4o-mini" in names
    assert "gpt-4o" in names
    assert "claude-3-5-sonnet" in names
    # simple-legacy-model lacks tools
    assert "simple-legacy-model" not in names
    # disabled-model is not enabled
    assert "disabled-model" not in names


def test_eligibility_filter_context_limit() -> None:
    """Assert candidate with context limit smaller than prompt is rejected."""
    long_content = "word " * 1000  # ~1250 tokens
    req = UnifiedChatRequest(
        model="auto",
        messages=[ChatMessage(role="user", content=long_content)],
        max_tokens=1500,  # 1250 + 1500 = 2750 > 2048
    )
    analysis = analyze_request(req)

    eligible, _ = PolicyEvaluator.filter_eligible(
        SAMPLE_CANDIDATES, analysis, requested_max_tokens=1500
    )
    names = [c.internal_name for c in eligible]
    assert "simple-legacy-model" not in names


@pytest.mark.asyncio
async def test_economy_mode_picks_cheapest() -> None:
    """Assert RuleBasedStrategy in Economy mode picks the lowest token rate candidate."""
    strategy = RuleBasedStrategy()
    req = UnifiedChatRequest(
        model="thegate-economy",
        messages=[ChatMessage(role="user", content="Short prompt")],
    )
    analysis = analyze_request(req)
    eligible, _ = PolicyEvaluator.filter_eligible(SAMPLE_CANDIDATES[:3], analysis)

    result = await strategy.select_model(
        request=req,
        analysis=analysis,
        eligible_candidates=eligible,
        policy_mode="economy",
        pricing_map=PRICING_MAP,
    )

    assert result.selected_model.internal_name == "gpt-4o-mini"
    assert "lowest-cost" in result.decision_reason.lower()


@pytest.mark.asyncio
async def test_quality_mode_picks_top_tier() -> None:
    """Assert RuleBasedStrategy in Quality mode picks the highest tier model."""
    strategy = RuleBasedStrategy()
    req = UnifiedChatRequest(
        model="thegate-quality",
        messages=[ChatMessage(role="user", content="Draft a contract")],
    )
    analysis = analyze_request(req)
    eligible, _ = PolicyEvaluator.filter_eligible(SAMPLE_CANDIDATES[:3], analysis)

    result = await strategy.select_model(
        request=req,
        analysis=analysis,
        eligible_candidates=eligible,
        policy_mode="quality",
        pricing_map=PRICING_MAP,
    )

    assert result.selected_model.internal_name == "gpt-4o"
    assert "highest quality tier" in result.decision_reason.lower()


@pytest.mark.asyncio
async def test_balanced_mode_adapts_to_complexity() -> None:
    """Assert Balanced mode routes simple queries to economy and complex to higher tiers."""
    strategy = RuleBasedStrategy()

    # Simple prompt (< 1000 tokens, no tools)
    simple_req = UnifiedChatRequest(
        model="thegate-balanced",
        messages=[ChatMessage(role="user", content="Hello!")],
    )
    simple_analysis = analyze_request(simple_req)
    eligible, _ = PolicyEvaluator.filter_eligible(SAMPLE_CANDIDATES[:3], simple_analysis)

    simple_res = await strategy.select_model(
        request=simple_req,
        analysis=simple_analysis,
        eligible_candidates=eligible,
        policy_mode="balanced",
        pricing_map=PRICING_MAP,
    )
    assert simple_res.selected_model.internal_name == "gpt-4o-mini"

    # Complex prompt with tools
    complex_req = UnifiedChatRequest(
        model="thegate-balanced",
        messages=[ChatMessage(role="user", content="Calculate financial statements")],
        tools=[{"type": "function", "function": {"name": "fin_calc"}}],
    )
    complex_analysis = analyze_request(complex_req)
    complex_eligible, _ = PolicyEvaluator.filter_eligible(SAMPLE_CANDIDATES[:3], complex_analysis)

    complex_res = await strategy.select_model(
        request=complex_req,
        analysis=complex_analysis,
        eligible_candidates=complex_eligible,
        policy_mode="balanced",
        pricing_map=PRICING_MAP,
    )
    # Picks tier >= 2
    assert complex_res.selected_model.internal_name in ("claude-3-5-sonnet", "gpt-4o")


@pytest.mark.asyncio
async def test_no_eligible_models_raises_error() -> None:
    """Assert empty eligible candidates pool raises NoEligibleModelError."""
    strategy = RuleBasedStrategy()
    req = UnifiedChatRequest(model="auto", messages=[ChatMessage(role="user", content="Hi")])
    analysis = analyze_request(req)

    with pytest.raises(NoEligibleModelError):
        await strategy.select_model(
            request=req,
            analysis=analysis,
            eligible_candidates=[],
            policy_mode="economy",
        )


@pytest.mark.asyncio
async def test_routing_decision_latency() -> None:
    """Assert routing selection executes in < 5ms CPU time."""
    strategy = RuleBasedStrategy()
    req = UnifiedChatRequest(model="auto", messages=[ChatMessage(role="user", content="Benchmark")])
    analysis = analyze_request(req)
    eligible, _ = PolicyEvaluator.filter_eligible(SAMPLE_CANDIDATES[:3], analysis)

    start = time.perf_counter()
    result = await strategy.select_model(
        request=req,
        analysis=analysis,
        eligible_candidates=eligible,
        policy_mode="economy",
        pricing_map=PRICING_MAP,
    )
    duration_ms = (time.perf_counter() - start) * 1000

    assert duration_ms < 5.0
    assert result.decision_latency_ms <= 5

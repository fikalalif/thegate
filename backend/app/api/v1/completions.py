"""OpenAI-compatible chat completions endpoint with policy routing integration."""

import json
import time
import uuid
from collections.abc import AsyncIterator
from decimal import Decimal

from fastapi import APIRouter, BackgroundTasks, Depends, Request, Response, status
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.adapters.base import BaseProviderAdapter
from app.api.deps import get_current_api_key, get_db_session, get_provider_adapter
from app.core.exceptions import TheGateError
from app.db.models.api_keys import ApiKey
from app.db.models.models_registry import ModelRegistry
from app.db.models.routing_policies import RoutingPolicy
from app.engine.analyzer import analyze_request
from app.engine.persistence import AuditLogPayload, record_request_audit
from app.engine.policy import PolicyEvaluator
from app.engine.strategy.base import RoutingResult
from app.engine.strategy.rule_based import RuleBasedStrategy
from app.schemas.openai import (
    ChatCompletionChoice,
    ChatCompletionChunk,
    ChatCompletionChunkChoice,
    ChatCompletionChunkDelta,
    ChatCompletionRequest,
    ChatCompletionResponse,
    ChatCompletionResponseMessage,
    CompletionUsage,
)
from app.schemas.provider import (
    ChatMessage,
    ModelCandidate,
    UnifiedChatRequest,
    UnifiedChatResponse,
)

router = APIRouter(prefix="/chat")


def to_unified_request(request: ChatCompletionRequest) -> UnifiedChatRequest:
    """Translate OpenAI ChatCompletionRequest into internal UnifiedChatRequest."""
    messages = [
        ChatMessage(
            role=m.role,
            content=m.content,
            name=m.name,
            tool_calls=m.tool_calls,
            tool_call_id=m.tool_call_id,
        )
        for m in request.messages
    ]

    stop_val = [request.stop] if isinstance(request.stop, str) else request.stop

    return UnifiedChatRequest(
        model=request.model,
        messages=messages,
        temperature=request.temperature,
        top_p=request.top_p,
        max_tokens=request.max_tokens,
        stream=request.stream,
        tools=request.tools,
        tool_choice=request.tool_choice,
        response_format=request.response_format,
        presence_penalty=request.presence_penalty,
        frequency_penalty=request.frequency_penalty,
        stop=stop_val,
    )


def to_openai_response(
    unified: UnifiedChatResponse, created_timestamp: int
) -> ChatCompletionResponse:
    """Translate internal UnifiedChatResponse into OpenAI ChatCompletionResponse."""
    choices = [
        ChatCompletionChoice(
            index=c.index,
            message=ChatCompletionResponseMessage(
                role=c.message.role,
                content=c.message.content if isinstance(c.message.content, str) else None,
                tool_calls=c.message.tool_calls,
            ),
            finish_reason=c.finish_reason or "stop",
        )
        for c in unified.choices
    ]

    usage: CompletionUsage | None = None
    if unified.usage:
        usage = CompletionUsage(
            prompt_tokens=unified.usage.prompt_tokens,
            completion_tokens=unified.usage.completion_tokens,
            total_tokens=unified.usage.total_tokens,
        )

    return ChatCompletionResponse(
        id=unified.id,
        created=unified.created or created_timestamp,
        model=unified.model,
        choices=choices,
        usage=usage,
        system_fingerprint=unified.system_fingerprint,
    )


async def resolve_routed_model(
    requested_model: str,
    unified_req: UnifiedChatRequest,
    session: AsyncSession,
) -> tuple[str, RoutingResult | None, uuid.UUID | None, int | None]:
    """Resolve virtual or policy model routing, or honor explicit model selection."""
    model_lower = requested_model.strip().lower()
    virtual_map = {
        "thegate/auto": "balanced",
        "thegate-auto": "balanced",
        "auto": "balanced",
        "thegate/balanced": "balanced",
        "thegate-balanced": "balanced",
        "balanced": "balanced",
        "thegate/economy": "economy",
        "thegate-economy": "economy",
        "economy": "economy",
        "thegate/quality": "quality",
        "thegate-quality": "quality",
        "quality": "quality",
    }

    policy_mode: str | None = None
    matched_policy_id: uuid.UUID | None = None
    matched_policy_version: int | None = None
    is_virtual = model_lower in virtual_map

    if is_virtual:
        policy_mode = virtual_map[model_lower]
    else:
        # Check if requested model matches an active registered policy name
        stmt = select(RoutingPolicy).where(
            RoutingPolicy.name == requested_model,
            RoutingPolicy.is_active == True,  # noqa: E712
        )
        result = await session.execute(stmt)
        matched_policy = result.scalar_one_or_none()
        if matched_policy:
            policy_mode = matched_policy.mode
            matched_policy_id = matched_policy.id
            matched_policy_version = matched_policy.version
            is_virtual = True

    if not is_virtual or not policy_mode:
        # Client explicitly requested a specific model directly
        return requested_model, None, None, None

    # Load candidates from DB registry
    reg_stmt = (
        select(ModelRegistry)
        .options(selectinload(ModelRegistry.pricing_entries))
        .where(ModelRegistry.enabled == True)  # noqa: E712
    )
    reg_result = await session.execute(reg_stmt)
    db_models = reg_result.scalars().all()

    if not db_models:
        raise TheGateError(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            error_type="no_eligible_model",
            message="No active models registered in catalog. Please connect an upstream AI router gateway (e.g. 9Router) in Providers settings to sync real models.",
        )

    candidates = [
        ModelCandidate(
            id=m.id,
            internal_name=m.internal_name,
            backend_model_id=m.backend_model_id,
            capabilities=m.capabilities or {},
            context_limit=m.context_limit,
            enabled=m.enabled,
            provider_adapter=m.provider_adapter,
        )
        for m in db_models
    ]
    pricing_map: dict[str, tuple[Decimal, Decimal]] = {}
    for m in db_models:
        if m.pricing_entries:
            active_p = next(
                (p for p in m.pricing_entries if p.effective_until is None),
                m.pricing_entries[0],
            )
            if (
                active_p.input_price_per_million is not None
                and active_p.output_price_per_million is not None
            ):
                pricing_map[m.internal_name] = (
                    active_p.input_price_per_million,
                    active_p.output_price_per_million,
                )

    analysis = analyze_request(unified_req)
    eligible, _ = PolicyEvaluator.filter_eligible(candidates, analysis, unified_req.max_tokens)

    strategy = RuleBasedStrategy()
    routing_result = await strategy.select_model(
        request=unified_req,
        analysis=analysis,
        eligible_candidates=eligible,
        policy_mode=policy_mode,
        pricing_map=pricing_map,
    )

    return (
        routing_result.selected_model.internal_name,
        routing_result,
        matched_policy_id,
        matched_policy_version,
    )


@router.post(
    "/completions",
    response_model=ChatCompletionResponse,
    summary="Create chat completion",
    description=(
        "OpenAI-compatible chat completion endpoint supporting streaming and non-streaming."
    ),
)
async def create_chat_completion(
    request: ChatCompletionRequest,
    raw_request: Request,
    response: Response,
    background_tasks: BackgroundTasks,
    api_key: ApiKey = Depends(get_current_api_key),
    adapter: BaseProviderAdapter = Depends(get_provider_adapter),
    session: AsyncSession = Depends(get_db_session),
) -> Response:
    """Process chat completion request with API key auth, routing, and audit logging."""
    raw_id = raw_request.headers.get("x-request-id")
    if raw_id:
        request_id = raw_id
        try:
            request_id_uuid = uuid.UUID(raw_id)
        except ValueError:
            request_id_uuid = uuid.uuid5(uuid.NAMESPACE_DNS, raw_id)
    else:
        request_id_uuid = uuid.uuid4()
        request_id = str(request_id_uuid)

    t_start = time.perf_counter()
    created_timestamp = int(time.time())

    unified_req = to_unified_request(request)

    # Resolve policy routing or explicit model selection
    t_routing_start = time.perf_counter()
    try:
        (
            selected_model_name,
            routing_result,
            matched_policy_id,
            matched_policy_version,
        ) = await resolve_routed_model(request.model, unified_req, session)
        t_routing_end = time.perf_counter()
        routing_latency_ms = max(0, int((t_routing_end - t_routing_start) * 1000))

        unified_req.model = selected_model_name
        raw_request.state.routing_result = routing_result
    except TheGateError as exc:
        t_routing_end = time.perf_counter()
        routing_latency_ms = max(0, int((t_routing_end - t_routing_start) * 1000))
        total_duration_ms = max(0, int((time.perf_counter() - t_start) * 1000))

        failed_audit = AuditLogPayload(
            request_id=request_id_uuid,
            api_key_id=api_key.id if api_key else None,
            status="failed",
            model_name=request.model,
            stream_enabled=request.stream,
            routing_latency_ms=routing_latency_ms,
            total_duration_ms=total_duration_ms,
            error_category=exc.error_type,
            strategy_name="direct",
            decision_reason=exc.message,
            attempt_status="failed",
            attempt_error_category=exc.error_type,
        )
        background_tasks.add_task(record_request_audit, failed_audit, engine=session.bind)

        return JSONResponse(
            content={
                "error": {
                    "message": exc.message,
                    "type": exc.error_type,
                    "code": exc.code,
                },
                "detail": exc.message,
            },
            status_code=exc.status_code,
            headers={"X-Request-ID": request_id},
        )

    strategy_name = routing_result.strategy_name if routing_result else "direct"
    strategy_version = routing_result.strategy_version if routing_result else "1.0.0"
    decision_reason = (
        routing_result.decision_reason
        if routing_result
        else "Direct model selection requested by client"
    )
    candidate_summary = (
        {"candidates_considered": routing_result.candidates_considered}
        if routing_result
        else {"requested_model": request.model}
    )
    decision_latency_ms = routing_result.decision_latency_ms if routing_result else 0

    # 1. Non-Streaming Flow with Resilient Fallback Chain
    if not request.stream:
        candidate_model_ids = [selected_model_name]
        if routing_result and routing_result.fallback_candidates:
            for fb in routing_result.fallback_candidates:
                if fb.backend_model_id not in candidate_model_ids:
                    candidate_model_ids.append(fb.backend_model_id)

        for idx, model_to_try in enumerate(candidate_model_ids):
            current_model_name = model_to_try
            unified_req.model = model_to_try
            t_provider_start = time.perf_counter()

            try:
                unified_resp = await adapter.execute(unified_req)
                t_provider_end = time.perf_counter()
                provider_latency_ms = max(0, int((t_provider_end - t_provider_start) * 1000))
                total_duration_ms = max(0, int((time.perf_counter() - t_start) * 1000))

                input_tokens = unified_resp.usage.prompt_tokens if unified_resp.usage else None
                output_tokens = unified_resp.usage.completion_tokens if unified_resp.usage else None

                effective_reason = decision_reason
                if idx > 0:
                    effective_reason = (
                        f"{decision_reason} (Fallback attempt #{idx + 1} succeeded with "
                        f"{current_model_name} after prior candidate failed)"
                    )

                audit_payload = AuditLogPayload(
                    request_id=request_id_uuid,
                    api_key_id=api_key.id if api_key else None,
                    routing_policy_id=matched_policy_id,
                    routing_policy_version=matched_policy_version,
                    status="completed",
                    model_name=current_model_name,
                    stream_enabled=False,
                    input_tokens=input_tokens,
                    output_tokens=output_tokens,
                    routing_latency_ms=routing_latency_ms,
                    provider_latency_ms=provider_latency_ms,
                    total_duration_ms=total_duration_ms,
                    error_category=None,
                    strategy_name=strategy_name,
                    strategy_version=strategy_version,
                    decision_reason=effective_reason,
                    candidate_summary=candidate_summary,
                    decision_latency_ms=decision_latency_ms,
                    attempt_status="success",
                    attempt_error_category=None,
                    usage_metadata=unified_resp.usage.model_dump() if unified_resp.usage else None,
                )
                background_tasks.add_task(record_request_audit, audit_payload, engine=session.bind)

                openai_resp = to_openai_response(unified_resp, created_timestamp)

                return JSONResponse(
                    content=openai_resp.model_dump(exclude_none=True),
                    status_code=status.HTTP_200_OK,
                    headers={"X-Request-ID": request_id},
                )
            except TheGateError as exc:
                t_provider_end = time.perf_counter()
                provider_latency_ms = max(0, int((t_provider_end - t_provider_start) * 1000))
                total_duration_ms = max(0, int((time.perf_counter() - t_start) * 1000))

                has_more_candidates = (idx + 1) < len(candidate_model_ids)
                if has_more_candidates:
                    # Log failed attempt without counting as final billable tokens
                    failed_attempt_payload = AuditLogPayload(
                        request_id=request_id_uuid,
                        api_key_id=api_key.id if api_key else None,
                        routing_policy_id=matched_policy_id,
                        routing_policy_version=matched_policy_version,
                        status="failed",
                        model_name=current_model_name,
                        stream_enabled=False,
                        input_tokens=None,
                        output_tokens=None,
                        routing_latency_ms=routing_latency_ms,
                        provider_latency_ms=provider_latency_ms,
                        total_duration_ms=total_duration_ms,
                        error_category=exc.error_type,
                        strategy_name=strategy_name,
                        strategy_version=strategy_version,
                        decision_reason=f"Candidate {current_model_name} failed: {exc.message}. Failing over to next candidate.",
                        candidate_summary=candidate_summary,
                        decision_latency_ms=decision_latency_ms,
                        attempt_status="failed",
                        attempt_error_category=exc.error_type,
                    )
                    background_tasks.add_task(record_request_audit, failed_attempt_payload, engine=session.bind)
                    continue

                # All candidates exhausted or single direct request failed
                failed_payload = AuditLogPayload(
                    request_id=request_id_uuid,
                    api_key_id=api_key.id if api_key else None,
                    routing_policy_id=matched_policy_id,
                    routing_policy_version=matched_policy_version,
                    status="failed",
                    model_name=current_model_name,
                    stream_enabled=False,
                    input_tokens=None,
                    output_tokens=None,
                    routing_latency_ms=routing_latency_ms,
                    provider_latency_ms=provider_latency_ms,
                    total_duration_ms=total_duration_ms,
                    error_category=exc.error_type,
                    strategy_name=strategy_name,
                    strategy_version=strategy_version,
                    decision_reason=decision_reason,
                    candidate_summary=candidate_summary,
                    decision_latency_ms=decision_latency_ms,
                    attempt_status="failed",
                    attempt_error_category=exc.error_type,
                )
                background_tasks.add_task(record_request_audit, failed_payload, engine=session.bind)

                return JSONResponse(
                    content={
                        "error": {
                            "message": exc.message,
                            "type": exc.error_type,
                            "code": exc.code,
                        },
                        "detail": exc.message,
                    },
                    status_code=exc.status_code,
                    headers={"X-Request-ID": request_id},
                )

    # 2. Streaming Flow (SSE)
    engine = session.bind
    api_key_id = api_key.id if api_key else None

    async def sse_stream_generator() -> AsyncIterator[str]:
        t_stream_start = time.perf_counter()
        stream_status = "completed"
        stream_err_cat: str | None = None
        input_tokens: int | None = None
        output_tokens: int | None = None

        try:
            async for chunk in adapter.stream(unified_req):
                if await raw_request.is_disconnected():
                    stream_status = "cancelled"
                    break

                if chunk.usage:
                    input_tokens = chunk.usage.prompt_tokens
                    output_tokens = chunk.usage.completion_tokens

                chunk_choices = [
                    ChatCompletionChunkChoice(
                        index=c.index,
                        delta=ChatCompletionChunkDelta(
                            role=c.delta.role,
                            content=c.delta.content,
                            tool_calls=c.delta.tool_calls,
                        ),
                        finish_reason=c.finish_reason,
                    )
                    for c in chunk.choices
                ]

                usage: CompletionUsage | None = None
                if chunk.usage:
                    usage = CompletionUsage(
                        prompt_tokens=chunk.usage.prompt_tokens,
                        completion_tokens=chunk.usage.completion_tokens,
                        total_tokens=chunk.usage.total_tokens,
                    )

                openai_chunk = ChatCompletionChunk(
                    id=chunk.id,
                    created=chunk.created or created_timestamp,
                    model=chunk.model,
                    choices=chunk_choices,
                    usage=usage,
                )

                chunk_json = json.dumps(openai_chunk.model_dump(exclude_none=True))
                yield f"data: {chunk_json}\n\n"

            if stream_status != "cancelled":
                yield "data: [DONE]\n\n"

        except Exception as exc:
            stream_status = "failed"
            stream_err_cat = exc.error_type if isinstance(exc, TheGateError) else type(exc).__name__
            err_msg = exc.message if isinstance(exc, TheGateError) else str(exc)
            err_type = exc.error_type if isinstance(exc, TheGateError) else "upstream_error"
            err_code = exc.code if isinstance(exc, TheGateError) else "stream_error"
            err_payload = json.dumps(
                {
                    "error": {
                        "message": err_msg,
                        "type": err_type,
                        "code": err_code,
                    }
                }
            )
            yield f"data: {err_payload}\n\n"
            yield "data: [DONE]\n\n"
        finally:
            t_stream_end = time.perf_counter()
            provider_latency_ms = max(0, int((t_stream_end - t_stream_start) * 1000))
            total_duration_ms = max(0, int((time.perf_counter() - t_start) * 1000))
            attempt_status = (
                "success"
                if stream_status == "completed"
                else ("aborted" if stream_status == "cancelled" else "failed")
            )
            usage_dict = (
                {
                    "prompt_tokens": input_tokens,
                    "completion_tokens": output_tokens,
                    "total_tokens": (input_tokens or 0) + (output_tokens or 0),
                }
                if input_tokens is not None or output_tokens is not None
                else None
            )
            stream_audit = AuditLogPayload(
                request_id=request_id_uuid,
                api_key_id=api_key_id,
                routing_policy_id=matched_policy_id,
                routing_policy_version=matched_policy_version,
                status=stream_status,
                model_name=selected_model_name,
                stream_enabled=True,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                routing_latency_ms=routing_latency_ms,
                provider_latency_ms=provider_latency_ms,
                total_duration_ms=total_duration_ms,
                error_category=stream_err_cat,
                strategy_name=strategy_name,
                strategy_version=strategy_version,
                decision_reason=decision_reason,
                candidate_summary=candidate_summary,
                decision_latency_ms=decision_latency_ms,
                attempt_status=attempt_status,
                attempt_error_category=stream_err_cat,
                usage_metadata=usage_dict,
            )
            await record_request_audit(stream_audit, engine=engine)

    return StreamingResponse(
        sse_stream_generator(),
        media_type="text/event-stream",
        headers={
            "X-Request-ID": request_id,
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


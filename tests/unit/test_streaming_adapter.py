"""Unit tests for Server-Sent Events (SSE) streaming and ADR-006 boundaries (Milestone 6)."""

import json
from collections.abc import AsyncIterator

import httpx
import pytest
from app.adapters.ninerouter import NineRouterAdapter
from app.core.exceptions import (
    ProviderAuthenticationError,
    ProviderRateLimitError,
    ProviderUnavailableError,
)
from app.core.streaming import (
    MidStreamError,
    StreamingBoundaryTracker,
    format_sse_chunk,
    format_sse_done,
    format_sse_error,
    safe_stream_wrapper,
)
from app.schemas.provider import (
    ChatMessage,
    StreamChunk,
    StreamDelta,
    UnifiedChatRequest,
)


@pytest.mark.asyncio
async def test_stream_chunk_passthrough() -> None:
    """Assert NineRouterAdapter.stream parses SSE chunks sequentially with zero-buffering."""
    chunk_1 = json.dumps({
        "id": "c-1",
        "model": "openai/gpt-4o",
        "choices": [{"index": 0, "delta": {"role": "assistant", "content": ""}}],
    })
    chunk_2 = json.dumps({
        "id": "c-1",
        "model": "openai/gpt-4o",
        "choices": [{"index": 0, "delta": {"content": "Hello"}}],
    })
    chunk_3 = json.dumps({
        "id": "c-1",
        "model": "openai/gpt-4o",
        "choices": [{"index": 0, "delta": {"content": " world"}}],
    })
    chunk_4 = json.dumps({
        "id": "c-1",
        "model": "openai/gpt-4o",
        "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}],
        "usage": {"prompt_tokens": 10, "completion_tokens": 2, "total_tokens": 12},
    })

    sse_events = [
        f"data: {chunk_1}\n\n",
        f"data: {chunk_2}\n\n",
        f"data: {chunk_3}\n\n",
        f"data: {chunk_4}\n\n",
        "data: [DONE]\n\n",
    ]

    def mock_stream_handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            headers={"Content-Type": "text/event-stream"},
            content="".join(sse_events).encode("utf-8"),
        )

    transport = httpx.MockTransport(mock_stream_handler)
    async with httpx.AsyncClient(transport=transport) as client:
        adapter = NineRouterAdapter(base_url="http://mock-9router/v1", client=client)
        req = UnifiedChatRequest(
            model="gpt-4o",
            messages=[ChatMessage(role="user", content="Stream me")],
            stream=True,
        )

        chunks: list[StreamChunk] = []
        async for chunk in adapter.stream(req):
            chunks.append(chunk)

        assert len(chunks) == 4
        assert chunks[0].choices[0].delta.role == "assistant"
        assert chunks[1].choices[0].delta.content == "Hello"
        assert chunks[2].choices[0].delta.content == " world"
        assert chunks[3].choices[0].finish_reason == "stop"
        assert chunks[3].usage is not None
        assert chunks[3].usage.total_tokens == 12


@pytest.mark.asyncio
async def test_stream_client_disconnect() -> None:
    """Assert safe_stream_wrapper halts and cleans up when client is disconnected."""
    tracker = StreamingBoundaryTracker()

    async def infinite_chunk_generator() -> AsyncIterator[StreamChunk]:
        i = 0
        while True:
            yield StreamChunk(
                id=f"c-{i}",
                model="gpt-4o",
                delta=StreamDelta(content=f"word-{i}"),
                finish_reason=None,
            )
            i += 1

    disconnected = False

    async def is_disconnected_check() -> bool:
        return disconnected

    stream = safe_stream_wrapper(
        infinite_chunk_generator(),
        tracker=tracker,
        is_disconnected=is_disconnected_check,
    )

    received_chunks: list[StreamChunk] = []
    async for chunk in stream:
        received_chunks.append(chunk)
        if len(received_chunks) == 3:
            disconnected = True  # Simulate client disconnect

    assert len(received_chunks) == 3
    assert tracker.chunks_emitted == 3
    assert tracker.has_started is True
    assert tracker.can_fallback() is False


@pytest.mark.asyncio
async def test_stream_midstream_error_aborts_without_fallback() -> None:
    """Assert errors occurring after chunks have started raise MidStreamError (ADR-006)."""
    tracker = StreamingBoundaryTracker()

    async def failing_stream_generator() -> AsyncIterator[StreamChunk]:
        yield StreamChunk(
            id="c-1", model="gpt-4o", delta=StreamDelta(content="Start"), finish_reason=None
        )
        yield StreamChunk(
            id="c-2", model="gpt-4o", delta=StreamDelta(content="More"), finish_reason=None
        )
        raise httpx.ReadTimeout("Connection dropped by upstream mid-stream")

    stream = safe_stream_wrapper(failing_stream_generator(), tracker=tracker)

    received: list[StreamChunk] = []
    with pytest.raises(MidStreamError) as exc_info:
        async for chunk in stream:
            received.append(chunk)

    assert len(received) == 2
    assert tracker.chunks_emitted == 2
    assert tracker.can_fallback() is False
    assert "fallback is prohibited" in str(exc_info.value).lower()


@pytest.mark.asyncio
async def test_stream_prestream_error_allows_fallback() -> None:
    """Assert error before first chunk allows fallback (ADR-006)."""
    tracker = StreamingBoundaryTracker()

    async def instant_fail_generator() -> AsyncIterator[StreamChunk]:
        raise httpx.ConnectError("Could not connect to provider")
        yield  # type: ignore[unreachable]

    stream = safe_stream_wrapper(instant_fail_generator(), tracker=tracker)

    with pytest.raises(httpx.ConnectError):
        async for _ in stream:
            pass

    assert tracker.chunks_emitted == 0
    assert tracker.has_started is False
    assert tracker.can_fallback() is True


@pytest.mark.asyncio
async def test_stream_non_200_error_mappings() -> None:
    """Assert upstream HTTP error during stream setup maps to domain exceptions."""
    def mock_401(_req: httpx.Request) -> httpx.Response:
        return httpx.Response(401, text="Invalid upstream key")

    def mock_429(_req: httpx.Request) -> httpx.Response:
        return httpx.Response(429, text="Rate limit exceeded")

    def mock_500(_req: httpx.Request) -> httpx.Response:
        return httpx.Response(500, text="Internal gateway error")

    req = UnifiedChatRequest(model="gpt-4o", messages=[ChatMessage(role="user", content="Hi")])

    # Test 401
    async with httpx.AsyncClient(transport=httpx.MockTransport(mock_401)) as client:
        adapter = NineRouterAdapter(base_url="http://mock-9router/v1", client=client)
        with pytest.raises(ProviderAuthenticationError):
            async for _ in adapter.stream(req):
                pass

    # Test 429
    async with httpx.AsyncClient(transport=httpx.MockTransport(mock_429)) as client:
        adapter = NineRouterAdapter(base_url="http://mock-9router/v1", client=client)
        with pytest.raises(ProviderRateLimitError):
            async for _ in adapter.stream(req):
                pass

    # Test 500
    async with httpx.AsyncClient(transport=httpx.MockTransport(mock_500)) as client:
        adapter = NineRouterAdapter(base_url="http://mock-9router/v1", client=client)
        with pytest.raises(ProviderUnavailableError):
            async for _ in adapter.stream(req):
                pass


def test_sse_formatting_helpers() -> None:
    """Assert SSE formatting functions produce valid compliant frames."""
    chunk = StreamChunk(
        id="c-99",
        model="gpt-4o",
        delta=StreamDelta(content="Sample"),
        finish_reason=None,
    )

    frame = format_sse_chunk(chunk)
    assert frame.startswith("data: ")
    assert frame.endswith("\n\n")
    parsed = json.loads(frame[len("data: "):-2])
    assert parsed["id"] == "c-99"
    assert parsed["choices"][0]["delta"]["content"] == "Sample"

    assert format_sse_done() == "data: [DONE]\n\n"

    err_frame = format_sse_error("Model overloaded", "overloaded_error", "rate_limit")
    assert "overloaded_error" in err_frame

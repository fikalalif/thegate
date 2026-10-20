"""Streaming utilities, SSE formatting, and ADR-006 safe boundary enforcement."""

import json
from collections.abc import AsyncIterator, Awaitable, Callable
from typing import Any

from app.core.exceptions import ProviderError
from app.schemas.provider import StreamChunk

DONE_SENTINEL = "data: [DONE]\n\n"


def format_sse_data(data: str) -> str:
    """Format raw data string into standard SSE frame."""
    return f"data: {data}\n\n"


def format_sse_chunk(chunk: StreamChunk | dict[str, Any]) -> str:
    """Serialize a StreamChunk or dictionary to SSE JSON data frame."""
    if isinstance(chunk, StreamChunk):
        payload = chunk.model_dump(exclude_none=True)
    else:
        payload = chunk
    return f"data: {json.dumps(payload)}\n\n"


def format_sse_done() -> str:
    """Return standard terminal SSE sentinel frame."""
    return DONE_SENTINEL


def format_sse_error(
    message: str,
    error_type: str = "upstream_error",
    code: str | None = None,
) -> str:
    """Format an error payload into standard OpenAI-compatible SSE frame."""
    err_obj: dict[str, Any] = {
        "error": {
            "message": message,
            "type": error_type,
            "code": code,
        }
    }
    return f"data: {json.dumps(err_obj)}\n\n"


class StreamingBoundaryTracker:
    """Tracks streaming lifecycle to strictly enforce ADR-006 boundaries.

    ADR-006 Rule: Once the first chunk/byte has been dispatched to the client,
    fallback to an alternate model is strictly prohibited.
    """

    def __init__(self) -> None:
        self.chunks_emitted: int = 0
        self.has_started: bool = False
        self.is_completed: bool = False
        self.error: Exception | None = None

    def record_chunk(self, chunk: StreamChunk) -> None:
        """Record emission of a chunk to client."""
        self.chunks_emitted += 1
        self.has_started = True

    def record_error(self, exc: Exception) -> None:
        """Record an error during streaming."""
        self.error = exc

    def can_fallback(self) -> bool:
        """Evaluate if fallback to another model is permitted under ADR-006."""
        return not self.has_started


class MidStreamError(ProviderError):
    """Exception raised when an upstream error occurs mid-stream after chunks have been emitted."""

    def __init__(
        self,
        message: str = "Upstream provider error occurred mid-stream; fallback is prohibited",
        original_error: Exception | None = None,
    ) -> None:
        super().__init__(
            message=message,
            status_code=502,
            error_type="midstream_provider_error",
            code="midstream_error",
        )
        self.original_error = original_error


async def safe_stream_wrapper(
    stream_iter: AsyncIterator[StreamChunk],
    tracker: StreamingBoundaryTracker,
    is_disconnected: Callable[[], Awaitable[bool]] | None = None,
) -> AsyncIterator[StreamChunk]:
    """Wrap a stream iterator with disconnect detection and ADR-006 boundary tracking."""
    try:
        async for chunk in stream_iter:
            if is_disconnected is not None and await is_disconnected():
                break

            tracker.record_chunk(chunk)
            yield chunk

        tracker.is_completed = True
    except Exception as exc:
        tracker.record_error(exc)
        if tracker.has_started:
            raise MidStreamError(
                message=(
                    f"Stream failed mid-flight after {tracker.chunks_emitted} chunks; "
                    f"fallback is prohibited (ADR-006): {exc}"
                ),
                original_error=exc,
            ) from exc
        raise

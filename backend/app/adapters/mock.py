"""Deterministic mock provider adapter for local development and testing."""

import time
import uuid
from collections.abc import AsyncIterator

from app.adapters.base import BaseProviderAdapter
from app.schemas.provider import (
    ChatChoice,
    ChatMessage,
    StreamChoice,
    StreamChunk,
    StreamDelta,
    TokenUsage,
    UnifiedChatRequest,
    UnifiedChatResponse,
)


class MockProviderAdapter(BaseProviderAdapter):
    """Hermetic in-process mock adapter for testing without external networks."""

    def __init__(
        self,
        default_response_text: str = "Mock completion response",
        is_healthy: bool = True,
        chunks: list[str] | None = None,
        exception_to_raise: Exception | None = None,
    ) -> None:
        """Initialize mock adapter with deterministic test configurations."""
        self.default_response_text = default_response_text
        self.is_healthy = is_healthy
        self.chunks = (
            chunks
            if chunks is not None
            else ["Mock", " streaming", " response", " complete."]
        )
        self.exception_to_raise = exception_to_raise

    async def execute(self, request: UnifiedChatRequest) -> UnifiedChatResponse:
        """Return deterministic UnifiedChatResponse for the given request."""
        if self.exception_to_raise:
            raise self.exception_to_raise

        content = self.default_response_text
        if request.messages:
            last_message = request.messages[-1]
            if isinstance(last_message.content, str) and last_message.content.strip():
                content = f"Echo: {last_message.content}"

        prompt_len = sum(
            len(str(m.content or "")) for m in request.messages
        )
        prompt_tokens = max(1, prompt_len // 4)
        completion_tokens = max(1, len(content) // 4)

        return UnifiedChatResponse(
            id=f"mock-{uuid.uuid4()}",
            model=request.model,
            choices=[
                ChatChoice(
                    index=0,
                    message=ChatMessage(role="assistant", content=content),
                    finish_reason="stop",
                )
            ],
            usage=TokenUsage(
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=prompt_tokens + completion_tokens,
            ),
            created=int(time.time()),
        )

    async def stream(self, request: UnifiedChatRequest) -> AsyncIterator[StreamChunk]:
        """Yield deterministic stream chunks matching SSE protocol."""
        if self.exception_to_raise:
            raise self.exception_to_raise

        stream_id = f"mock-stream-{uuid.uuid4()}"
        created = int(time.time())

        # Initial chunk specifying role
        yield StreamChunk(
            id=stream_id,
            model=request.model,
            choices=[
                StreamChoice(
                    index=0,
                    delta=StreamDelta(role="assistant", content=""),
                    finish_reason=None,
                )
            ],
            created=created,
        )

        # Content chunks
        total_completion_chars = 0
        for chunk_text in self.chunks:
            total_completion_chars += len(chunk_text)
            yield StreamChunk(
                id=stream_id,
                model=request.model,
                choices=[
                    StreamChoice(
                        index=0,
                        delta=StreamDelta(content=chunk_text),
                        finish_reason=None,
                    )
                ],
                created=created,
            )

        # Final terminal chunk with finish_reason and usage
        prompt_len = sum(
            len(str(m.content or "")) for m in request.messages
        )
        prompt_tokens = max(1, prompt_len // 4)
        completion_tokens = max(1, total_completion_chars // 4)

        yield StreamChunk(
            id=stream_id,
            model=request.model,
            choices=[
                StreamChoice(
                    index=0,
                    delta=StreamDelta(),
                    finish_reason="stop",
                )
            ],
            usage=TokenUsage(
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=prompt_tokens + completion_tokens,
            ),
            created=created,
        )

    async def check_health(self) -> bool:
        """Return configured health state."""
        return self.is_healthy

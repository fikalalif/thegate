"""Abstract base provider adapter isolating the core routing engine from providers."""

from abc import ABC, abstractmethod
from collections.abc import AsyncIterator

from app.schemas.provider import StreamChunk, UnifiedChatRequest, UnifiedChatResponse


class BaseProviderAdapter(ABC):
    """Abstract contract that all upstream provider adapters must implement.

    Ensures that the core routing engine, analytics, and policy layers interact
    exclusively with unified domain models (ADR-002).
    """

    @abstractmethod
    async def execute(self, request: UnifiedChatRequest) -> UnifiedChatResponse:
        """Execute a non-streaming chat completion request against the provider.

        Args:
            request: Unified request containing messages, model, and sampling parameters.

        Returns:
            UnifiedChatResponse containing model choices and token usage.

        Raises:
            ProviderAuthenticationError: Upstream authentication failure.
            ProviderRateLimitError: Upstream rate limit reached.
            ProviderUnavailableError: Upstream service down or returns 5xx.
            ProviderTimeoutError: Upstream connection or read timeout.
        """
        ...

    @abstractmethod
    async def stream(self, request: UnifiedChatRequest) -> AsyncIterator[StreamChunk]:
        """Stream chat completion chunks via Server-Sent Events (SSE).

        Yields:
            StreamChunk objects as incremental byte fragments are decoded.

        Raises:
            ProviderAuthenticationError: Upstream authentication failure.
            ProviderRateLimitError: Upstream rate limit reached.
            ProviderUnavailableError: Upstream service down or returns 5xx.
            ProviderTimeoutError: Upstream connection or read timeout.
        """
        ...

    @abstractmethod
    async def check_health(self) -> bool:
        """Verify upstream provider connectivity and readiness.

        Returns:
            True if provider is reachable and responsive, False otherwise.
        """
        ...

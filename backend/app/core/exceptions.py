"""Domain exception classes and error mapping for TheGate."""

from typing import Any


class TheGateError(Exception):
    """Base exception for all domain-specific errors in TheGate."""

    def __init__(
        self,
        message: str,
        status_code: int = 500,
        error_type: str = "internal_error",
        code: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_type = error_type
        self.code = code
        self.details = details or {}


class ProviderError(TheGateError):
    """Base exception for upstream model provider errors."""

    def __init__(
        self,
        message: str,
        status_code: int = 502,
        error_type: str = "upstream_error",
        code: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            message=message,
            status_code=status_code,
            error_type=error_type,
            code=code,
            details=details,
        )


class ProviderAuthenticationError(ProviderError):
    """Raised when upstream provider rejects credentials (HTTP 401/403)."""

    def __init__(
        self,
        message: str = "Upstream provider authentication failed",
        code: str | None = "provider_auth_error",
    ) -> None:
        super().__init__(
            message=message,
            status_code=502,
            error_type="upstream_authentication_error",
            code=code,
        )


class ProviderRateLimitError(ProviderError):
    """Raised when upstream provider rate limit is exceeded (HTTP 429)."""

    def __init__(
        self,
        message: str = "Upstream provider rate limit exceeded",
        retry_after: float | None = None,
        code: str | None = "provider_rate_limit_exceeded",
    ) -> None:
        super().__init__(
            message=message,
            status_code=429,
            error_type="upstream_rate_limit_error",
            code=code,
            details={"retry_after": retry_after} if retry_after else None,
        )
        self.retry_after = retry_after


class ProviderUnavailableError(ProviderError):
    """Raised when upstream provider is unavailable, down, or returning 5xx."""

    def __init__(
        self,
        message: str = "Upstream provider is temporarily unavailable",
        code: str | None = "provider_unavailable",
    ) -> None:
        super().__init__(
            message=message,
            status_code=503,
            error_type="upstream_unavailable_error",
            code=code,
        )


class ProviderTimeoutError(ProviderError):
    """Raised when upstream provider connection or read operation times out."""

    def __init__(
        self,
        message: str = "Upstream provider connection or read timed out",
        code: str | None = "provider_timeout",
    ) -> None:
        super().__init__(
            message=message,
            status_code=504,
            error_type="upstream_timeout_error",
            code=code,
        )


class ProviderResponseError(ProviderError):
    """Raised when upstream provider returns an invalid or unparseable response payload."""

    def __init__(
        self,
        message: str = "Invalid response received from upstream provider",
        code: str | None = "provider_invalid_response",
    ) -> None:
        super().__init__(
            message=message,
            status_code=502,
            error_type="upstream_response_error",
            code=code,
        )

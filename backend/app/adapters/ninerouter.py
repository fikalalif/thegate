"""9Router upstream provider adapter implementation."""

import json
import time
import uuid
from collections.abc import AsyncIterator
from typing import Any

import httpx

from app.adapters.base import BaseProviderAdapter
from app.core.config import get_settings
from app.core.exceptions import (
    ProviderAuthenticationError,
    ProviderError,
    ProviderRateLimitError,
    ProviderResponseError,
    ProviderTimeoutError,
    ProviderUnavailableError,
)
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

DEFAULT_MODEL_MAPPING: dict[str, str] = {
    "gpt-4o": "openai/gpt-4o",
    "gpt-4o-mini": "openai/gpt-4o-mini",
    "claude-3-5-sonnet": "anthropic/claude-3-5-sonnet",
    "claude-3-haiku": "anthropic/claude-3-haiku",
    "llama-3-8b": "meta/llama-3-8b-instruct",
    "llama-3-70b": "meta/llama-3-70b-instruct",
}


class NineRouterAdapter(BaseProviderAdapter):
    """Adapter for communicating with a downstream 9Router instance over HTTP/SSE."""

    def __init__(
        self,
        base_url: str | None = None,
        api_key: str | None = None,
        timeout_seconds: float | None = None,
        connect_timeout_seconds: float = 5.0,
        model_mapping: dict[str, str] | None = None,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        """Initialize NineRouterAdapter with connection parameters and optional injected client."""
        settings = get_settings()
        self.base_url = (base_url or settings.ninerouter_base_url).rstrip("/")
        self.api_key = api_key if api_key is not None else settings.ninerouter_api_key
        self.timeout_seconds = (
            timeout_seconds if timeout_seconds is not None else settings.ninerouter_timeout_seconds
        )
        self.connect_timeout_seconds = connect_timeout_seconds
        self.model_mapping = (
            dict(model_mapping) if model_mapping is not None else dict(DEFAULT_MODEL_MAPPING)
        )
        self._custom_client = client
        self._internal_client: httpx.AsyncClient | None = None

    def _get_client(self) -> httpx.AsyncClient:
        """Obtain or initialize the persistent HTTP client with connection pooling."""
        if self._custom_client is not None:
            return self._custom_client

        if self._internal_client is None or self._internal_client.is_closed:
            limits = httpx.Limits(max_keepalive_connections=20, max_connections=50)
            timeout = httpx.Timeout(
                timeout=self.timeout_seconds,
                connect=self.connect_timeout_seconds,
            )
            self._internal_client = httpx.AsyncClient(limits=limits, timeout=timeout)

        return self._internal_client

    async def close(self) -> None:
        """Close internal HTTP client session."""
        if self._internal_client is not None and not self._internal_client.is_closed:
            await self._internal_client.aclose()
            self._internal_client = None

    def translate_model_id(self, internal_name: str) -> str:
        """Translate internal model identifier to 9Router backend model ID."""
        return self.model_mapping.get(internal_name, internal_name)

    def _prepare_headers(self) -> dict[str, str]:
        """Construct HTTP headers ensuring safe credential injection."""
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    def _prepare_payload(self, request: UnifiedChatRequest) -> dict[str, Any]:
        """Convert UnifiedChatRequest into OpenAI-compatible JSON payload for 9Router."""
        messages_payload: list[dict[str, Any]] = []
        for msg in request.messages:
            msg_dict: dict[str, Any] = {"role": msg.role, "content": msg.content}
            if msg.name:
                msg_dict["name"] = msg.name
            if msg.tool_calls is not None:
                msg_dict["tool_calls"] = msg.tool_calls
            if msg.tool_call_id is not None:
                msg_dict["tool_call_id"] = msg.tool_call_id
            messages_payload.append(msg_dict)

        payload: dict[str, Any] = {
            "model": self.translate_model_id(request.model),
            "messages": messages_payload,
            "stream": request.stream,
        }

        if request.temperature is not None:
            payload["temperature"] = request.temperature
        if request.max_tokens is not None:
            payload["max_tokens"] = request.max_tokens
        if request.tools is not None:
            payload["tools"] = request.tools
        if request.tool_choice is not None:
            payload["tool_choice"] = request.tool_choice
        if request.response_format is not None:
            payload["response_format"] = request.response_format
        if request.top_p is not None:
            payload["top_p"] = request.top_p
        if request.frequency_penalty is not None:
            payload["frequency_penalty"] = request.frequency_penalty
        if request.presence_penalty is not None:
            payload["presence_penalty"] = request.presence_penalty
        if request.stop is not None:
            payload["stop"] = request.stop

        if request.extra_params:
            payload.update(request.extra_params)

        return payload

    def _sanitize_error_text(self, text: str) -> str:
        """Redact any sensitive credentials from upstream error text."""
        if not text:
            return ""
        if self.api_key and self.api_key in text:
            text = text.replace(self.api_key, "[REDACTED]")
        return text

    async def execute(self, request: UnifiedChatRequest) -> UnifiedChatResponse:
        """Execute a non-streaming completion request against 9Router."""
        client = self._get_client()
        url = f"{self.base_url}/chat/completions"
        headers = self._prepare_headers()
        payload = self._prepare_payload(request)

        try:
            response = await client.post(
                url,
                json=payload,
                headers=headers,
                timeout=httpx.Timeout(
                    timeout=self.timeout_seconds,
                    connect=self.connect_timeout_seconds,
                ),
            )
        except httpx.TimeoutException as exc:
            raise ProviderTimeoutError(
                f"9Router request timed out after {self.timeout_seconds}s"
            ) from exc
        except (httpx.ConnectError, httpx.NetworkError) as exc:
            sanitized = self._sanitize_error_text(str(exc))
            raise ProviderUnavailableError(
                f"Failed to connect to 9Router at {self.base_url}: {sanitized}"
            ) from exc
        except httpx.HTTPError as exc:
            sanitized = self._sanitize_error_text(str(exc))
            raise ProviderUnavailableError(
                f"HTTP error communicating with 9Router: {sanitized}"
            ) from exc

        # Handle non-2xx HTTP responses
        if response.status_code != 200:
            error_body = self._sanitize_error_text(response.text)
            status = response.status_code

            if status in (401, 403):
                raise ProviderAuthenticationError(
                    f"9Router authentication failed ({status}): {error_body}"
                )
            if status == 429:
                retry_after_header = response.headers.get("retry-after")
                retry_after: float | None = None
                if retry_after_header:
                    try:
                        retry_after = float(retry_after_header)
                    except ValueError:
                        retry_after = None
                raise ProviderRateLimitError(
                    f"9Router rate limit exceeded (429): {error_body}",
                    retry_after=retry_after,
                )
            if status in (500, 502, 503, 504):
                raise ProviderUnavailableError(
                    f"9Router upstream service error ({status}): {error_body}"
                )

            raise ProviderError(
                f"9Router upstream returned unexpected status {status}: {error_body}",
                status_code=status,
            )

        # Parse JSON response or reconstruct from SSE stream if upstream streamed
        content_type = response.headers.get("content-type", "")
        text = response.text.strip()
        if "text/event-stream" in content_type or text.startswith("data:"):
            accumulated_content: list[str] = []
            usage_dict = None
            resp_model = request.model
            resp_id = f"chatcmpl-{uuid.uuid4().hex[:12]}"
            created_ts = int(time.time())
            finish_reason = "stop"

            for raw_line in text.split("\n"):
                line = raw_line.strip()
                if not line or line.startswith(":"):
                    continue
                if line.startswith("data:"):
                    data_str = line[len("data:"):].strip()
                    if data_str == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data_str)
                    except json.JSONDecodeError:
                        continue
                    if "id" in chunk:
                        resp_id = chunk["id"]
                    if "model" in chunk:
                        resp_model = chunk["model"]
                    if "created" in chunk:
                        created_ts = chunk["created"]
                    if "usage" in chunk and chunk["usage"]:
                        usage_dict = chunk["usage"]
                    for choice in chunk.get("choices", []):
                        delta = choice.get("delta", {})
                        if delta.get("content"):
                            accumulated_content.append(delta["content"])
                        if choice.get("finish_reason"):
                            finish_reason = choice["finish_reason"]

            full_content = "".join(accumulated_content)
            data = {
                "id": resp_id,
                "object": "chat.completion",
                "created": created_ts,
                "model": resp_model,
                "choices": [{
                    "index": 0,
                    "message": {"role": "assistant", "content": full_content},
                    "finish_reason": finish_reason,
                }],
                "usage": usage_dict or {
                    "prompt_tokens": len(request.messages[0].content.split()) if request.messages and request.messages[0].content else 10,
                    "completion_tokens": len(full_content.split()),
                    "total_tokens": len(full_content.split()) + 10,
                },
            }
        else:
            try:
                data = response.json()
            except Exception as exc:
                raise ProviderResponseError("Failed to decode JSON from 9Router response") from exc

        try:
            choices: list[ChatChoice] = []
            for item in data.get("choices", []):
                msg_data = item.get("message", {})
                choice = ChatChoice(
                    index=item.get("index", 0),
                    message=ChatMessage(
                        role=msg_data.get("role", "assistant"),
                        content=msg_data.get("content"),
                        tool_calls=msg_data.get("tool_calls"),
                        tool_call_id=msg_data.get("tool_call_id"),
                    ),
                    finish_reason=item.get("finish_reason", "stop"),
                )
                choices.append(choice)

            if not choices:
                raise ValueError("No choices returned in 9Router response payload")

            usage_data = data.get("usage")
            usage: TokenUsage | None = None
            if usage_data:
                usage = TokenUsage(
                    prompt_tokens=usage_data.get("prompt_tokens", 0),
                    completion_tokens=usage_data.get("completion_tokens", 0),
                    total_tokens=usage_data.get("total_tokens", 0),
                )

            return UnifiedChatResponse(
                id=data.get("id", f"resp-{request.model}"),
                model=data.get("model", request.model),
                choices=choices,
                usage=usage,
                created=data.get("created"),
                system_fingerprint=data.get("system_fingerprint"),
            )
        except Exception as exc:
            raise ProviderResponseError(
                f"Failed to parse 9Router response structure: {exc}"
            ) from exc

    async def stream(self, request: UnifiedChatRequest) -> AsyncIterator[StreamChunk]:
        """Stream chat completion chunks via Server-Sent Events (SSE) with zero-buffering."""
        client = self._get_client()
        url = f"{self.base_url}/chat/completions"
        headers = self._prepare_headers()
        headers["Accept"] = "text/event-stream"
        headers["Cache-Control"] = "no-cache"

        payload = self._prepare_payload(request)
        payload["stream"] = True
        payload["stream_options"] = {"include_usage": True}

        try:
            async with client.stream(
                "POST",
                url,
                json=payload,
                headers=headers,
                timeout=httpx.Timeout(
                    timeout=self.timeout_seconds,
                    connect=self.connect_timeout_seconds,
                ),
            ) as response:
                if response.status_code != 200:
                    raw_err = await response.aread()
                    error_body = self._sanitize_error_text(raw_err.decode(errors="replace"))
                    status = response.status_code

                    if status in (401, 403):
                        raise ProviderAuthenticationError(
                            f"9Router streaming authentication failed ({status}): {error_body}"
                        )
                    if status == 429:
                        raise ProviderRateLimitError(
                            f"9Router streaming rate limit exceeded (429): {error_body}"
                        )
                    if status in (500, 502, 503, 504):
                        raise ProviderUnavailableError(
                            f"9Router streaming service error ({status}): {error_body}"
                        )
                    raise ProviderError(
                        f"9Router streaming unexpected status {status}: {error_body}",
                        status_code=status,
                    )

                async for raw_line in response.aiter_lines():
                    line = raw_line.strip()
                    if not line or line.startswith(":"):
                        # Empty line or SSE comment/keepalive
                        continue

                    if line.startswith("data:"):
                        data_str = line[len("data:"):].strip()
                        if data_str == "[DONE]":
                            break

                        try:
                            chunk_dict = json.loads(data_str)
                        except json.JSONDecodeError:
                            continue

                        choices: list[StreamChoice] = []
                        for item in chunk_dict.get("choices", []):
                            delta_data = item.get("delta", {})
                            stream_delta = StreamDelta(
                                role=delta_data.get("role"),
                                content=delta_data.get("content"),
                                tool_calls=delta_data.get("tool_calls"),
                            )
                            choices.append(
                                StreamChoice(
                                    index=item.get("index", 0),
                                    delta=stream_delta,
                                    finish_reason=item.get("finish_reason"),
                                )
                            )

                        usage_data = chunk_dict.get("usage")
                        usage: TokenUsage | None = None
                        if usage_data:
                            usage = TokenUsage(
                                prompt_tokens=usage_data.get("prompt_tokens", 0),
                                completion_tokens=usage_data.get("completion_tokens", 0),
                                total_tokens=usage_data.get("total_tokens", 0),
                            )

                        yield StreamChunk(
                            id=chunk_dict.get("id", f"chunk-{request.model}"),
                            model=chunk_dict.get("model", request.model),
                            choices=choices,
                            usage=usage,
                            created=chunk_dict.get("created"),
                        )

        except httpx.TimeoutException as exc:
            raise ProviderTimeoutError(
                f"9Router stream timed out after {self.timeout_seconds}s"
            ) from exc
        except (httpx.ConnectError, httpx.NetworkError) as exc:
            sanitized = self._sanitize_error_text(str(exc))
            raise ProviderUnavailableError(
                f"Failed to connect to 9Router stream at {self.base_url}: {sanitized}"
            ) from exc
        except httpx.HTTPError as exc:
            sanitized = self._sanitize_error_text(str(exc))
            raise ProviderUnavailableError(
                f"HTTP error during 9Router stream: {sanitized}"
            ) from exc

    async def check_health(self) -> bool:
        """Probe 9Router health/models endpoint."""
        client = self._get_client()
        url = f"{self.base_url}/models"
        headers = self._prepare_headers()

        try:
            response = await client.get(
                url,
                headers=headers,
                timeout=httpx.Timeout(timeout=5.0, connect=self.connect_timeout_seconds),
            )
            return response.status_code < 400
        except Exception:
            return False

"""Unit tests for NineRouterAdapter and domain error translations (Milestone 5)."""

import json
from typing import Any

import httpx
import pytest
from app.adapters.ninerouter import DEFAULT_MODEL_MAPPING, NineRouterAdapter
from app.core.exceptions import (
    ProviderAuthenticationError,
    ProviderRateLimitError,
    ProviderResponseError,
    ProviderTimeoutError,
    ProviderUnavailableError,
)
from app.schemas.provider import ChatMessage, UnifiedChatRequest, UnifiedChatResponse


@pytest.mark.asyncio
async def test_ninerouter_execute_success() -> None:
    """Assert NineRouterAdapter.execute correctly calls 9Router and parses response."""
    captured_requests: list[httpx.Request] = []

    def mock_handler(request: httpx.Request) -> httpx.Response:
        captured_requests.append(request)
        response_data: dict[str, Any] = {
            "id": "chatcmpl-test-123",
            "object": "chat.completion",
            "created": 1700000000,
            "model": "openai/gpt-4o",
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": "Hello from 9Router!",
                    },
                    "finish_reason": "stop",
                }
            ],
            "usage": {
                "prompt_tokens": 12,
                "completion_tokens": 5,
                "total_tokens": 17,
            },
        }
        return httpx.Response(200, json=response_data)

    transport = httpx.MockTransport(mock_handler)
    async with httpx.AsyncClient(transport=transport) as client:
        adapter = NineRouterAdapter(
            base_url="http://mock-9router:8080/v1",
            api_key="sk-test-9router-key",
            client=client,
        )

        request = UnifiedChatRequest(
            model="gpt-4o",
            messages=[ChatMessage(role="user", content="Hi 9Router")],
            temperature=0.5,
        )

        response = await adapter.execute(request)

        assert isinstance(response, UnifiedChatResponse)
        assert response.id == "chatcmpl-test-123"
        assert response.model == "openai/gpt-4o"
        assert len(response.choices) == 1
        assert response.choices[0].message.role == "assistant"
        assert response.choices[0].message.content == "Hello from 9Router!"
        assert response.usage is not None
        assert response.usage.total_tokens == 17

        # Verify outgoing HTTP request details
        assert len(captured_requests) == 1
        req = captured_requests[0]
        assert req.url == "http://mock-9router:8080/v1/chat/completions"
        assert req.headers["Authorization"] == "Bearer sk-test-9router-key"
        body = json.loads(req.content)
        assert body["model"] == "openai/gpt-4o"
        assert body["messages"][0]["content"] == "Hi 9Router"
        assert body["temperature"] == 0.5


@pytest.mark.asyncio
async def test_ninerouter_model_id_translation() -> None:
    """Assert model IDs are mapped to upstream backend IDs."""
    adapter = NineRouterAdapter()

    assert adapter.translate_model_id("gpt-4o") == DEFAULT_MODEL_MAPPING["gpt-4o"]
    assert adapter.translate_model_id("gpt-4o-mini") == DEFAULT_MODEL_MAPPING["gpt-4o-mini"]
    assert (
        adapter.translate_model_id("claude-3-5-sonnet")
        == DEFAULT_MODEL_MAPPING["claude-3-5-sonnet"]
    )
    # Unmapped model should pass through cleanly
    assert adapter.translate_model_id("custom-model-id") == "custom-model-id"


@pytest.mark.asyncio
async def test_ninerouter_error_mapping_401() -> None:
    """Assert HTTP 401 maps to ProviderAuthenticationError."""
    def mock_handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={"error": "Unauthorized key"})

    transport = httpx.MockTransport(mock_handler)
    async with httpx.AsyncClient(transport=transport) as client:
        adapter = NineRouterAdapter(base_url="http://mock-9router/v1", client=client)
        req = UnifiedChatRequest(model="gpt-4o", messages=[ChatMessage(role="user", content="Hi")])

        with pytest.raises(ProviderAuthenticationError) as exc_info:
            await adapter.execute(req)

        assert "authentication failed" in str(exc_info.value).lower()
        assert exc_info.value.status_code == 502


@pytest.mark.asyncio
async def test_ninerouter_error_mapping_429() -> None:
    """Assert HTTP 429 maps to ProviderRateLimitError with Retry-After parsed."""
    def mock_handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            429,
            json={"error": "Rate limit exceeded"},
            headers={"Retry-After": "15"},
        )

    transport = httpx.MockTransport(mock_handler)
    async with httpx.AsyncClient(transport=transport) as client:
        adapter = NineRouterAdapter(base_url="http://mock-9router/v1", client=client)
        req = UnifiedChatRequest(model="gpt-4o", messages=[ChatMessage(role="user", content="Hi")])

        with pytest.raises(ProviderRateLimitError) as exc_info:
            await adapter.execute(req)

        assert exc_info.value.status_code == 429
        assert exc_info.value.retry_after == 15.0


@pytest.mark.asyncio
async def test_ninerouter_error_mapping_500() -> None:
    """Assert HTTP 500 and 503 map to ProviderUnavailableError."""
    def mock_handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(503, text="Service temporarily unavailable")

    transport = httpx.MockTransport(mock_handler)
    async with httpx.AsyncClient(transport=transport) as client:
        adapter = NineRouterAdapter(base_url="http://mock-9router/v1", client=client)
        req = UnifiedChatRequest(model="gpt-4o", messages=[ChatMessage(role="user", content="Hi")])

        with pytest.raises(ProviderUnavailableError) as exc_info:
            await adapter.execute(req)

        assert exc_info.value.status_code == 503


@pytest.mark.asyncio
async def test_ninerouter_timeout_handling() -> None:
    """Assert request timeout raises ProviderTimeoutError."""
    def mock_handler(_request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("Read operation timed out")

    transport = httpx.MockTransport(mock_handler)
    async with httpx.AsyncClient(transport=transport) as client:
        adapter = NineRouterAdapter(base_url="http://mock-9router/v1", client=client)
        req = UnifiedChatRequest(model="gpt-4o", messages=[ChatMessage(role="user", content="Hi")])

        with pytest.raises(ProviderTimeoutError) as exc_info:
            await adapter.execute(req)

        assert exc_info.value.status_code == 504
        assert "timed out" in str(exc_info.value).lower()


@pytest.mark.asyncio
async def test_ninerouter_redacts_auth_header() -> None:
    """Assert sensitive credentials do not leak into exception messages."""
    secret = "secret-super-sensitive-token-xyz"

    def mock_handler(_request: httpx.Request) -> httpx.Response:
        # Simulate upstream error that echoes back credentials
        return httpx.Response(
            401,
            text=f"Authentication failed for token: {secret}",
        )

    transport = httpx.MockTransport(mock_handler)
    async with httpx.AsyncClient(transport=transport) as client:
        adapter = NineRouterAdapter(
            base_url="http://mock-9router/v1",
            api_key=secret,
            client=client,
        )
        req = UnifiedChatRequest(model="gpt-4o", messages=[ChatMessage(role="user", content="Hi")])

        with pytest.raises(ProviderAuthenticationError) as exc_info:
            await adapter.execute(req)

        error_msg = str(exc_info.value)
        assert secret not in error_msg
        assert "[REDACTED]" in error_msg


@pytest.mark.asyncio
async def test_ninerouter_invalid_json_response() -> None:
    """Assert malformed upstream JSON raises ProviderResponseError."""
    def mock_handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text="Not a JSON payload")

    transport = httpx.MockTransport(mock_handler)
    async with httpx.AsyncClient(transport=transport) as client:
        adapter = NineRouterAdapter(base_url="http://mock-9router/v1", client=client)
        req = UnifiedChatRequest(model="gpt-4o", messages=[ChatMessage(role="user", content="Hi")])

        with pytest.raises(ProviderResponseError):
            await adapter.execute(req)


@pytest.mark.asyncio
async def test_ninerouter_empty_choices_response() -> None:
    """Assert response with empty choices raises ProviderResponseError."""
    def mock_handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"id": "empty-choices", "choices": []})

    transport = httpx.MockTransport(mock_handler)
    async with httpx.AsyncClient(transport=transport) as client:
        adapter = NineRouterAdapter(base_url="http://mock-9router/v1", client=client)
        req = UnifiedChatRequest(model="gpt-4o", messages=[ChatMessage(role="user", content="Hi")])

        with pytest.raises(ProviderResponseError):
            await adapter.execute(req)


@pytest.mark.asyncio
async def test_ninerouter_check_health() -> None:
    """Assert check_health returns True on success and False on failures."""
    def healthy_handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"data": [{"id": "gpt-4o"}]})

    def unhealthy_handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(500, text="Internal error")

    transport_ok = httpx.MockTransport(healthy_handler)
    transport_bad = httpx.MockTransport(unhealthy_handler)

    async with httpx.AsyncClient(transport=transport_ok) as client_ok:
        adapter_ok = NineRouterAdapter(base_url="http://mock-9router/v1", client=client_ok)
        assert await adapter_ok.check_health() is True

    async with httpx.AsyncClient(transport=transport_bad) as client_bad:
        adapter_bad = NineRouterAdapter(base_url="http://mock-9router/v1", client=client_bad)
        assert await adapter_bad.check_health() is False

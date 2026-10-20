"""Unit tests for BaseProviderAdapter, MockProviderAdapter, and domain schemas (Milestone 4)."""

import uuid

import pytest
from app.adapters.base import BaseProviderAdapter
from app.adapters.mock import MockProviderAdapter
from app.schemas.provider import (
    ChatMessage,
    ModelCandidate,
    StreamChunk,
    StreamDelta,
    UnifiedChatRequest,
    UnifiedChatResponse,
)
from pydantic import ValidationError


@pytest.mark.asyncio
async def test_mock_adapter_execute() -> None:
    """Assert MockProviderAdapter.execute returns a valid UnifiedChatResponse."""
    adapter = MockProviderAdapter()
    request = UnifiedChatRequest(
        model="gpt-4o-mini",
        messages=[
            ChatMessage(role="user", content="Hello, TheGate!"),
        ],
        temperature=0.7,
        max_tokens=100,
    )

    response = await adapter.execute(request)

    assert isinstance(response, UnifiedChatResponse)
    assert response.model == "gpt-4o-mini"
    assert len(response.choices) == 1
    assert response.choices[0].finish_reason == "stop"
    assert "Echo: Hello, TheGate!" in str(response.choices[0].message.content)
    assert response.usage is not None
    assert response.usage.prompt_tokens > 0
    assert response.usage.completion_tokens > 0
    assert (
        response.usage.total_tokens
        == response.usage.prompt_tokens + response.usage.completion_tokens
    )


@pytest.mark.asyncio
async def test_mock_adapter_stream() -> None:
    """Assert MockProviderAdapter.stream yields StreamChunks to completion."""
    custom_chunks = ["First", " Second", " Third"]
    adapter = MockProviderAdapter(chunks=custom_chunks)
    request = UnifiedChatRequest(
        model="claude-3-5-sonnet",
        messages=[ChatMessage(role="user", content="Stream test")],
        stream=True,
    )

    chunks: list[StreamChunk] = []
    async for chunk in adapter.stream(request):
        assert isinstance(chunk, StreamChunk)
        assert chunk.model == "claude-3-5-sonnet"
        chunks.append(chunk)

    # First chunk: role
    assert chunks[0].choices[0].delta.role == "assistant"

    # Middle chunks: content fragments
    accumulated_content = "".join(
        chunk.choices[0].delta.content or "" for chunk in chunks[1:-1]
    )
    assert accumulated_content == "First Second Third"

    # Last chunk: finish_reason="stop" and token usage
    last_chunk = chunks[-1]
    assert last_chunk.choices[0].finish_reason == "stop"
    assert last_chunk.usage is not None
    assert last_chunk.usage.total_tokens > 0


@pytest.mark.asyncio
async def test_mock_adapter_health_check() -> None:
    """Assert health check reflects configured state."""
    healthy_adapter = MockProviderAdapter(is_healthy=True)
    unhealthy_adapter = MockProviderAdapter(is_healthy=False)

    assert await healthy_adapter.check_health() is True
    assert await unhealthy_adapter.check_health() is False


@pytest.mark.asyncio
async def test_mock_adapter_exception_raising() -> None:
    """Assert configured exception is raised on execute and stream."""
    adapter = MockProviderAdapter(exception_to_raise=RuntimeError("Simulated upstream failure"))
    request = UnifiedChatRequest(
        model="mock-model",
        messages=[ChatMessage(role="user", content="Fail please")],
    )

    with pytest.raises(RuntimeError, match="Simulated upstream failure"):
        await adapter.execute(request)

    with pytest.raises(RuntimeError, match="Simulated upstream failure"):
        async for _ in adapter.stream(request):
            pass


def test_domain_schemas_validation_rejects_invalid() -> None:
    """Assert domain schemas enforce validation constraints."""
    # Empty messages list should fail
    with pytest.raises(ValidationError):
        UnifiedChatRequest(model="test-model", messages=[])

    # Out of range temperature should fail
    with pytest.raises(ValidationError):
        UnifiedChatRequest(
            model="test-model",
            messages=[ChatMessage(role="user", content="Hi")],
            temperature=3.5,
        )

    # Non-positive max_tokens should fail
    with pytest.raises(ValidationError):
        UnifiedChatRequest(
            model="test-model",
            messages=[ChatMessage(role="user", content="Hi")],
            max_tokens=-5,
        )

    # Empty model should fail
    with pytest.raises(ValidationError):
        UnifiedChatRequest(
            model="",
            messages=[ChatMessage(role="user", content="Hi")],
        )


def test_stream_chunk_convenience_accessors() -> None:
    """Assert StreamChunk normalizes direct delta initialization and exposes properties."""
    chunk = StreamChunk(
        id="chunk-123",
        model="gpt-4o",
        delta=StreamDelta(content="Hello world"),
        finish_reason="stop",
    )

    assert len(chunk.choices) == 1
    assert chunk.delta is not None
    assert chunk.delta.content == "Hello world"
    assert chunk.finish_reason == "stop"


def test_model_candidate_schema() -> None:
    """Assert ModelCandidate validates required fields and sets sensible defaults."""
    candidate_id = uuid.uuid4()
    candidate = ModelCandidate(
        id=candidate_id,
        internal_name="gpt-4o-mini",
        backend_model_id="openai/gpt-4o-mini",
        capabilities={"tools": True, "vision": True},
        context_limit=128000,
    )

    assert candidate.id == candidate_id
    assert candidate.internal_name == "gpt-4o-mini"
    assert candidate.provider_adapter == "9router"
    assert candidate.enabled is True
    assert candidate.context_limit == 128000


def test_base_provider_adapter_is_abstract() -> None:
    """Assert BaseProviderAdapter cannot be instantiated directly without implementations."""
    with pytest.raises(TypeError):
        BaseProviderAdapter()  # type: ignore[abstract]

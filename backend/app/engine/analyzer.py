"""Request feature extraction and technical constraint analyzer."""

from pydantic import BaseModel, Field

from app.schemas.provider import UnifiedChatRequest


class RequestAnalysis(BaseModel):
    """Extracted feature metadata and constraints from an inference request."""

    estimated_chars: int = Field(ge=0, description="Estimated total character count")
    estimated_tokens: int = Field(ge=1, description="Estimated prompt token count")
    requires_tools: bool = Field(
        default=False, description="Whether request specifies tools/functions"
    )
    requires_json_mode: bool = Field(
        default=False, description="Whether request specifies structured JSON output"
    )
    requires_vision: bool = Field(
        default=False, description="Whether request includes image inputs"
    )
    message_count: int = Field(ge=1, description="Number of conversation messages")


def analyze_request(request: UnifiedChatRequest) -> RequestAnalysis:
    """Analyze incoming request parameters to extract size, tokens, and technical constraints."""
    total_chars = 0
    requires_vision = False

    for message in request.messages:
        content = message.content
        if isinstance(content, str):
            total_chars += len(content)
        elif isinstance(content, list):
            for part in content:
                if isinstance(part, dict):
                    if part.get("type") == "text":
                        total_chars += len(str(part.get("text", "")))
                    elif part.get("type") == "image_url":
                        requires_vision = True
                    else:
                        total_chars += len(str(part))
                else:
                    total_chars += len(str(part))

        # Include tool call arguments in character estimate if assistant message has tools
        if message.tool_calls:
            for tc in message.tool_calls:
                fn = tc.get("function", {})
                total_chars += len(str(fn.get("name", "")))
                total_chars += len(str(fn.get("arguments", "")))

    # Standard heuristic: ~4 characters per token + 4 tokens structural overhead per message
    estimated_tokens = max(1, (total_chars // 4) + (len(request.messages) * 4))

    # Detect technical capability requirements
    requires_tools = bool(request.tools and len(request.tools) > 0)

    requires_json_mode = False
    if request.response_format and isinstance(request.response_format, dict):
        rf_type = request.response_format.get("type")
        if rf_type in ("json_object", "json_schema"):
            requires_json_mode = True

    return RequestAnalysis(
        estimated_chars=total_chars,
        estimated_tokens=estimated_tokens,
        requires_tools=requires_tools,
        requires_json_mode=requires_json_mode,
        requires_vision=requires_vision,
        message_count=len(request.messages),
    )

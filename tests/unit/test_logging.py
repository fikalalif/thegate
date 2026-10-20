"""Unit tests for logging secret redaction."""

from app.core.logging import RedactingFilter


def test_redacting_filter_masks_bearer_token() -> None:
    """Assert Bearer token is masked in log messages."""
    filter_instance = RedactingFilter()
    raw_message = "Forwarding upstream request with Authorization: Bearer abcdef1234567890xyz"
    redacted = filter_instance.redact(raw_message)

    assert "abcdef1234567890xyz" not in redacted
    assert "Bearer [REDACTED]" in redacted


def test_redacting_filter_masks_thegate_api_key() -> None:
    """Assert tg_live_ API key is masked in log messages."""
    filter_instance = RedactingFilter()
    raw_message = "Authenticated request for key tg_live_a1b2c3d4e5f6g7h8i9j0"
    redacted = filter_instance.redact(raw_message)

    assert "a1b2c3d4e5f6g7h8i9j0" not in redacted
    assert "tg_live_[REDACTED]" in redacted


def test_redacting_filter_masks_openai_key() -> None:
    """Assert sk-... key is masked in log messages."""
    filter_instance = RedactingFilter()
    raw_message = "Configured provider secret sk-proj-1234567890abcdefghijklmn"
    redacted = filter_instance.redact(raw_message)

    assert "1234567890abcdefghijklmn" not in redacted
    assert "sk-[REDACTED]" in redacted


def test_redacting_filter_masks_password() -> None:
    """Assert password assignment is masked in log messages."""
    filter_instance = RedactingFilter()
    raw_message = "Connected to database with password='super_secret_db_pass'"
    redacted = filter_instance.redact(raw_message)

    assert "super_secret_db_pass" not in redacted
    assert "[REDACTED]" in redacted


def test_redacting_filter_preserves_normal_logs() -> None:
    """Assert normal non-sensitive messages remain unchanged."""
    filter_instance = RedactingFilter()
    raw_message = "Application starting up on port 8000 in environment development"
    redacted = filter_instance.redact(raw_message)

    assert redacted == raw_message

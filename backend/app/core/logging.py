"""Structured logging configuration with automatic secret and credential redaction."""

import logging
import re
import sys

# Patterns to redact from logs
SENSITIVE_PATTERNS = [
    # Bearer tokens & Authorization headers
    (re.compile(r"(Bearer\s+)[A-Za-z0-9_\-\.]{8,}", re.IGNORECASE), r"\1[REDACTED]"),
    # API key assignments: api_key=..., apiKey=..., token=...
    (
        re.compile(
            r"((?:api[_-]?key|secret|token|password|auth)\s*[=:]\s*['\"]?)"
            r"[A-Za-z0-9_\-\.]{6,}(['\"]?)",
            re.IGNORECASE,
        ),
        r"\1[REDACTED]\2",
    ),
    # TheGate API keys (tg_live_...)
    (re.compile(r"tg_live_[A-Za-z0-9_]{16,}", re.IGNORECASE), "tg_live_[REDACTED]"),
    # OpenAI/standard sk-... keys
    (re.compile(r"sk-[A-Za-z0-9_\-]{20,}", re.IGNORECASE), "sk-[REDACTED]"),
]


class RedactingFilter(logging.Filter):
    """Filter that intercepts and masks sensitive secrets in log record messages."""

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            record.msg = self.redact(record.msg)
        if record.args:
            if isinstance(record.args, dict):
                record.args = {
                    k: self.redact(v) if isinstance(v, str) else v for k, v in record.args.items()
                }
            elif isinstance(record.args, tuple):
                record.args = tuple(
                    self.redact(v) if isinstance(v, str) else v for v in record.args
                )
        return True

    @staticmethod
    def redact(text: str) -> str:
        """Apply all redaction patterns to a string."""
        for pattern, replacement in SENSITIVE_PATTERNS:
            text = pattern.sub(replacement, text)
        return text


class StructuredFormatter(logging.Formatter):
    """Clean structured log formatter with timestamp, level, module, and message."""

    def format(self, record: logging.LogRecord) -> str:
        # Standard formatted output
        base = super().format(record)
        return base


def setup_logging(log_level: str = "INFO", environment: str = "development") -> None:
    """Configure root logger with structured formatting and secret redaction."""
    level = getattr(logging, log_level.upper(), logging.INFO)

    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    # Remove existing handlers to avoid duplicates
    for handler in list(root_logger.handlers):
        root_logger.removeHandler(handler)

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)
    handler.addFilter(RedactingFilter())

    if environment == "development":
        format_str = "[%(asctime)s] [%(levelname)s] [%(name)s:%(lineno)d] %(message)s"
    else:
        format_str = (
            '{"timestamp": "%(asctime)s", "level": "%(levelname)s", '
            '"logger": "%(name)s", "message": "%(message)s"}'
        )

    formatter = StructuredFormatter(fmt=format_str, datefmt="%Y-%m-%dT%H:%M:%S%z")
    handler.setFormatter(formatter)
    root_logger.addHandler(handler)

    # Silence overly verbose third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

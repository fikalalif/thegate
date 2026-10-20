"""Unit tests for cryptographic security utilities."""

from app.core.security import (
    KEY_PREFIX,
    extract_key_prefix,
    generate_api_key,
    hash_api_key,
    verify_api_key,
)


def test_generate_api_key_format() -> None:
    """Assert generated API key starts with tg_live_ and has secure length."""
    key = generate_api_key()

    assert key.startswith(KEY_PREFIX)
    assert len(key) == len(KEY_PREFIX) + 32  # 8 + 32 = 40 characters


def test_generate_api_key_is_unique() -> None:
    """Assert consecutive calls generate unique random keys."""
    key1 = generate_api_key()
    key2 = generate_api_key()

    assert key1 != key2


def test_extract_key_prefix() -> None:
    """Assert key prefix extracts exactly the first 10 characters."""
    key = "tg_live_0123456789abcdef"
    prefix = extract_key_prefix(key)

    assert prefix == "tg_live_01"
    assert len(prefix) == 10


def test_hash_api_key_deterministic() -> None:
    """Assert hashing is deterministic and yields 64 hex characters (SHA-256)."""
    key = "tg_live_abcdef1234567890"
    hash1 = hash_api_key(key)
    hash2 = hash_api_key(key)

    assert hash1 == hash2
    assert len(hash1) == 64


def test_verify_api_key_success() -> None:
    """Assert verify_api_key succeeds with matching raw key and hash."""
    key = generate_api_key()
    stored_hash = hash_api_key(key)

    assert verify_api_key(key, stored_hash) is True


def test_verify_api_key_failure() -> None:
    """Assert verify_api_key fails with mismatched key."""
    key = generate_api_key()
    wrong_key = generate_api_key()
    stored_hash = hash_api_key(key)

    assert verify_api_key(wrong_key, stored_hash) is False
    assert verify_api_key("tg_live_wrong", stored_hash) is False

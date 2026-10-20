"""Cryptographic utilities for API key generation, hashing, and constant-time verification."""

import hashlib
import secrets

KEY_PREFIX = "tg_live_"


def generate_api_key() -> str:
    """Generate a secure cryptographically random API key with standard prefix."""
    random_part = secrets.token_hex(16)
    return f"{KEY_PREFIX}{random_part}"


def extract_key_prefix(raw_key: str) -> str:
    """Extract human-readable prefix (first 10 characters) for identification."""
    return raw_key[:10]


def hash_api_key(raw_key: str) -> str:
    """Compute SHA-256 hash of the plaintext API key."""
    return hashlib.sha256(raw_key.strip().encode("utf-8")).hexdigest()


def verify_api_key(raw_key: str, stored_hash: str) -> bool:
    """Verify raw API key against stored hash using constant-time comparison."""
    candidate_hash = hash_api_key(raw_key)
    return secrets.compare_digest(candidate_hash, stored_hash)

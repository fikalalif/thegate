"""Core authentication utilities for password verification and session tokens."""

import hashlib
import hmac
import secrets
import time
from typing import Tuple

DEFAULT_ADMIN_PASSWORD = "12345678"
SETTING_KEY_PASSWORD = "admin_password_hash"


def hash_password(plain_password: str) -> str:
    """Hash password with a random 16-byte salt using PBKDF2-HMAC-SHA256 (100,000 rounds)."""
    salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac(
        "sha256", plain_password.encode("utf-8"), bytes.fromhex(salt), 100000
    ).hex()
    return f"{salt}${hashed}"


def verify_password(plain_password: str, stored_hash: str) -> bool:
    """Verify plain password against stored salt$hash string in constant time."""
    try:
        if "$" not in stored_hash:
            return False
        salt_hex, expected_hash = stored_hash.split("$", 1)
        calculated = hashlib.pbkdf2_hmac(
            "sha256", plain_password.encode("utf-8"), bytes.fromhex(salt_hex), 100000
        ).hex()
        return secrets.compare_digest(calculated, expected_hash)
    except Exception:
        return False


def create_session_token(secret_key: str) -> str:
    """Create a tamper-proof signed session token."""
    timestamp = int(time.time())
    nonce = secrets.token_hex(8)
    payload = f"thegate_admin:{timestamp}:{nonce}"
    sig = hmac.new(secret_key.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{payload}:{sig}"


def verify_session_token(token: str, secret_key: str, max_age_seconds: int = 86400 * 30) -> bool:
    """Validate signed session token signature and expiration."""
    try:
        parts = token.split(":")
        if len(parts) != 4 or parts[0] != "thegate_admin":
            return False
        _, ts_str, nonce, sig = parts
        timestamp = int(ts_str)
        # Expiration check
        if time.time() - timestamp > max_age_seconds or timestamp > time.time() + 300:
            return False
        payload = f"thegate_admin:{timestamp}:{nonce}"
        expected_sig = hmac.new(
            secret_key.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256
        ).hexdigest()
        return secrets.compare_digest(sig, expected_sig)
    except Exception:
        return False

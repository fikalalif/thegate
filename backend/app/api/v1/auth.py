"""Authentication and access password management API."""

from datetime import datetime
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import (
    DEFAULT_ADMIN_PASSWORD,
    SETTING_KEY_PASSWORD,
    create_session_token,
    hash_password,
    verify_password,
    verify_session_token,
)
from app.core.config import get_settings
from app.db.base import Base
from app.db.models.system_settings import SystemSetting
from app.db.session import get_db_session, get_engine
from app.schemas.auth import (
    AuthStatusResponse,
    ChangePasswordRequest,
    ChangePasswordResponse,
    LoginRequest,
    LoginResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


async def ensure_system_settings_table() -> None:
    """Ensure the system_settings table exists in database."""
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_or_seed_password_hash(session: AsyncSession) -> tuple[str, bool]:
    """Retrieve stored password hash or auto-seed with default '12345678'."""
    await ensure_system_settings_table()

    stmt = select(SystemSetting).where(SystemSetting.key == SETTING_KEY_PASSWORD)
    res = await session.execute(stmt)
    setting = res.scalars().first()

    if not setting:
        default_hash = hash_password(DEFAULT_ADMIN_PASSWORD)
        new_setting = SystemSetting(
            key=SETTING_KEY_PASSWORD,
            value=default_hash,
            updated_at=datetime.utcnow(),
        )
        session.add(new_setting)
        await session.commit()
        return default_hash, True

    is_default = verify_password(DEFAULT_ADMIN_PASSWORD, setting.value)
    return setting.value, is_default


@router.post("/login", response_model=LoginResponse)
async def login(
    payload: LoginRequest,
    session: AsyncSession = Depends(get_db_session),
) -> LoginResponse:
    """Authenticate using access password (default: 12345678)."""
    stored_hash, is_default = await get_or_seed_password_hash(session)

    if not verify_password(payload.password, stored_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access password. Default is 12345678.",
        )

    settings = get_settings()
    token = create_session_token(settings.secret_key)

    return LoginResponse(
        success=True,
        token=token,
        message="Authenticated successfully",
        is_default_password=is_default,
    )


@router.get("/status", response_model=AuthStatusResponse)
async def get_auth_status(
    authorization: str | None = Header(default=None),
    session: AsyncSession = Depends(get_db_session),
) -> AuthStatusResponse:
    """Check if current session token is valid and if default password is in use."""
    _, is_default = await get_or_seed_password_hash(session)

    authenticated = False
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:].strip()
        settings = get_settings()
        authenticated = verify_session_token(token, settings.secret_key)

    return AuthStatusResponse(
        authenticated=authenticated,
        is_default_password=is_default,
    )


@router.post("/change-password", response_model=ChangePasswordResponse)
async def change_password(
    payload: ChangePasswordRequest,
    authorization: str | None = Header(default=None),
    session: AsyncSession = Depends(get_db_session),
) -> ChangePasswordResponse:
    """Change access password after validating current password."""
    stored_hash, _ = await get_or_seed_password_hash(session)

    if not verify_password(payload.current_password, stored_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )

    if len(payload.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long.",
        )

    new_hash = hash_password(payload.new_password)

    stmt = select(SystemSetting).where(SystemSetting.key == SETTING_KEY_PASSWORD)
    res = await session.execute(stmt)
    setting = res.scalars().first()

    if setting:
        setting.value = new_hash
        setting.updated_at = datetime.utcnow()
    else:
        setting = SystemSetting(
            key=SETTING_KEY_PASSWORD,
            value=new_hash,
            updated_at=datetime.utcnow(),
        )
        session.add(setting)

    await session.commit()

    settings = get_settings()
    new_token = create_session_token(settings.secret_key)

    return ChangePasswordResponse(
        success=True,
        token=new_token,
        message="Password updated successfully",
    )


@router.post("/logout")
async def logout() -> dict[str, str]:
    """Logout current session."""
    return {"success": "true", "message": "Logged out successfully"}

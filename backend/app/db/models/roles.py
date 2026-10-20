"""SQLAlchemy model for team roles and autonomous agent personas."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Role(Base):
    """Stores custom team roles, behavior contexts, and NPC avatar attributes."""

    __tablename__ = "roles"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    role_key: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    department: Mapped[str] = mapped_column(String(128), nullable=False)
    context_behavior: Mapped[str] = mapped_column(Text, nullable=False)
    preferred_model_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    hair_color: Mapped[str] = mapped_column(String(32), default="#4B2E1E", nullable=False)
    shirt_color: Mapped[str] = mapped_column(String(32), default="#2B5278", nullable=False)
    tie_color: Mapped[str | None] = mapped_column(String(32), nullable=True)
    has_glasses: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    has_headset: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    current_activity: Mapped[str] = mapped_column(String(64), default="idle", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

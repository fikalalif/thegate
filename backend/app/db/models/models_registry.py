"""SQLAlchemy model for model registry."""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import JSON, Boolean, DateTime, Integer, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ModelRegistry(Base):
    """Stores known model metadata, capabilities, context limits, and adapter mapping."""

    __tablename__ = "models_registry"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    internal_name: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    backend_model_id: Mapped[str] = mapped_column(String(128), nullable=False)
    provider_adapter: Mapped[str] = mapped_column(String(64), default="9router", nullable=False)
    capabilities: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    context_limit: Mapped[int | None] = mapped_column(Integer, nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    pricing_entries: Mapped[list["ModelPricing"]] = relationship(  # type: ignore[name-defined] # noqa: F821
        "ModelPricing", back_populates="model", cascade="all, delete-orphan", lazy="selectin"
    )
    requests: Mapped[list["Request"]] = relationship(  # type: ignore[name-defined] # noqa: F821
        "Request", back_populates="selected_model", lazy="selectin"
    )

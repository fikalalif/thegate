"""SQLAlchemy model for request attempts and fallback tracking."""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class RequestAttempt(Base):
    """Tracks isolated execution attempts, preventing cost double-counting on retry/fallback."""

    __tablename__ = "request_attempts"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("requests.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    attempt_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    model_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("models_registry.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False)  # success, failed, aborted
    error_category: Mapped[str | None] = mapped_column(String(64), nullable=True)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    usage_metadata: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    request: Mapped["Request"] = relationship(  # type: ignore[name-defined] # noqa: F821
        "Request", back_populates="attempts"
    )

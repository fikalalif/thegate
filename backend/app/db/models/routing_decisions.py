"""SQLAlchemy model for routing decision audit records."""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, Numeric, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class RoutingDecision(Base):
    """Audit record capturing the rationale and candidates considered for each routing decision."""

    __tablename__ = "routing_decisions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("requests.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    strategy_name: Mapped[str] = mapped_column(String(64), nullable=False)
    strategy_version: Mapped[str] = mapped_column(String(32), default="1.0.0", nullable=False)
    selected_model_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("models_registry.id", ondelete="SET NULL"), nullable=True
    )
    decision_reason: Mapped[str | None] = mapped_column(String(512), nullable=True)
    candidate_summary: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    estimated_cost: Mapped[Decimal | None] = mapped_column(Numeric(12, 6), nullable=True)
    decision_latency_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    request: Mapped["Request"] = relationship(  # type: ignore[name-defined] # noqa: F821
        "Request", back_populates="routing_decision"
    )

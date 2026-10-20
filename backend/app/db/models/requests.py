"""SQLAlchemy model for API requests metadata (Privacy by Default)."""

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Request(Base):
    """Stores request metadata, tokens, and costs with zero prompt content persistence."""

    __tablename__ = "requests"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    api_key_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("api_keys.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    routing_policy_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("routing_policies.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    routing_policy_version: Mapped[int | None] = mapped_column(Integer, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, index=True
    )  # completed, failed, cancelled
    selected_model_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("models_registry.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    input_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    output_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cost_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 6), nullable=True)
    cost_currency: Mapped[str] = mapped_column(String(8), default="USD", nullable=False)
    cost_type: Mapped[str] = mapped_column(
        String(32), default="UNKNOWN", nullable=False
    )  # PROVIDER_REPORTED, ESTIMATED, UNKNOWN
    baseline_cost_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 6), nullable=True)
    estimated_savings_percent: Mapped[Decimal | None] = mapped_column(Numeric(6, 2), nullable=True)
    routing_latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    provider_latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    stream_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    error_category: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # Relationships
    api_key: Mapped["ApiKey | None"] = relationship(  # type: ignore[name-defined] # noqa: F821
        "ApiKey", back_populates="requests", lazy="selectin"
    )
    routing_policy: Mapped["RoutingPolicy | None"] = relationship(  # type: ignore[name-defined] # noqa: F821
        "RoutingPolicy", back_populates="requests", lazy="selectin"
    )
    selected_model: Mapped["ModelRegistry | None"] = relationship(  # type: ignore[name-defined] # noqa: F821
        "ModelRegistry", back_populates="requests", lazy="selectin"
    )
    routing_decision: Mapped["RoutingDecision | None"] = relationship(  # type: ignore[name-defined] # noqa: F821
        "RoutingDecision",
        back_populates="request",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    attempts: Mapped[list["RequestAttempt"]] = relationship(  # type: ignore[name-defined] # noqa: F821
        "RequestAttempt",
        back_populates="request",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

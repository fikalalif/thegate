"""SQLAlchemy model for versioned model pricing."""

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ModelPricing(Base):
    """Stores versioned pricing rates per million tokens."""

    __tablename__ = "model_pricing"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    model_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("models_registry.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    input_price_per_million: Mapped[Decimal | None] = mapped_column(Numeric(12, 6), nullable=True)
    output_price_per_million: Mapped[Decimal | None] = mapped_column(Numeric(12, 6), nullable=True)
    currency: Mapped[str] = mapped_column(String(8), default="USD", nullable=False)
    effective_from: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    effective_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    source: Mapped[str | None] = mapped_column(String(128), nullable=True)
    validated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    model: Mapped["ModelRegistry"] = relationship(  # type: ignore[name-defined] # noqa: F821
        "ModelRegistry", back_populates="pricing_entries"
    )

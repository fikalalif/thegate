"""System settings and authentication state model."""

from datetime import datetime
from sqlalchemy import Column, DateTime, String, Text

from app.db.base import Base


class SystemSetting(Base):
    """Key-value system setting and auth store."""

    __tablename__ = "system_settings"

    key = Column(String(128), primary_key=True, index=True)
    value = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

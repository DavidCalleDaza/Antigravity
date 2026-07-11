import uuid
from datetime import datetime
from sqlalchemy import Boolean, String, DateTime, Numeric, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base


class CountrySetting(Base):
    """
    Represents the tax/currency configuration for a given country.

    Attributes:
        id: Unique identifier (UUID).
        country_code: ISO 3166-1 Alpha-2 code (e.g. 'CO', 'EC'). Unique — referenced
            by Location.country_code as a foreign key.
        country_name: Human-readable country name.
        default_tax_rate: Default VAT/IVA percentage applied to new invoice lines.
        is_active: If False, this configuration must not be used (validation layer
            should reject it and fall back to 0%).
    """
    __tablename__ = "country_settings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )
    country_code: Mapped[str] = mapped_column(
        String(10),
        unique=True,
        index=True,
        nullable=False,
    )
    country_name: Mapped[str] = mapped_column(String(100), nullable=False)
    default_tax_rate: Mapped[float] = mapped_column(
        Numeric(5, 2),
        nullable=False,
        server_default="0",
    )
    currency_code: Mapped[str | None] = mapped_column(String(3), nullable=True)
    currency_symbol: Mapped[str | None] = mapped_column(String(5), nullable=True)
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default="true",
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, onupdate=func.now())
"""
Servinow API — Services Module: ORM Models.

Defines the ``services`` table using SQLAlchemy 2.0.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base


class ServiceCategory(Base):
    """
    Represents a service category.

    Attributes:
        id: Unique identifier (UUID v4, auto-generated).
        name: Category display name.
        created_at: Timestamp of creation.
    """

    __tablename__ = "service_categories"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )


class Service(Base):
    """
    Represents a service offered to clients.

    Attributes:
        id: Unique identifier (UUID v4, auto-generated).
        name: Service display name.
        description: Optional service description.
        category_id: Service category ID.
        price: Service price (numeric, 2 decimal places).
        duration: Estimated duration (e.g., '30 min', '1 hora').
        status: Service availability status (active, inactive).
        image_url: Optional URL to service image.
        video_url: Optional URL to service video.
        created_at: Timestamp of creation (server-side default).
        updated_at: Timestamp of last update.
    """

    __tablename__ = "services"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(
        String(150), 
        nullable=False)

    description: Mapped[str | None] = mapped_column(
        Text, 
        nullable=True)

    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )

    price: Mapped[float] = mapped_column(
        Numeric(10, 2), 
        nullable=False, 
        default=0)
    duration: Mapped[str | None] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="active",
        server_default="active",
    )
    image_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    video_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        onupdate=func.now(),
    )
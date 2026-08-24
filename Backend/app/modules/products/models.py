"""
DonApp API — Products Module: ORM Models.

Defines the ``products`` table using SQLAlchemy 2.0.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class Product(Base):
    """
    Represents a product in the inventory.

    Attributes:
        id: Unique identifier (UUID v4, auto-generated).
        name: Product display name.
        description: Optional product description.
        category_id: Foreign key to the category (UUID, nullable).
        price: Product price (numeric, 2 decimal places).
        stock: Available inventory quantity.
        status: Product availability status (active, inactive, out_of_stock).
        image_url: Optional URL to product image.
        video_url: Optional URL to product video.
        user_id: ID of the user who created the product.
        created_at: Timestamp of creation (server-side default).
        updated_at: Timestamp of last update.
    """

    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Se reemplaza la columna antigua 'category' (String) por 'category_id' (UUID con FK)
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("categories.id", ondelete="RESTRICT"),
        nullable=True,
    )
    
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    stock: Mapped[int] = mapped_column(default=0, server_default="0")
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="active",
        server_default="active",
    )
    image_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    media_urls: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    video_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        comment="Usuario que creó el producto",
    )
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

    store_location_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("store_locations.id", ondelete="SET NULL"),
        nullable=True,
        comment="Sucursal donde se ofrece este producto",
    )

    category = relationship("Category", back_populates="products", lazy="selectin")
    user = relationship("User", lazy="joined", foreign_keys=[user_id])
    store_location = relationship("StoreLocation", lazy="joined")

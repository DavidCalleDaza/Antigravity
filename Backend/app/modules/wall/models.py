"""
DonApp API — Wall Module: ORM Models.

Defines the ``posts``, ``comments``, ``post_media`` and
``wall_post_customer_mentions`` tables using SQLAlchemy 2.0.
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class Post(Base):
    """
    Represents a wall post (e.g., donation, testimony).

    Attributes:
        id: Post UUID.
        author_id: UUID of the user who created the post.
        content: Post body text.
        type: Post category ('Donación', 'Testimonio', ...).
        created_at: Creation timestamp.
        media_url: Legacy single media URL (kept for compatibility).
        media_type: Legacy single media type (kept for compatibility).
        is_edited: Whether the post was edited.
        product_id: Optional linked product (max one of product/service).
        service_id: Optional linked service (max one of product/service).
    """

    __tablename__ = "posts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )
    author_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="General",
        server_default="General",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    media_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    media_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_edited: Mapped[bool] = mapped_column(Boolean, default=False, server_default='false')

    product_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    service_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("services.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    author: Mapped["User"] = relationship("User", lazy="selectin", innerjoin=True)
    comments: Mapped[list["Comment"]] = relationship(
        "Comment",
        lazy="selectin",
        cascade="all, delete-orphan",
        order_by="Comment.created_at",
    )
    media: Mapped[list["PostMedia"]] = relationship(
        "PostMedia",
        lazy="selectin",
        cascade="all, delete-orphan",
        order_by="PostMedia.position",
    )
    customer_mentions: Mapped[list["PostCustomerMention"]] = relationship(
        "PostCustomerMention",
        lazy="selectin",
        cascade="all, delete-orphan",
        order_by="PostCustomerMention.created_at",
    )
    product: Mapped["Product"] = relationship("Product", lazy="selectin")
    service: Mapped["Service"] = relationship("Service", lazy="selectin")

    @property
    def linked_item(self) -> dict | None:
        """
        Lightweight computed payload for the API response: exposes a compact
        summary of the linked product/service without leaking the full object.
        """
        if self.product is not None:
            return {
                "id": self.product.id,
                "name": self.product.name,
                "price": float(self.product.price) if self.product.price is not None else None,
                "image_url": self.product.image_url,
                "kind": "product",
            }
        if self.service is not None:
            return {
                "id": self.service.id,
                "name": self.service.name,
                "price": float(self.service.price) if self.service.price is not None else None,
                "image_url": self.service.image_url,
                "kind": "service",
            }
        return None


class Comment(Base):
    """
    Represents a comment on a wall post.
    """

    __tablename__ = "comments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False,
    )
    post_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False,
    )
    author_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )
    media_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    media_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_edited: Mapped[bool] = mapped_column(Boolean, default=False, server_default='false')

    author: Mapped["User"] = relationship("User", lazy="selectin", innerjoin=True)


class PostMedia(Base):
    """
    Media attached to a wall post. Supports multiple images per post;
    ``posts.media_url``/``media_type`` are kept as legacy compatibility fields.
    """

    __tablename__ = "post_media"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False,
    )
    post_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    media_url: Mapped[str] = mapped_column(String(255), nullable=False)
    media_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    position: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )


class PostCustomerMention(Base):
    """
    Customer mention on a wall post, gated by explicit consent.

    The mention starts in ``pending`` status and is only revealed publicly
    once the customer confirms it through a single-use token link. The API
    response schema hides business names until ``status == "confirmed"``.
    """

    __tablename__ = "wall_post_customer_mentions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False,
    )
    post_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    mentioned_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True,
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending", server_default="pending", index=True,
    )
    confirm_token: Mapped[str | None] = mapped_column(
        String(64), nullable=True, unique=True, index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    post: Mapped["Post"] = relationship("Post", back_populates="customer_mentions")
    customer: Mapped["Customer"] = relationship("Customer", lazy="selectin")

    @property
    def business_name(self) -> str | None:
        return self.customer.business_name if self.customer else None

    @property
    def trade_name(self) -> str | None:
        return self.customer.trade_name if self.customer else None
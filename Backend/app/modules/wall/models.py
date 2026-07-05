"""
Servinow API — Wall Module: ORM Models.

Defines the ``posts`` and ``comments`` tables using SQLAlchemy 2.0.
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class Post(Base):
    """
    Represents a wall post (e.g., donation, testimony).

    Attributes:
        id: Unique identifier (UUID v4, auto-generated).
        author_id: FK to users.id.
        content: Post body text.
        type: Category label (e.g., 'Donación', 'Testimonio').
        created_at: Timestamp of creation (server-side default).
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

    author: Mapped["User"] = relationship(
        "User",
        lazy="selectin",
        innerjoin=True,
    )
    comments: Mapped[list["Comment"]] = relationship(
        "Comment",
        lazy="selectin",
        cascade="all, delete-orphan",
        order_by="Comment.created_at",
    )


class Comment(Base):
    """
    Represents a comment on a wall post.

    Attributes:
        id: Unique identifier (UUID v4, auto-generated).
        post_id: FK to posts.id.
        author_id: FK to users.id.
        content: Comment body text.
        created_at: Timestamp of creation (server-side default).
    """

    __tablename__ = "comments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )
    post_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("posts.id", ondelete="CASCADE"),
        nullable=False,
    )
    author_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    media_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    media_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_edited: Mapped[bool] = mapped_column(Boolean, default=False, server_default='false')

    author: Mapped["User"] = relationship(
        "User",
        lazy="selectin",
        innerjoin=True,
    )

"""
Servinow API — Auth Module: User ORM Model.

Defines the ``users`` table schema using SQLAlchemy 2.0 mapped columns.
Supports role-based access control with three predefined roles:
admin, seller, and client.
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base


class User(Base):
    """
    Represents an application user.

    Attributes:
        id: Unique identifier (UUID v4, auto-generated).
        email: Unique email address used for authentication.
        hashed_password: Bcrypt hash of the user's password.
        full_name: Display name of the user.
        role: Access-control role. One of ``admin``, ``seller``, ``client``.
        is_active: Soft-delete flag. Inactive users cannot authenticate.
        created_at: Timestamp of account creation (server-side default).
    """

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )
    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    full_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )
    role: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="client",
        server_default="client",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    avatar_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
        default=None,
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id!r}, email={self.email!r}, role={self.role!r})>"

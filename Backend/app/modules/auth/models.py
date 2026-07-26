"""
Servinow API — Auth Module: User ORM Model.

Defines the ``users`` table schema using SQLAlchemy 2.0 mapped columns.
Supports role-based access control with three predefined roles:
admin, seller, and client.
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, func, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.modules.locations.models import Location


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
    hashed_password: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
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
    is_staff: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
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
    location_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("locations.id", ondelete="SET NULL"),
        nullable=True,
    )

    location: Mapped["Location"] = relationship(lazy="joined")

    social_accounts = relationship(
        "SocialAccount",
        foreign_keys="[SocialAccount.user_id]",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    identities = relationship(
        "UserIdentity",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    store_locations = relationship(
        "StoreLocation",
        back_populates="user",
        foreign_keys="[StoreLocation.user_id]",
        cascade="all, delete-orphan",
    )

    availability_templates = relationship(
        "AvailabilityTemplate",
        back_populates="user",
        foreign_keys="[AvailabilityTemplate.user_id]",
        cascade="all, delete-orphan",
    )

    availability_overrides = relationship(
        "AvailabilityOverride",
        back_populates="user",
        foreign_keys="[AvailabilityOverride.user_id]",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id!r}, email={self.email!r}, role={self.role!r})>"


from sqlalchemy import UniqueConstraint

class UserIdentity(Base):
    __tablename__ = "user_identities"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    provider_id: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="identities")

    __table_args__ = (UniqueConstraint("provider", "provider_id", name="uq_provider_provider_id"),)

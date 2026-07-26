"""
Servinow API — Auth Module: Pydantic Schemas.

Defines request/response validation models for user-related endpoints.
These schemas form the API contract visible in Swagger/ReDoc.
"""

import uuid
from datetime import datetime
from enum import Enum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

from app.modules.locations.schemas import LocationCreate, LocationResponse


class UserRole(str, Enum):
    """Allowed user roles for role-based access control."""

    ADMIN = "admin"
    SELLER = "seller"
    CLIENT = "client"


# ── Base Schemas ─────────────────────────────────────────────────────────────


class UserBase(BaseModel):
    """
    Shared fields for user creation and response payloads.

    Attributes:
        email: Valid email address (validated by Pydantic).
        full_name: Display name, between 2 and 150 characters.
        role: One of admin, seller, client. Defaults to client.
    """

    email: Annotated[
        str,
        Field(
            ...,
            description="User's email address.",
            examples=["usuario@servinow.com"],
            max_length=255,
        ),
    ]
    full_name: Annotated[
        str,
        Field(
            ...,
            description="User's full display name.",
            examples=["David Calle"],
            min_length=2,
            max_length=150,
        ),
    ]
    role: Annotated[
        UserRole,
        Field(
            default=UserRole.CLIENT,
            description="User role for access control.",
            examples=["client"],
        ),
    ]
    location: Annotated[LocationCreate | None, Field(default=None)] = None


# ── Request Schemas ──────────────────────────────────────────────────────────


class UserCreate(UserBase):
    """
    Schema for user registration requests.

    Extends ``UserBase`` with a plain-text password that will be
    hashed before storage.
    """

    password: Annotated[
        str,
        Field(
            ...,
            description="Plain-text password (min 8 characters).",
            min_length=8,
            max_length=128,
            examples=["SecureP@ss123"],
        ),
    ]


class UserLogin(BaseModel):
    """Schema for user login requests."""

    email: Annotated[
        str,
        Field(
            ...,
            description="User email address.",
            examples=["usuario@servinow.com"],
            max_length=255,
        ),
    ]
    password: Annotated[
        str,
        Field(
            ...,
            description="Plain-text password.",
            examples=["SecureP@ss123"],
        ),
    ]


class TokenResponse(BaseModel):
    """Schema for authentication token response."""

    access_token: Annotated[str, Field(description="JWT access token.")]
    token_type: Annotated[str, Field(description="Token type (always 'bearer').")]
    user: Annotated["UserResponse", Field(description="User profile data.")]


class UserUpdate(BaseModel):
    """
    Schema for partial user profile updates.

    All fields are optional — only provided fields will be updated.
    """

    full_name: Annotated[
        str | None,
        Field(
            default=None,
            description="Updated display name.",
            min_length=2,
            max_length=150,
        ),
    ]
    role: Annotated[
        UserRole | None,
        Field(
            default=None,
            description="Updated user role.",
        ),
    ]
    is_active: Annotated[
        bool | None,
        Field(
            default=None,
            description="Activate or deactivate the user.",
        ),
    ]
    location: Annotated[LocationCreate | None, Field(default=None)] = None


class UserUpdateMe(BaseModel):
    """Schema for the current user to update their own profile."""

    full_name: Annotated[
        str | None,
        Field(
            default=None,
            description="Updated display name.",
            min_length=2,
            max_length=150,
        ),
    ]
    email: Annotated[
        str | None,
        Field(
            default=None,
            description="Updated email address.",
            max_length=255,
        ),
    ]
    avatar_url: Annotated[
        str | None,
        Field(
            default=None,
            description="Updated avatar URL.",
            max_length=500,
        ),
    ]
    location: Annotated[LocationCreate | None, Field(default=None)] = None


# ── Response Schemas ─────────────────────────────────────────────────────────


class UserResponse(UserBase):
    """
    Schema for user data returned in API responses.

    Configured with ``from_attributes = True`` so it can be constructed
    directly from SQLAlchemy ORM instances.
    """

    model_config = ConfigDict(from_attributes=True)

    id: Annotated[
        uuid.UUID,
        Field(description="Unique user identifier (UUID v4)."),
    ]
    is_active: Annotated[
        bool,
        Field(description="Whether the user account is active."),
    ]
    is_staff: Annotated[
        bool,
        Field(description="Whether the user is a staff member.", default=False),
    ] = False
    created_at: Annotated[
        datetime,
        Field(description="Timestamp of account creation."),
    ]
    avatar_url: Annotated[
        str | None,
        Field(description="URL of the user's avatar image.", default=None),
    ]
    location: Annotated[LocationResponse | None, Field(default=None)] = None


class PasswordRecoveryRequest(BaseModel):
    """Schema for password recovery request."""

    email: Annotated[
        str,
        Field(
            ...,
            description="Email address to send the recovery code to.",
            examples=["usuario@servinow.com"],
            max_length=255,
        ),
    ]


class PasswordRecoveryReset(BaseModel):
    """Schema to reset password using recovery code."""

    email: Annotated[
        str,
        Field(
            ...,
            description="User email address.",
            examples=["usuario@servinow.com"],
            max_length=255,
        ),
    ]
    code: Annotated[
        str,
        Field(
            ...,
            description="6-digit verification code received by email.",
            examples=["123456"],
            min_length=6,
            max_length=6,
        ),
    ]
    new_password: Annotated[
        str,
        Field(
            ...,
            description="New plain-text password.",
            min_length=8,
            max_length=128,
            examples=["NewSecureP@ss123"],
        ),
    ]

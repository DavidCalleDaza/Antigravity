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
    country: Annotated[
        str | None,
        Field(default=None, description="Country (País)", max_length=100),
    ] = None
    state: Annotated[
        str | None,
        Field(default=None, description="State/Department (Departamento)", max_length=100),
    ] = None
    city: Annotated[
        str | None,
        Field(default=None, description="City (Ciudad)", max_length=100),
    ] = None
    neighborhood: Annotated[
        str | None,
        Field(default=None, description="Neighborhood (Barrio/Sector)", max_length=150),
    ] = None
    address: Annotated[
        str | None,
        Field(default=None, description="Address (Dirección)", max_length=255),
    ] = None


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
    country: Annotated[str | None, Field(default=None, max_length=100)] = None
    state: Annotated[str | None, Field(default=None, max_length=100)] = None
    city: Annotated[str | None, Field(default=None, max_length=100)] = None
    neighborhood: Annotated[str | None, Field(default=None, max_length=150)] = None
    address: Annotated[str | None, Field(default=None, max_length=255)] = None


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
    country: Annotated[str | None, Field(default=None, max_length=100)] = None
    state: Annotated[str | None, Field(default=None, max_length=100)] = None
    city: Annotated[str | None, Field(default=None, max_length=100)] = None
    neighborhood: Annotated[str | None, Field(default=None, max_length=150)] = None
    address: Annotated[str | None, Field(default=None, max_length=255)] = None


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
    created_at: Annotated[
        datetime,
        Field(description="Timestamp of account creation."),
    ]
    avatar_url: Annotated[
        str | None,
        Field(description="URL of the user's avatar image.", default=None),
    ]

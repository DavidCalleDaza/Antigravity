"""
Servinow API — Services Module: Schemas.

Defines request/response validation models for services.
"""

import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field


class ServiceCategoryResponse(BaseModel):
    """Schema for service category data returned in API responses."""

    model_config = ConfigDict(from_attributes=True)

    id: Annotated[uuid.UUID, Field(description="Category UUID.")]
    name: Annotated[str, Field(description="Category name.")]


class ServiceBase(BaseModel):
    """Shared fields for service creation and response."""

    name: Annotated[
        str,
        Field(
            ...,
            description="Service name.",
            min_length=1,
            max_length=150,
        ),
    ]
    description: Annotated[str | None, Field(None, description="Service description.")]
    category_id: Annotated[
        uuid.UUID | None,
        Field(default=None, description="Service category ID."),
    ]
    price: Annotated[float, Field(default=0, description="Service price.", ge=0)]
    duration: Annotated[int | None, Field(None, description="Estimated duration.")]
    status: Annotated[
        str,
        Field(
            default="active",
            description="Service status (active, inactive).",
            max_length=20,
        ),
    ]


class ServiceCreate(ServiceBase):
    """Schema for creating a new service."""

    image_url: Annotated[str | None, Field(None)] = None
    video_url: Annotated[str | None, Field(None)] = None


class ServiceUpdate(BaseModel):
    """Schema for updating an existing service."""

    name: Annotated[str | None, Field(None, min_length=1, max_length=150)]
    description: Annotated[str | None, Field(None)]
    category_id: Annotated[uuid.UUID | None, Field(None)]
    price: Annotated[float | None, Field(None, ge=0)]
    duration: Annotated[int | None, Field(None)]
    status: Annotated[str | None, Field(None, max_length=20)]
    image_url: Annotated[str | None, Field(None)]
    video_url: Annotated[str | None, Field(None)]


class ServiceResponse(ServiceBase):
    """Schema for service data returned in API responses."""

    model_config = ConfigDict(from_attributes=True)

    id: Annotated[uuid.UUID, Field(description="Service UUID.")]
    user_id: Annotated[uuid.UUID | None, Field(None, description="User UUID.")]
    image_url: Annotated[str | None, Field(None, description="Optional image URL.")]
    video_url: Annotated[str | None, Field(None, description="Optional video URL.")]
    created_at: Annotated[datetime, Field(description="Creation timestamp.")]
    updated_at: Annotated[datetime | None, Field(None, description="Last update timestamp.")]
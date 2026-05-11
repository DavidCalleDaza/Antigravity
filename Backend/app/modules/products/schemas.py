"""
Servinow API — Products Module: Schemas.

Defines request/response validation models for products.
"""

import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field


class ProductBase(BaseModel):
    """Shared fields for product creation and response."""

    name: Annotated[
        str,
        Field(
            ...,
            description="Product name.",
            min_length=1,
            max_length=150,
        ),
    ]
    description: Annotated[str | None, Field(None, description="Product description.")]
    category: Annotated[
        str,
        Field(
            default="General",
            description="Product category.",
            max_length=50,
        ),
    ]
    price: Annotated[float, Field(..., description="Product price.", ge=0)]
    stock: Annotated[int, Field(default=0, description="Available stock.", ge=0)]
    status: Annotated[
        str,
        Field(
            default="active",
            description="Product status (active, inactive, out_of_stock).",
            max_length=20,
        ),
    ]


class ProductCreate(ProductBase):
    """Schema for creating a new product."""

    image_url: Annotated[str | None, Field(None)] = None
    video_url: Annotated[str | None, Field(None)] = None


class ProductUpdate(BaseModel):
    """Schema for updating an existing product."""

    name: Annotated[str | None, Field(None, min_length=1, max_length=150)]
    description: Annotated[str | None, Field(None)]
    category: Annotated[str | None, Field(None, max_length=50)]
    price: Annotated[float | None, Field(None, ge=0)]
    stock: Annotated[int | None, Field(None, ge=0)]
    status: Annotated[str | None, Field(None, max_length=20)]
    image_url: Annotated[str | None, Field(None)]
    video_url: Annotated[str | None, Field(None)]


class ProductResponse(ProductBase):
    """Schema for product data returned in API responses."""

    model_config = ConfigDict(from_attributes=True)

    id: Annotated[uuid.UUID, Field(description="Product UUID.")]
    image_url: Annotated[str | None, Field(None, description="Optional image URL.")]
    video_url: Annotated[str | None, Field(None, description="Optional video URL.")]
    created_at: Annotated[datetime, Field(description="Creation timestamp.")]
    updated_at: Annotated[datetime | None, Field(None, description="Last update timestamp.")]
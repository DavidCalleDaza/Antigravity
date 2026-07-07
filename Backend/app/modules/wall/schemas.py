"""
Servinow API — Wall Module: Pydantic Schemas.

Defines request/response validation models for wall posts and comments.
"""

import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field


class AuthorBrief(BaseModel):
    """Simplified author data included in posts and comments."""

    model_config = ConfigDict(from_attributes=True)

    id: Annotated[uuid.UUID, Field(description="User UUID.")]
    full_name: Annotated[str, Field(description="User display name.")]
    avatar_url: Annotated[str | None, Field(description="Avatar URL.", default=None)]


# --- Comments ---

class CommentBase(BaseModel):
    """Shared fields for comment creation and response."""

    content: Annotated[
        str,
        Field(
            ...,
            description="Comment text.",
            min_length=0,
            max_length=2000,
        ),
    ]


class CommentCreate(CommentBase):
    """Schema for creating a new comment."""
    media_url: Annotated[str | None, Field(None)] = None
    media_type: Annotated[str | None, Field(None)] = None


class CommentUpdate(BaseModel):
    """Schema for updating an existing comment."""
    content: Annotated[str | None, Field(None, min_length=0, max_length=2000)]


class CommentResponse(CommentBase):
    """Schema for comment data returned in API responses."""

    model_config = ConfigDict(from_attributes=True)

    id: Annotated[uuid.UUID, Field(description="Comment UUID.")]
    post_id: Annotated[uuid.UUID, Field(description="Parent post UUID.")]
    author_id: Annotated[uuid.UUID, Field(description="Author UUID.")]
    author: Annotated[AuthorBrief, Field(description="Author summary.")]
    created_at: Annotated[datetime, Field(description="Creation timestamp.")]
    media_url: Annotated[str | None, Field(None, description="Optional media URL.")]
    media_type: Annotated[str | None, Field(None, description="Optional media type.")]
    is_edited: Annotated[bool, Field(False, description="Whether the comment was edited.")]


# --- Posts ---

class PostBase(BaseModel):
    """Shared fields for post creation and response."""

    content: Annotated[
        str,
        Field(
            ...,
            description="Post body text.",
            min_length=0,
            max_length=5000,
        ),
    ]
    type: Annotated[
        str,
        Field(
            default="General",
            description="Post category (e.g., 'Donación', 'Testimonio').",
            max_length=50,
        ),
    ]


class PostCreate(PostBase):
    """Schema for creating a new post."""
    media_url: Annotated[str | None, Field(None)] = None
    media_type: Annotated[str | None, Field(None)] = None


class PostUpdate(BaseModel):
    """Schema for updating an existing post."""
    content: Annotated[str | None, Field(None, min_length=0, max_length=5000)]
    type: Annotated[str | None, Field(None, max_length=50)]


class PostResponse(PostBase):
    """Schema for post data returned in API responses."""

    model_config = ConfigDict(from_attributes=True)

    id: Annotated[uuid.UUID, Field(description="Post UUID.")]
    author_id: Annotated[uuid.UUID, Field(description="Author UUID.")]
    author: Annotated[AuthorBrief, Field(description="Author summary.")]
    created_at: Annotated[datetime, Field(description="Creation timestamp.")]
    media_url: Annotated[str | None, Field(None, description="Optional media URL.")]
    media_type: Annotated[str | None, Field(None, description="Optional media type.")]
    is_edited: Annotated[bool, Field(False, description="Whether the post was edited.")]
    comments: Annotated[
        list[CommentResponse],
        Field(description="Comments on this post.", default_factory=list),
    ]

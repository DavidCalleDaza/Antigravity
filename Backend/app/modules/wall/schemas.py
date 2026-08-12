import uuid
from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class AuthorBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: Annotated[uuid.UUID, Field(description="User UUID.")]
    full_name: Annotated[str, Field(description="User display name.")]
    avatar_url: Annotated[str | None, Field(description="Avatar URL.", default=None)]


# --- Linked items (product/service) ---
class LinkedItemBrief(BaseModel):
    """
    Compact summary of the product/service linked to a post.
    Does not expose full product/service objects.
    """

    model_config = ConfigDict(from_attributes=True)
    id: Annotated[uuid.UUID, Field(description="Linked item UUID.")]
    name: Annotated[str, Field(description="Item name.")]
    price: Annotated[float | None, Field(description="Item price.", default=None)]
    image_url: Annotated[str | None, Field(description="Item image URL.", default=None)]
    kind: Annotated[str, Field(description="Item kind: 'product' or 'service'.")]


# --- Media ---
class PostMediaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: Annotated[uuid.UUID, Field(description="Media UUID.")]
    post_id: Annotated[uuid.UUID, Field(description="Parent post UUID.")]
    media_url: Annotated[str, Field(description="Media URL.")]
    media_type: Annotated[str | None, Field(description="Media MIME type.", default=None)]
    position: Annotated[int, Field(description="Order within the post.", default=0)]


# --- Customer mentions ---
class CustomerMentionBrief(BaseModel):
    """
    Mention summary. Business name is only exposed once the customer
    explicitly confirmed the mention; otherwise it is forced to None
    at the schema level (never trust the frontend to hide it).
    """

    model_config = ConfigDict(from_attributes=True)
    id: Annotated[uuid.UUID, Field(description="Mention UUID.")]
    status: Annotated[str, Field(description="pending | confirmed | declined")]
    business_name: Annotated[str | None, Field(description="Customer business name, only when confirmed.", default=None)]
    trade_name: Annotated[str | None, Field(description="Customer trade name, only when confirmed.", default=None)]

    @model_validator(mode="after")
    def _hide_unconfirmed_names(self) -> "CustomerMentionBrief":
        if self.status != "confirmed":
            self.business_name = None
            self.trade_name = None
        return self


# --- Comments ---
class CommentBase(BaseModel):
    content: Annotated[str, Field(..., description="Comment text.", min_length=0, max_length=2000)]

class CommentCreate(CommentBase):
    media_url: Annotated[str | None, Field(None)] = None
    media_type: Annotated[str | None, Field(None)] = None

class CommentUpdate(BaseModel):
    content: Annotated[str | None, Field(None, min_length=0, max_length=2000)]

class CommentResponse(CommentBase):
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
    content: Annotated[str, Field(..., description="Post body text.", min_length=0, max_length=5000)]
    type: Annotated[str, Field(default="General", description="Post category (e.g., 'Donación', 'Testimonio').", max_length=50)]

class PostCreate(PostBase):
    media_url: Annotated[str | None, Field(None)] = None
    media_type: Annotated[str | None, Field(None)] = None
    product_id: Annotated[uuid.UUID | None, Field(None, description="Linked product UUID (mutually exclusive with service_id).")] = None
    service_id: Annotated[uuid.UUID | None, Field(None, description="Linked service UUID (mutually exclusive with product_id).")] = None
    customer_ids: Annotated[list[uuid.UUID], Field(default_factory=list, description="Customer mentions awaiting consent.")]

    @model_validator(mode="after")
    def _validate_exclusive_link(self) -> "PostCreate":
        if self.product_id and self.service_id:
            raise ValueError("Un post puede vincular un producto o un servicio, no ambos.")
        return self

class PostUpdate(BaseModel):
    content: Annotated[str | None, Field(None, min_length=0, max_length=5000)]
    type: Annotated[str | None, Field(None, max_length=50)]

class PostResponse(PostBase):
    model_config = ConfigDict(from_attributes=True)
    id: Annotated[uuid.UUID, Field(description="Post UUID.")]
    author_id: Annotated[uuid.UUID, Field(description="Author UUID.")]
    author: Annotated[AuthorBrief, Field(description="Author summary.")]
    created_at: Annotated[datetime, Field(description="Creation timestamp.")]
    media_url: Annotated[str | None, Field(None, description="Legacy media URL.")]
    media_type: Annotated[str | None, Field(None, description="Legacy media type.")]
    is_edited: Annotated[bool, Field(False, description="Whether the post was edited.")]
    comments: Annotated[list[CommentResponse], Field(description="Comments on this post.", default_factory=list)]
    product_id: Annotated[uuid.UUID | None, Field(None, description="Linked product UUID.")] = None
    service_id: Annotated[uuid.UUID | None, Field(None, description="Linked service UUID.")] = None
    linked_item: Annotated[LinkedItemBrief | None, Field(None, description="Compact linked product/service summary.")] = None
    media: Annotated[list[PostMediaResponse], Field(description="Media attached to this post.", default_factory=list)]
    customer_mentions: Annotated[list[CustomerMentionBrief], Field(description="Customer mentions on this post.", default_factory=list)]


# --- Public mention consent (Fase 2) ---
class PublicMentionResponse(BaseModel):
    """Shown to the customer themselves through the single-use consent link."""
    business_name: Annotated[str | None, Field(None, description="Customer business name.")]
    trade_name: Annotated[str | None, Field(None, description="Customer trade name.")]
    author_name: Annotated[str, Field(description="Name of the user who mentioned the customer.")]
    post_snippet: Annotated[str, Field(description="First 200 characters of the post content.")]
    status: Annotated[str, Field(description="Current mention status.")]


class MentionRespondRequest(BaseModel):
    action: Annotated[Literal["confirm", "decline"], Field(description="Customer decision on the mention.")]
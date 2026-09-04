"""
DonApp API — Social Module: Pydantic Schemas.

Request/response models for social account management, publishing, and admin flows.
"""

from typing import Optional, List
from pydantic import BaseModel, ConfigDict
import uuid
from datetime import datetime


# ── Social Account ──────────────────────────────────────────────────────────

class SocialAccountBase(BaseModel):
    platform: str
    platform_user_id: Optional[str] = None
    platform_username: Optional[str] = None


class SocialAccountCreate(SocialAccountBase):
    """Used internally when saving an account from OAuth or manual flow."""
    access_token: str
    refresh_token: Optional[str] = None
    expires_at: Optional[datetime] = None
    # Multi-account fields (with defaults for backward compat)
    account_type: str = "personal"
    display_label: Optional[str] = None
    connection_method: str = "oauth"
    app_credential_id: Optional[uuid.UUID] = None


class SocialAccountUpdate(BaseModel):
    """PATCH /accounts/{account_id} — user-editable fields only."""
    account_type: Optional[str] = None
    display_label: Optional[str] = None
    is_default: Optional[bool] = None


class TokenRenewRequest(BaseModel):
    """PATCH /accounts/{account_id}/token — renew only the access token."""
    access_token: str


class SocialAccountResponse(SocialAccountBase):
    id: uuid.UUID
    platform_user_id: Optional[str] = None
    account_type: str = "personal"
    display_label: Optional[str] = None
    is_default: bool = False
    status: str = "active"
    last_error: Optional[str] = None
    last_verified_at: Optional[datetime] = None
    connection_method: str = "oauth"
    created_at: datetime
    last_modified_by: Optional[uuid.UUID] = None
    last_modified_at: Optional[datetime] = None
    # Expiration of the account's token (never expose the token itself)
    token_expires_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ── Manual credential flow ──────────────────────────────────────────────────

class ManualValidateRequest(BaseModel):
    platform_group: str  # "meta" o "tiktok"
    app_id: str
    app_secret: Optional[str] = None
    access_token: str

class ManualAuthorizeRequest(BaseModel):
    app_id: str
    app_secret: Optional[str] = None

class ManualConfirmRequest(BaseModel):
    """Shared with /admin/social/* — only OPTIONAL fields added to avoid breaking
    the frozen admin screen (decision #4)."""
    platform_group: str
    app_id: str
    app_secret: Optional[str] = None  # omitido => reusa el guardado
    access_token: str
    selected_account_id: str
    selected_account_name: Optional[str] = None
    instagram_business_account_id: Optional[str] = None
    instagram_username: Optional[str] = None
    # New optional fields for multi-account (defaults preserve backward compat)
    account_type: str = "personal"
    display_label: Optional[str] = None


class AppCredentialResponse(BaseModel):
    """Devuelve el App ID guardado. Nunca incluye el App Secret."""
    app_id: Optional[str] = None
    has_credential: bool = False


class RevealCredentialRequest(BaseModel):
    password: str


class AppCredentialReveal(BaseModel):
    app_id: str
    app_secret: str


# ── Social Post ─────────────────────────────────────────────────────────────

class SocialPostBase(BaseModel):
    platform: Optional[str] = None  # Now optional — derived from account when account_id present
    caption: Optional[str] = None
    media_url: Optional[str] = None           # Deprecated — kept for backward compat; prefer media_urls
    media_urls: Optional[List[str]] = None    # NEW: list of media URLs for multi-image posts
    product_id: Optional[uuid.UUID] = None
    service_id: Optional[uuid.UUID] = None
    is_ai_generated: bool = False


class SocialPostCreate(SocialPostBase):
    account_id: Optional[uuid.UUID] = None  # If absent → use default account for platform


class SocialPostResponse(SocialPostBase):
    id: uuid.UUID
    account_id: Optional[uuid.UUID] = None
    platform: Optional[str] = None
    status: str
    platform_post_id: Optional[str] = None
    error_message: Optional[str] = None
    published_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Batch Publishing ────────────────────────────────────────────────────────

class SocialBatchPostCreate(BaseModel):
    account_ids: List[uuid.UUID]
    caption: Optional[str] = None
    images: Optional[List[str]] = None
    videos: Optional[List[str]] = None
    product_id: Optional[uuid.UUID] = None
    service_id: Optional[uuid.UUID] = None
    is_ai_generated: bool = False


class SocialBatchPostResponse(BaseModel):
    total_posts: int
    posts: List[SocialPostResponse]


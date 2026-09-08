"""
DonApp API — Admin Users: Pydantic Schemas.
Request and response validation models for user administration.
"""

import uuid
from datetime import datetime
from typing import Annotated, List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.modules.locations.schemas import LocationResponse


class AdminUserResponse(BaseModel):
    """Full user payload for administrative views."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    full_name: str
    role: str
    is_active: bool = True
    is_staff: bool = False
    is_approved: bool = True
    needs_onboarding: bool = False
    avatar_url: Optional[str] = None
    business_name: Optional[str] = None
    created_at: datetime
    location: Optional[LocationResponse] = None


class AdminUserListResponse(BaseModel):
    """Paginated list of users."""
    items: List[AdminUserResponse]
    total: int
    page: int
    size: int


class AdminUserStatsResponse(BaseModel):
    """Consolidated KPI counters for administrative dashboard."""
    total_users: int
    total_admins: int
    total_sellers: int
    total_clients: int
    total_active: int
    total_inactive: int
    total_pending_approval: int


class AdminUserCreateRequest(BaseModel):
    """Schema to create a new user directly from the admin panel."""
    email: Annotated[str, Field(..., min_length=5, max_length=255)]
    full_name: Annotated[str, Field(..., min_length=2, max_length=150)]
    password: Annotated[str, Field(..., min_length=6, max_length=128)]
    role: Annotated[str, Field(default="client", pattern="^(admin|seller|client)$")]
    business_name: Optional[str] = None
    is_active: bool = True
    is_staff: bool = False
    is_approved: bool = True


class AdminUserUpdateRequest(BaseModel):
    """Schema for updating an existing user and their role."""
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = Field(default=None, pattern="^(admin|seller|client)$")
    business_name: Optional[str] = None
    is_active: Optional[bool] = None
    is_staff: Optional[bool] = None
    is_approved: Optional[bool] = None
    password: Optional[str] = Field(default=None, min_length=6, max_length=128)


class AdminUserBulkDeleteRequest(BaseModel):
    """Schema for bulk deletion / deactivation of users."""
    user_ids: List[uuid.UUID] = Field(..., min_length=1, description="List of user IDs to delete or deactivate")
    permanent: bool = Field(default=False, description="If True, performs hard delete. If False, deactivates.")


class AdminUserBulkDeleteResponse(BaseModel):
    """Result of bulk delete operation."""
    deleted_count: int
    skipped_count: int = 0
    message: str

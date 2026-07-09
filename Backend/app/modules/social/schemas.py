from typing import Optional
from pydantic import BaseModel, ConfigDict
import uuid
from datetime import datetime

class SocialAccountBase(BaseModel):
    platform: str
    platform_user_id: Optional[str] = None
    platform_username: Optional[str] = None

class SocialAccountCreate(SocialAccountBase):
    access_token: str
    refresh_token: Optional[str] = None
    expires_at: Optional[datetime] = None

class SocialAccountResponse(SocialAccountBase):
    id: uuid.UUID
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class SocialPostBase(BaseModel):
    platform: str
    caption: Optional[str] = None
    media_url: Optional[str] = None
    product_id: Optional[uuid.UUID] = None
    service_id: Optional[uuid.UUID] = None

class SocialPostCreate(SocialPostBase):
    pass

class SocialPostResponse(SocialPostBase):
    id: uuid.UUID
    status: str
    platform_post_id: Optional[str] = None
    error_message: Optional[str] = None
    published_at: Optional[datetime] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

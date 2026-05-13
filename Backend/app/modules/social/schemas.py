import uuid
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, ConfigDict, Field

class SocialPlatform(str, Enum):
    TIKTOK = "tiktok"
    INSTAGRAM = "instagram"
    FACEBOOK = "facebook"

class SocialAccountBase(BaseModel):
    platform: SocialPlatform
    platform_username: str | None = None

class SocialAccountResponse(SocialAccountBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: uuid.UUID
    created_at: datetime

class SocialPostBase(BaseModel):
    platform: SocialPlatform
    caption: str | None = None
    media_url: str | None = None
    product_id: uuid.UUID | None = None
    service_id: uuid.UUID | None = None

class SocialPostCreate(SocialPostBase):
    pass

class SocialPostResponse(SocialPostBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: uuid.UUID
    status: str
    published_at: datetime | None = None
    error_message: str | None = None
    created_at: datetime

import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict

class NotificationBase(BaseModel):
    type: str
    title: str
    message: str
    data_json: Optional[Dict[str, Any]] = None

class NotificationUpdate(BaseModel):
    is_read: bool

class NotificationResponse(NotificationBase):
    id: uuid.UUID
    user_id: uuid.UUID
    is_read: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

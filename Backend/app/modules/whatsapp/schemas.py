from pydantic import BaseModel, Field
from typing import List, Optional

class WhatsAppIntentResponse(BaseModel):
    intent: str = Field(description="'create_product', 'create_service', or 'unknown'")
    entities: dict = Field(description="Extracted entities: name, price, description, category")
    missing_fields: List[str] = Field(description="Required fields missing (name, price)")
    bot_reply: str = Field(description="Response to send back to the user via WhatsApp")

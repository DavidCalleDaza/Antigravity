import httpx
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

class WhatsAppService:
    """
    Service to interact with the Meta WhatsApp Cloud API.
    """
    def __init__(self):
        self.base_url = "https://graph.facebook.com/v20.0"
        self.phone_number_id = settings.WHATSAPP_PHONE_ID
        self.access_token = settings.WHATSAPP_ACCESS_TOKEN
        
        self.headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }

    async def send_text_message(self, to_phone: str, body: str) -> dict:
        """
        Sends a simple text message to the specified phone number.
        """
        url = f"{self.base_url}/{self.phone_number_id}/messages"
        
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to_phone,
            "type": "text",
            "text": {
                "preview_url": False,
                "body": body
            }
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, headers=self.headers, json=payload)
                response.raise_for_status()
                logger.info(f"Successfully sent WhatsApp message to {to_phone}")
                return response.json()
            except httpx.HTTPStatusError as e:
                logger.error(f"Failed to send WhatsApp message: {e.response.text}")
                raise
            except Exception as e:
                logger.error(f"Error connecting to WhatsApp API: {e}")
                raise

whatsapp_service = WhatsAppService()

import json
import logging
from google import genai
from app.core.config import settings
from app.modules.whatsapp.prompts import WHATSAPP_INTENT_SYSTEM_PROMPT
from app.modules.whatsapp.schemas import WhatsAppIntentResponse

logger = logging.getLogger(__name__)

async def parse_whatsapp_intent(user_text: str) -> WhatsAppIntentResponse:
    """
    Uses Gemini LLM to parse a natural language WhatsApp message into structured JSON.
    """

    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    
    prompt = f"{WHATSAPP_INTENT_SYSTEM_PROMPT}\n\nMensaje del usuario: \"{user_text}\""
    
    try:
        response = await client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config={
                "response_mime_type": "application/json",
            }
        )
        
        result = json.loads(response.text)
        return WhatsAppIntentResponse(**result)
        
    except Exception as e:
        logger.error(f"Failed to parse intent via Gemini: {e}")
        # Fallback empty response
        return WhatsAppIntentResponse(
            intent="unknown",
            entities={},
            missing_fields=["name", "price"],
            bot_reply="Lo siento, tuve un problema interno. ¿Podrías intentar de nuevo?"
        )

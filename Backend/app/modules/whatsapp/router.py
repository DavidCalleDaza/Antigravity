from fastapi import APIRouter, Request, Response, HTTPException, Depends
from fastapi.responses import PlainTextResponse
import hashlib
import hmac
import logging
import random
import string
import redis.asyncio as redis
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.db.session import get_db
from app.modules.auth.deps import get_current_user
from app.modules.auth.models import User, UserIdentity

logger = logging.getLogger(__name__)
router = APIRouter()
redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

@router.post("/link/otp")
async def generate_whatsapp_otp(current_user: User = Depends(get_current_user)):
    """
    Generates a 6-digit OTP for the authenticated user to link their WhatsApp account.
    The OTP is valid for 10 minutes.
    """
    otp = ''.join(random.choices(string.digits, k=6))
    redis_key = f"wa_otp:{otp}"
    
    # Check if this user already has a pending OTP and delete it to prevent spam
    user_otp_key = f"wa_otp_user:{current_user.id}"
    existing_otp = await redis_client.get(user_otp_key)
    if existing_otp:
        await redis_client.delete(f"wa_otp:{existing_otp}")
        
    # Save new OTP
    await redis_client.setex(redis_key, 600, str(current_user.id))
    await redis_client.setex(user_otp_key, 600, otp)
    
    return {"otp": otp, "expires_in_seconds": 600}

@router.get("/link/status")
async def get_link_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Check if the authenticated user has a WhatsApp number linked."""
    result = await db.execute(
        select(UserIdentity).filter(
            UserIdentity.user_id == current_user.id,
            UserIdentity.provider == "whatsapp",
        )
    )
    identity = result.scalars().first()
    if identity:
        phone = identity.provider_id
        masked = "•" * (len(phone) - 4) + phone[-4:]
        return {"linked": True, "phone_masked": masked}
    return {"linked": False}


@router.delete("/link")
async def unlink_whatsapp(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove the WhatsApp number linked to the authenticated user."""
    result = await db.execute(
        select(UserIdentity).filter(
            UserIdentity.user_id == current_user.id,
            UserIdentity.provider == "whatsapp",
        )
    )
    identity = result.scalars().first()
    if not identity:
        raise HTTPException(status_code=404, detail="No hay número vinculado")
    await db.delete(identity)
    return {"detail": "Número desvinculado correctamente"}


@router.get("/webhook")
async def verify_webhook(request: Request):
    """
    Meta Webhook Verification endpoint.
    Meta sends a GET request with hub.mode, hub.challenge, and hub.verify_token.
    """
    mode = request.query_params.get("hub.mode")
    challenge = request.query_params.get("hub.challenge")
    verify_token = request.query_params.get("hub.verify_token")

    if mode == "subscribe" and verify_token == settings.WHATSAPP_VERIFY_TOKEN:
        logger.info("WhatsApp Webhook verified successfully.")
        return PlainTextResponse(content=challenge, status_code=200)
    
    logger.warning("Failed WhatsApp Webhook verification. Invalid token.")
    raise HTTPException(status_code=403, detail="Verification failed")


def verify_signature(payload_body: bytes, signature_header: str | None) -> bool:
    """Validate X-Hub-Signature-256 from Meta using HMAC-SHA256."""
    if not signature_header or not signature_header.startswith("sha256="):
        return False
    expected = hmac.new(
        settings.META_APP_SECRET.encode("utf-8"),
        payload_body,
        hashlib.sha256,
    ).hexdigest()
    received = signature_header.split("sha256=", 1)[1]
    return hmac.compare_digest(expected, received)


@router.post("/webhook")
async def receive_message(request: Request):
    """Meta Webhook endpoint for incoming messages."""
    raw_body = await request.body()
    signature = request.headers.get("X-Hub-Signature-256")

    if not verify_signature(raw_body, signature):
        logger.warning("WhatsApp webhook: invalid signature, rejecting payload.")
        raise HTTPException(status_code=403, detail="Invalid signature")

    try:
        payload = await request.json()
        from app.modules.whatsapp.tasks import process_whatsapp_message
        process_whatsapp_message.delay(payload)
    except Exception as e:
        logger.error(f"Error parsing WhatsApp webhook payload: {e}")

    return Response(content="OK", status_code=200)

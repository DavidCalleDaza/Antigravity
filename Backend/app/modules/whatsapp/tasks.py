import json
import logging
import asyncio
from decimal import Decimal, InvalidOperation

from app.core.celery_app import celery_app
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.db.session import async_session_factory
from app.core.config import settings
from app.modules.whatsapp.service import whatsapp_service
from app.modules.whatsapp.ai import parse_whatsapp_intent
from app.modules.auth.models import UserIdentity, User
from app.modules.products.crud import create_product
from app.modules.products.schemas import ProductCreate
from app.modules.services.crud import create_service
from app.modules.services.schemas import ServiceCreate
import redis.asyncio as redis

logger = logging.getLogger(__name__)
redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

OTP_MAX_ATTEMPTS = 5
OTP_LOCKOUT_SECONDS = 600      # 10 min
DRAFT_TTL_SECONDS = 900         # 15 min
MESSAGE_DEDUP_TTL = 3600        # 1 hour


# ── Phone normalization ──────────────────────────────────────────────────────

def _normalize_phone(phone: str | None) -> str | None:
    """Strips +, spaces, dashes so phone numbers match Meta's format."""
    if phone is None:
        return None
    return phone.lstrip("+").replace(" ", "").replace("-", "")


# ── Price coercion ───────────────────────────────────────────────────────────

def _coerce_price(raw_price) -> Decimal | None:
    """Normaliza el precio devuelto por el LLM."""
    if raw_price is None:
        return None
    if isinstance(raw_price, (int, float)):
        return Decimal(str(raw_price))
    if isinstance(raw_price, str):
        cleaned = "".join(c for c in raw_price if c.isdigit() or c == ".")
        if not cleaned:
            return None
        try:
            return Decimal(cleaned)
        except InvalidOperation:
            return None
    return None


# ── Redis helpers ────────────────────────────────────────────────────────────

async def _is_duplicate_message(message_id: str) -> bool:
    """True si ya se procesó este message_id."""
    key = f"wa_msg_seen:{message_id}"
    was_set = await redis_client.set(key, "1", ex=MESSAGE_DEDUP_TTL, nx=True)
    return was_set is None


async def _get_draft(from_phone: str) -> dict:
    raw = await redis_client.get(f"wa_draft:{from_phone}")
    return json.loads(raw) if raw else {}


async def _save_draft(from_phone: str, intent: str, entities: dict) -> None:
    await redis_client.setex(
        f"wa_draft:{from_phone}",
        DRAFT_TTL_SECONDS,
        json.dumps({"intent": intent, "entities": entities}),
    )


async def _clear_draft(from_phone: str) -> None:
    await redis_client.delete(f"wa_draft:{from_phone}")


# ── OTP lockout ──────────────────────────────────────────────────────────────

async def _handle_otp_attempt(from_phone: str, clean_text: str) -> None:
    lockout_key = f"wa_otp_lockout:{from_phone}"
    attempts = await redis_client.get(lockout_key)
    if attempts and int(attempts) >= OTP_MAX_ATTEMPTS:
        await whatsapp_service.send_text_message(
            from_phone,
            "🔒 Demasiados intentos fallidos. Espera unos minutos antes de volver a intentarlo.",
        )
        return

    redis_key = f"wa_otp:{clean_text}"
    user_id_str = await redis_client.get(redis_key)

    if user_id_str:
        async with async_session_factory() as db:
            new_identity = UserIdentity(
                user_id=user_id_str,
                provider="whatsapp",
                provider_id=from_phone,
            )
            db.add(new_identity)
            await db.commit()
        await redis_client.delete(redis_key)
        await redis_client.delete(f"wa_otp_user:{user_id_str}")
        await redis_client.delete(lockout_key)
        await whatsapp_service.send_text_message(
            from_phone,
            "✅ ¡Tu número ha sido vinculado exitosamente a tu cuenta de ServiNow! "
            "Ya puedes empezar a crear productos y servicios enviándome mensajes.",
        )
    else:
        new_count = await redis_client.incr(lockout_key)
        if new_count == 1:
            await redis_client.expire(lockout_key, OTP_LOCKOUT_SECONDS)
        await whatsapp_service.send_text_message(
            from_phone,
            "❌ El código que enviaste es inválido o ha expirado. Genera uno nuevo en la plataforma.",
        )


# ── Intent handlers ──────────────────────────────────────────────────────────

async def _handle_create_product(from_phone: str, user: User, entities: dict, db) -> None:
    price = _coerce_price(entities.get("price"))
    name = entities.get("name")

    product_in = ProductCreate(
        name=name,
        description=entities.get("description"),
        category_id=None,
        price=float(price) if price is not None else 0.0,
        stock=0,
        status="active",
    )
    product = await create_product(db, product_in, user.id)
    await _clear_draft(from_phone)
    await whatsapp_service.send_text_message(
        from_phone,
        f"✅ Producto '{product.name}' creado con éxito por ${product.price}!",
    )


async def _handle_create_service(from_phone: str, user: User, entities: dict, db) -> None:
    price = _coerce_price(entities.get("price"))
    name = entities.get("name")

    service_in = ServiceCreate(
        name=name,
        description=entities.get("description"),
        category_id=None,
        price=float(price) if price is not None else 0.0,
        duration=None,
        status="active",
    )
    service = await create_service(db, service_in, user.id)
    await _clear_draft(from_phone)
    await whatsapp_service.send_text_message(
        from_phone,
        f"✅ Servicio '{service.name}' creado con éxito por ${service.price}!",
    )


async def _handle_unknown(from_phone: str, user: User, entities: dict, db) -> None:
    await whatsapp_service.send_text_message(
        from_phone,
        "Lo siento, aún no entiendo cómo hacer eso. Intenta decir: "
        "'Crear producto empanada por 3000 pesos' o 'Crear servicio corte de cabello por 15000 pesos'.",
    )


INTENT_HANDLERS = {
    "create_product": _handle_create_product,
    "create_service": _handle_create_service,
    "unknown": _handle_unknown,
}


# ── Main entrypoint ──────────────────────────────────────────────────────────

async def async_process_message(payload: dict, retries: int = 0):
    try:
        entries = payload.get("entry", [])
        for entry in entries:
            for change in entry.get("changes", []):
                value = change.get("value", {})
                if "messages" not in value:
                    continue

                for message in value.get("messages", []):
                    from_phone = _normalize_phone(message.get("from"))
                    message_id = message.get("id")
                    message_type = message.get("type")

                    if retries == 0 and message_id and await _is_duplicate_message(message_id):
                        logger.info(f"Skipping duplicate WhatsApp message {message_id}")
                        continue

                    if message_type != "text":
                        continue

                    text_body = message.get("text", {}).get("body", "")
                    logger.info(f"Received text from {from_phone}: {text_body}")

                    async with async_session_factory() as db:
                        result = await db.execute(
                            select(UserIdentity)
                            .options(selectinload(UserIdentity.user))
                            .filter(
                                UserIdentity.provider == "whatsapp",
                                UserIdentity.provider_id == from_phone,
                            )
                        )
                        identity = result.scalars().first()

                        if not identity:
                            clean_text = text_body.strip()
                            if len(clean_text) == 6 and clean_text.isdigit():
                                await _handle_otp_attempt(from_phone, clean_text)
                            else:
                                await whatsapp_service.send_text_message(
                                    from_phone,
                                    "Hola! Tu número no está vinculado a una cuenta de ServiNow. "
                                    "Ve a tu perfil en la web y añade tu número para empezar a crear "
                                    "productos desde aquí. Si ya tienes un código, escríbelo aquí (6 dígitos).",
                                )
                            continue

                        user = identity.user

                        # Merge draft + current message
                        draft = await _get_draft(from_phone)
                        intent_data = await parse_whatsapp_intent(text_body)

                        merged_entities = {
                            **draft.get("entities", {}),
                            **{k: v for k, v in intent_data.entities.items() if v},
                        }
                        effective_intent = (
                            intent_data.intent
                            if intent_data.intent != "unknown"
                            else draft.get("intent", intent_data.intent)
                        )

                        still_missing = [
                            f for f in ("name", "price") if not merged_entities.get(f)
                        ]

                        if still_missing:
                            await _save_draft(from_phone, effective_intent, merged_entities)
                            await whatsapp_service.send_text_message(from_phone, intent_data.bot_reply)
                            continue

                        handler = INTENT_HANDLERS.get(effective_intent, _handle_unknown)
                        await handler(from_phone, user, merged_entities, db)

    except Exception as exc:
        logger.error(f"Failed to process WhatsApp message: {exc}")
        raise exc


@celery_app.task(name="process_whatsapp_message", bind=True, max_retries=3)
def process_whatsapp_message(self, payload: dict):
    loop = celery_app._worker_loop
    try:
        loop.run_until_complete(
            async_process_message(payload, retries=self.request.retries)
        )
    except Exception as exc:
        raise self.retry(exc=exc, countdown=10)

"""
DonApp API — Contact Module: API Routes.

Endpoint público (sin autenticación) para el formulario de contacto de la
landing. Protegido con honeypot + rate limit en memoria por IP (sin
dependencias externas). El límite en memoria NO se comparte entre workers
si en algún momento se despliega con más de un proceso Uvicorn/Gunicorn —
suficiente para el volumen actual, revisar si se escala horizontalmente.
"""

import logging
import time
from collections import defaultdict

from fastapi import APIRouter, HTTPException, Request, status

from app.core.config import settings
from app.core.email import send_email
from app.modules.contact.schemas import (
    SUBJECT_LABELS,
    ContactMessageCreate,
    ContactMessageResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/contact", tags=["Contact"])

# --- Rate limiting simple en memoria (5 envíos por IP por hora) ---
RATE_LIMIT_MAX = 5
RATE_LIMIT_WINDOW_SECONDS = 3600
_submission_log: dict[str, list[float]] = defaultdict(list)


def _get_client_ip(request: Request) -> str:
    """Usa X-Forwarded-For si está detrás de un proxy (Render), si no, la IP directa."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _check_rate_limit(ip: str) -> None:
    now = time.time()
    window_start = now - RATE_LIMIT_WINDOW_SECONDS
    recent = [t for t in _submission_log[ip] if t > window_start]
    if len(recent) >= RATE_LIMIT_MAX:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiados mensajes enviados. Intenta de nuevo más tarde.",
        )
    recent.append(now)
    _submission_log[ip] = recent


@router.post("", response_model=ContactMessageResponse)
async def submit_contact_message(payload: ContactMessageCreate, request: Request):
    """Recibe un mensaje del formulario de contacto y notifica por email."""

    # Honeypot: si el campo invisible viene lleno, es un bot. Respondemos
    # éxito igual (no delatar la trampa) pero sin enviar el correo.
    if payload.website:
        logger.info("Honeypot activado en /contact desde IP %s", _get_client_ip(request))
        return ContactMessageResponse(success=True, detail="Mensaje recibido.")

    ip = _get_client_ip(request)
    _check_rate_limit(ip)

    subject_label = SUBJECT_LABELS.get(payload.subject, payload.subject)

    try:
        sent = send_email(
            to=settings.CONTACT_NOTIFICATION_EMAIL,
            subject=f"[Contacto DonApp] {subject_label} — {payload.name}",
            template_name="contact_notification.html",
            context={
                "name": payload.name,
                "email": payload.email,
                "subject_label": subject_label,
                "message": payload.message,
            },
        )
    except ValueError as e:
        logger.error("SMTP no configurado al procesar /contact: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No pudimos enviar tu mensaje en este momento. Escríbenos directamente a hola@donapp.com.",
        )

    if not sent:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No pudimos enviar tu mensaje en este momento. Escríbenos directamente a hola@donapp.com.",
        )

    return ContactMessageResponse(
        success=True,
        detail="¡Gracias! Recibimos tu mensaje y te responderemos pronto.",
    )

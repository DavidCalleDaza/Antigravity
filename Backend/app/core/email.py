import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

import httpx
from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.core.config import settings

logger = logging.getLogger(__name__)

TEMPLATES_DIR = Path(__file__).parent.parent / "templates"

_jinja_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(["html"]),
)


def _send_via_resend(to: str, subject: str, html_body: str) -> bool:
    """Send email via Resend HTTP REST API over port 443 (HTTPS - never blocked by cloud firewalls)."""
    headers = {
        "Authorization": f"Bearer {settings.RESEND_API_KEY.strip()}",
        "Content-Type": "application/json",
    }
    from_name = settings.SMTP_FROM_NAME or "DonApp"
    from_address = settings.RESEND_FROM_EMAIL or "onboarding@resend.dev"
    from_header = f"{from_name} <{from_address}>"

    payload = {
        "from": from_header,
        "to": [to] if isinstance(to, str) else to,
        "subject": subject,
        "html": html_body,
    }

    try:
        response = httpx.post(
            "https://api.resend.com/emails",
            headers=headers,
            json=payload,
            timeout=15.0,
        )
        if response.status_code in (200, 201):
            email_id = response.json().get("id", "ok")
            logger.info("Email '%s' sent successfully via Resend API to %s (id: %s)", subject, to, email_id)
            return True
        else:
            logger.error("Error al enviar email vía Resend API (HTTP %s): %s", response.status_code, response.text)
            return False
    except Exception as exc:
        logger.error("Excepción al conectar con Resend API: %s", exc, exc_info=True)
        return False


def send_email(to: str, subject: str, template_name: str, context: dict) -> bool:
    """
    General purpose email sender.
    1. If settings.RESEND_API_KEY is configured, sends via Resend REST API (HTTPS port 443).
    2. Otherwise, if settings.SMTP_HOST is configured, sends via SMTP (smtplib).
    3. If neither is configured, logs a warning and returns False without failing.
    Catches all exceptions to not break caller flow.
    """
    try:
        template = _jinja_env.get_template(template_name)
        html_body = template.render(**context)
    except Exception as exc:
        logger.error("Error al renderizar plantilla '%s' para email '%s': %s", template_name, subject, exc, exc_info=True)
        return False

    # Opción 1: Resend HTTP API (Recomendado para Render / cloud sin puertos SMTP)
    if settings.RESEND_API_KEY and settings.RESEND_API_KEY.strip():
        return _send_via_resend(to, subject, html_body)

    # Opción 2: SMTP Tradicional
    if not settings.SMTP_HOST:
        logger.warning("Configuración de correo incompleta (ni RESEND_API_KEY ni SMTP_HOST configurados). Email no enviado (subject: %s, to: %s)", subject, to)
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
        msg["To"] = to

        msg.attach(MIMEText(html_body, "html", "utf-8"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            clean_pwd = (settings.SMTP_PASSWORD or "").strip()
            if "gmail" in (settings.SMTP_HOST or "").lower():
                clean_pwd = clean_pwd.replace(" ", "")
            server.login(settings.SMTP_USER, clean_pwd)
            server.sendmail(settings.SMTP_FROM_EMAIL, [to], msg.as_string())
        
        logger.info("Email '%s' sent successfully to %s", subject, to)
        return True

    except Exception as e:
        logger.error("Error al enviar email '%s' a %s: %s", subject, to, e, exc_info=True)
        return False

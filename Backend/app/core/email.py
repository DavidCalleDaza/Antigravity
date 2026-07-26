import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.core.config import settings

logger = logging.getLogger(__name__)

TEMPLATES_DIR = Path(__file__).parent.parent / "templates"

_jinja_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(["html"]),
)

def send_email(to: str, subject: str, template_name: str, context: dict) -> bool:
    """
    General purpose email sender.
    If settings.SMTP_HOST is empty, logs a warning and returns False without trying to connect.
    Renders template with Jinja2 and sends via smtplib.
    Catches SMTP exceptions to not break caller flow.
    """
    if not settings.SMTP_HOST:
        logger.error("Configuración SMTP incompleta. Email no enviado (subject: %s, to: %s)", subject, to)
        raise ValueError("El servidor de correo (SMTP) no está configurado correctamente en las variables de entorno.")

    try:
        template = _jinja_env.get_template(template_name)
        html_body = template.render(**context)

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
        msg["To"] = to

        msg.attach(MIMEText(html_body, "html", "utf-8"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM_EMAIL, [to], msg.as_string())
        
        logger.info("Email '%s' sent successfully to %s", subject, to)
        return True

    except Exception as e:
        logger.error("Error al enviar email '%s' a %s: %s", subject, to, e)
        return False

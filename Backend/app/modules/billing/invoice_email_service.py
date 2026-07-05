"""
Servinow API — Billing Module: Invoice Email Service.

Envía la factura electrónica al correo del cliente, adjuntando el PDF
generado por pdf_service.py (reutilizado, sin duplicar lógica de render).

No transmite nada a la DIAN — es un envío informativo independiente.
"""

import logging
import re
import smtplib
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.core.config import settings
from app.modules.billing.models import Invoice
from app.modules.billing.pdf_service import (
    render_invoice_pdf_bytes,
    InvoicePDFDataError,
)

logger = logging.getLogger(__name__)

TEMPLATES_DIR = Path(__file__).parent / "templates"

_jinja_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(["html"]),
)

# Regex simple de validación de formato de correo (RFC 5322 simplificado).
_EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class InvoiceEmailError(Exception):
    """
    Error base para fallos de envío de correo de factura.
    `code` permite al router mapear a un status HTTP y mensaje adecuados.
    """

    def __init__(self, message: str, code: str = "email_error"):
        self.code = code
        super().__init__(message)


class CustomerEmailMissingError(InvoiceEmailError):
    def __init__(self):
        super().__init__(
            "El cliente no tiene un correo electrónico registrado.",
            code="customer_email_missing",
        )


class InvalidEmailFormatError(InvoiceEmailError):
    def __init__(self, email: str):
        super().__init__(
            f"El correo del cliente '{email}' no tiene un formato válido.",
            code="invalid_email_format",
        )


class SmtpConfigError(InvoiceEmailError):
    def __init__(self):
        super().__init__(
            "El servidor de correo (SMTP) no está configurado correctamente. "
            "Verifique las variables de entorno SMTP_* en el servidor.",
            code="smtp_config_error",
        )


class SmtpSendError(InvoiceEmailError):
    def __init__(self, detail: str):
        super().__init__(
            f"Error al enviar el correo a través del servidor SMTP: {detail}",
            code="smtp_send_error",
        )


def _validate_email_format(email: str) -> None:
    if not _EMAIL_REGEX.match(email):
        raise InvalidEmailFormatError(email)


def _validate_smtp_config() -> None:
    missing = [
        name
        for name, value in [
            ("SMTP_HOST", settings.SMTP_HOST),
            ("SMTP_USER", settings.SMTP_USER),
            ("SMTP_PASSWORD", settings.SMTP_PASSWORD),
            ("SMTP_FROM_EMAIL", settings.SMTP_FROM_EMAIL),
        ]
        if not value
    ]
    if missing:
        logger.error(f"Configuración SMTP incompleta. Variables faltantes: {missing}")
        raise SmtpConfigError()


def _render_email_html(invoice: Invoice) -> str:
    """Renderiza la plantilla Jinja2 con los datos de la factura."""
    template = _jinja_env.get_template("invoice_email.html")
    customer = invoice.customer
    return template.render(
        customer_name=customer.business_name,
        full_number=invoice.full_number,
        issued_at=invoice.issued_at.strftime("%Y-%m-%d %H:%M"),
        total=f"{invoice.total:,.2f}",
        company_name=settings.COMPANY_NAME,
        company_nit=settings.COMPANY_NIT,
        company_address=settings.COMPANY_ADDRESS,
        company_city=settings.COMPANY_CITY,
        company_phone=settings.COMPANY_PHONE,
    )


def _build_email_message(invoice: Invoice, pdf_bytes: bytes, html_body: str) -> MIMEMultipart:
    """Construye el mensaje MIME con el HTML del cuerpo y el PDF adjunto."""
    msg = MIMEMultipart("mixed")
    msg["Subject"] = f"Factura Electrónica {invoice.full_number} — {settings.COMPANY_NAME}"
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    msg["To"] = invoice.customer.email

    alt_part = MIMEMultipart("alternative")
    alt_part.attach(MIMEText(html_body, "html", "utf-8"))
    msg.attach(alt_part)

    filename = f"Factura_{invoice.full_number}.pdf"
    pdf_part = MIMEApplication(pdf_bytes, _subtype="pdf")
    pdf_part.add_header("Content-Disposition", "attachment", filename=filename)
    msg.attach(pdf_part)

    return msg


def _send_via_smtp(message: MIMEMultipart, to_email: str) -> None:
    """Abre la conexión SMTP y envía el mensaje. Traduce errores comunes a SmtpSendError."""
    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM_EMAIL, [to_email], message.as_string())
    except smtplib.SMTPAuthenticationError as auth_err:
        logger.error(f"Fallo de autenticación SMTP: {auth_err}")
        raise SmtpSendError("credenciales SMTP inválidas.") from auth_err
    except smtplib.SMTPConnectError as conn_err:
        logger.error(f"No se pudo conectar al servidor SMTP: {conn_err}")
        raise SmtpSendError("no se pudo conectar al servidor de correo.") from conn_err
    except smtplib.SMTPException as smtp_err:
        logger.error(f"Error SMTP genérico: {smtp_err}")
        raise SmtpSendError(str(smtp_err)) from smtp_err
    except (OSError, TimeoutError) as net_err:
        logger.error(f"Error de red al enviar correo: {net_err}")
        raise SmtpSendError("tiempo de espera agotado o error de red.") from net_err


def send_invoice_email(invoice: Invoice) -> dict:
    """
    Orquesta el envío completo de la factura por correo:
    valida cliente/email -> genera PDF (reutilizando pdf_service) ->
    renderiza plantilla -> construye mensaje -> envía por SMTP.

    Lanza subclases de InvoiceEmailError en cada punto de fallo, para que
    el router las traduzca a respuestas HTTP claras y específicas.

    Returns:
        dict con status de éxito y el correo destino, para la respuesta del API.
    """
    customer = invoice.customer
    if not customer or not customer.email:
        raise CustomerEmailMissingError()

    _validate_email_format(customer.email)
    _validate_smtp_config()

    # Reutiliza el servicio de PDF existente — misma fuente que /download,
    # así el adjunto siempre refleja el estado actual de la factura.
    try:
        pdf_bytes = render_invoice_pdf_bytes(invoice)
    except InvoicePDFDataError:
        raise  # el router ya sabe traducir esto a 422
    except Exception as pdf_err:
        logger.error(f"Error generando PDF para envío de correo: {pdf_err}")
        raise InvoiceEmailError(
            "No fue posible generar el PDF de la factura para el envío.",
            code="pdf_generation_error",
        ) from pdf_err

    html_body = _render_email_html(invoice)
    message = _build_email_message(invoice, pdf_bytes, html_body)
    _send_via_smtp(message, customer.email)

    logger.info(f"Factura {invoice.full_number} enviada por correo a {customer.email}")
    return {
        "success": True,
        "message": f"Factura enviada correctamente a {customer.email}.",
        "email": customer.email,
    }
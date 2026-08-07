"""
DonApp API — Contact Module: Pydantic Schemas.
"""

from typing import Literal

from pydantic import BaseModel, Field

SubjectType = Literal["usar_donapp", "integrar_negocio", "donacion", "modelo_impacto", "otro"]

SUBJECT_LABELS: dict[str, str] = {
    "usar_donapp": "Quiero usar DonApp",
    "integrar_negocio": "Tengo un negocio y quiero integrarme",
    "donacion": "Quiero hacer una donación",
    "modelo_impacto": "Preguntas sobre el modelo de impacto",
    "otro": "Otro",
}


class ContactMessageCreate(BaseModel):
    """Payload enviado desde el formulario público de contacto."""

    name: str = Field(..., min_length=2, max_length=100, examples=["Juan Pérez"])
    email: str = Field(
        ...,
        pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$",
        examples=["usuario@donapp.com"],
    )
    subject: SubjectType = Field(..., examples=["usar_donapp"])
    message: str = Field(..., min_length=10, max_length=2000)

    # Honeypot: campo invisible para humanos. Si llega con contenido, es un bot.
    website: str = Field(default="", max_length=200)


class ContactMessageResponse(BaseModel):
    """Respuesta de confirmación al usuario."""

    success: bool
    detail: str

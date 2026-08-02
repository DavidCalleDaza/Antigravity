"""
Servinow API — Billing Module: Public Invoice Verification.

Endpoint público (sin autenticación) para que cualquier persona con el
CUFE (o, temporalmente, el id de la factura) pueda verificar su
autenticidad, ver su estado y descargar el PDF. Pensado para ser
consumido desde el QR impreso en la representación gráfica.

IMPORTANTE: este router se monta SIN el prefijo /api/v1/billing y SIN
el Depends(get_current_user) — es intencionalmente público. No debe
crecer para exponer datos sensibles del cliente más allá de lo mínimo
necesario para la verificación.
"""

import logging
import uuid
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.config import settings
from app.modules.billing.crud import get_invoice_by_public_identifier
from app.modules.exports.invoice_pdf import render_invoice_pdf_bytes, InvoicePDFDataError

router = APIRouter(prefix="/verify", tags=["public-verify"])
logger = logging.getLogger(__name__)


@router.get("/{identifier}")
async def verify_invoice_public(
    identifier: str,
    db: AsyncSession = Depends(get_db),
):
    """Datos públicos mínimos de una factura, para la página de verificación."""
    invoice = await get_invoice_by_public_identifier(db, identifier)
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Factura no encontrada")

    return {
        "numero": invoice.full_number,
        "fecha": invoice.issued_at,
        "empresa": settings.COMPANY_NAME,
        "cliente": invoice.customer.business_name if invoice.customer else "N/A",
        "total": float(invoice.total),
        "estado": invoice.status,
        "estado_dian": invoice.dian_status,
        "pdf_url": f"/api/v1/verify/{identifier}/pdf",
        "xml_url": None,  # aún no implementado — no hay generación de XML todavía
    }


@router.get("/{identifier}/pdf", include_in_schema=False)
async def download_invoice_pdf_public(
    identifier: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Descarga pública del PDF, renderizado en tiempo real (mismo motor que
    el endpoint autenticado /invoices/{id}/download, pero accesible sin
    sesión — es la única forma en que la página de verificación puede
    ofrecer el botón de descarga).
    """
    invoice = await get_invoice_by_public_identifier(db, identifier)
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Factura no encontrada")

    try:
        pdf_bytes = await run_in_threadpool(render_invoice_pdf_bytes, invoice)
    except InvoicePDFDataError as data_err:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(data_err))
    except Exception as pdf_err:
        logger.error(f"Error generando PDF público de la factura {identifier}: {pdf_err}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ocurrió un error generando el PDF. Intenta nuevamente.",
        )

    filename = f"Factura_{invoice.full_number or invoice.id}.pdf"
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
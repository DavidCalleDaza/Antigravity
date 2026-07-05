"""
Servinow API — Billing Module: Router.

Defines all endpoints for customer management, invoice workflows, credit notes,
and DIAN integration.
Mounted under /api/v1/billing.
"""

import uuid
import logging
from io import BytesIO
from typing import Annotated
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.modules.auth.deps import get_current_user
from app.modules.auth.models import User
from app.modules.billing.crud import (
    get_customers,
    get_customer,
    get_customer_by_id_number,
    create_customer,
    update_customer,
    get_invoices,
    get_invoice,
    create_invoice,
    update_invoice,
    cancel_invoice,
    mark_invoice_paid,
    create_credit_note,
    get_billing_summary,
    get_top_selling_products_and_services,
)
from app.modules.billing.schemas import (
    CustomerCreate,
    CustomerUpdate,
    CustomerResponse,
    InvoiceCreate,
    InvoiceUpdate,
    InvoiceResponse,
    InvoiceListResponse,
    CreditNoteCreate,
    CreditNoteResponse,
    DianSubmitResponse,
    DianStatusResponse,
    InvoiceSummary,
    TopSellingItem,
    TopSellingResponse,
)
from app.modules.billing.pdf_service import (
    generate_invoice_pdf,
    render_invoice_pdf_bytes,
    InvoicePDFDataError,
)

from app.modules.billing.invoice_email_service import (
    send_invoice_email,
    InvoiceEmailError,
    CustomerEmailMissingError,
    InvalidEmailFormatError,
    SmtpConfigError,
    SmtpSendError,
)
from app.modules.billing.schemas import InvoiceEmailSendResponse  # si no está ya importado

from app.modules.billing.dian_service import submit_invoice_to_dian, get_dian_status as fetch_dian_status
from .payment_means_rules import get_valid_payment_means, is_payment_means_valid

router = APIRouter()
logger = logging.getLogger(__name__)


# --- Customers ---

@router.get("/customers", response_model=list[CustomerResponse])
async def list_billing_customers(
    skip: int = 0,
    limit: int = 50,
    search: str | None = None,
    active_only: bool = True,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[CustomerResponse]:
    """List billing customers with search and pagination."""
    customers = await get_customers(db, skip=skip, limit=limit, search=search, active_only=active_only)
    return [CustomerResponse.model_validate(c) for c in customers]


@router.post("/customers", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_billing_customer(
    customer_in: CustomerCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> CustomerResponse:
    """Create a new billing customer."""
    # Check if identification number is already taken
    existing = await get_customer_by_id_number(db, customer_in.id_number)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe un cliente con la identificación {customer_in.id_number}."
        )
    try:
        customer = await create_customer(db, customer_in)
        return CustomerResponse.model_validate(customer)
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )


@router.patch("/customers/{customer_id}", response_model=CustomerResponse)
async def update_billing_customer(
    customer_id: uuid.UUID,
    customer_in: CustomerUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> CustomerResponse:
    """Update customer details."""
    db_customer = await get_customer(db, customer_id)
    if not db_customer:
        raise HTTPException(status_code=404, detail="Cliente no encontrado.")
    
    # If updating document number, check for duplicates
    if customer_in.id_number and customer_in.id_number != db_customer.id_number:
        existing = await get_customer_by_id_number(db, customer_in.id_number)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe otro cliente con la identificación {customer_in.id_number}."
            )
    try:        
        customer = await update_customer(db, db_customer, customer_in)
        return CustomerResponse.model_validate(customer)
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )


# --- Invoices ---

@router.get("/invoices", response_model=list[InvoiceListResponse])
async def list_billing_invoices(
    skip: int = 0,
    limit: int = 50,
    status: str | None = None,
    dian_status: str | None = None,
    customer_id: uuid.UUID | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[InvoiceListResponse]:
    """Retrieve filtered, paginated invoice listings."""
    invoices = await get_invoices(
        db,
        skip=skip,
        limit=limit,
        status=status,
        dian_status=dian_status,
        customer_id=customer_id,
        date_from=date_from,
        date_to=date_to,
    )
    
    res = []
    for inv in invoices:
        res.append(InvoiceListResponse(
            id=inv.id,
            full_number=inv.full_number,
            customer_name=inv.customer.business_name if inv.customer else "N/A",
            customer_email=inv.customer.email if inv.customer else None,
            items_count=len(inv.items),
            subtotal=inv.subtotal,
            tax_total=inv.tax_total,
            total=inv.total,
            status=inv.status,
            dian_status=inv.dian_status,
            payment_method=inv.payment_method,
            issued_at=inv.issued_at,
            due_date=inv.due_date,
            created_at=inv.created_at,
        ))
    return res


@router.post("/invoices", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_billing_invoice(
    invoice_in: InvoiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InvoiceResponse:
    """Create a new invoice. Increments consecutives and generates CUFE automatically."""
    try:
        invoice = await create_invoice(db, invoice_in, current_user.id)
        # Pre-generate a disk snapshot for convenience (pdf_url). This copy is
        # NOT what gets served on download — downloads always render fresh.
        try:
            generate_invoice_pdf(invoice)
        except Exception as pdf_err:
            logger.error(f"Error pre-generating PDF: {pdf_err}")
        return InvoiceResponse.model_validate(invoice)
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))


@router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
async def get_billing_invoice_detail(
    invoice_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> InvoiceResponse:
    """Retrieve full invoice details with lines, credit notes, and DIAN event logs."""
    invoice = await get_invoice(db, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada.")
    return InvoiceResponse.model_validate(invoice)


@router.patch("/invoices/{invoice_id}", response_model=InvoiceResponse)
async def update_billing_invoice(
    invoice_id: uuid.UUID,
    invoice_in: InvoiceUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> InvoiceResponse:
    """Update an invoice (drafts only)."""
    db_invoice = await get_invoice(db, invoice_id)
    if not db_invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada.")
    try:
        invoice = await update_invoice(db, db_invoice, invoice_in)
        # Regenerate the disk snapshot (pdf_url); downloads still render fresh.
        try:
            generate_invoice_pdf(invoice)
        except Exception as pdf_err:
            logger.error(f"Error regenerating PDF: {pdf_err}")
        return InvoiceResponse.model_validate(invoice)
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))


@router.post("/invoices/{invoice_id}/cancel", response_model=InvoiceResponse)
async def cancel_billing_invoice(
    invoice_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> InvoiceResponse:
    """Cancel / Annul an invoice (not possible if marked paid, use credit note instead)."""
    db_invoice = await get_invoice(db, invoice_id)
    if not db_invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada.")
    try:
        invoice = await cancel_invoice(db, db_invoice)
        return InvoiceResponse.model_validate(invoice)
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))


@router.post("/invoices/{invoice_id}/mark-paid", response_model=InvoiceResponse)
async def mark_billing_invoice_paid(
    invoice_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> InvoiceResponse:
    """Mark an invoice as paid."""
    db_invoice = await get_invoice(db, invoice_id)
    if not db_invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada.")
    try:
        invoice = await mark_invoice_paid(db, db_invoice)
        return InvoiceResponse.model_validate(invoice)
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))


@router.get("/invoices/{invoice_id}/download")
async def download_invoice_pdf(
    invoice_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """
    Generate and download the invoice as a PDF.

    El documento se renderiza SIEMPRE en tiempo real a partir del estado
    actual de la factura (nunca se sirve una copia en disco potencialmente
    desactualizada tras un pago, anulación o transmisión a la DIAN). La
    generación (CPU-bound, ReportLab) corre en un threadpool para no
    bloquear el event loop.
    """
    invoice = await get_invoice(db, invoice_id)
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Factura no encontrada.")

    try:
        pdf_bytes = await run_in_threadpool(render_invoice_pdf_bytes, invoice)
    except InvoicePDFDataError as data_err:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(data_err))
    except Exception as pdf_err:
        logger.error(f"Error generando PDF de la factura {invoice_id}: {pdf_err}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ocurrió un error generando el PDF de la factura. Intenta nuevamente.",
        )

    filename = f"Factura_{invoice.full_number or invoice.id}.pdf"
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/invoices/{invoice_id}/pdf", include_in_schema=False)
async def get_invoice_pdf_file(
    invoice_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Alias legacy de /download, conservado por compatibilidad hacia atrás."""
    return await download_invoice_pdf(invoice_id, db, current_user)


# --- DIAN & Electronic Invoicing Events ---

@router.post("/invoices/{invoice_id}/send-dian", response_model=DianSubmitResponse)
async def submit_invoice_to_dian_endpoint(
    invoice_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> DianSubmitResponse:
    """Submit a generated invoice to DIAN (or run simulated flow in dev)."""
    return await submit_invoice_to_dian(db, invoice_id)


@router.post("/invoices/{invoice_id}/send-email", response_model=InvoiceEmailSendResponse)
async def send_invoice_email_endpoint(
    invoice_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> InvoiceEmailSendResponse:
    """
    Envía la factura electrónica al correo registrado del cliente, con el
    PDF adjunto. No transmite nada a la DIAN — es un envío informativo
    independiente del flujo de facturación electrónica.
    """
    invoice = await get_invoice(db, invoice_id)
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Factura no encontrada.")

    try:
        result = await run_in_threadpool(send_invoice_email, invoice)
        return InvoiceEmailSendResponse(**result)
    except CustomerEmailMissingError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))
    except InvalidEmailFormatError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))
    except InvoicePDFDataError as err:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(err))
    except SmtpConfigError as err:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(err))
    except SmtpSendError as err:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(err))
    except InvoiceEmailError as err:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(err))
    except Exception as unexpected_err:
        logger.error(f"Error inesperado enviando correo de factura {invoice_id}: {unexpected_err}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ocurrió un error inesperado al enviar el correo. Intenta nuevamente.",
        )

@router.get("/invoices/{invoice_id}/dian-status", response_model=DianStatusResponse)
async def get_invoice_dian_status_timeline(
    invoice_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> DianStatusResponse:
    """Get the live DIAN status and full communication event log timeline."""
    try:
        status_info = await fetch_dian_status(db, invoice_id)
        return DianStatusResponse(**status_info)
    except ValueError as val_err:
        raise HTTPException(status_code=404, detail=str(val_err))


# --- Credit Notes ---

@router.post("/credit-notes", response_model=CreditNoteResponse, status_code=status.HTTP_201_CREATED)
async def create_billing_credit_note(
    cn_in: CreditNoteCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> CreditNoteResponse:
    """Create a credit note for invoice adjustments."""
    try:
        credit_note = await create_credit_note(db, cn_in)
        return CreditNoteResponse.model_validate(credit_note)
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))


# --- Summary ---

@router.get("/summary", response_model=InvoiceSummary)
async def get_invoices_dashboard_summary(
    date_from: date | None = None,
    date_to: date | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> InvoiceSummary:
    """Retrieve aggregated stats (income, pending, overdue, credit notes) for the dashboard."""
    summary_data = await get_billing_summary(db, date_from=date_from, date_to=date_to)
    return InvoiceSummary(**summary_data)

@router.get("/payment-means")
async def list_payment_means(
    payment_method: str | None = Query(None),
    amount: float | None = Query(None),
    customer_id: str | None = Query(None),
):
    """
    GET /api/v1/billing/payment-means?payment_method=Transferencia
    Devuelve los medios de pago válidos para el método de pago dado.
    """
    customer = None
    # Si luego necesitas reglas por cliente:
    # if customer_id:
    #     customer = await get_customer_by_id(customer_id)

    return get_valid_payment_means(
        payment_method=payment_method,
        amount=amount,
        customer=customer,
    )

# --- Top Selling Products & Services ---

@router.get("/top-selling", response_model=TopSellingResponse)
async def get_top_selling_endpoint(
    limit: int = Query(5, ge=1, le=50),
    date_from: date | None = None,
    date_to: date | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> TopSellingResponse:
    """Retrieve the top N best-selling products and top N services, separately, by quantity."""
    products, services = await get_top_selling_products_and_services(
        db, limit=limit, date_from=date_from, date_to=date_to
    )
    return TopSellingResponse(
        products=[TopSellingItem(**dict(r._mapping)) for r in products],
        services=[TopSellingItem(**dict(r._mapping)) for r in services],
    )
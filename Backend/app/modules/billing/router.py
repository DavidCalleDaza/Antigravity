"""
Servinow API — Billing Module: Router.

Defines all endpoints for customer management, invoice workflows, credit notes,
and DIAN integration.
Mounted under /api/v1/billing.
"""

import uuid
import os
import logging
from typing import Annotated
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
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
)
from app.modules.billing.pdf_service import generate_invoice_pdf
from app.modules.billing.dian_service import submit_invoice_to_dian, get_dian_status as fetch_dian_status

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
    customer = await create_customer(db, customer_in)
    return CustomerResponse.model_validate(customer)


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
            
    customer = await update_customer(db, db_customer, customer_in)
    return CustomerResponse.model_validate(customer)


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
        # Pre-generate PDF for convenience
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
        # Regenerate PDF
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


@router.get("/invoices/{invoice_id}/pdf")
async def get_invoice_pdf_file(
    invoice_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Generate and download the visual ReportLab PDF representation."""
    invoice = await get_invoice(db, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada.")
    
    # Generate / update path
    filepath = os.path.join("uploads", "invoices", f"{invoice.id}.pdf")
    if not os.path.exists(filepath):
        try:
            generate_invoice_pdf(invoice)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error generando PDF: {str(e)}")
            
    return FileResponse(
        filepath,
        media_type="application/pdf",
        filename=f"Factura_{invoice.full_number}.pdf"
    )


# --- DIAN & Electronic Invoicing Events ---

@router.post("/invoices/{invoice_id}/send-dian", response_model=DianSubmitResponse)
async def submit_invoice_to_dian_endpoint(
    invoice_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> DianSubmitResponse:
    """Submit a generated invoice to DIAN (or run simulated flow in dev)."""
    return await submit_invoice_to_dian(db, invoice_id)


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

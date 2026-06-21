"""
Servinow API ? Billing Module: CRUD Operations.

Provides async database operations for customers, invoices, invoice items,
credit notes, and billing summaries. Includes atomic invoice numbering
and CUFE hash generation.
"""

import hashlib
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.modules.billing.models import (
    CreditNote,
    CreditNoteItem,
    Customer,
    DianEvent,
    Invoice,
    InvoiceItem,
    InvoiceSequence,
)
from app.modules.billing.schemas import (
    CreditNoteCreate,
    CustomerCreate,
    CustomerUpdate,
    InvoiceCreate,
    InvoiceUpdate,
)


# ?? Customer CRUD ????????????????????????????????????????????????????????????


async def get_customers(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
    search: str | None = None,
    active_only: bool = True,
) -> list[Customer]:
    """Retrieve paginated customers with optional search by name or ID number."""
    stmt = select(Customer).order_by(Customer.business_name).offset(skip).limit(limit)
    if active_only:
        stmt = stmt.where(Customer.is_active == True)  # noqa: E712
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(
            Customer.business_name.ilike(pattern) | Customer.id_number.ilike(pattern)
        )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_customer(db: AsyncSession, customer_id: uuid.UUID) -> Customer | None:
    """Retrieve a single customer by ID."""
    result = await db.execute(select(Customer).where(Customer.id == customer_id))
    return result.scalar_one_or_none()


async def get_customer_by_id_number(db: AsyncSession, id_number: str) -> Customer | None:
    """Retrieve a customer by their identification number."""
    result = await db.execute(select(Customer).where(Customer.id_number == id_number))
    return result.scalar_one_or_none()


async def create_customer(db: AsyncSession, customer_in: CustomerCreate) -> Customer:
    """Create a new customer."""
    db_customer = Customer(**customer_in.model_dump())
    db.add(db_customer)
    await db.flush()
    await db.refresh(db_customer)
    return db_customer


async def update_customer(
    db: AsyncSession, db_customer: Customer, customer_in: CustomerUpdate
) -> Customer:
    """Update an existing customer."""
    update_data = customer_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_customer, field, value)
    db.add(db_customer)
    await db.flush()
    await db.refresh(db_customer)
    return db_customer


# ?? Invoice Sequence ?????????????????????????????????????????????????????????


async def get_next_invoice_number(db: AsyncSession, prefix: str = "SETT") -> tuple[int, str]:
    """
    Get the next consecutive invoice number for a given prefix.

    Uses SELECT ... FOR UPDATE to ensure atomic increment under
    concurrent requests.

    Returns:
        Tuple of (number, full_number) e.g. (1, "SETT-0001").
    """
    stmt = (
        select(InvoiceSequence)
        .where(InvoiceSequence.prefix == prefix)
        .with_for_update()
    )
    result = await db.execute(stmt)
    seq = result.scalar_one_or_none()

    if seq is None:
        # Create initial sequence
        seq = InvoiceSequence(
            prefix=prefix,
            current_number=0,
            resolution_number=settings.DIAN_RESOLUTION_NUMBER or None,
            resolution_date=None,
            range_from=settings.DIAN_RESOLUTION_RANGE_FROM,
            range_to=settings.DIAN_RESOLUTION_RANGE_TO,
        )
        db.add(seq)
        await db.flush()
        # Re-select with lock
        result = await db.execute(
            select(InvoiceSequence)
            .where(InvoiceSequence.prefix == prefix)
            .with_for_update()
        )
        seq = result.scalar_one()

    next_num = seq.current_number + 1

    if next_num > seq.range_to:
        raise ValueError(
            f"Se ha alcanzado el l?mite de numeraci?n ({seq.range_to}) "
            f"para el prefijo '{prefix}'. Solicite una nueva resoluci?n."
        )

    await db.execute(
        update(InvoiceSequence)
        .where(InvoiceSequence.id == seq.id)
        .values(current_number=next_num)
    )

    full_number = f"{prefix}-{next_num:04d}"
    return next_num, full_number


# ?? CUFE Generation ??????????????????????????????????????????????????????????


def generate_cufe(
    full_number: str,
    issued_at: datetime,
    subtotal: Decimal,
    tax_code: str,
    tax_total: Decimal,
    total: Decimal,
    nit_emisor: str,
    nit_receptor: str,
    technical_key: str,
    environment: str = "2",
) -> str:
    """
    Generate the CUFE (C?digo ?nico de Factura Electr?nica).

    SHA-384 hash of concatenated invoice data per DIAN specification.
    """
    fecha = issued_at.strftime("%Y-%m-%d")
    hora = issued_at.strftime("%H:%M:%S-05:00")

    cufe_string = (
        f"{full_number}"
        f"{fecha}"
        f"{hora}"
        f"{subtotal:.2f}"
        f"{tax_code}"
        f"{tax_total:.2f}"
        f"{total:.2f}"
        f"{nit_emisor}"
        f"{nit_receptor}"
        f"{technical_key}"
        f"{environment}"
    )

    return hashlib.sha384(cufe_string.encode("utf-8")).hexdigest()


# ?? Invoice CRUD ?????????????????????????????????????????????????????????????


def _calculate_item_totals(
    quantity: Decimal, unit_price: Decimal, discount: Decimal, tax_rate: Decimal
) -> tuple[Decimal, Decimal, Decimal]:
    """Calculate subtotal, tax_amount, and total for a line item."""
    subtotal = (quantity * unit_price) - discount
    tax_amount = subtotal * (tax_rate / Decimal("100"))
    total = subtotal + tax_amount
    return subtotal, tax_amount, total


async def get_invoices(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
    status: str | None = None,
    dian_status: str | None = None,
    customer_id: uuid.UUID | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[Invoice]:
    """Retrieve paginated invoices with optional filters."""
    stmt = (
        select(Invoice)
        .options(selectinload(Invoice.customer))
        .options(selectinload(Invoice.items))
        .order_by(Invoice.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    if status:
        stmt = stmt.where(Invoice.status == status)
    if dian_status:
        stmt = stmt.where(Invoice.dian_status == dian_status)
    if customer_id:
        stmt = stmt.where(Invoice.customer_id == customer_id)
    if date_from:
        stmt = stmt.where(func.date(Invoice.issued_at) >= date_from)
    if date_to:
        stmt = stmt.where(func.date(Invoice.issued_at) <= date_to)

    result = await db.execute(stmt)
    return list(result.scalars().unique().all())


async def get_invoice(db: AsyncSession, invoice_id: uuid.UUID) -> Invoice | None:
    """Retrieve a single invoice by ID with all relations loaded."""
    stmt = (
        select(Invoice)
        .options(selectinload(Invoice.customer))
        .options(selectinload(Invoice.items))
        .options(selectinload(Invoice.credit_notes).selectinload(CreditNote.items))
        .options(selectinload(Invoice.dian_events))
        .where(Invoice.id == invoice_id)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_invoice(
    db: AsyncSession, invoice_in: InvoiceCreate, user_id: uuid.UUID
) -> Invoice:
    """
    Create a new invoice with line items.

    Automatically assigns the next consecutive number, calculates
    all totals and taxes, and generates the CUFE hash.
    """
    prefix = settings.DIAN_RESOLUTION_PREFIX or "SETT"
    number, full_number = await get_next_invoice_number(db, prefix)

    # Build items and calculate totals
    inv_subtotal = Decimal("0")
    inv_discount = Decimal("0")
    inv_tax_total = Decimal("0")

    db_items: list[InvoiceItem] = []
    for idx, item_data in enumerate(invoice_in.items, start=1):
        subtotal, tax_amount, total = _calculate_item_totals(
            item_data.quantity,
            item_data.unit_price,
            item_data.discount,
            item_data.tax_rate,
        )
        db_item = InvoiceItem(
            line_number=idx,
            description=item_data.description,
            code=item_data.code,
            unit=item_data.unit,
            quantity=item_data.quantity,
            unit_price=item_data.unit_price,
            discount=item_data.discount,
            subtotal=subtotal,
            tax_rate=item_data.tax_rate,
            tax_amount=tax_amount,
            total=total,
            product_id=item_data.product_id,
            service_id=item_data.service_id,
        )
        db_items.append(db_item)
        inv_subtotal += subtotal
        inv_discount += item_data.discount
        inv_tax_total += tax_amount

    inv_total = inv_subtotal + inv_tax_total
    now = datetime.now(timezone.utc)

    # Fetch customer for CUFE
    customer = await get_customer(db, invoice_in.customer_id)
    nit_receptor = customer.id_number if customer else "0"

    cufe = generate_cufe(
        full_number=full_number,
        issued_at=now,
        subtotal=inv_subtotal,
        tax_code="01",
        tax_total=inv_tax_total,
        total=inv_total,
        nit_emisor=settings.COMPANY_NIT,
        nit_receptor=nit_receptor,
        technical_key=settings.DIAN_TECHNICAL_KEY or "fc8eac422eba16e22ffd8c6f94b3f40a6e38571d",
        environment="2" if settings.DIAN_ENVIRONMENT == "test" else "1",
    )

    db_invoice = Invoice(
        prefix=prefix,
        number=number,
        full_number=full_number,
        customer_id=invoice_in.customer_id,
        user_id=user_id,
        issued_at=now,
        due_date=invoice_in.due_date,
        subtotal=inv_subtotal,
        discount_total=inv_discount,
        tax_base=inv_subtotal,
        tax_total=inv_tax_total,
        total=inv_total,
        payment_method=invoice_in.payment_method,
        payment_means=invoice_in.payment_means,
        status=invoice_in.status,
        notes=invoice_in.notes,
        cufe=cufe,
        items=db_items,
    )
    db.add(db_invoice)
    await db.flush()

    # Reload with relations
    return await get_invoice(db, db_invoice.id)  # type: ignore[return-value]


async def update_invoice(
    db: AsyncSession, db_invoice: Invoice, invoice_in: InvoiceUpdate
) -> Invoice:
    """
    Update a draft invoice.

    Only invoices with status='draft' can be modified.
    If items are provided, existing items are replaced.
    """
    if db_invoice.status != "draft":
        raise ValueError("Solo se pueden editar facturas en estado 'borrador'.")

    update_data = invoice_in.model_dump(exclude_unset=True, exclude={"items"})
    for field, value in update_data.items():
        setattr(db_invoice, field, value)

    if invoice_in.items is not None:
        # Remove existing items
        for old_item in list(db_invoice.items):
            await db.delete(old_item)

        inv_subtotal = Decimal("0")
        inv_discount = Decimal("0")
        inv_tax_total = Decimal("0")
        new_items: list[InvoiceItem] = []

        for idx, item_data in enumerate(invoice_in.items, start=1):
            subtotal, tax_amount, total = _calculate_item_totals(
                item_data.quantity,
                item_data.unit_price,
                item_data.discount,
                item_data.tax_rate,
            )
            db_item = InvoiceItem(
                invoice_id=db_invoice.id,
                line_number=idx,
                description=item_data.description,
                code=item_data.code,
                unit=item_data.unit,
                quantity=item_data.quantity,
                unit_price=item_data.unit_price,
                discount=item_data.discount,
                subtotal=subtotal,
                tax_rate=item_data.tax_rate,
                tax_amount=tax_amount,
                total=total,
                product_id=item_data.product_id,
                service_id=item_data.service_id,
            )
            new_items.append(db_item)
            db.add(db_item)
            inv_subtotal += subtotal
            inv_discount += item_data.discount
            inv_tax_total += tax_amount

        db_invoice.subtotal = inv_subtotal
        db_invoice.discount_total = inv_discount
        db_invoice.tax_base = inv_subtotal
        db_invoice.tax_total = inv_tax_total
        db_invoice.total = inv_subtotal + inv_tax_total

    db.add(db_invoice)
    await db.flush()
    return await get_invoice(db, db_invoice.id)  # type: ignore[return-value]


async def cancel_invoice(db: AsyncSession, db_invoice: Invoice) -> Invoice:
    """Cancel an invoice. Cannot cancel already paid invoices."""
    if db_invoice.status == "paid":
        raise ValueError("No se puede anular una factura pagada. Use una nota cr?dito.")
    db_invoice.status = "cancelled"
    db.add(db_invoice)
    await db.flush()
    await db.refresh(db_invoice)
    return db_invoice


async def mark_invoice_paid(db: AsyncSession, db_invoice: Invoice) -> Invoice:
    """Mark an invoice as paid."""
    if db_invoice.status in ("cancelled", "credit_note"):
        raise ValueError("No se puede marcar como pagada una factura anulada.")
    db_invoice.status = "paid"
    db.add(db_invoice)
    await db.flush()
    await db.refresh(db_invoice)
    return db_invoice


# ?? Credit Note CRUD ?????????????????????????????????????????????????????????


async def create_credit_note(
    db: AsyncSession, cn_in: CreditNoteCreate
) -> CreditNote:
    """Create a credit note for an existing invoice."""
    # Get invoice
    invoice = await get_invoice(db, cn_in.invoice_id)
    if invoice is None:
        raise ValueError("Factura no encontrada.")
    if invoice.status == "cancelled":
        raise ValueError("No se puede crear nota cr?dito para factura anulada.")

    # Generate credit note number
    cn_count_result = await db.execute(
        select(func.count(CreditNote.id))
    )
    cn_count = cn_count_result.scalar() or 0
    cn_number = f"NC-{cn_count + 1:04d}"

    cn_subtotal = Decimal("0")
    cn_tax_total = Decimal("0")
    db_items: list[CreditNoteItem] = []

    for item_data in cn_in.items:
        subtotal = item_data.quantity * item_data.unit_price
        tax_amount = subtotal * (item_data.tax_rate / Decimal("100"))
        total = subtotal + tax_amount

        db_item = CreditNoteItem(
            description=item_data.description,
            quantity=item_data.quantity,
            unit_price=item_data.unit_price,
            tax_rate=item_data.tax_rate,
            tax_amount=tax_amount,
            subtotal=subtotal,
            total=total,
        )
        db_items.append(db_item)
        cn_subtotal += subtotal
        cn_tax_total += tax_amount

    db_cn = CreditNote(
        invoice_id=cn_in.invoice_id,
        number=cn_number,
        reason=cn_in.reason,
        subtotal=cn_subtotal,
        tax_total=cn_tax_total,
        total=cn_subtotal + cn_tax_total,
        items=db_items,
    )
    db.add(db_cn)

    # If total credit equals invoice total, mark as credit_note status
    existing_cn_result = await db.execute(
        select(func.coalesce(func.sum(CreditNote.total), 0)).where(
            CreditNote.invoice_id == cn_in.invoice_id,
            CreditNote.status == "active",
        )
    )
    existing_cn_total = existing_cn_result.scalar() or Decimal("0")
    new_total_credits = existing_cn_total + db_cn.total

    if new_total_credits >= invoice.total:
        invoice.status = "credit_note"
        db.add(invoice)

    await db.flush()
    await db.refresh(db_cn, attribute_names=["items"])
    return db_cn


# ?? DIAN Event Logging ???????????????????????????????????????????????????????


async def create_dian_event(
    db: AsyncSession,
    invoice_id: uuid.UUID,
    event_type: str,
    request_payload: str | None = None,
    response_payload: str | None = None,
    status_code: str | None = None,
    message: str | None = None,
) -> DianEvent:
    """Log a DIAN interaction event."""
    event = DianEvent(
        invoice_id=invoice_id,
        event_type=event_type,
        request_payload=request_payload,
        response_payload=response_payload,
        status_code=status_code,
        message=message,
    )
    db.add(event)
    await db.flush()
    await db.refresh(event)
    return event


async def get_dian_events(
    db: AsyncSession, invoice_id: uuid.UUID
) -> list[DianEvent]:
    """Get all DIAN events for an invoice, newest first."""
    result = await db.execute(
        select(DianEvent)
        .where(DianEvent.invoice_id == invoice_id)
        .order_by(DianEvent.created_at.desc())
    )
    return list(result.scalars().all())


# ?? Billing Summary ??????????????????????????????????????????????????????????


async def get_billing_summary(
    db: AsyncSession,
    date_from: date | None = None,
    date_to: date | None = None,
) -> dict:
    """
    Calculate billing summary (income, pending, overdue, credit notes).

    Returns dict with keys matching InvoiceSummary schema.
    """
    base_stmt = select(Invoice).where(Invoice.status != "cancelled")
    if date_from:
        base_stmt = base_stmt.where(func.date(Invoice.issued_at) >= date_from)
    if date_to:
        base_stmt = base_stmt.where(func.date(Invoice.issued_at) <= date_to)

    # Income (paid)
    income_result = await db.execute(
        select(func.coalesce(func.sum(Invoice.total), 0)).where(
            Invoice.status == "paid",
            *([func.date(Invoice.issued_at) >= date_from] if date_from else []),
            *([func.date(Invoice.issued_at) <= date_to] if date_to else []),
        )
    )
    income = income_result.scalar() or Decimal("0")

    # Pending
    pending_result = await db.execute(
        select(func.coalesce(func.sum(Invoice.total), 0)).where(
            Invoice.status == "pending",
            *([func.date(Invoice.issued_at) >= date_from] if date_from else []),
            *([func.date(Invoice.issued_at) <= date_to] if date_to else []),
        )
    )
    pending = pending_result.scalar() or Decimal("0")

    # Overdue
    overdue_result = await db.execute(
        select(func.coalesce(func.sum(Invoice.total), 0)).where(
            Invoice.status == "overdue",
            *([func.date(Invoice.issued_at) >= date_from] if date_from else []),
            *([func.date(Invoice.issued_at) <= date_to] if date_to else []),
        )
    )
    overdue = overdue_result.scalar() or Decimal("0")

    # Credit notes
    cn_result = await db.execute(
        select(func.coalesce(func.sum(CreditNote.total), 0)).where(
            CreditNote.status == "active"
        )
    )
    cn_total = cn_result.scalar() or Decimal("0")

    # Invoice count
    count_result = await db.execute(
        select(func.count(Invoice.id)).where(
            Invoice.status != "cancelled",
            *([func.date(Invoice.issued_at) >= date_from] if date_from else []),
            *([func.date(Invoice.issued_at) <= date_to] if date_to else []),
        )
    )
    invoice_count = count_result.scalar() or 0

    return {
        "income": income,
        "pending": pending,
        "overdue": overdue,
        "credit_notes_total": cn_total,
        "invoice_count": invoice_count,
        "balance": income - cn_total,
    }

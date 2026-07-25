"""
Servinow API – Billing Module: CRUD Operations.

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

from app.modules.products.models import Product
from app.modules.services.models import Service
from app.modules.categories.models import Category

from app.core.config import settings

from app.modules.billing.models import (
    CreditNote,
    CreditNoteItem,
    Customer,
    DianEvent,
    Invoice,
    InvoiceItem,
    InvoiceSequence,
    CountrySetting,
)
from app.modules.locations.models import Location

from app.modules.billing.schemas import (
    CreditNoteCreate,
    CustomerCreate,
    CustomerUpdate,
    InvoiceCreate,
    InvoiceUpdate,
    CountrySettingUpsert,
)


# —— Customer CRUD ————————————————————————————————————————————————————————————


async def get_customers(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
    search: str | None = None,
    active_only: bool = True,
) -> list[Customer]:
    """Retrieve paginated customers with optional search by name or ID number."""
    stmt = select(Customer).options(selectinload(Customer.location)).order_by(Customer.business_name).offset(skip).limit(limit)
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
    result = await db.execute(select(Customer).options(selectinload(Customer.location)).where(Customer.id == customer_id))
    return result.scalar_one_or_none()


async def get_customer_by_id_number(db: AsyncSession, id_number: str) -> Customer | None:
    """Retrieve a customer by their identification number."""
    result = await db.execute(select(Customer).options(selectinload(Customer.location)).where(Customer.id_number == id_number))
    return result.scalar_one_or_none()


async def create_customer(db: AsyncSession, customer_in: CustomerCreate) -> Customer:
    """
    Create a new customer.

    Valida la unicidad de email, phone e id_number antes del INSERT
    para evitar errores de restricción SQL no controlados.
    """
    if customer_in.email:
        existing_email = await db.execute(
            select(Customer).where(Customer.email == customer_in.email)
        )
        if existing_email.scalar_one_or_none():
            raise ValueError("Correo electrónico ya registrado.")

    if customer_in.phone:
        existing_phone = await db.execute(
            select(Customer).where(Customer.phone == customer_in.phone)
        )
        if existing_phone.scalar_one_or_none():
            raise ValueError("Número de contacto ya registrado.")

    if customer_in.id_number:
        existing_id = await get_customer_by_id_number(db, customer_in.id_number)
        if existing_id:
            raise ValueError("Número de documento de identificación ya registrado.")

    customer_data = customer_in.model_dump(exclude={"location"})
    db_customer = Customer(**customer_data)
    if customer_in.location:
        db_customer.location = Location(**customer_in.location.model_dump())
    db.add(db_customer)
    await db.flush()
    # Eagerly load the location relationship to prevent MissingGreenlet error on model_validate
    stmt = select(Customer).options(selectinload(Customer.location)).where(Customer.id == db_customer.id)
    res = await db.execute(stmt)
    return res.scalar_one()


async def update_customer(
    db: AsyncSession, db_customer: Customer, customer_in: CustomerUpdate
) -> Customer:
    """
    Update an existing customer.

    Valida la unicidad de campos omitiendo el propio registro que se está editando.
    """
    update_data = customer_in.model_dump(exclude_unset=True, exclude={"location"})

    if "email" in update_data and update_data["email"] != db_customer.email:
        existing_email = await db.execute(
            select(Customer).where(
                Customer.email == update_data["email"],
                Customer.id != db_customer.id,
            )
        )
        if existing_email.scalar_one_or_none():
            raise ValueError("Correo electrónico ya registrado.")

    if "phone" in update_data and update_data["phone"] != db_customer.phone:
        existing_phone = await db.execute(
            select(Customer).where(
                Customer.phone == update_data["phone"],
                Customer.id != db_customer.id,
            )
        )
        if existing_phone.scalar_one_or_none():
            raise ValueError("Número de contacto ya registrado.")

    if "id_number" in update_data and update_data["id_number"] != db_customer.id_number:
        existing_id = await db.execute(
            select(Customer).where(
                Customer.id_number == update_data["id_number"],
                Customer.id != db_customer.id,
            )
        )
        if existing_id.scalar_one_or_none():
            raise ValueError("Número de documento de identificación ya registrado.")

    for field, value in update_data.items():
        setattr(db_customer, field, value)
        
    if customer_in.location is not None:
        if db_customer.location:
            for k, v in customer_in.location.model_dump(exclude_unset=True).items():
                setattr(db_customer.location, k, v)
        else:
            db_customer.location = Location(**customer_in.location.model_dump())

    db.add(db_customer)
    await db.flush()
    await db.refresh(db_customer)
    return db_customer


# —— Invoice Sequence —————————————————————————————————————————————————————————


async def get_next_invoice_number(db: AsyncSession, prefix: str = "SETT") -> tuple[int, str]:
    """
    Get the next consecutive invoice number for a given prefix.

    Uses SELECT ... FOR UPDATE to ensure atomic increment under concurrent requests.
    full_number usa LPAD de 8 dígitos, igual que la columna GENERATED en DB.
    """
    stmt = (
        select(InvoiceSequence)
        .where(InvoiceSequence.prefix == prefix)
        .with_for_update()
    )
    result = await db.execute(stmt)
    seq = result.scalar_one_or_none()

    if seq is None:
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
        result = await db.execute(
            select(InvoiceSequence)
            .where(InvoiceSequence.prefix == prefix)
            .with_for_update()
        )
        seq = result.scalar()

    next_num = seq.current_number + 1

    if next_num > seq.range_to:
        raise ValueError(
            f"Se ha alcanzado el límite de numeración ({seq.range_to}) "
            f"para el prefijo '{prefix}'. Solicite una nueva resolución."
        )

    await db.execute(
        update(InvoiceSequence)
        .where(InvoiceSequence.id == seq.id)
        .values(current_number=next_num)
    )

    full_number = f"{prefix}-{next_num:08d}"
    return next_num, full_number


# —— CUFE Generation ——————————————————————————————————————————————————————————


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
    Generate the CUFE (Código Único de Factura Electrónica).
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


# —— Invoice CRUD —————————————————————————————————————————————————————————————


def _calculate_item_totals(
    quantity: Decimal,
    unit_price: Decimal,
    discount: Decimal,
    tax_rate: Decimal,
) -> tuple[Decimal, Decimal, Decimal]:
    """
    Calcula subtotal, tax_amount y total localmente.

    IMPORTANTE: Estos valores NO se persisten en DB (son columnas GENERATED).
    Solo se usan para calcular el CUFE antes del INSERT.
    """
    subtotal = quantity * unit_price
    taxable_base = subtotal - discount
    tax_amount = taxable_base * (tax_rate / Decimal("100"))
    total = taxable_base + tax_amount
    return subtotal, tax_amount, total


# Valores válidos del ENUM invoice_status en PostgreSQL:
# 'draft' | 'issued' | 'sent' | 'paid' | 'void' | 'overdue'
VALID_INVOICE_STATUSES = {"draft", "issued", "sent", "paid", "void", "overdue"}

# Valores válidos del ENUM item_unit en PostgreSQL:
# 'UND' | 'KG' | 'LT' | 'MT' | 'HR' | 'SRV' | 'MES' | 'CJA' | 'PAR' | 'ROL'
VALID_ITEM_UNITS = {"UND", "KG", "LT", "MT", "HR", "SRV", "MES", "CJA", "PAR", "ROL"}


def _compute_preferred_discount(customer: Customer | None, base: Decimal) -> Decimal:
    """
    Calcula el descuento preferencial del cliente sobre una base dada.
    Misma lógica que ya usa InvoiceForm.jsx en el frontend (totals.preferredDiscount).
    """
    if not customer or not customer.is_preferred:
        return Decimal("0")

    discount_value = Decimal(customer.discount_value or 0)
    if discount_value <= 0:
        return Decimal("0")

    if customer.discount_type == "percent":
        return (base * discount_value / Decimal("100")).quantize(Decimal("0.0001"))
    return min(discount_value, base)

async def _get_country_default_tax_rate(db: AsyncSession, customer: Customer | None) -> Decimal:
    """
    Obtiene el IVA por defecto según el país de la ubicación del cliente.
    Retorna 0% si el cliente no tiene ubicación, país configurado, o si
    la configuración de ese país está inactiva (mismo criterio que el
    documento de especificación: fallback seguro a 0%).
    """
    if not customer or not customer.location or not customer.location.country_code:
        return Decimal("0.00")

    country_code = customer.location.country_code.strip().upper()
    result = await db.execute(
        select(CountrySetting).where(
            CountrySetting.country_code == country_code,
            CountrySetting.is_active == True,  # noqa: E712
        )
    )
    setting = result.scalar_one_or_none()
    return Decimal(str(setting.default_tax_rate)) if setting else Decimal("0.00")

async def get_customer_default_tax_rate(db: AsyncSession, customer_id: uuid.UUID) -> Decimal:
    """Wrapper público: obtiene el IVA por defecto de un cliente por su ID."""
    customer = await get_customer(db, customer_id)
    return await _get_country_default_tax_rate(db, customer)

async def upsert_country_setting(
    db: AsyncSession,
    country_code: str,
    data: "CountrySettingUpsert",
) -> CountrySetting:
    """
    Crea o actualiza la configuración tributaria de un país.

    Si el país ya tiene configuración, se actualiza (esto afecta a TODOS
    los clientes de ese país hacia adelante, ya que default_tax_rate vive
    a nivel de country_settings, no por cliente). Si no existe, se crea.
    """
    normalized_code = country_code.strip().upper()

    result = await db.execute(
        select(CountrySetting).where(CountrySetting.country_code == normalized_code)
    )
    setting = result.scalar_one_or_none()

    if setting:
        setting.country_name = data.country_name
        setting.default_tax_rate = data.default_tax_rate
        setting.currency_code = data.currency_code
        setting.currency_symbol = data.currency_symbol
        setting.is_active = data.is_active
        db.add(setting)
    else:
        setting = CountrySetting(
            country_code=normalized_code,
            country_name=data.country_name,
            default_tax_rate=data.default_tax_rate,
            currency_code=data.currency_code,
            currency_symbol=data.currency_symbol,
            is_active=data.is_active,
        )
        db.add(setting)

    await db.flush()
    await db.refresh(setting)
    return setting

def _distribute_discount_across_items(items_in, preferred_discount: Decimal) -> list[Decimal]:
    """
    Reparte `preferred_discount` proporcionalmente entre las líneas, según
    la base neta de cada una (quantity * unit_price - discount de línea).
    El último ítem absorbe el residuo de redondeo para que la suma cuadre
    exactamente. Ningún ítem puede quedar con descuento mayor a su propia base.
    """
    if preferred_discount <= 0:
        return [Decimal("0")] * len(items_in)

    line_bases = [
        max((item.quantity * item.unit_price) - item.discount, Decimal("0"))
        for item in items_in
    ]
    total_base = sum(line_bases)
    if total_base <= 0:
        return [Decimal("0")] * len(items_in)

    extra_discounts = []
    accumulated = Decimal("0")
    last_idx = len(line_bases) - 1

    for idx, base in enumerate(line_bases):
        if idx == last_idx:
            extra = preferred_discount - accumulated  # residuo de redondeo
        else:
            extra = (preferred_discount * base / total_base).quantize(Decimal("0.0001"))
        extra = min(extra, base)  # nunca superar la base de esa línea
        extra_discounts.append(extra)
        accumulated += extra

    return extra_discounts

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
    """
    Retrieve paginated invoices with optional filters.

    El campo full_number es GENERATED en DB — no necesita calcularse aquí,
    viene automáticamente en cada fila del SELECT.
    """
    if status and status not in VALID_INVOICE_STATUSES:
        raise ValueError(
            f"Estado '{status}' no válido. Valores permitidos: {VALID_INVOICE_STATUSES}"
        )

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

async def get_invoice_by_public_identifier(db: AsyncSession, identifier: str) -> Invoice | None:
    """
    Busca una factura por CUFE o, si el CUFE aún no existe/no matchea,
    por su id (UUID). Uso exclusivo del endpoint público de verificación
    — no requiere autenticación, así que NO debe traer datos sensibles
    del usuario dueño de la factura (solo lo necesario para el portal).
    """
    # Intento 1: por CUFE (cadena, siempre válida como comparación directa)
    result = await db.execute(
        select(Invoice)
        .options(selectinload(Invoice.customer).selectinload(Customer.location))
        .options(selectinload(Invoice.items))
        .where(Invoice.cufe == identifier)
    )
    invoice = result.scalar_one_or_none()
    if invoice:
        return invoice

    # Intento 2: por id (UUID) — válido mientras no haya CUFE real de DIAN
    try:
        parsed_id = uuid.UUID(identifier)
    except ValueError:
        return None

    result = await db.execute(
        select(Invoice)
        .options(selectinload(Invoice.customer).selectinload(Customer.location))
        .options(selectinload(Invoice.items))
        .where(Invoice.id == parsed_id)
    )
    return result.scalar_one_or_none()

async def get_invoice(db: AsyncSession, invoice_id: uuid.UUID) -> Invoice | None:
    """Retrieve a single invoice by ID with all relations loaded."""
    stmt = (
        select(Invoice)
        .options(selectinload(Invoice.customer).selectinload(Customer.location))
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
    prefix = settings.DIAN_RESOLUTION_PREFIX or "SETT"
    number, full_number = await get_next_invoice_number(db, prefix)

    customer = await get_customer(db, invoice_in.customer_id)  # 👈 mover arriba

    # Obtener el IVA configurado por país del cliente para validación y auto-asignación

    default_tax_rate = await _get_country_default_tax_rate(db, customer)

    """
    default_tax_rate = Decimal("0.00")
    if customer and customer.location and customer.location.country_code:
        country_code = customer.location.country_code.strip().upper()
        # Importación local para evitar circulares
        from app.modules.billing.models import CountrySetting
        stmt_cs = select(CountrySetting).where(
            CountrySetting.country_code == country_code,
            CountrySetting.is_active == True
        )
        res_cs = await db.execute(stmt_cs)
        cs = res_cs.scalar_one_or_none()
        if cs:
            default_tax_rate = Decimal(str(cs.default_tax_rate))
    """
    
    # Base neta de todas las líneas (subtotal - descuento de línea) para
    # calcular el descuento preferencial del cliente sobre esa base.
    line_base_total = sum(
        (i.quantity * i.unit_price) - i.discount for i in invoice_in.items
    )
    preferred_discount = _compute_preferred_discount(customer, line_base_total)
    extra_discounts = _distribute_discount_across_items(invoice_in.items, preferred_discount)

    inv_subtotal = Decimal("0")
    inv_tax_total = Decimal("0")
    db_items: list[InvoiceItem] = []

    for idx, (item_data, extra) in enumerate(zip(invoice_in.items, extra_discounts), start=1):
        unit = item_data.unit.upper() if item_data.unit else "UND"
        if unit not in VALID_ITEM_UNITS:
            raise ValueError(
                f"Unidad '{unit}' no válida en ítem {idx}. "
                f"Valores permitidos: {VALID_ITEM_UNITS}"
            )

        # Si el tax_rate no viene o es nulo en el request, usar el default del país
        # Si viene, validarlo: no permitir negativos.
        line_tax_rate = item_data.tax_rate if item_data.tax_rate is not None else default_tax_rate
        if line_tax_rate < 0:
            raise ValueError(f"El porcentaje de IVA de la línea {idx} no puede ser negativo.")

        total_line_discount = item_data.discount + extra  # 👈 línea + parte del preferencial

        subtotal, tax_amount, _ = _calculate_item_totals(
            item_data.quantity,
            item_data.unit_price,
            total_line_discount,
            line_tax_rate,
        )

        db_item = InvoiceItem(
            line_number=idx,
            description=item_data.description,
            code=item_data.code,
            unit=unit,
            quantity=item_data.quantity,
            unit_price=item_data.unit_price,
            discount=total_line_discount,   # 👈 aquí se persiste
            tax_rate=line_tax_rate,
            product_id=item_data.product_id,
            service_id=item_data.service_id,
        )
        db_items.append(db_item)
        inv_subtotal += subtotal
        inv_tax_total += tax_amount

    inv_total = inv_subtotal + inv_tax_total
    now = datetime.now(timezone.utc)
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
        customer_id=invoice_in.customer_id,
        user_id=user_id,
        issued_at=now,
        due_date=invoice_in.due_date,
        payment_method=invoice_in.payment_method,
        payment_means=invoice_in.payment_means,
        status=invoice_in.status or "draft",
        notes=invoice_in.notes,
        cufe=cufe,
        items=db_items,
    )
    db_invoice.customer = customer
    db.add(db_invoice)
    await db.flush()

    return await get_invoice(db, db_invoice.id)

async def update_invoice(
    db: AsyncSession, db_invoice: Invoice, invoice_in: InvoiceUpdate
) -> Invoice:
    """
    Update a draft invoice.

    Solo facturas con status='draft' pueden modificarse.
    Si se proveen items, los existentes se reemplazan.
    subtotal, tax_amount y total de items NO se incluyen (GENERATED en DB).
    El trigger recalcula los totales de la cabecera automáticamente.
    El descuento preferencial vive en customer.discount_value — no se duplica en Invoice.
    """
    if db_invoice.status != "draft":
        raise ValueError("Solo se pueden editar facturas en estado 'draft'.")

    if db_invoice.dian_status == "accepted":
        raise ValueError("No se puede modificar una factura ya aceptada por la DIAN.")

    # Excluir campos GENERATED y totales calculados por trigger
    update_data = invoice_in.model_dump(
        exclude_unset=True,
        exclude={"items", "full_number", "subtotal", "discount_total", "tax_base", "tax_total", "total"},
    )

    if "status" in update_data and update_data["status"] not in VALID_INVOICE_STATUSES:
        raise ValueError(
            f"Estado '{update_data['status']}' no válido. "
            f"Valores permitidos: {VALID_INVOICE_STATUSES}"
        )

    for field, value in update_data.items():
        setattr(db_invoice, field, value)

    if invoice_in.items is not None:
        for old_item in list(db_invoice.items):
            await db.delete(old_item)
        db_invoice.items.clear()
        await db.flush()

        # 👇 mismo cálculo que en create_invoice
        line_base_total = sum(
            (i.quantity * i.unit_price) - i.discount for i in invoice_in.items
        )
        preferred_discount = _compute_preferred_discount(db_invoice.customer, line_base_total)
        extra_discounts = _distribute_discount_across_items(invoice_in.items, preferred_discount)

        # Obtener el IVA configurado por país del cliente para validación y auto-asignación en actualización

        default_tax_rate = await _get_country_default_tax_rate(db, db_invoice.customer)

        """
        default_tax_rate = Decimal("0.00")
        if db_invoice.customer and db_invoice.customer.location and db_invoice.customer.location.country_code:
            country_code = db_invoice.customer.location.country_code.strip().upper()
            from app.modules.billing.models import CountrySetting
            stmt_cs = select(CountrySetting).where(
                CountrySetting.country_code == country_code,
                CountrySetting.is_active == True
            )
            res_cs = await db.execute(stmt_cs)
            cs = res_cs.scalar_one_or_none()
            if cs:
                default_tax_rate = Decimal(str(cs.default_tax_rate))
        """

        for idx, (item_data, extra) in enumerate(zip(invoice_in.items, extra_discounts), start=1):
            unit = item_data.unit.upper() if item_data.unit else "UND"
            if unit not in VALID_ITEM_UNITS:
                raise ValueError(
                    f"Unidad '{unit}' no válida en ítem {idx}. "
                    f"Valores permitidos: {VALID_ITEM_UNITS}"
                )

            line_tax_rate = item_data.tax_rate if item_data.tax_rate is not None else default_tax_rate
            if line_tax_rate < 0:
                raise ValueError(f"El porcentaje de IVA de la línea {idx} no puede ser negativo.")

            db_item = InvoiceItem(
                invoice_id=db_invoice.id,
                line_number=idx,
                description=item_data.description,
                code=item_data.code,
                unit=unit,
                quantity=item_data.quantity,
                unit_price=item_data.unit_price,
                discount=item_data.discount + extra,
                tax_rate=line_tax_rate,
                product_id=item_data.product_id,
                service_id=item_data.service_id,
            )
            db.add(db_item)

    # ── EL ARREGLO ──
    # Sacamos estas 4 líneas fuera del bloque "if invoice_in.items is not None:"
    # alineándolas con el nivel principal de la función (mismo nivel de indentación que el "if")
    db.add(db_invoice)
    await db.flush()
    await db.refresh(db_invoice)
    return await get_invoice(db, db_invoice.id)

async def cancel_invoice(db: AsyncSession, db_invoice: Invoice) -> Invoice:
    """
    Cancel an invoice.
    El valor correcto para anular es 'void' — 'cancelled' no existe en el ENUM.
    """
    if db_invoice.status == "paid":
        raise ValueError("No se puede anular una factura pagada. Use una nota crédito.")
    if db_invoice.status == "void":
        raise ValueError("La factura ya está anulada.")
    db_invoice.status = "void"
    db.add(db_invoice)
    await db.flush()
    await db.refresh(db_invoice)
    return db_invoice


async def mark_invoice_paid(db: AsyncSession, db_invoice: Invoice) -> Invoice:
    """Mark an invoice as paid."""
    if db_invoice.status == "void":
        raise ValueError("No se puede marcar como pagada una factura anulada.")
    if db_invoice.status == "paid":
        raise ValueError("La factura ya está marcada como pagada.")
    db_invoice.status = "paid"
    db.add(db_invoice)
    await db.flush()
    await db.refresh(db_invoice)
    return db_invoice


# —— Credit Note CRUD —————————————————————————————————————————————————————————


async def create_credit_note(
    db: AsyncSession, cn_in: CreditNoteCreate
) -> CreditNote:
    """
    Create a credit note for an existing invoice.

    credit_note_items SÍ persiste subtotal/tax_amount/total
    porque esa tabla NO tiene columnas GENERATED (solo invoice_items las tiene).
    Si la nota crédito absorbe el total, la factura pasa a 'void'.
    """
    invoice = await get_invoice(db, cn_in.invoice_id)
    if invoice is None:
        raise ValueError("Factura no encontrada.")
    if invoice.status == "void":
        raise ValueError("No se puede crear nota crédito para factura anulada.")

    cn_count_result = await db.execute(select(func.count(CreditNote.id)))
    cn_count = cn_count_result.scalar() or 0
    cn_number = f"NC-{cn_count + 1:04d}"

    cn_subtotal = Decimal("0")
    cn_tax_total = Decimal("0")
    db_items: list[CreditNoteItem] = []

    for item_data in cn_in.items:
        subtotal = item_data.quantity * item_data.unit_price
        tax_amount = subtotal * (item_data.tax_rate / Decimal("100"))

        db_item = CreditNoteItem(
            description=item_data.description,
            quantity=item_data.quantity,
            unit_price=item_data.unit_price,
            tax_rate=item_data.tax_rate,
            tax_amount=tax_amount,
            subtotal=subtotal,
            total=subtotal + tax_amount,
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

    existing_cn_result = await db.execute(
        select(func.coalesce(func.sum(CreditNote.total), 0)).where(
            CreditNote.invoice_id == cn_in.invoice_id,
            CreditNote.status == "active",
        )
    )
    existing_cn_total = existing_cn_result.scalar() or Decimal("0")
    new_total_credits = existing_cn_total + db_cn.total

    if new_total_credits >= invoice.total:
        invoice.status = "void"
        db.add(invoice)

    await db.flush()
    await db.refresh(db_cn, attribute_names=["items"])
    return db_cn


# —— DIAN Event Logging ———————————————————————————————————————————————————————


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


# —— Billing Summary ——————————————————————————————————————————————————————————


async def get_billing_summary(
    db: AsyncSession,
    date_from: date | None = None,
    date_to: date | None = None,
) -> dict:
    """
    Calculate billing summary (income, pending, overdue, credit notes).

    pending agrupa 'issued' y 'sent' (estados reales del ENUM).
    'void' reemplaza a 'cancelled' en los filtros de exclusión.
    """
    income_result = await db.execute(
        select(func.coalesce(func.sum(Invoice.total), 0)).where(
            Invoice.status == "paid",
            *([func.date(Invoice.issued_at) >= date_from] if date_from else []),
            *([func.date(Invoice.issued_at) <= date_to] if date_to else []),
        )
    )
    income = income_result.scalar() or Decimal("0")

    pending_result = await db.execute(
        select(func.coalesce(func.sum(Invoice.total), 0)).where(
            Invoice.status.in_(["issued", "sent"]),
            *([func.date(Invoice.issued_at) >= date_from] if date_from else []),
            *([func.date(Invoice.issued_at) <= date_to] if date_to else []),
        )
    )
    pending = pending_result.scalar() or Decimal("0")

    overdue_result = await db.execute(
        select(func.coalesce(func.sum(Invoice.total), 0)).where(
            Invoice.status == "overdue",
            *([func.date(Invoice.issued_at) >= date_from] if date_from else []),
            *([func.date(Invoice.issued_at) <= date_to] if date_to else []),
        )
    )
    overdue = overdue_result.scalar() or Decimal("0")

    cn_result = await db.execute(
        select(func.coalesce(func.sum(CreditNote.total), 0)).where(
            CreditNote.status == "active"
        )
    )
    cn_total = cn_result.scalar() or Decimal("0")

    count_result = await db.execute(
        select(func.count(Invoice.id)).where(
            Invoice.status != "void",
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

# —- Top Selling Products/Services ——————————————————————————————————————————————

async def _get_top_selling(
    db: AsyncSession,
    filter_column,
    limit: int,
    date_from: date | None,
    date_to: date | None,
):
    """Query interna compartida: agrupa invoice_items por description/code,
    filtrando solo ítems que tengan la columna indicada (product_id o service_id) no nula."""
    stmt = (
        select(
            InvoiceItem.description.label("description"),
            InvoiceItem.code.label("code"),
            func.sum(InvoiceItem.quantity).label("total_quantity"),
            func.sum(InvoiceItem.total).label("total_amount"),
        )
        .join(Invoice, Invoice.id == InvoiceItem.invoice_id)
        .where(Invoice.status != "void")
        .where(filter_column.isnot(None))
        .group_by(InvoiceItem.description, InvoiceItem.code)
        .order_by(func.sum(InvoiceItem.quantity).desc())
        .limit(limit)
    )

    if date_from:
        stmt = stmt.where(Invoice.issued_at >= date_from)
    if date_to:
        stmt = stmt.where(Invoice.issued_at <= date_to)

    result = await db.execute(stmt)
    return result.all()


async def get_top_selling_products_and_services(
    db: AsyncSession,
    limit: int = 5,
    date_from: date | None = None,
    date_to: date | None = None,
):
    """
    Retorna el top N de productos y el top N de servicios más vendidos,
    por separado, ordenados por cantidad vendida.
    """
    products = await _get_top_selling(db, InvoiceItem.product_id, limit, date_from, date_to)
    services = await _get_top_selling(db, InvoiceItem.service_id, limit, date_from, date_to)
    return products, services


# —- Category Distribution —————————————————————————————————————————————————————————

async def get_category_distribution(
    db: AsyncSession,
    entity_type: str,
    date_from: date | None = None,
    date_to: date | None = None,
):
    """
    Retorna la distribución de categorías para productos o servicios.

    Response:
    [
        {
            "category": "Tecnología",
            "quantity": 25,
            "revenue": Decimal("1250000.00"),
            "percentage": 41.6
        }
    ]
    """

    if entity_type not in ("product", "service"):
        raise ValueError("entity_type debe ser 'product' o 'service'.")

    if entity_type == "product":
        entity_model = Product
        fk_column = InvoiceItem.product_id
    else:
        entity_model = Service
        fk_column = InvoiceItem.service_id

    stmt = (
        select(
            Category.id.label("category_id"),
            func.coalesce(Category.name, "Sin categoría").label("category"),
            func.sum(InvoiceItem.quantity).label("quantity"),
            func.sum(InvoiceItem.total).label("revenue"),
        )
        .select_from(InvoiceItem)
        .join(Invoice, Invoice.id == InvoiceItem.invoice_id)
        .join(entity_model, entity_model.id == fk_column)
        .outerjoin(Category, Category.id == entity_model.category_id)
        .where(Invoice.status != "void")
        .group_by(Category.id, Category.name)
        .order_by(func.sum(InvoiceItem.total).desc())
    )

    if date_from:
        stmt = stmt.where(func.date(Invoice.issued_at) >= date_from)

    if date_to:
        stmt = stmt.where(func.date(Invoice.issued_at) <= date_to)

    result = await db.execute(stmt)
    rows = result.all()

    if not rows:
        return []

    total_revenue = sum((row.revenue or Decimal("0")) for row in rows)

    response = []

    for row in rows:
        revenue = row.revenue or Decimal("0")

        percentage = (
            float((revenue / total_revenue) * Decimal("100"))
            if total_revenue > 0
            else 0.0
        )

        response.append(
            {
                "category": row.category,
                "quantity": int(row.quantity or 0),
                "revenue": revenue,
                "percentage": round(percentage, 2),
            }
        )

    return response

# -- Revenue By Line (products vs services, por mes) ---------------------------

async def get_revenue_by_line(
    db: AsyncSession,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[dict]:
    """
    Retorna ingresos mensuales desglosados por linea de negocio
    (productos vs servicios) para el periodo indicado.
    """
    from sqlalchemy import extract, case

    MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
                    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

    stmt = (
        select(
            extract('year', Invoice.issued_at).label('year'),
            extract('month', Invoice.issued_at).label('month'),
            func.sum(
                case(
                    (InvoiceItem.product_id.isnot(None), InvoiceItem.total),
                    else_=Decimal('0'),
                )
            ).label('products_total'),
            func.sum(
                case(
                    (InvoiceItem.service_id.isnot(None), InvoiceItem.total),
                    else_=Decimal('0'),
                )
            ).label('services_total'),
        )
        .join(InvoiceItem, InvoiceItem.invoice_id == Invoice.id)
        .where(Invoice.status != 'void')
        .group_by(
            extract('year', Invoice.issued_at),
            extract('month', Invoice.issued_at),
        )
        .order_by(
            extract('year', Invoice.issued_at),
            extract('month', Invoice.issued_at),
        )
    )

    if date_from:
        stmt = stmt.where(func.date(Invoice.issued_at) >= date_from)
    if date_to:
        stmt = stmt.where(func.date(Invoice.issued_at) <= date_to)

    result = await db.execute(stmt)
    rows = result.all()

    response = []
    for row in rows:
        year = int(row.year)
        month_idx = int(row.month) - 1
        products_total = row.products_total or Decimal('0')
        services_total = row.services_total or Decimal('0')
        response.append({
            'month': MONTH_LABELS[month_idx],
            'sortKey': year * 12 + month_idx,
            'products': products_total,
            'services': services_total,
            'total': products_total + services_total,
        })

    return response


# -- Payment Statistics (distribucion de ingresos por metodo de pago) ----------

async def get_payment_stats(
    db: AsyncSession,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[dict]:
    """
    Retorna la distribucion de ingresos por metodo de pago para el periodo.
    """
    stmt = (
        select(
            Invoice.payment_method.label('method'),
            func.sum(Invoice.total).label('total'),
            func.count(Invoice.id).label('count'),
        )
        .where(Invoice.status != 'void')
        .group_by(Invoice.payment_method)
        .order_by(func.sum(Invoice.total).desc())
    )

    if date_from:
        stmt = stmt.where(func.date(Invoice.issued_at) >= date_from)
    if date_to:
        stmt = stmt.where(func.date(Invoice.issued_at) <= date_to)

    result = await db.execute(stmt)
    rows = result.all()

    return [
        {
            'method': row.method or 'Sin especificar',
            'total': row.total or Decimal('0'),
            'count': row.count or 0,
        }
        for row in rows
    ]

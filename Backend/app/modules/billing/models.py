"""
Servinow API – Billing Module: ORM Models.

Defines all database tables required for the complete electronic invoicing
(facturación electrónica) system, including customers, invoices, line items,
credit notes, invoice sequences, and DIAN event logs.

Compliant with Colombian DIAN regulations (Resolución 000012).
"""

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CHAR,
    Date,
    DateTime,
    Enum,
    FetchedValue,
    ForeignKey,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.modules.locations.models import Location


# —— Customers ————————————————————————————————————————————————————————————————


class Customer(Base):
    """
    Represents a billing customer (receptor de factura).

    Stores identification, contact, and address information required
    for Colombian electronic invoicing.
    """

    __tablename__ = "customers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False,
    )
    id_type: Mapped[str] = mapped_column(
        String(10), nullable=False, default="NIT", server_default="NIT",
        comment="Tipo de documento: NIT, CC, CE, PP, TI",
    )
    id_number: Mapped[str] = mapped_column(
        String(20), nullable=False, unique=True, index=True,
        comment="Número de identificación (NIT sin DV, CC, etc.)",
    )
    dv: Mapped[str | None] = mapped_column(
        String(1), nullable=True,
        comment="Dígito de verificación (solo para NIT)",
    )
    business_name: Mapped[str] = mapped_column(
        String(255), nullable=False,
        comment="Razón social o nombre completo",
    )
    trade_name: Mapped[str | None] = mapped_column(String(255), nullable=True, comment="Nombre comercial")
    email: Mapped[str] = mapped_column(
        String(255), nullable=False, unique=True, index=True,
        comment="Correo electrónico único del cliente"
    )
    phone: Mapped[str | None] = mapped_column(
        String(30), nullable=True, unique=True, index=True,
        comment="Número de contacto telefónico único"
    )
    location_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("locations.id", ondelete="SET NULL"), nullable=True,
    )
    location: Mapped["Location"] = relationship()
    tax_regime: Mapped[str] = mapped_column(
        String(50), nullable=False, default="Simplificado", server_default="Simplificado",
        comment="Régimen tributario: Simplificado, Común, Gran Contribuyente",
    )
    is_tax_responsible: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false",
        comment="Responsable de IVA",
    )
    is_preferred: Mapped[bool] = mapped_column(
    Boolean, nullable=False, default=False, server_default="false",
    comment="Cliente preferencial con descuento automático",
    )
    discount_type: Mapped[str] = mapped_column(
        String(10), nullable=False, default="percent", server_default="percent",
        comment="Tipo de descuento: percent | fixed",
    )
    discount_value: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0"), server_default="0",
        comment="Valor del descuento (% o monto fijo)",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, onupdate=func.now(),
    )

    invoices: Mapped[list["Invoice"]] = relationship(
        back_populates="customer", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Customer(id={self.id!r}, id_number={self.id_number!r}, name={self.business_name!r})>"


# —— Invoice Sequences ————————————————————————————————————————————————————————


class InvoiceSequence(Base):
    """
    Controls consecutive invoice numbering per prefix.

    Uses database-level row locking for atomic increment to
    guarantee unique sequential numbers.
    """

    __tablename__ = "invoice_sequences"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False,
    )
    prefix: Mapped[str] = mapped_column(
        String(10), nullable=False, unique=True, index=True,
        comment="Prefijo de facturación (ej: SETT)",
    )
    current_number: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0",
        comment="Último número usado",
    )
    resolution_number: Mapped[str | None] = mapped_column(
        String(50), nullable=True, comment="Número de resolución DIAN",
    )
    resolution_date: Mapped[date | None] = mapped_column(
        Date, nullable=True, comment="Fecha de la resolución DIAN",
    )
    range_from: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")
    range_to: Mapped[int] = mapped_column(Integer, nullable=False, default=5000, server_default="5000")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")

    def __repr__(self) -> str:
        return f"<InvoiceSequence(prefix={self.prefix!r}, current={self.current_number})>"


# —— Invoices —————————————————————————————————————————————————————————————————


class Invoice(Base):
    """
    Represents an electronic invoice (factura electrónica).

    Columnas GENERATED por PostgreSQL (solo lectura desde ORM):
    - full_number: prefix || '-' || LPAD(number::text, 8, '0')
    - subtotal, discount_total, tax_base, tax_total, total:
      sincronizados por el trigger sync_invoice_totals al insertar/modificar items.

    SQLAlchemy usa FetchedValue() en estas columnas para indicar que
    el valor lo provee la DB y debe refrescarse después del INSERT/UPDATE.
    """

    __tablename__ = "invoices"

    __table_args__ = (
        UniqueConstraint("prefix", "number", name="uidx_invoices_prefix_number"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False,
    )

    # Numeración
    prefix: Mapped[str] = mapped_column(String(10), nullable=False, default="SETT")
    number: Mapped[int] = mapped_column(Integer, nullable=False)

    # full_number es GENERATED ALWAYS AS en PostgreSQL.
    # server_default=FetchedValue() indica a SQLAlchemy que NO lo incluya en INSERT
    # y que lo lea desde la DB después del flush (eager_defaults o refresh).
    full_number: Mapped[str] = mapped_column(
        String,
        nullable=False,
        unique=True,
        index=True,
        server_default=FetchedValue(),
        comment="GENERATED: prefix || '-' || LPAD(number::text, 8, '0')",
    )

    # Relaciones
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.id", ondelete="RESTRICT"), nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False,
        comment="Usuario que creó la factura",
    )

    # Fechas
    issued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # CHAR(3) ISO 4217 — consistente con la migración SQL
    currency: Mapped[str] = mapped_column(
        CHAR(3), nullable=False, default="COP", server_default="COP",
    )

    # Totales gestionados por trigger sync_invoice_totals.
    # FetchedValue() en server_default Y server_onupdate indica a SQLAlchemy
    # que estos campos los escribe la DB, no el ORM. Nunca los incluyas en
    # INSERT ni UPDATE desde el código Python.
    subtotal: Mapped[Decimal] = mapped_column(
        Numeric(14, 4), nullable=False,
        server_default=FetchedValue(),
        server_onupdate=FetchedValue(),
        comment="TRIGGER: suma de invoice_items.subtotal",
    )
    discount_total: Mapped[Decimal] = mapped_column(
        Numeric(14, 4), nullable=False,
        server_default=FetchedValue(),
        server_onupdate=FetchedValue(),
        comment="TRIGGER: suma de invoice_items.discount",
    )
    tax_base: Mapped[Decimal] = mapped_column(
        Numeric(14, 4), nullable=False,
        server_default=FetchedValue(),
        server_onupdate=FetchedValue(),
        comment="TRIGGER: suma de (subtotal - discount) por ítem",
    )
    tax_total: Mapped[Decimal] = mapped_column(
        Numeric(14, 4), nullable=False,
        server_default=FetchedValue(),
        server_onupdate=FetchedValue(),
        comment="TRIGGER: suma de invoice_items.tax_amount",
    )
    total: Mapped[Decimal] = mapped_column(
        Numeric(14, 4), nullable=False,
        server_default=FetchedValue(),
        server_onupdate=FetchedValue(),
        comment="TRIGGER: suma de invoice_items.total",
    )

    # Pago
    payment_method: Mapped[str] = mapped_column(
        String(50), nullable=False, default="Contado", server_default="Contado",
        comment="Método de pago: Contado, Crédito, etc.",
    )
    payment_means: Mapped[str] = mapped_column(
        String(5), nullable=False, default="10", server_default="10",
        comment="Código medio de pago DIAN (10=Efectivo, 42=Consignación, etc.)",
    )

    #  ENUM invoice_status alineado con el tipo creado en PostgreSQL.
    # create_type=False porque el tipo ya existe en la DB (lo creamos en el Bloque 1).
    # Valores válidos: draft | issued | sent | paid | void | overdue
    status: Mapped[str] = mapped_column(
        Enum(
            "draft", "issued", "sent", "paid", "void", "overdue",
            name="invoice_status",
            create_type=False,
        ),
        nullable=False,
        default="draft",
        server_default="draft",
    )

    # DIAN
    dian_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="none", server_default="none",
        comment="none | pending | accepted | rejected",
    )
    cufe: Mapped[str | None] = mapped_column(
        String(128), nullable=True,
        comment="Código Único de Factura Electrónica (SHA-384)",
    )
    qr_data: Mapped[str | None] = mapped_column(
        Text, nullable=True,
        comment="Datos para código QR de validación DIAN",
    )
    xml_content: Mapped[str | None] = mapped_column(
        Text, nullable=True,
        comment="XML UBL 2.1 completo de la factura",
    )
    pdf_url: Mapped[str | None] = mapped_column(
        String(500), nullable=True, comment="Ruta al archivo PDF generado",
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True,
        server_onupdate=FetchedValue(),
        comment="Actualizado por trigger trg_invoices_updated_at",
    )

    # Relationships
    customer: Mapped["Customer"] = relationship(back_populates="invoices")
    user: Mapped["User"] = relationship()
    items: Mapped[list["InvoiceItem"]] = relationship(
        back_populates="invoice",
        cascade="all, delete-orphan",
        order_by="InvoiceItem.line_number",
    )
    credit_notes: Mapped[list["CreditNote"]] = relationship(
        back_populates="invoice", cascade="all, delete-orphan"
    )
    dian_events: Mapped[list["DianEvent"]] = relationship(
        back_populates="invoice", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Invoice(id={self.id!r}, number={self.full_number!r}, total={self.total})>"


# —— Invoice Items ————————————————————————————————————————————————————————————


class InvoiceItem(Base):
    """
    Represents a single line item within an invoice.

    Columnas GENERATED por PostgreSQL (solo lectura desde ORM):
    - subtotal:   ROUND(quantity * unit_price, 4)
    - tax_amount: ROUND((quantity * unit_price - discount) * tax_rate / 100, 4)
    - total:      ROUND(quantity * unit_price - discount + tax_amount, 4)

    SQLAlchemy usa FetchedValue() para que nunca intente escribir estas columnas.
    """

    __tablename__ = "invoice_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False,
    )
    invoice_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("invoices.id", ondelete="CASCADE"),
        nullable=False,
    )
    line_number: Mapped[int] = mapped_column(
        SmallInteger, nullable=False, default=1,
        comment="Número de línea único por factura (constraint uidx_item_line_number)",
    )

    # Referencia opcional a producto o servicio
    product_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="SET NULL"), nullable=True,
    )
    service_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("services.id", ondelete="SET NULL"), nullable=True,
    )

    description: Mapped[str] = mapped_column(String(500), nullable=False)
    code: Mapped[str | None] = mapped_column(
        String(50), nullable=True, comment="Código del producto/servicio",
    )

    # ENUM item_unit alineado con el tipo creado en PostgreSQL.
    # create_type=False porque el tipo ya existe en la DB (Bloque 1 de la migración).
    # Valores: UND | KG | LT | MT | HR | SRV | MES | CJA | PAR | ROL
    unit: Mapped[str] = mapped_column(
        Enum(
            "UND", "KG", "LT", "MT", "HR", "SRV", "MES", "CJA", "PAR", "ROL",
            name="item_unit",
            create_type=False,
        ),
        nullable=False,
        default="UND",
        server_default="UND",
    )

    # Campos base — estos SÍ se escriben desde el ORM
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 4), nullable=False, default=1)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    discount: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False, default=0, server_default="0")
    tax_rate: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), nullable=False, default=19,
        comment="Porcentaje de IVA (0, 5, 19)",
    )

    # subtotal, tax_amount y total son GENERATED ALWAYS AS en PostgreSQL.
    # FetchedValue() indica a SQLAlchemy que NO los incluya en INSERT ni UPDATE,
    # y que los lea desde la DB después del flush.
    subtotal: Mapped[Decimal] = mapped_column(
        Numeric(14, 4), nullable=False,
        server_default=FetchedValue(),
        comment="GENERATED: ROUND(quantity * unit_price, 4)",
    )
    tax_amount: Mapped[Decimal] = mapped_column(
        Numeric(14, 4), nullable=False,
        server_default=FetchedValue(),
        comment="GENERATED: ROUND((subtotal - discount) * tax_rate / 100, 4)",
    )
    total: Mapped[Decimal] = mapped_column(
        Numeric(14, 4), nullable=False,
        server_default=FetchedValue(),
        comment="GENERATED: ROUND(subtotal - discount + tax_amount, 4)",
    )

    # updated_at gestionado por trigger trg_invoice_items_updated_at
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True,
        server_onupdate=FetchedValue(),
        comment="Actualizado por trigger trg_invoice_items_updated_at",
    )

    invoice: Mapped["Invoice"] = relationship(back_populates="items")

    def __repr__(self) -> str:
        return f"<InvoiceItem(id={self.id!r}, desc={self.description!r}, total={self.total})>"


# —— Credit Notes —————————————————————————————————————————————————————————————


class CreditNote(Base):
    """
    Represents a credit note (nota crédito) associated with an invoice.

    A diferencia de invoice_items, credit_note_items NO tiene columnas GENERATED.
    Los totales se calculan en Python (crud.py) y se persisten normalmente.
    """

    __tablename__ = "credit_notes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False,
    )
    invoice_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="RESTRICT"), nullable=False,
    )
    number: Mapped[str] = mapped_column(String(30), nullable=False, unique=True, index=True)
    reason: Mapped[str] = mapped_column(String(500), nullable=False, comment="Motivo de la nota crédito")
    subtotal: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False, default=0)
    tax_total: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False, default=0)
    total: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False, default=0)
    #  Numeric(14,4) consistente con invoice_items (antes era Numeric(15,2))
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="active", server_default="active",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )

    invoice: Mapped["Invoice"] = relationship(back_populates="credit_notes")
    items: Mapped[list["CreditNoteItem"]] = relationship(
        back_populates="credit_note", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<CreditNote(id={self.id!r}, number={self.number!r})>"


class CreditNoteItem(Base):
    """
    Line item within a credit note.

    NO usa columnas GENERATED — los totales se calculan en crud.py y se persisten.
    """

    __tablename__ = "credit_note_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False,
    )
    credit_note_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("credit_notes.id", ondelete="CASCADE"), nullable=False,
    )
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    # Numeric(12,4) para quantity — consistente con invoice_items
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 4), nullable=False, default=1)
    # Numeric(14,4) para precios — consistente con invoice_items
    unit_price: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    tax_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, default=19)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False, default=0)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False, default=0)
    total: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False, default=0)

    credit_note: Mapped["CreditNote"] = relationship(back_populates="items")


# —— DIAN Events ——————————————————————————————————————————————————————————————


class DianEvent(Base):
    """
    Logs every interaction with the DIAN web service.

    Provides full traceability for electronic invoicing compliance.
    """

    __tablename__ = "dian_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False,
    )
    invoice_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False,
    )
    event_type: Mapped[str] = mapped_column(
        String(50), nullable=False,
        comment="send | status_check | accepted | rejected | error",
    )
    request_payload: Mapped[str | None] = mapped_column(Text, nullable=True, comment="XML/SOAP request sent")
    response_payload: Mapped[str | None] = mapped_column(Text, nullable=True, comment="XML/SOAP response received")
    status_code: Mapped[str | None] = mapped_column(String(10), nullable=True, comment="DIAN response code")
    message: Mapped[str | None] = mapped_column(Text, nullable=True, comment="DIAN response message")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )

    invoice: Mapped["Invoice"] = relationship(back_populates="dian_events")

    def __repr__(self) -> str:
        return f"<DianEvent(id={self.id!r}, type={self.event_type!r})>"


# Import User para resolución de relaciones — al final para evitar imports circulares
from app.modules.auth.models import User  # noqa: E402, F401
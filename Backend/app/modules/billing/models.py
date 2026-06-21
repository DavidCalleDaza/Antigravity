"""
Servinow API ? Billing Module: ORM Models.

Defines all database tables required for the complete electronic invoicing
(facturaci?n electr?nica) system, including customers, invoices, line items,
credit notes, invoice sequences, and DIAN event logs.

Compliant with Colombian DIAN regulations (Resoluci?n 000012).
"""

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


# ?? Customers ????????????????????????????????????????????????????????????????


class Customer(Base):
    """
    Represents a billing customer (receptor de factura).

    Stores identification, contact, and address information required
    for Colombian electronic invoicing.
    """

    __tablename__ = "customers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )
    # Identification
    id_type: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        default="NIT",
        server_default="NIT",
        comment="Tipo de documento: NIT, CC, CE, PP, TI",
    )
    id_number: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        unique=True,
        index=True,
        comment="N?mero de identificaci?n (NIT sin DV, CC, etc.)",
    )
    dv: Mapped[str | None] = mapped_column(
        String(1),
        nullable=True,
        comment="D?gito de verificaci?n (solo para NIT)",
    )
    # Name
    business_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="Raz?n social o nombre completo",
    )
    trade_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        comment="Nombre comercial",
    )
    # Contact
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    # Address
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    department: Mapped[str | None] = mapped_column(String(100), nullable=True)
    country_code: Mapped[str] = mapped_column(
        String(2), nullable=False, default="CO", server_default="CO"
    )
    # Tax regime
    tax_regime: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="Simplificado",
        server_default="Simplificado",
        comment="R?gimen tributario: Simplificado, Com?n, Gran Contribuyente",
    )
    is_tax_responsible: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
        comment="Responsable de IVA",
    )
    # Metadata
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, onupdate=func.now()
    )

    # Relationships
    invoices: Mapped[list["Invoice"]] = relationship(
        back_populates="customer", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Customer(id={self.id!r}, id_number={self.id_number!r}, name={self.business_name!r})>"


# ?? Invoice Sequences ????????????????????????????????????????????????????????


class InvoiceSequence(Base):
    """
    Controls consecutive invoice numbering per prefix.

    Uses database-level row locking for atomic increment to
    guarantee unique sequential numbers.
    """

    __tablename__ = "invoice_sequences"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )
    prefix: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        unique=True,
        index=True,
        comment="Prefijo de facturaci?n (ej: SETT)",
    )
    current_number: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
        comment="?ltimo n?mero usado",
    )
    resolution_number: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        comment="N?mero de resoluci?n DIAN",
    )
    resolution_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
        comment="Fecha de la resoluci?n DIAN",
    )
    range_from: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1, server_default="1"
    )
    range_to: Mapped[int] = mapped_column(
        Integer, nullable=False, default=5000, server_default="5000"
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )

    def __repr__(self) -> str:
        return f"<InvoiceSequence(prefix={self.prefix!r}, current={self.current_number})>"


# ?? Invoices ?????????????????????????????????????????????????????????????????


class Invoice(Base):
    """
    Represents an electronic invoice (factura electr?nica).

    Contains all header-level data including totals, tax calculations,
    DIAN integration status, and CUFE hash.
    """

    __tablename__ = "invoices"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )
    # Numbering
    prefix: Mapped[str] = mapped_column(
        String(10), nullable=False, default="SETT"
    )
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    full_number: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        unique=True,
        index=True,
        comment="N?mero completo: PREFIX-NUMBER (ej: SETT-0001)",
    )

    # Relations
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("customers.id", ondelete="RESTRICT"),
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        comment="Usuario que cre? la factura",
    )

    # Dates
    issued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Monetary
    currency: Mapped[str] = mapped_column(
        String(3), nullable=False, default="COP", server_default="COP"
    )
    subtotal: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=0
    )
    discount_total: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=0
    )
    tax_base: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=0,
        comment="Base gravable total",
    )
    tax_total: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=0,
        comment="Total IVA",
    )
    total: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=0
    )

    # Payment
    payment_method: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="Contado",
        server_default="Contado",
        comment="M?todo de pago: Contado, Cr?dito, Transferencia, etc.",
    )
    payment_means: Mapped[str] = mapped_column(
        String(5),
        nullable=False,
        default="10",
        server_default="10",
        comment="C?digo medio de pago DIAN (10=Efectivo, 42=Consignaci?n, 47=Transferencia, 48=Tarjeta cr?dito, 49=Tarjeta d?bito)",
    )

    # Status
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="draft",
        server_default="draft",
        comment="draft, pending, paid, overdue, cancelled, credit_note",
    )

    # DIAN
    dian_status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="none",
        server_default="none",
        comment="none, pending, accepted, rejected",
    )
    cufe: Mapped[str | None] = mapped_column(
        String(128),
        nullable=True,
        comment="C?digo ?nico de Factura Electr?nica (SHA-384)",
    )
    qr_data: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Datos para c?digo QR de validaci?n DIAN",
    )
    xml_content: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="XML UBL 2.1 completo de la factura",
    )

    # PDF
    pdf_url: Mapped[str | None] = mapped_column(
        String(500), nullable=True, comment="Ruta al archivo PDF generado"
    )

    # Notes
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, onupdate=func.now()
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


# ?? Invoice Items ????????????????????????????????????????????????????????????


class InvoiceItem(Base):
    """
    Represents a single line item within an invoice.

    Each item references either a product or service (or neither for
    custom items) and contains its own tax calculation.
    """

    __tablename__ = "invoice_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )
    invoice_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("invoices.id", ondelete="CASCADE"),
        nullable=False,
    )
    line_number: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1
    )

    # Item reference (optional)
    product_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="SET NULL"),
        nullable=True,
    )
    service_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("services.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Description
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    code: Mapped[str | None] = mapped_column(
        String(50), nullable=True, comment="C?digo del producto/servicio"
    )
    unit: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        default="UND",
        server_default="UND",
        comment="Unidad de medida (UND, HRS, KG, etc.)",
    )

    # Quantities and prices
    quantity: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=1
    )
    unit_price: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False
    )
    discount: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=0
    )
    subtotal: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=0,
        comment="quantity * unit_price - discount",
    )

    # Tax
    tax_rate: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        nullable=False,
        default=19.00,
        comment="Porcentaje de IVA (0, 5, 19)",
    )
    tax_amount: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=0
    )
    total: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=0,
        comment="subtotal + tax_amount",
    )

    # Relationships
    invoice: Mapped["Invoice"] = relationship(back_populates="items")

    def __repr__(self) -> str:
        return f"<InvoiceItem(id={self.id!r}, desc={self.description!r}, total={self.total})>"


# ?? Credit Notes ?????????????????????????????????????????????????????????????


class CreditNote(Base):
    """
    Represents a credit note (nota cr?dito) associated with an invoice.

    Used for partial or total cancellation/adjustment of invoices.
    """

    __tablename__ = "credit_notes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )
    invoice_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("invoices.id", ondelete="RESTRICT"),
        nullable=False,
    )
    number: Mapped[str] = mapped_column(
        String(30), nullable=False, unique=True, index=True
    )
    reason: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        comment="Motivo de la nota cr?dito",
    )
    subtotal: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=0
    )
    tax_total: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=0
    )
    total: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=0
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="active", server_default="active"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Relationships
    invoice: Mapped["Invoice"] = relationship(back_populates="credit_notes")
    items: Mapped[list["CreditNoteItem"]] = relationship(
        back_populates="credit_note", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<CreditNote(id={self.id!r}, number={self.number!r})>"


class CreditNoteItem(Base):
    """Line item within a credit note."""

    __tablename__ = "credit_note_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )
    credit_note_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("credit_notes.id", ondelete="CASCADE"),
        nullable=False,
    )
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=1
    )
    unit_price: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False
    )
    tax_rate: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), nullable=False, default=19.00
    )
    tax_amount: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=0
    )
    subtotal: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=0
    )
    total: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=0
    )

    credit_note: Mapped["CreditNote"] = relationship(back_populates="items")


# ?? DIAN Events ??????????????????????????????????????????????????????????????


class DianEvent(Base):
    """
    Logs every interaction with the DIAN web service.

    Provides full traceability for electronic invoicing compliance.
    """

    __tablename__ = "dian_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )
    invoice_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("invoices.id", ondelete="CASCADE"),
        nullable=False,
    )
    event_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="send, status_check, accepted, rejected, error",
    )
    request_payload: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="XML/SOAP request sent"
    )
    response_payload: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="XML/SOAP response received"
    )
    status_code: Mapped[str | None] = mapped_column(
        String(10), nullable=True, comment="DIAN response code"
    )
    message: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="DIAN response message"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Relationships
    invoice: Mapped["Invoice"] = relationship(back_populates="dian_events")

    def __repr__(self) -> str:
        return f"<DianEvent(id={self.id!r}, type={self.event_type!r})>"


# Import User for relationship resolution
from app.modules.auth.models import User  # noqa: E402, F401

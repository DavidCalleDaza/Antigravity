"""
Servinow API ? Billing Module: Pydantic Schemas.

Defines request/response validation models for customers, invoices,
invoice items, credit notes, and billing summaries.
"""

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ?? Customer Schemas ?????????????????????????????????????????????????????????


class CustomerBase(BaseModel):
    """Shared fields for customer creation and response."""

    id_type: Annotated[
        str,
        Field(
            default="NIT",
            description="Tipo de documento: NIT, CC, CE, PP, TI",
            max_length=10,
        ),
    ]
    id_number: Annotated[
        str,
        Field(
            ...,
            description="N?mero de identificaci?n.",
            min_length=1,
            max_length=20,
        ),
    ]
    dv: Annotated[str | None, Field(None, description="D?gito de verificaci?n.", max_length=1)]
    business_name: Annotated[
        str,
        Field(..., description="Raz?n social o nombre completo.", min_length=1, max_length=255),
    ]
    trade_name: Annotated[str | None, Field(None, description="Nombre comercial.", max_length=255)]
    email: Annotated[str, Field(..., description="Email de contacto.", max_length=255)]
    phone: Annotated[str | None, Field(None, description="Tel?fono.", max_length=30)]
    address: Annotated[str | None, Field(None, description="Direcci?n.", max_length=255)]
    city: Annotated[str | None, Field(None, description="Ciudad.", max_length=100)]
    department: Annotated[str | None, Field(None, description="Departamento.", max_length=100)]
    country_code: Annotated[str, Field(default="CO", max_length=2)]
    tax_regime: Annotated[
        str, Field(default="Simplificado", description="R?gimen tributario.", max_length=50)
    ]
    is_tax_responsible: Annotated[
        bool, Field(default=False, description="Responsable de IVA.")
    ]


class CustomerCreate(CustomerBase):
    """Schema for creating a new customer."""
    pass


class CustomerUpdate(BaseModel):
    """Schema for updating an existing customer."""

    id_type: Annotated[str | None, Field(None, max_length=10)] = None
    id_number: Annotated[str | None, Field(None, max_length=20)] = None
    dv: Annotated[str | None, Field(None, max_length=1)] = None
    business_name: Annotated[str | None, Field(None, max_length=255)] = None
    trade_name: Annotated[str | None, Field(None, max_length=255)] = None
    email: Annotated[str | None, Field(None, max_length=255)] = None
    phone: Annotated[str | None, Field(None, max_length=30)] = None
    address: Annotated[str | None, Field(None, max_length=255)] = None
    city: Annotated[str | None, Field(None, max_length=100)] = None
    department: Annotated[str | None, Field(None, max_length=100)] = None
    tax_regime: Annotated[str | None, Field(None, max_length=50)] = None
    is_tax_responsible: Annotated[bool | None, Field(None)] = None
    is_active: Annotated[bool | None, Field(None)] = None


class CustomerResponse(CustomerBase):
    """Schema for customer data in API responses."""

    model_config = ConfigDict(from_attributes=True)

    id: Annotated[uuid.UUID, Field(description="Customer UUID.")]
    is_active: bool
    created_at: datetime
    updated_at: datetime | None = None


# ?? Invoice Item Schemas ?????????????????????????????????????????????????????


class InvoiceItemCreate(BaseModel):
    """Schema for creating an invoice line item."""

    description: Annotated[str, Field(..., min_length=1, max_length=500)]
    code: Annotated[str | None, Field(None, max_length=50)] = None
    unit: Annotated[str, Field(default="UND", max_length=10)]
    quantity: Annotated[Decimal, Field(..., ge=0.01, description="Cantidad.")]
    unit_price: Annotated[Decimal, Field(..., ge=0, description="Precio unitario.")]
    discount: Annotated[Decimal, Field(default=0, ge=0, description="Descuento por l?nea.")]
    tax_rate: Annotated[
        Decimal,
        Field(default=Decimal("19.00"), ge=0, le=100, description="Porcentaje de IVA."),
    ]
    product_id: Annotated[uuid.UUID | None, Field(None)] = None
    service_id: Annotated[uuid.UUID | None, Field(None)] = None


class InvoiceItemResponse(BaseModel):
    """Schema for invoice item data in API responses."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    line_number: int
    description: str
    code: str | None = None
    unit: str
    quantity: Decimal
    unit_price: Decimal
    discount: Decimal
    subtotal: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    total: Decimal
    product_id: uuid.UUID | None = None
    service_id: uuid.UUID | None = None


# ?? Invoice Schemas ??????????????????????????????????????????????????????????


class InvoiceCreate(BaseModel):
    """Schema for creating a new invoice."""

    customer_id: Annotated[uuid.UUID, Field(..., description="ID del cliente.")]
    due_date: Annotated[date | None, Field(None, description="Fecha de vencimiento.")]
    payment_method: Annotated[
        str, Field(default="Contado", max_length=50, description="M?todo de pago.")
    ]
    payment_means: Annotated[
        str,
        Field(
            default="10",
            max_length=5,
            description="C?digo medio de pago DIAN.",
        ),
    ]
    notes: Annotated[str | None, Field(None, description="Observaciones.")] = None
    items: Annotated[
        list[InvoiceItemCreate],
        Field(..., min_length=1, description="L?neas de la factura."),
    ]
    status: Annotated[
        str,
        Field(default="draft", description="Estado inicial: draft o pending."),
    ]

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in ("draft", "pending"):
            raise ValueError("El estado inicial debe ser 'draft' o 'pending'.")
        return v


class InvoiceUpdate(BaseModel):
    """Schema for updating a draft invoice."""

    customer_id: Annotated[uuid.UUID | None, Field(None)] = None
    due_date: Annotated[date | None, Field(None)] = None
    payment_method: Annotated[str | None, Field(None, max_length=50)] = None
    payment_means: Annotated[str | None, Field(None, max_length=5)] = None
    notes: Annotated[str | None, Field(None)] = None
    items: Annotated[list[InvoiceItemCreate] | None, Field(None)] = None


class InvoiceListResponse(BaseModel):
    """Compact schema for invoice list views."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_number: str
    customer_name: str
    items_count: int
    subtotal: Decimal
    tax_total: Decimal
    total: Decimal
    status: str
    dian_status: str
    payment_method: str
    issued_at: datetime
    due_date: date | None = None
    created_at: datetime


class InvoiceResponse(BaseModel):
    """Full schema for invoice detail views."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    prefix: str
    number: int
    full_number: str
    customer_id: uuid.UUID
    customer: CustomerResponse
    user_id: uuid.UUID
    issued_at: datetime
    due_date: date | None = None
    currency: str
    subtotal: Decimal
    discount_total: Decimal
    tax_base: Decimal
    tax_total: Decimal
    total: Decimal
    payment_method: str
    payment_means: str
    status: str
    dian_status: str
    cufe: str | None = None
    qr_data: str | None = None
    pdf_url: str | None = None
    notes: str | None = None
    items: list[InvoiceItemResponse]
    created_at: datetime
    updated_at: datetime | None = None


# ?? Credit Note Schemas ??????????????????????????????????????????????????????


class CreditNoteItemCreate(BaseModel):
    """Schema for creating a credit note line item."""

    description: Annotated[str, Field(..., min_length=1, max_length=500)]
    quantity: Annotated[Decimal, Field(..., ge=0.01)]
    unit_price: Annotated[Decimal, Field(..., ge=0)]
    tax_rate: Annotated[Decimal, Field(default=Decimal("19.00"), ge=0, le=100)]


class CreditNoteCreate(BaseModel):
    """Schema for creating a credit note."""

    invoice_id: Annotated[uuid.UUID, Field(..., description="ID de la factura original.")]
    reason: Annotated[str, Field(..., min_length=1, max_length=500)]
    items: Annotated[list[CreditNoteItemCreate], Field(..., min_length=1)]


class CreditNoteItemResponse(BaseModel):
    """Schema for credit note item data."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    description: str
    quantity: Decimal
    unit_price: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    subtotal: Decimal
    total: Decimal


class CreditNoteResponse(BaseModel):
    """Schema for credit note data in API responses."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    invoice_id: uuid.UUID
    number: str
    reason: str
    subtotal: Decimal
    tax_total: Decimal
    total: Decimal
    status: str
    items: list[CreditNoteItemResponse]
    created_at: datetime


# ?? DIAN Event Schemas ???????????????????????????????????????????????????????


class DianEventResponse(BaseModel):
    """Schema for DIAN event log entries."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    event_type: str
    status_code: str | None = None
    message: str | None = None
    created_at: datetime


class DianSubmitResponse(BaseModel):
    """Response from DIAN submission."""

    success: bool
    message: str
    cufe: str | None = None
    dian_status: str
    events: list[DianEventResponse] = []


class DianStatusResponse(BaseModel):
    """Current DIAN status for an invoice."""

    dian_status: str
    cufe: str | None = None
    events: list[DianEventResponse]


# ?? Summary Schemas ??????????????????????????????????????????????????????????


class InvoiceSummary(BaseModel):
    """Billing summary for dashboard cards."""

    income: Decimal = Field(description="Total de facturas pagadas en el per?odo.")
    pending: Decimal = Field(description="Total de facturas pendientes.")
    overdue: Decimal = Field(description="Total de facturas vencidas.")
    credit_notes_total: Decimal = Field(description="Total de notas cr?dito.")
    invoice_count: int = Field(description="Cantidad de facturas en el per?odo.")
    balance: Decimal = Field(description="Balance neto (income - credit_notes).")

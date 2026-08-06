"""
DonApp API — Billing Module: Pydantic Schemas.

Defines request/response validation models for customers, invoices,
invoice items, credit notes, and billing summaries.
"""

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.modules.locations.schemas import LocationCreate, LocationResponse


# —— Constantes ENUM (espejo de los tipos PostgreSQL) —————————————————————————

# Espejo exacto del ENUM invoice_status de PostgreSQL.
# 'cancelled' y 'pending' eliminados — no existen en la DB.
INVOICE_STATUSES = Literal["draft", "issued", "sent", "paid", "void", "overdue"]

# Espejo exacto del ENUM item_unit de PostgreSQL.
ITEM_UNITS = Literal["UND", "KG", "LT", "MT", "HR", "SRV", "MES", "CJA", "PAR", "ROL"]

# Estados permitidos al crear una factura (subconjunto de INVOICE_STATUSES)
INVOICE_CREATE_STATUSES = Literal["draft", "issued", "sent"]


# —— Customer Schemas —————————————————————————————————————————————————————————


class CustomerBase(BaseModel):
    """Shared fields for customer creation and response."""

    id_type: Annotated[
        str,
        Field(default="NIT", description="Tipo de documento: NIT, CC, CE, PP, TI", max_length=10),
    ]
    id_number: Annotated[
        str,
        Field(..., description="Número de identificación.", min_length=1, max_length=20),
    ]
    dv: Annotated[str | None, Field(None, description="Dígito de verificación.", max_length=1)]
    business_name: Annotated[
        str, Field(..., description="Razón social o nombre completo.", min_length=1, max_length=255),
    ]
    trade_name: Annotated[str | None, Field(None, description="Nombre comercial.", max_length=255)]
    email: Annotated[str, Field(..., description="Email de contacto.", max_length=255)]
    phone: Annotated[str | None, Field(None, description="Teléfono.", max_length=30)]
    location: Annotated[LocationCreate | None, Field(None, description="Ubicación.")]
    tax_regime: Annotated[
        str, Field(default="Simplificado", description="Régimen tributario.", max_length=50)
    ]
    is_tax_responsible: Annotated[bool, Field(default=False, description="Responsable de IVA.")]
    is_preferred: Annotated[bool, Field(default=False, description="Cliente preferencial.")]
    discount_type: Annotated[str, Field(default="percent", description="percent | fixed.", max_length=10)]
    discount_value: Annotated[Decimal, Field(default=Decimal("0"), ge=0, description="Valor del descuento.")]

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
    location: Annotated[LocationCreate | None, Field(None)] = None
    tax_regime: Annotated[str | None, Field(None, max_length=50)] = None
    is_tax_responsible: Annotated[bool | None, Field(None)] = None
    is_active: Annotated[bool | None, Field(None)] = None
    is_preferred: Annotated[bool | None, Field(None)] = None
    discount_type: Annotated[str | None, Field(None, max_length=10)] = None
    discount_value: Annotated[Decimal | None, Field(None, ge=0)] = None


class CustomerResponse(CustomerBase):
    """Schema for customer data in API responses."""

    model_config = ConfigDict(from_attributes=True)

    id: Annotated[uuid.UUID, Field(description="Customer UUID.")]
    is_active: bool
    created_at: datetime
    updated_at: datetime | None = None
    location: LocationResponse | None = None


# —— Invoice Item Schemas —————————————————————————————————————————————————————


class InvoiceItemCreate(BaseModel):
    """
    Schema for creating an invoice line item.

    IMPORTANTE: No incluir subtotal, tax_amount ni total —
    son columnas GENERATED en PostgreSQL y son rechazadas en el INSERT.
    """

    description: Annotated[str, Field(..., min_length=1, max_length=500)]
    code: Annotated[str | None, Field(None, max_length=50)] = None

    # unit tipado con Literal del ENUM item_unit de PostgreSQL.
    # Pydantic validará automáticamente que el valor esté en la lista.
    unit: Annotated[ITEM_UNITS, Field(default="UND", description="Unidad de medida.")]

    quantity: Annotated[Decimal, Field(..., ge=Decimal("0.0001"), description="Cantidad.")]
    unit_price: Annotated[Decimal, Field(..., ge=0, description="Precio unitario.")]
    discount: Annotated[Decimal, Field(default=Decimal("0"), ge=0, description="Descuento por línea.")]
    tax_rate: Annotated[
        Decimal | None, Field(default=None, ge=0, le=100, description="Porcentaje de IVA. Si no se especifica, se usa el IVA por defecto del país del cliente.")
    ]
    product_id: Annotated[uuid.UUID | None, Field(None)] = None
    service_id: Annotated[uuid.UUID | None, Field(None)] = None

    # Validar que product_id y service_id no vengan ambos llenos
    # (refleja el constraint chk_invoice_items_product_or_service de la DB)
    @field_validator("service_id")
    @classmethod
    def validate_product_or_service(cls, v: uuid.UUID | None, info) -> uuid.UUID | None:
        if v is not None and info.data.get("product_id") is not None:
            raise ValueError("Un ítem no puede tener product_id y service_id al mismo tiempo.")
        return v

    # Normalizar unit a mayúsculas antes de validar contra el ENUM
    @field_validator("unit", mode="before")
    @classmethod
    def normalize_unit(cls, v: str) -> str:
        return v.strip().upper() if isinstance(v, str) else v


class InvoiceItemResponse(BaseModel):
    """
    Schema for invoice item data in API responses.

    subtotal, tax_amount y total son columnas GENERATED en DB —
    solo se leen, nunca se escriben desde el frontend.
    """

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    line_number: int
    description: str
    code: str | None = None
    #  unit tipado con str (el ENUM viene como string desde SQLAlchemy)
    unit: str
    quantity: Decimal
    unit_price: Decimal
    discount: Decimal
    tax_rate: Decimal
    # Campos GENERATED — solo lectura
    subtotal: Decimal
    tax_amount: Decimal
    total: Decimal
    product_id: uuid.UUID | None = None
    service_id: uuid.UUID | None = None


# —— Invoice Schemas ——————————————————————————————————————————————————————————


class InvoiceCreate(BaseModel):
    """
    Schema for creating a new invoice.

    NO incluir: full_number, subtotal, discount_total, tax_base, tax_total, total.
    Todos son calculados automáticamente por PostgreSQL (GENERATED o trigger).
    """

    customer_id: Annotated[uuid.UUID, Field(..., description="ID del cliente.")]
    due_date: Annotated[date | None, Field(None, description="Fecha de vencimiento.")]
    payment_method: Annotated[
        str, Field(default="Contado", max_length=50, description="Método de pago.")
    ]
    payment_means: Annotated[
        str, Field(default="10", max_length=5, description="Código medio de pago DIAN."),
    ]
    notes: Annotated[str | None, Field(None, description="Observaciones.")] = None
    items: Annotated[
        list[InvoiceItemCreate],
        Field(..., min_length=1, description="Líneas de la factura."),
    ]

    # status tipado con Literal de estados válidos en creación.
    # Reemplaza el field_validator manual — Pydantic lo valida automáticamente.
    status: Annotated[
        INVOICE_CREATE_STATUSES,
        Field(default="draft", description="Estado inicial: draft, issued o sent."),
    ]


class InvoiceUpdate(BaseModel):
    """
    Schema for updating a draft invoice.

    Solo facturas con status='draft' son editables (validado en crud.py).
    NO incluir full_number ni totales — son campos de solo lectura en DB.
    """

    customer_id: Annotated[uuid.UUID | None, Field(None)] = None
    due_date: Annotated[date | None, Field(None)] = None
    payment_method: Annotated[str | None, Field(None, max_length=50)] = None
    payment_means: Annotated[str | None, Field(None, max_length=5)] = None
    notes: Annotated[str | None, Field(None)] = None
    items: Annotated[list[InvoiceItemCreate] | None, Field(None)] = None
    status: Annotated[str | None, Field(None)] = None
    


class InvoiceListResponse(BaseModel):
    """
    Compact schema for invoice list views.

    full_number viene de la columna GENERATED en DB —
    nunca se calcula en el frontend.
    """

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_number: str | None = None  # None en borradores sin número aún asignado
    customer_name: str | None = None
    customer_email: str | None = None
    items_count: int = 0
    subtotal: Decimal = Decimal("0")
    tax_total: Decimal = Decimal("0")
    total: Decimal = Decimal("0")
    # status tipado como str (el ENUM llega como string desde SQLAlchemy)
    # La conversión a texto legible ocurre en el frontend (statusBadge en Billing.jsx)
    status: str
    dian_status: str
    payment_method: str
    issued_at: datetime
    due_date: date | None = None
    created_at: datetime
    


class InvoiceResponse(BaseModel):
    """
    Full schema for invoice detail views.

    Incluye todos los campos calculados por la DB:
    - full_number (GENERATED)
    - subtotal, discount_total, tax_base, tax_total, total (trigger)
    - items con subtotal, tax_amount, total (GENERATED en invoice_items)
    """

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
    # currency tipado como str de longitud 3 (CHAR(3) en DB)
    currency: str
    # Totales calculados por trigger — solo lectura
    subtotal: Decimal
    discount_total: Decimal
    tax_base: Decimal
    tax_total: Decimal
    total: Decimal
    preferred_discount: Decimal = Decimal("0")
    payment_method: str
    payment_means: str
    # status tipado como str — viene como string del ENUM de PostgreSQL
    status: str
    dian_status: str
    cufe: str | None = None
    qr_data: str | None = None
    pdf_url: str | None = None
    notes: str | None = None
    items: list[InvoiceItemResponse]
    created_at: datetime
    updated_at: datetime | None = None


# —— Credit Note Schemas ——————————————————————————————————————————————————————


class CreditNoteItemCreate(BaseModel):
    """Schema for creating a credit note line item."""

    description: Annotated[str, Field(..., min_length=1, max_length=500)]
    # ge=Decimal("0.0001") consistente con InvoiceItemCreate
    quantity: Annotated[Decimal, Field(..., ge=Decimal("0.0001"))]
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
    # status como str — credit_notes usa String(20) en DB (no ENUM)
    status: str
    items: list[CreditNoteItemResponse]
    created_at: datetime


# —— DIAN Event Schemas ———————————————————————————————————————————————————————


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
    # dian_status como str — valores: none | pending | accepted | rejected
    dian_status: str
    events: list[DianEventResponse] = []


class DianStatusResponse(BaseModel):
    """Current DIAN status for an invoice."""

    dian_status: str
    cufe: str | None = None
    events: list[DianEventResponse]


# —— Summary Schemas ——————————————————————————————————————————————————————————


class InvoiceSummary(BaseModel):
    """
    Billing summary for dashboard cards.

    pending = suma de facturas en estado 'issued' + 'sent'
    (no existe el estado 'pending' en el ENUM — ver crud.py get_billing_summary)
    """

    income: Decimal = Field(description="Total de facturas pagadas en el período.")
    pending: Decimal = Field(description="Total de facturas emitidas/enviadas pendientes de cobro.")
    overdue: Decimal = Field(description="Total de facturas vencidas.")
    credit_notes_total: Decimal = Field(description="Total de notas crédito activas.")
    invoice_count: int = Field(description="Cantidad de facturas activas en el período.")
    balance: Decimal = Field(description="Balance neto (income - credit_notes_total).")


# —— Top Selling Products/Services Schema ————————————————————————————————————


class TopSellingItem(BaseModel):
    """
    Aggregated sales data for a single product or service line.

    Se agrupa por description + code. Excluye facturas con status='void'.
    """

    model_config = ConfigDict(from_attributes=True)

    description: Annotated[str, Field(description="Descripción del producto o servicio.")]
    code: Annotated[str | None, Field(None, description="Código, si aplica.")]
    total_quantity: Annotated[Decimal, Field(description="Cantidad total vendida.")]
    total_amount: Annotated[Decimal, Field(description="Monto total facturado.")]


class TopSellingResponse(BaseModel):
    """Top productos y top servicios más vendidos, separados por categoría."""

    products: Annotated[list[TopSellingItem], Field(description="Top productos más vendidos.")]
    services: Annotated[list[TopSellingItem], Field(description="Top servicios más vendidos.")]


# —— Email Sending Schema ——————————————————————————————————————————————————

class InvoiceEmailSendResponse(BaseModel):
    """Respuesta del endpoint de envío de factura por correo."""

    success: bool
    message: str
    email: str | None = None


# —— Country Settings Schemas ————————————————————————————————————————————————

class CountrySettingUpsert(BaseModel):
    """Schema para crear o actualizar la configuración tributaria de un país."""

    country_name: Annotated[str, Field(..., min_length=1, max_length=100)]
    default_tax_rate: Annotated[
        Decimal, Field(..., ge=0, le=100, description="Porcentaje de IVA por defecto para el país.")
    ]
    currency_code: Annotated[str | None, Field(None, max_length=10)] = None
    currency_symbol: Annotated[str | None, Field(None, max_length=10)] = None
    is_active: Annotated[bool, Field(default=True)] = True


class CountrySettingResponse(BaseModel):
    """Schema for country settings in API responses."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    country_code: str
    country_name: str
    default_tax_rate: Decimal
    currency_code: str | None = None
    currency_symbol: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime | None = None


class CategoryDistributionItem(BaseModel):
    """
    Item individual del reporte de distribución por categoría.
    """
    category: str
    quantity: Decimal
    revenue: Decimal
    percentage: float


class CategoryDistributionResponse(BaseModel):
    """
    Respuesta completa del reporte de distribución por categoría.
    """
    entity_type: Literal["product", "service"]
    total_quantity: Decimal
    total_revenue: Decimal
    total_percentage: float
    distribution: list[CategoryDistributionItem]


# —- Analytics Endpoints Schemas ————————————————————————————————————————————————

# -- Revenue By Line Schema ----------------------------------------------------

class RevenueByLineItem(BaseModel):
    """
    Ingreso mensual desagregado por linea de negocio (Productos vs Servicios).
    """
    month: str
    sortKey: int
    products: Decimal = Decimal("0")
    services: Decimal = Decimal("0")
    total: Decimal = Decimal("0")


# -- Payment Stats Schema ------------------------------------------------------

class PaymentStatItem(BaseModel):
    """
    Distribucion de ingresos por metodo de pago.
    """
    method: str
    total: Decimal = Decimal("0")
    count: int = 0

"""
Tests for billing statistics endpoints:
- GET /api/v1/billing/revenue-by-line
- GET /api/v1/billing/payment-stats
"""

import pytest
import uuid
from datetime import datetime, date, timezone
from decimal import Decimal
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.deps import get_current_user
from app.modules.auth.models import User
from app.modules.billing.models import Invoice, InvoiceItem, Customer
from app.main import app

# Mock User ID
MOCK_USER_ID = uuid.uuid4()


async def mock_get_current_user() -> User:
    """Mock dependency to bypass actual JWT auth."""
    return User(
        id=MOCK_USER_ID,
        email="test_stats@example.com",
        is_active=True,
    )


@pytest.fixture(autouse=True)
def override_auth():
    app.dependency_overrides[get_current_user] = mock_get_current_user
    yield
    app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_billing_statistics_endpoints(client: AsyncClient, db_session: AsyncSession) -> None:
    # 1. Create a dummy customer
    customer = Customer(
        id=uuid.uuid4(),
        business_name="Rodrigo Stats",
        id_type="CC",
        id_number="1234567890",
        email="rodrigo@example.com",
    )
    db_session.add(customer)
    await db_session.flush()

    # 2. Create sample Invoices (one paid, one issued)
    invoice_1 = Invoice(
        id=uuid.uuid4(),
        prefix="SETT",
        number=1,
        full_number="SETT-1",
        customer_id=customer.id,
        user_id=MOCK_USER_ID,
        issued_at=datetime(2026, 7, 10, 12, 0, 0, tzinfo=timezone.utc),
        currency="COP",
        payment_method="Transferencia",
        payment_means="31",  # Transferencia
        status="paid",
        dian_status="none",
        subtotal=Decimal("150000.00"),
        discount_total=Decimal("0.00"),
        tax_base=Decimal("150000.00"),
        tax_total=Decimal("28500.00"),
        total=Decimal("178500.00"),
    )
    db_session.add(invoice_1)
    await db_session.flush()

    # Add items to invoice_1 (one product, one service)
    item_prod = InvoiceItem(
        id=uuid.uuid4(),
        invoice_id=invoice_1.id,
        product_id=uuid.uuid4(),  # Mock product
        description="Filtro de Aceite",
        code="PROD-01",
        quantity=Decimal("2.0000"),
        unit_price=Decimal("50000.00"),
        tax_rate=Decimal("19.00"),
        tax_amount=Decimal("19000.00"),
        subtotal=Decimal("100000.00"),
        total=Decimal("119000.00"),
    )
    item_serv = InvoiceItem(
        id=uuid.uuid4(),
        invoice_id=invoice_1.id,
        service_id=uuid.uuid4(),  # Mock service
        description="Cambio de Aceite",
        code="SERV-01",
        quantity=Decimal("1.0000"),
        unit_price=Decimal("50000.00"),
        tax_rate=Decimal("19.00"),
        tax_amount=Decimal("9500.00"),
        subtotal=Decimal("50000.00"),
        total=Decimal("59500.00"),
    )
    db_session.add_all([item_prod, item_serv])
    await db_session.flush()

    invoice_2 = Invoice(
        id=uuid.uuid4(),
        prefix="SETT",
        number=2,
        full_number="SETT-2",
        customer_id=customer.id,
        user_id=MOCK_USER_ID,
        issued_at=datetime(2026, 7, 12, 10, 0, 0, tzinfo=timezone.utc),
        currency="COP",
        payment_method="Efectivo",
        payment_means="10",  # Efectivo
        status="issued",
        dian_status="none",
        subtotal=Decimal("80000.00"),
        discount_total=Decimal("0.00"),
        tax_base=Decimal("80000.00"),
        tax_total=Decimal("15200.00"),
        total=Decimal("95200.00"),
    )
    db_session.add(invoice_2)
    await db_session.flush()

    item_prod_2 = InvoiceItem(
        id=uuid.uuid4(),
        invoice_id=invoice_2.id,
        product_id=uuid.uuid4(),
        description="Pastillas de Freno",
        code="PROD-02",
        quantity=Decimal("1.0000"),
        unit_price=Decimal("80000.00"),
        tax_rate=Decimal("19.00"),
        tax_amount=Decimal("15200.00"),
        subtotal=Decimal("80000.00"),
        total=Decimal("95200.00"),
    )
    db_session.add(item_prod_2)
    await db_session.flush()
    await db_session.commit()

    # Test GET /api/v1/billing/revenue-by-line
    resp_revenue = await client.get("/api/v1/billing/revenue-by-line")
    assert resp_revenue.status_code == 200
    data_rev = resp_revenue.json()
    assert len(data_rev) == 1
    assert data_rev[0]["month"] == "Jul"
    # total products: 119000 (prod 1) + 95200 (prod 2) = 214200
    assert float(data_rev[0]["products"]) == 214200.0
    # total services: 59500
    assert float(data_rev[0]["services"]) == 59500.0
    assert float(data_rev[0]["total"]) == 273700.0

    # Test GET /api/v1/billing/payment-stats
    resp_payments = await client.get("/api/v1/billing/payment-stats")
    assert resp_payments.status_code == 200
    data_pay = resp_payments.json()
    assert len(data_pay) == 2
    # Verify values
    pay_methods = {item["method"]: float(item["total"]) for item in data_pay}
    assert pay_methods["Transferencia"] == 178500.0
    assert pay_methods["Efectivo"] == 95200.0

"""
Tests for wall customer mentions (Fase 2) and the hourly token limit (Fase 3).

Covers:
- Own mention: post created with pending status; business name hidden in schema.
- Foreign mention (customer not invoiced by the user): 400.
- Confirm via public link: status flips, token invalidated, Notification created.
- Decline via public link: mention no longer visible (name hidden).
- Post media add/delete endpoints (Fase 1b).
- Linked product: own product shows linked_item; foreign product is 404.
- tokens.service.enforce_hourly_limit: 429 + message with COP amounts.
"""

import uuid
from decimal import Decimal

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.deps import get_current_user
from app.modules.auth.models import User
from app.modules.billing.models import Customer, Invoice
from app.modules.notifications.models import Notification
from app.modules.products.models import Product
from app.modules.tokens import service as tokens_service
from app.modules.wall.models import PostCustomerMention
from app.main import app

MOCK_USER_ID = uuid.uuid4()


async def mock_get_current_user() -> User:
    """Mock dependency to bypass actual JWT auth."""
    return User(
        id=MOCK_USER_ID,
        email="wall_mentions@example.com",
        full_name="Autor del Muro",
        role="seller",
        is_active=True,
    )


@pytest.fixture(autouse=True)
def override_auth():
    app.dependency_overrides[get_current_user] = mock_get_current_user
    yield
    app.dependency_overrides.pop(get_current_user, None)


@pytest_asyncio.fixture(autouse=True)
async def mock_user_in_db(db_session: AsyncSession):
    """Persist the mock user so post.author resolves when serializing posts."""
    db_session.add(
        User(
            id=MOCK_USER_ID,
            email="wall_mentions@example.com",
            full_name="Autor del Muro",
            role="seller",
            is_active=True,
            hashed_password="x",
        )
    )
    await db_session.commit()
    yield


@pytest.fixture(autouse=True)
def _no_celery_dispatch(monkeypatch):
    """The email task is fire-and-forget; tests must not touch the broker."""
    import app.modules.wall.tasks as wall_tasks

    monkeypatch.setattr(
        wall_tasks.send_customer_mention_notification,
        "delay",
        lambda *a, **k: None,
        raising=False,
    )
    yield


async def _make_customer_with_invoice(
    db: AsyncSession,
    owner_id: uuid.UUID,
    name: str = "Cliente Mencionado S.A.S.",
) -> Customer:
    customer = Customer(
        id=uuid.uuid4(),
        business_name=name,
        trade_name="Cliente Mencionado",
        id_type="NIT",
        id_number=str(uuid.uuid4().int)[:10],
        email="cliente@example.com",
    )
    db.add(customer)
    await db.flush()

    invoice = Invoice(
        id=uuid.uuid4(),
        prefix="SETT",
        number=1,
        full_number="SETT-1",
        customer_id=customer.id,
        user_id=owner_id,
        currency="COP",
        payment_method="Transferencia",
        payment_means="31",
        status="paid",
        dian_status="none",
        subtotal=Decimal("100000.00"),
        discount_total=Decimal("0.00"),
        tax_base=Decimal("100000.00"),
        tax_total=Decimal("19000.00"),
        total=Decimal("119000.00"),
    )
    db.add(invoice)
    await db.commit()
    return customer


async def _get_mention_by_post(db: AsyncSession, post_id: uuid.UUID) -> PostCustomerMention:
    result = await db.execute(
        select(PostCustomerMention).where(PostCustomerMention.post_id == post_id)
    )
    return result.scalar_one()


# ── Fase 2: mentions ────────────────────────────────────────────────────────


async def test_own_mention_pending_hides_name(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    customer = await _make_customer_with_invoice(db_session, MOCK_USER_ID)

    resp = await client.post(
        "/api/v1/wall",
        json={"content": "Testimonio con cliente.", "type": "Testimonio", "customer_ids": [str(customer.id)]},
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert len(data["customer_mentions"]) == 1
    mention = data["customer_mentions"][0]
    assert mention["status"] == "pending"
    assert mention["business_name"] is None
    assert mention["trade_name"] is None


async def test_foreign_mention_rejected_400(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    other_user = uuid.uuid4()
    customer = await _make_customer_with_invoice(db_session, other_user)

    resp = await client.post(
        "/api/v1/wall",
        json={"content": "Testimonio ajeno.", "type": "Testimonio", "customer_ids": [str(customer.id)]},
    )
    assert resp.status_code == 400, resp.text
    assert "no pertenece" in resp.json()["detail"]


async def test_confirm_via_public_link(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    customer = await _make_customer_with_invoice(db_session, MOCK_USER_ID)

    resp = await client.post(
        "/api/v1/wall",
        json={"content": "Testimonio para confirmar.", "type": "Testimonio", "customer_ids": [str(customer.id)]},
    )
    assert resp.status_code == 201, resp.text
    post_id = resp.json()["id"]
    mention = await _get_mention_by_post(db_session, uuid.UUID(post_id))
    token = mention.confirm_token
    assert token

    # Public GET shows the customer their own data.
    resp = await client.get(f"/api/v1/public/wall/mentions/{token}")
    assert resp.status_code == 200, resp.text
    payload = resp.json()
    assert payload["business_name"] == "Cliente Mencionado S.A.S."
    assert payload["author_name"] == "Autor del Muro"
    assert payload["status"] == "pending"

    # Confirm.
    resp = await client.post(f"/api/v1/public/wall/mentions/{token}/respond", json={"action": "confirm"})
    assert resp.status_code == 200, resp.text

    # Token invalidated → 404 on reuse.
    resp = await client.get(f"/api/v1/public/wall/mentions/{token}")
    assert resp.status_code == 404

    # Notification created for the author.
    result = await db_session.execute(
        select(Notification).where(Notification.user_id == MOCK_USER_ID)
    )
    notif = result.scalar_one_or_none()
    assert notif is not None
    assert notif.type == "wall_mention_response"

    # Post response now shows the customer name.
    resp = await client.get("/api/v1/wall")
    assert resp.status_code == 200
    post = next(p for p in resp.json() if p["id"] == post_id)
    assert post["customer_mentions"][0]["status"] == "confirmed"
    assert post["customer_mentions"][0]["business_name"] == "Cliente Mencionado S.A.S."


async def test_decline_keeps_name_hidden(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    customer = await _make_customer_with_invoice(db_session, MOCK_USER_ID, name="Cliente Que Declina")

    resp = await client.post(
        "/api/v1/wall",
        json={"content": "Testimonio declinado.", "type": "Testimonio", "customer_ids": [str(customer.id)]},
    )
    assert resp.status_code == 201, resp.text
    post_id = resp.json()["id"]
    mention = await _get_mention_by_post(db_session, uuid.UUID(post_id))

    resp = await client.post(
        f"/api/v1/public/wall/mentions/{mention.confirm_token}/respond",
        json={"action": "decline"},
    )
    assert resp.status_code == 200, resp.text

    resp = await client.get("/api/v1/wall")
    post = next(p for p in resp.json() if p["id"] == post_id)
    assert post["customer_mentions"][0]["status"] == "declined"
    assert post["customer_mentions"][0]["business_name"] is None


async def test_invalid_or_used_token_404(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/public/wall/mentions/token-inventado")
    assert resp.status_code == 404


# ── Fase 1b: post media ─────────────────────────────────────────────────────


async def test_add_and_delete_post_media(
    client: AsyncClient,
    db_session: AsyncSession,
    monkeypatch,
    tmp_path,
) -> None:
    # Redirect uploads to a writable temp dir (uploads/wall is root-owned here).
    import pathlib

    real_path = pathlib.Path

    def _test_path(*args):
        p = real_path(*args)
        if str(p) == "uploads/wall":
            return real_path(tmp_path)
        return p

    monkeypatch.setattr("app.modules.wall.router.Path", _test_path)

    resp = await client.post(
        "/api/v1/wall",
        json={"content": "Post con media.", "type": "General"},
    )
    assert resp.status_code == 201, resp.text
    post_id = resp.json()["id"]

    resp = await client.post(
        f"/api/v1/wall/{post_id}/media",
        files={"file": ("foto.jpg", b"fake-jpeg-bytes", "image/jpeg")},
    )
    assert resp.status_code == 201, resp.text
    media = resp.json()
    assert media["position"] == 0
    assert media["media_url"].startswith("/uploads/wall/")

    resp = await client.post(
        f"/api/v1/wall/{post_id}/media",
        files={"file": ("foto2.jpg", b"fake-jpeg-bytes-2", "image/jpeg")},
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["position"] == 1

    # Media reflected on the post response.
    resp = await client.get("/api/v1/wall")
    post = next(p for p in resp.json() if p["id"] == post_id)
    assert len(post["media"]) == 2

    resp = await client.delete(f"/api/v1/wall/{post_id}/media/{media['id']}")
    assert resp.status_code == 204

    resp = await client.get("/api/v1/wall")
    post = next(p for p in resp.json() if p["id"] == post_id)
    assert len(post["media"]) == 1


# ── Fase 1a: linked product ─────────────────────────────────────────────────


async def test_linked_product_own_and_foreign(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    own_product = Product(
        id=uuid.uuid4(),
        name="Producto Propio",
        price=Decimal("15000.00"),
        user_id=MOCK_USER_ID,
    )
    db_session.add(own_product)

    other_product = Product(
        id=uuid.uuid4(),
        name="Producto Ajeno",
        price=Decimal("5000.00"),
        user_id=uuid.uuid4(),
    )
    db_session.add(other_product)
    await db_session.commit()

    resp = await client.post(
        "/api/v1/wall",
        json={"content": "Post con producto.", "type": "General", "product_id": str(own_product.id)},
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["linked_item"]["kind"] == "product"
    assert data["linked_item"]["name"] == "Producto Propio"
    assert data["linked_item"]["price"] == 15000.0

    resp = await client.post(
        "/api/v1/wall",
        json={"content": "Post con producto ajeno.", "type": "General", "product_id": str(other_product.id)},
    )
    assert resp.status_code == 404, resp.text

    resp = await client.post(
        "/api/v1/wall",
        json={"content": "Post con ambos.", "type": "General", "product_id": str(own_product.id), "service_id": str(uuid.uuid4())},
    )
    assert resp.status_code == 422, resp.text


# ── Fase 3: hourly token limit ──────────────────────────────────────────────


async def test_enforce_hourly_limit_rejects_over_budget(
    db_session: AsyncSession,
    monkeypatch,
) -> None:
    from app.core.config import settings

    monkeypatch.setattr(settings, "AI_HOURLY_COST_LIMIT_USD", 0.50)
    await tokens_service.record_usage(
        db_session,
        user_id=MOCK_USER_ID,
        ai_action="generate_copy",
        model_name="gemini-3.5-flash",
        cost_usd=Decimal("0.40"),
        input_tokens=1000,
        output_tokens=500,
    )
    # 0.40 < 0.50 → passes.
    await tokens_service.enforce_hourly_limit(db_session, MOCK_USER_ID)

    await tokens_service.record_usage(
        db_session,
        user_id=MOCK_USER_ID,
        ai_action="generate_copy",
        model_name="gemini-3.5-flash",
        cost_usd=Decimal("0.20"),
        input_tokens=500,
        output_tokens=200,
    )
    # 0.60 >= 0.50 → 429 with COP amounts.
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc_info:
        await tokens_service.enforce_hourly_limit(db_session, MOCK_USER_ID)
    assert exc_info.value.status_code == 429
    assert "COP" in exc_info.value.detail
    # 0.50 USD * 3157.43 COP/USD = 1,578.72 COP (seeded rate).
    assert "1,578.72" in exc_info.value.detail


async def test_to_cop_uses_seeded_rate(db_session: AsyncSession) -> None:
    cop = await tokens_service.to_cop(db_session, Decimal("1.00"))
    assert cop == Decimal("3157.43")

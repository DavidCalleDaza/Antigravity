"""
DonApp API — Product/Service Ownership Tests.

Verifies that PATCH and DELETE on /products/{id} and /services/{id} enforce
ownership: a user cannot modify or delete another user's resource (403),
the owner can (200/204), and an admin can on any resource (200/204).
"""

import uuid

import pytest
from httpx import AsyncClient

from app.core.security import create_access_token
from app.modules.auth.models import User
from app.modules.products.models import Product
from app.modules.services.models import Service

pytestmark = pytest.mark.asyncio

PRODUCTS_URL = "/api/v1/products"
SERVICES_URL = "/api/v1/services"


# ── Helpers ──────────────────────────────────────────────────────────────────

async def _create_user_with_token(db_session, role: str = "seller", email: str = "owner@example.com"):
    """Create a user and return (user, token)."""
    user = User(email=email, full_name="Ownership User", role=role, hashed_password="dummy")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    token = create_access_token({"sub": str(user.id)})
    return user, token


async def _create_product(db_session, user_id: uuid.UUID, name: str = "Producto A") -> Product:
    product = Product(name=name, price=1000, stock=5, status="active", user_id=user_id)
    db_session.add(product)
    await db_session.commit()
    await db_session.refresh(product)
    return product


async def _create_service(db_session, user_id: uuid.UUID, name: str = "Servicio A") -> Service:
    service = Service(name=name, price=500, duration=30, status="active", user_id=user_id)
    db_session.add(service)
    await db_session.commit()
    await db_session.refresh(service)
    return service


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ═══════════════════════════════════════════════════════════════════════════════
# Products — user B vs user A, owner, admin
# ═══════════════════════════════════════════════════════════════════════════════

async def test_user_b_cannot_patch_or_delete_product_of_user_a(client: AsyncClient, db_session):
    """User B attempting to PATCH/DELETE user A's product must get 403 and the
    resource must remain untouched."""
    user_a, _ = await _create_user_with_token(db_session, email="prod_owner@example.com")
    _, token_b = await _create_user_with_token(db_session, email="prod_intruder@example.com")
    product = await _create_product(db_session, user_a.id)

    patch_resp = await client.patch(
        f"{PRODUCTS_URL}/{product.id}",
        json={"name": "Hackeado"},
        headers=_auth(token_b),
    )
    assert patch_resp.status_code == 403

    delete_resp = await client.delete(f"{PRODUCTS_URL}/{product.id}", headers=_auth(token_b))
    assert delete_resp.status_code == 403

    await db_session.refresh(product)
    assert product.name == "Producto A"


async def test_owner_can_patch_and_delete_own_product(client: AsyncClient, db_session):
    """The owner can PATCH (200) and DELETE (204) their own product."""
    user_a, token_a = await _create_user_with_token(db_session, email="prod_owner2@example.com")
    product = await _create_product(db_session, user_a.id)

    patch_resp = await client.patch(
        f"{PRODUCTS_URL}/{product.id}",
        json={"name": "Producto Actualizado", "price": 1500},
        headers=_auth(token_a),
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["name"] == "Producto Actualizado"
    assert patch_resp.json()["price"] == 1500

    delete_resp = await client.delete(f"{PRODUCTS_URL}/{product.id}", headers=_auth(token_a))
    assert delete_resp.status_code == 204

    gone = await client.get(f"{PRODUCTS_URL}/{product.id}", headers=_auth(token_a))
    assert gone.status_code == 404


async def test_admin_can_patch_and_delete_any_product(client: AsyncClient, db_session):
    """An admin can PATCH/DELETE a product owned by another user."""
    user_a, _ = await _create_user_with_token(db_session, email="prod_owner3@example.com")
    _, token_admin = await _create_user_with_token(db_session, role="admin", email="prod_admin@example.com")
    product = await _create_product(db_session, user_a.id)

    patch_resp = await client.patch(
        f"{PRODUCTS_URL}/{product.id}",
        json={"status": "inactive"},
        headers=_auth(token_admin),
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["status"] == "inactive"

    delete_resp = await client.delete(f"{PRODUCTS_URL}/{product.id}", headers=_auth(token_admin))
    assert delete_resp.status_code == 204


# ═══════════════════════════════════════════════════════════════════════════════
# Services — user B vs user A, owner, admin
# ═══════════════════════════════════════════════════════════════════════════════

async def test_user_b_cannot_patch_or_delete_service_of_user_a(client: AsyncClient, db_session):
    """User B attempting to PATCH/DELETE user A's service must get 403 and the
    resource must remain untouched."""
    user_a, _ = await _create_user_with_token(db_session, email="svc_owner@example.com")
    _, token_b = await _create_user_with_token(db_session, email="svc_intruder@example.com")
    service = await _create_service(db_session, user_a.id)

    patch_resp = await client.patch(
        f"{SERVICES_URL}/{service.id}",
        json={"name": "Hackeado"},
        headers=_auth(token_b),
    )
    assert patch_resp.status_code == 403

    delete_resp = await client.delete(f"{SERVICES_URL}/{service.id}", headers=_auth(token_b))
    assert delete_resp.status_code == 403

    await db_session.refresh(service)
    assert service.name == "Servicio A"


async def test_owner_can_patch_and_delete_own_service(client: AsyncClient, db_session):
    """The owner can PATCH (200) and DELETE (204) their own service."""
    user_a, token_a = await _create_user_with_token(db_session, email="svc_owner2@example.com")
    service = await _create_service(db_session, user_a.id)

    patch_resp = await client.patch(
        f"{SERVICES_URL}/{service.id}",
        json={"name": "Servicio Actualizado", "price": 800},
        headers=_auth(token_a),
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["name"] == "Servicio Actualizado"

    delete_resp = await client.delete(f"{SERVICES_URL}/{service.id}", headers=_auth(token_a))
    assert delete_resp.status_code == 204

    gone = await client.get(f"{SERVICES_URL}/{service.id}", headers=_auth(token_a))
    assert gone.status_code == 404


async def test_admin_can_patch_and_delete_any_service(client: AsyncClient, db_session):
    """An admin can PATCH/DELETE a service owned by another user."""
    user_a, _ = await _create_user_with_token(db_session, email="svc_owner3@example.com")
    _, token_admin = await _create_user_with_token(db_session, role="admin", email="svc_admin@example.com")
    service = await _create_service(db_session, user_a.id)

    patch_resp = await client.patch(
        f"{SERVICES_URL}/{service.id}",
        json={"status": "inactive"},
        headers=_auth(token_admin),
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["status"] == "inactive"

    delete_resp = await client.delete(f"{SERVICES_URL}/{service.id}", headers=_auth(token_admin))
    assert delete_resp.status_code == 204


# ═══════════════════════════════════════════════════════════════════════════════
# List Visibility — Admin vs Seller
# ═══════════════════════════════════════════════════════════════════════════════

async def test_admin_can_list_all_products_and_services_from_other_users(client: AsyncClient, db_session):
    """An admin can see products and services created by any seller or other admin."""
    seller_1, token_seller_1 = await _create_user_with_token(db_session, role="seller", email="seller1_list@example.com")
    seller_2, token_seller_2 = await _create_user_with_token(db_session, role="seller", email="seller2_list@example.com")
    _, token_admin = await _create_user_with_token(db_session, role="admin", email="admin_list@example.com")

    # Create products
    p1 = await _create_product(db_session, seller_1.id, name="Producto Seller 1")
    p2 = await _create_product(db_session, seller_2.id, name="Producto Seller 2")

    # Create services
    s1 = await _create_service(db_session, seller_1.id, name="Servicio Seller 1")
    s2 = await _create_service(db_session, seller_2.id, name="Servicio Seller 2")

    # Seller 1 lists products: only sees p1
    resp_s1_prod = await client.get(PRODUCTS_URL, headers=_auth(token_seller_1))
    assert resp_s1_prod.status_code == 200
    prod_ids_s1 = [p["id"] for p in resp_s1_prod.json()]
    assert str(p1.id) in prod_ids_s1
    assert str(p2.id) not in prod_ids_s1

    # Seller 1 lists services: only sees s1
    resp_s1_svc = await client.get(SERVICES_URL, headers=_auth(token_seller_1))
    assert resp_s1_svc.status_code == 200
    svc_ids_s1 = [s["id"] for s in resp_s1_svc.json()]
    assert str(s1.id) in svc_ids_s1
    assert str(s2.id) not in svc_ids_s1

    # Admin lists products: sees BOTH p1 and p2
    resp_admin_prod = await client.get(PRODUCTS_URL, headers=_auth(token_admin))
    assert resp_admin_prod.status_code == 200
    prod_ids_admin = [p["id"] for p in resp_admin_prod.json()]
    assert str(p1.id) in prod_ids_admin
    assert str(p2.id) in prod_ids_admin

    # Admin lists services: sees BOTH s1 and s2
    resp_admin_svc = await client.get(SERVICES_URL, headers=_auth(token_admin))
    assert resp_admin_svc.status_code == 200
    svc_ids_admin = [s["id"] for s in resp_admin_svc.json()]
    assert str(s1.id) in svc_ids_admin
    assert str(s2.id) in svc_ids_admin


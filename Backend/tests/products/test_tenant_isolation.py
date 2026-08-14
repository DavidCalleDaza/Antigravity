"""
DonApp API — Tenant Isolation Integration Tests.

Two sellers operate in the same platform: products created by each one are
only visible to their owner via GET /products. The marketplace showcase for
`client` role (seller_id filter) is out of scope here.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.future import select

from app.core.security import create_access_token
from app.modules.auth.models import User
from app.modules.products.models import Product

pytestmark = pytest.mark.asyncio

PRODUCTS_URL = "/api/v1/products"


async def _create_seller(db_session, email: str, full_name: str):
    """Create a seller user and return (user, token)."""
    user = User(email=email, full_name=full_name, role="seller", hashed_password="dummy")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    token = create_access_token({"sub": str(user.id)})
    return user, token


async def test_two_sellers_see_only_their_own_products(client: AsyncClient, db_session):
    """Seller A and Seller B create products; each GET /products response only
    contains that seller's own products, never the other's."""
    user_a, token_a = await _create_seller(db_session, "isolation_a@example.com", "Seller A")
    user_b, token_b = await _create_seller(db_session, "isolation_b@example.com", "Seller B")

    # A creates a product
    resp_a = await client.post(
        PRODUCTS_URL,
        json={"name": "Producto de A", "price": 1000},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert resp_a.status_code == 201
    product_a = resp_a.json()

    # B creates a different product
    resp_b = await client.post(
        PRODUCTS_URL,
        json={"name": "Producto de B", "price": 2000},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert resp_b.status_code == 201
    product_b = resp_b.json()

    # Each product is owned by its creator
    assert product_a["user_id"] == str(user_a.id)
    assert product_b["user_id"] == str(user_b.id)

    # A only sees their own product
    list_a = await client.get(PRODUCTS_URL, headers={"Authorization": f"Bearer {token_a}"})
    assert list_a.status_code == 200
    items_a = list_a.json()
    assert [p["name"] for p in items_a] == ["Producto de A"]
    assert all(p["id"] != product_b["id"] for p in items_a)

    # B only sees their own product
    list_b = await client.get(PRODUCTS_URL, headers={"Authorization": f"Bearer {token_b}"})
    assert list_b.status_code == 200
    items_b = list_b.json()
    assert [p["name"] for p in items_b] == ["Producto de B"]
    assert all(p["id"] != product_a["id"] for p in items_b)

    # Cross-check the DB: two products, one per user
    result = await db_session.execute(select(Product).order_by(Product.name))
    products = list(result.scalars().all())
    assert len(products) == 2
    by_name = {p.name: p.user_id for p in products}
    assert by_name == {
        "Producto de A": user_a.id,
        "Producto de B": user_b.id,
    }

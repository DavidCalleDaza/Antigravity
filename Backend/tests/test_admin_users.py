"""
DonApp API — Admin Users Module Tests.
Tests for listing, filtering, creating, updating roles, and deleting users by admin.
"""

import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, hash_password
from app.modules.auth.models import User

pytestmark = pytest.mark.asyncio


def get_auth_headers(user: User) -> dict:
    token = create_access_token(data={"sub": str(user.id), "email": user.email, "role": user.role})
    return {"Authorization": f"Bearer {token}"}


async def test_admin_user_stats_and_authorization(client: AsyncClient, db_session: AsyncSession):
    # Create Admin
    admin = User(
        id=uuid.uuid4(),
        email="admin_stats_test@donapp.com",
        full_name="Admin Stats",
        role="admin",
        is_staff=True,
        is_active=True,
        hashed_password=hash_password("adminpass123"),
    )
    # Create Client
    regular_client = User(
        id=uuid.uuid4(),
        email="client_stats_test@donapp.com",
        full_name="Client Regular",
        role="client",
        is_staff=False,
        is_active=True,
        hashed_password=hash_password("clientpass123"),
    )
    db_session.add_all([admin, regular_client])
    await db_session.commit()

    # 1. Non-admin should get 403
    res_forbidden = await client.get(
        "/api/v1/admin/users/stats",
        headers=get_auth_headers(regular_client),
    )
    assert res_forbidden.status_code == 403

    # 2. Admin should get stats (200)
    res_ok = await client.get(
        "/api/v1/admin/users/stats",
        headers=get_auth_headers(admin),
    )
    assert res_ok.status_code == 200
    data = res_ok.json()
    assert "total_users" in data
    assert "total_admins" in data
    assert "total_sellers" in data
    assert "total_clients" in data
    assert data["total_admins"] >= 1


async def test_admin_list_and_filter_users(client: AsyncClient, db_session: AsyncSession):
    unique_suffix = uuid.uuid4().hex[:6]
    admin = User(
        id=uuid.uuid4(),
        email=f"admin_list_{unique_suffix}@donapp.com",
        full_name=f"Admin List {unique_suffix}",
        role="admin",
        is_staff=True,
        is_active=True,
        hashed_password=hash_password("pass123"),
    )
    seller = User(
        id=uuid.uuid4(),
        email=f"seller_list_{unique_suffix}@donapp.com",
        full_name=f"Seller Alpha {unique_suffix}",
        business_name="Barberia Alpha",
        role="seller",
        is_staff=False,
        is_active=True,
        hashed_password=hash_password("pass123"),
    )
    db_session.add_all([admin, seller])
    await db_session.commit()

    admin_headers = get_auth_headers(admin)

    # Search by business name
    res = await client.get(
        f"/api/v1/admin/users?search=Barberia Alpha",
        headers=admin_headers,
    )
    assert res.status_code == 200
    body = res.json()
    assert body["total"] >= 1
    assert any(u["email"] == seller.email for u in body["items"])

    # Filter by role=seller
    res_seller = await client.get(
        f"/api/v1/admin/users?role=seller&search={unique_suffix}",
        headers=admin_headers,
    )
    assert res_seller.status_code == 200
    assert all(u["role"] == "seller" for u in res_seller.json()["items"])


async def test_admin_create_user_and_update_role(client: AsyncClient, db_session: AsyncSession):
    admin = User(
        id=uuid.uuid4(),
        email=f"admin_crud_{uuid.uuid4().hex[:6]}@donapp.com",
        full_name="Admin CRUD Master",
        role="admin",
        is_staff=True,
        is_active=True,
        hashed_password=hash_password("pass123"),
    )
    db_session.add(admin)
    await db_session.commit()

    admin_headers = get_auth_headers(admin)

    # Create new user as client
    new_email = f"created_{uuid.uuid4().hex[:6]}@donapp.com"
    create_res = await client.post(
        "/api/v1/admin/users",
        json={
            "email": new_email,
            "full_name": "Nuevo Usuario Creado",
            "password": "SecurePassword123!",
            "role": "client",
            "is_active": True,
            "is_approved": True,
        },
        headers=admin_headers,
    )
    assert create_res.status_code == 201
    created_user = create_res.json()
    user_id = created_user["id"]
    assert created_user["role"] == "client"

    # Update user role to seller with business name
    patch_res = await client.patch(
        f"/api/v1/admin/users/{user_id}",
        json={
            "role": "seller",
            "business_name": "Panadería DonApp",
        },
        headers=admin_headers,
    )
    assert patch_res.status_code == 200
    updated_user = patch_res.json()
    assert updated_user["role"] == "seller"
    assert updated_user["business_name"] == "Panadería DonApp"

    # Soft delete (deactivate)
    del_res = await client.delete(
        f"/api/v1/admin/users/{user_id}",
        headers=admin_headers,
    )
    assert del_res.status_code == 204

    # Verify user is deactivated
    get_res = await client.get(
        f"/api/v1/admin/users/{user_id}",
        headers=admin_headers,
    )
    assert get_res.status_code == 200
    assert get_res.json()["is_active"] is False


async def test_admin_cannot_delete_self(client: AsyncClient, db_session: AsyncSession):
    admin = User(
        id=uuid.uuid4(),
        email=f"admin_self_{uuid.uuid4().hex[:6]}@donapp.com",
        full_name="Admin Self Guard",
        role="admin",
        is_staff=True,
        is_active=True,
        hashed_password=hash_password("pass123"),
    )
    db_session.add(admin)
    await db_session.commit()

    admin_headers = get_auth_headers(admin)

    # Attempt to delete own account
    del_res = await client.delete(
        f"/api/v1/admin/users/{admin.id}",
        headers=admin_headers,
    )
    assert del_res.status_code == 400
    assert "No puedes eliminar o desactivar tu propia cuenta" in del_res.json()["detail"]


async def test_admin_bulk_delete_users(client: AsyncClient, db_session: AsyncSession):
    admin = User(
        id=uuid.uuid4(),
        email=f"admin_bulk_{uuid.uuid4().hex[:6]}@donapp.com",
        full_name="Admin Bulk Master",
        role="admin",
        is_staff=True,
        is_active=True,
        hashed_password=hash_password("pass123"),
    )
    u1 = User(
        id=uuid.uuid4(),
        email=f"bulk_u1_{uuid.uuid4().hex[:6]}@donapp.com",
        full_name="User Bulk 1",
        role="client",
        is_active=True,
        hashed_password=hash_password("pass123"),
    )
    u2 = User(
        id=uuid.uuid4(),
        email=f"bulk_u2_{uuid.uuid4().hex[:6]}@donapp.com",
        full_name="User Bulk 2",
        role="seller",
        is_active=True,
        hashed_password=hash_password("pass123"),
    )
    db_session.add_all([admin, u1, u2])
    await db_session.commit()

    admin_headers = get_auth_headers(admin)

    # Test bulk deactivation (including admin's own ID which must be skipped)
    bulk_res = await client.post(
        "/api/v1/admin/users/bulk-delete",
        json={
            "user_ids": [str(u1.id), str(u2.id), str(admin.id)],
            "permanent": False,
        },
        headers=admin_headers,
    )
    assert bulk_res.status_code == 200
    body = bulk_res.json()
    assert body["deleted_count"] == 2
    assert body["skipped_count"] == 1

    # Verify admin remained active and users became inactive
    await db_session.refresh(admin)
    await db_session.refresh(u1)
    await db_session.refresh(u2)
    assert admin.is_active is True
    assert u1.is_active is False
    assert u2.is_active is False

    # Test bulk permanent delete
    bulk_perm_res = await client.post(
        "/api/v1/admin/users/bulk-delete",
        json={
            "user_ids": [str(u1.id), str(u2.id)],
            "permanent": True,
        },
        headers=admin_headers,
    )
    assert bulk_perm_res.status_code == 200
    assert bulk_perm_res.json()["deleted_count"] == 2

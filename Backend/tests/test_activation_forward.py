"""
Tests for Admin 1-click Activation Code Forwarding to User:
- POST /api/v1/auth/register (sends approval email with forward link)
- GET /api/v1/auth/forward-activation-code (delivers activation code email to user)
- Expired / Invalid token handling
"""

import pytest
from unittest.mock import patch
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.modules.auth.models import User
from app.modules.auth.tokens import activation_forward_serializer, build_activation_approval_context
from app.core.security import hash_password

pytestmark = pytest.mark.asyncio


async def test_register_builds_forward_activation_link(client: AsyncClient, db_session: AsyncSession):
    """
    Test that registering a user triggers new_user_approval email containing the forward_url.
    """
    with patch("app.modules.auth.router.send_email", return_value=True) as mock_send_email:
        resp = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "pending_forward@example.com",
                "password": "Password123!",
                "full_name": "Pending Forward User",
                "role": "client",
            },
        )
        assert resp.status_code == 201
        assert mock_send_email.called

        call_args = mock_send_email.call_args[1]
        context = call_args["context"]
        assert "forward_url" in context
        assert "mailto_url" in context
        assert "activation_code" in context
        assert context["forward_url"].startswith("http")
        assert "/api/v1/auth/forward-activation-code?token=" in context["forward_url"]


async def test_forward_activation_code_success(client: AsyncClient, db_session: AsyncSession):
    """
    Test clicking the forward link in the email delivers the user_activation_code email to the user.
    """
    # 1. Create a user pending approval
    user = User(
        id=uuid.uuid4(),
        email="user_to_activate@example.com",
        full_name="User To Activate",
        role="seller",
        is_approved=False,
        is_active=True,
        activation_code="DON-884422",
        hashed_password=hash_password("Password123!"),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    # 2. Build timed token
    token = activation_forward_serializer.dumps({
        "user_id": str(user.id),
        "email": user.email,
        "code": user.activation_code,
    })

    # 3. Call GET /api/v1/auth/forward-activation-code
    with patch("app.modules.auth.router.send_email", return_value=True) as mock_send_email:
        resp = await client.get(f"/api/v1/auth/forward-activation-code?token={token}")
        assert resp.status_code == 200
        assert "text/html" in resp.headers["content-type"]
        assert "Código de Activación Enviado" in resp.text
        assert "DON-884422" in resp.text
        assert "user_to_activate@example.com" in resp.text

        # Verify email was dispatched to the user
        assert mock_send_email.called
        call_kwargs = mock_send_email.call_args[1]
        assert call_kwargs["to"] == "user_to_activate@example.com"
        assert call_kwargs["template_name"] == "user_activation_code.html"
        assert call_kwargs["context"]["activation_code"] == "DON-884422"


async def test_forward_activation_code_invalid_token(client: AsyncClient):
    """
    Test that invalid or tampered tokens return 400 Bad Request HTML.
    """
    resp = await client.get("/api/v1/auth/forward-activation-code?token=invalid.tampered.token")
    assert resp.status_code == 400
    assert "Enlace Inválido" in resp.text


async def test_forward_activation_code_already_active_user(client: AsyncClient, db_session: AsyncSession):
    """
    Test that clicking link for an already active user returns an informative page.
    """
    user = User(
        id=uuid.uuid4(),
        email="already_active@example.com",
        full_name="Already Active User",
        role="client",
        is_approved=True,
        is_active=True,
        activation_code=None,
        hashed_password=hash_password("Password123!"),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    token = activation_forward_serializer.dumps({
        "user_id": str(user.id),
        "email": user.email,
        "code": "DON-111111",
    })

    resp = await client.get(f"/api/v1/auth/forward-activation-code?token={token}")
    assert resp.status_code == 200
    assert "Cuenta Ya Activa" in resp.text

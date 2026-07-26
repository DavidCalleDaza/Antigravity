import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.auth.models import User
from app.core.security import hash_password, verify_password

pytestmark = pytest.mark.asyncio


async def test_request_password_recovery_success(client: AsyncClient, db_session: AsyncSession):
    """
    Test that a valid user with local password can request recovery successfully.
    """
    user = User(
        email="recovery_test@example.com",
        full_name="Recovery User",
        role="client",
        hashed_password=hash_password("oldpassword")
    )
    db_session.add(user)
    await db_session.commit()

    with patch("app.modules.auth.router.redis_client.setex", new_callable=AsyncMock) as mock_setex, \
         patch("app.modules.auth.router.send_email", return_value=True) as mock_send_email:
        
        response = await client.post(
            "/api/v1/auth/password-recovery/request",
            json={"email": "recovery_test@example.com"}
        )

        assert response.status_code == 200
        assert response.json()["detail"] == "Código de recuperación enviado."
        assert mock_setex.called
        assert mock_send_email.called


async def test_request_password_recovery_google_user_fails(client: AsyncClient, db_session: AsyncSession):
    """
    Test that a user registered via Google (null password) cannot request recovery.
    """
    user = User(
        email="google_recovery@example.com",
        full_name="Google User",
        role="client",
        hashed_password=None
    )
    db_session.add(user)
    await db_session.commit()

    response = await client.post(
        "/api/v1/auth/password-recovery/request",
        json={"email": "google_recovery@example.com"}
    )

    assert response.status_code == 400
    assert "cuenta está vinculada con Google" in response.json()["detail"]


async def test_request_password_recovery_not_found(client: AsyncClient):
    """
    Test requesting password recovery for non-existent email returns 400 error.
    """
    response = await client.post(
        "/api/v1/auth/password-recovery/request",
        json={"email": "nonexistent@example.com"}
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Usuario no encontrado."


async def test_reset_password_success(client: AsyncClient, db_session: AsyncSession):
    """
    Test resetting password successfully using valid code.
    """
    user = User(
        email="reset_test@example.com",
        full_name="Reset User",
        role="client",
        hashed_password=hash_password("oldpassword")
    )
    db_session.add(user)
    await db_session.commit()

    # Setup redis mock to return code
    with patch("app.modules.auth.router.redis_client.get", new_callable=AsyncMock) as mock_get, \
         patch("app.modules.auth.router.redis_client.delete", new_callable=AsyncMock) as mock_delete:
        
        mock_get.return_value = "123456"

        response = await client.post(
            "/api/v1/auth/password-recovery/reset",
            json={
                "email": "reset_test@example.com",
                "code": "123456",
                "new_password": "brandnewpassword"
            }
        )

        assert response.status_code == 200
        assert response.json()["detail"] == "Contraseña restablecida exitosamente."
        
        # Verify password in DB
        await db_session.refresh(user)
        assert verify_password("brandnewpassword", user.hashed_password)
        assert mock_delete.called


async def test_reset_password_invalid_code(client: AsyncClient, db_session: AsyncSession):
    """
    Test resetting password fails with incorrect code.
    """
    user = User(
        email="badcode_test@example.com",
        full_name="Bad Code User",
        role="client",
        hashed_password=hash_password("oldpassword")
    )
    db_session.add(user)
    await db_session.commit()

    with patch("app.modules.auth.router.redis_client.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = "123456"  # Stored code is 123456

        response = await client.post(
            "/api/v1/auth/password-recovery/reset",
            json={
                "email": "badcode_test@example.com",
                "code": "000000",  # Submitted wrong code
                "new_password": "brandnewpassword"
            }
        )

        assert response.status_code == 400
        assert response.json()["detail"] == "Código inválido o expirado."

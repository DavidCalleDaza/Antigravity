import pytest
import pytest_asyncio
import uuid
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import status

from app.modules.auth.models import User
from app.api.upload_models import UploadedFile
from app.core.security import create_access_token, hash_password


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession) -> User:
    user = User(
        id=uuid.uuid4(),
        email="lockout_test@example.com",
        full_name="Test Security",
        role="seller",
        is_active=True,
        hashed_password=hash_password("correctpassword"),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
def test_user_token(test_user: User) -> str:
    return create_access_token(data={"sub": str(test_user.id), "email": test_user.email, "role": test_user.role})


@pytest.mark.asyncio
async def test_login_rate_limiting_lockout(
    client: AsyncClient,
    test_user: User,
):
    """Test that 5 failed login attempts lock the account for 15 minutes."""
    from app.main import app
    await app.state.redis.flushdb()
    email = test_user.email
    
    # 5 failed attempts
    for _ in range(5):
        resp = await client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "wrongpassword"}
        )
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    # 6th attempt should be 429
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "wrongpassword"}
    )
    assert resp.status_code == status.HTTP_429_TOO_MANY_REQUESTS
    assert "bloqueada temporalmente" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_jwt_logout_blocklist(
    client: AsyncClient,
    test_user_token: str,
):
    """Test that logging out invalidates the JWT token."""
    headers = {"Authorization": f"Bearer {test_user_token}"}
    
    # Verify token works initially
    resp = await client.get("/api/v1/auth/me", headers=headers)
    assert resp.status_code == status.HTTP_200_OK

    # Logout
    resp = await client.post("/api/v1/auth/logout", headers=headers)
    assert resp.status_code == status.HTTP_204_NO_CONTENT

    # Verify token is now blocked
    resp = await client.get("/api/v1/auth/me", headers=headers)
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED
    assert "inválido o expirado" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_uploads_idor_delete(
    client: AsyncClient,
    db_session: AsyncSession,
    test_user_token: str,
):
    """Test that a user cannot delete another user's uploaded file."""
    other_user_id = uuid.uuid4()
    filename = f"{uuid.uuid4()}.png"
    
    record = UploadedFile(filename=filename, user_id=other_user_id)
    db_session.add(record)
    await db_session.commit()

    # Attempt to delete with test_user_token (different user)
    headers = {"Authorization": f"Bearer {test_user_token}"}
    resp = await client.delete(f"/api/v1/uploads/media/{filename}", headers=headers)
    
    assert resp.status_code == status.HTTP_403_FORBIDDEN
    assert "No tienes permiso" in resp.json()["detail"]

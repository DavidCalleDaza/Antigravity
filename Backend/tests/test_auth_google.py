import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.modules.auth.models import User, UserIdentity
from app.modules.auth.crud import create_user
from app.modules.auth.schemas import UserCreate
from app.core.security import hash_password

pytestmark = pytest.mark.asyncio


async def test_login_null_password_generic_error(client: AsyncClient, db_session: AsyncSession):
    """
    Test that attempting to log in with a user that has a null password (Google auth user)
    returns the exact same generic error as invalid credentials.
    """
    # Create a user with null password (simulating Google signup)
    user = User(
        email="googleuser@example.com",
        full_name="Google User",
        role="client",
        hashed_password=None
    )
    db_session.add(user)
    await db_session.commit()

    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "googleuser@example.com", "password": "somepassword"}
    )
    
    assert response.status_code == 401
    assert response.json()["detail"] == "Credenciales inválidas."


async def test_user_identity_unique_constraint(db_session: AsyncSession):
    """
    Test that UserIdentity enforces uniqueness on (provider, provider_id).
    """
    # Create a base user
    user = User(
        email="baseuser@example.com",
        full_name="Base User",
        role="client",
        hashed_password="dummy"
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    # Add first identity
    identity1 = UserIdentity(
        user_id=user.id,
        provider="google",
        provider_id="12345"
    )
    db_session.add(identity1)
    await db_session.commit()

    # Attempt to add second identity with same provider and provider_id
    identity2 = UserIdentity(
        user_id=user.id,
        provider="google",
        provider_id="12345"
    )
    db_session.add(identity2)
    
    with pytest.raises(IntegrityError):
        await db_session.commit()


# We will mock httpx.AsyncClient to simulate Google callback for the non-escalation test
from unittest.mock import patch, MagicMock, AsyncMock
import json
from itsdangerous import URLSafeTimedSerializer
from app.core.config import settings
from jose import jwt
import uuid

async def test_google_auth_non_escalation_role(client: AsyncClient, db_session: AsyncSession):
    """
    Test that an existing 'client' user logging in via Google Auth 
    with state requesting 'seller' role DOES NOT escalate their role.
    """
    # 1. Setup existing user with 'client' role
    user = User(
        email="existing@example.com",
        full_name="Existing User",
        role="client",
        hashed_password="dummy"
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    # 2. Setup mock data for the callback
    state_id = "mock_state_id"
    expected_nonce = "mock_nonce"
    code_verifier = "mock_verifier"
    
    # Mock redis get/delete/setex
    from app.modules.auth.google import redis_client
    
    async def mock_redis_get(key):
        if key == f"pkce:{state_id}":
            return json.dumps({"code_verifier": code_verifier, "nonce": expected_nonce})
        return None
        
    async def mock_redis_delete(key):
        pass
        
    async def mock_redis_setex(key, ttl, value):
        pass
        
    redis_client.get = mock_redis_get
    redis_client.delete = mock_redis_delete
    redis_client.setex = mock_redis_setex

    # 3. Create signed state requesting 'seller' role
    signer = URLSafeTimedSerializer(settings.SECRET_KEY)
    state_payload = {"state_id": state_id, "role": "seller", "action": "login"}
    signed_state = signer.dumps(state_payload)

    # 4. Mock httpx and jose.jwt
    with patch("app.modules.auth.google.httpx.AsyncClient") as mock_client:
        # Mock token response
        mock_token_resp = MagicMock()
        mock_token_resp.json.return_value = {"id_token": "mock_id_token"}
        mock_token_resp.raise_for_status = MagicMock()
        
        # Mock jwks response
        mock_jwks_resp = MagicMock()
        mock_jwks_resp.json.return_value = {"keys": []}
        mock_jwks_resp.raise_for_status = MagicMock()
        
        # Setup async context manager for httpx.AsyncClient()
        mock_client_instance = MagicMock()
        mock_client_instance.post = AsyncMock(return_value=mock_token_resp)
        mock_client_instance.get = AsyncMock(return_value=mock_jwks_resp)
        mock_client.return_value.__aenter__.return_value = mock_client_instance

        with patch("app.modules.auth.google.jwt.decode") as mock_jwt_decode:
            # Return a payload that matches our existing user, with the correct nonce
            mock_jwt_decode.return_value = {
                "email": "existing@example.com",
                "email_verified": True,
                "sub": "google123",
                "nonce": expected_nonce,
                "name": "Google Name"
            }
            
            # Execute callback
            response = await client.get(
                f"/api/v1/auth/google/callback?code=auth_code&state={signed_state}",
                follow_redirects=False
            )
            
            assert response.status_code == 307
            location = response.headers.get("location")
            assert "code=" in location
            assert "error" not in location

    # 5. Verify the user's role remains 'client' in the database
    await db_session.refresh(user)
    assert user.role == "client", "Role should not have escalated to seller"
    
    # Ensure identity was linked
    from sqlalchemy import select
    stmt = select(UserIdentity).where(UserIdentity.user_id == user.id)
    result = await db_session.execute(stmt)
    identity = result.scalar_one_or_none()
    assert identity is not None
    assert identity.provider == "google"
    assert identity.provider_id == "google123"

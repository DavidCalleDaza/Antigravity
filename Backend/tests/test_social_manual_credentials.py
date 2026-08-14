"""
DonApp API — Social Manual Credentials Tests.

Covers two fixes:
1. ManualConfirmRequest.app_secret is optional: POST /accounts/manual/confirm
   without app_secret (reusing saved credentials) must return 200, not 422.
2. reveal_app_credentials has a Redis-backed lockout (5 attempts / 10 min),
   same pattern as the WhatsApp OTP flow.
"""

import uuid
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy.future import select

from app.core.security import create_access_token, hash_password
from app.modules.auth.models import User
from app.modules.social.models import SocialAccount, SocialAppCredential
from app.modules.social.router import REVEAL_MAX_ATTEMPTS

pytestmark = pytest.mark.asyncio

CONFIRM_URL = "/api/v1/social/accounts/manual/confirm"
REVEAL_URL = "/api/v1/social/accounts/app-credentials/meta/reveal"


# ── Helpers ──────────────────────────────────────────────────────────────────

async def _create_user_with_password(db_session, email: str, password: str):
    """Create a seller user with a real bcrypt password hash and return (user, token)."""
    user = User(
        email=email,
        full_name="Manual Creds User",
        role="seller",
        hashed_password=hash_password(password),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    token = create_access_token({"sub": str(user.id)})
    return user, token


async def _create_app_credential(db_session, user_id: uuid.UUID, platform_group: str = "meta"):
    cred = SocialAppCredential(
        user_id=user_id,
        platform_group=platform_group,
        app_id="app-id-123",
        app_secret="app-secret-123",
    )
    db_session.add(cred)
    await db_session.commit()
    await db_session.refresh(cred)
    return cred


def _confirm_body(**overrides) -> dict:
    """Base body for POST /accounts/manual/confirm (app_secret omitted by default)."""
    body = {
        "platform_group": "meta",
        "app_id": "app-id-123",
        "access_token": "token-abc",
        "selected_account_id": "page_abc",
        "selected_account_name": "Page ABC",
    }
    body.update(overrides)
    return body


# ═══════════════════════════════════════════════════════════════════════════════
# Hallazgo 1 — app_secret opcional en manual/confirm
# ═══════════════════════════════════════════════════════════════════════════════

async def test_manual_confirm_without_app_secret_reuses_saved_credential(client: AsyncClient, db_session):
    """Confirm without app_secret (reusing saved credentials) must return 200,
    not 422, and must create the SocialAccount."""
    user, token = await _create_user_with_password(db_session, "confirm_nosecret@example.com", "clave-correcta")
    await _create_app_credential(db_session, user.id)

    response = await client.post(CONFIRM_URL, json=_confirm_body(), headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert response.json() == {"status": "success"}

    result = await db_session.execute(select(SocialAccount).where(SocialAccount.user_id == user.id))
    accounts = list(result.scalars().all())
    assert len(accounts) == 1
    assert accounts[0].platform == "facebook"
    assert accounts[0].platform_user_id == "page_abc"
    assert accounts[0].connection_method == "manual"


async def test_manual_confirm_with_app_secret_still_works(client: AsyncClient, db_session):
    """Confirm with app_secret present keeps working (backward compat)."""
    user, token = await _create_user_with_password(db_session, "confirm_secret@example.com", "clave-correcta")
    await _create_app_credential(db_session, user.id)

    response = await client.post(
        CONFIRM_URL,
        json=_confirm_body(app_secret="app-secret-123"),
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json() == {"status": "success"}


# ═══════════════════════════════════════════════════════════════════════════════
# Hallazgo 2 — lockout Redis en reveal_app_credentials
# ═══════════════════════════════════════════════════════════════════════════════

@patch("app.modules.social.router.redis_client")
async def test_reveal_wrong_password_increments_lockout(mock_redis, client: AsyncClient, db_session):
    """Five wrong passwords each return 401 and increment the Redis counter;
    expire is set only on the first failed attempt."""
    user, token = await _create_user_with_password(db_session, "reveal_wrong@example.com", "clave-correcta")
    await _create_app_credential(db_session, user.id)

    mock_redis.get = AsyncMock(return_value=None)
    call_count = {"n": 0}

    async def mock_incr(key):
        call_count["n"] += 1
        return call_count["n"]

    mock_redis.incr = AsyncMock(side_effect=mock_incr)
    mock_redis.expire = AsyncMock()
    mock_redis.delete = AsyncMock()

    for _ in range(REVEAL_MAX_ATTEMPTS):
        response = await client.post(
            REVEAL_URL,
            json={"password": "clave-incorrecta"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 401

    assert call_count["n"] == REVEAL_MAX_ATTEMPTS
    assert mock_redis.incr.await_count == REVEAL_MAX_ATTEMPTS
    lockout_key = f"social_reveal_lockout:{user.id}:meta"
    mock_redis.expire.assert_awaited_once_with(lockout_key, 600)
    mock_redis.delete.assert_not_awaited()


@patch("app.modules.social.router.redis_client")
async def test_reveal_blocked_after_max_attempts_even_with_correct_password(mock_redis, client: AsyncClient, db_session):
    """Once the counter reaches REVEAL_MAX_ATTEMPTS, even the correct password
    is rejected with 429."""
    user, token = await _create_user_with_password(db_session, "reveal_blocked@example.com", "clave-correcta")
    await _create_app_credential(db_session, user.id)

    mock_redis.get = AsyncMock(return_value=str(REVEAL_MAX_ATTEMPTS))

    response = await client.post(
        REVEAL_URL,
        json={"password": "clave-correcta"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 429
    assert "Demasiados intentos fallidos" in response.json()["detail"]


@patch("app.modules.social.router.redis_client")
async def test_reveal_success_resets_lockout_counter(mock_redis, client: AsyncClient, db_session):
    """A correct password before exhaustion returns the credentials in clear
    and deletes the lockout key."""
    user, token = await _create_user_with_password(db_session, "reveal_reset@example.com", "clave-correcta")
    await _create_app_credential(db_session, user.id)

    mock_redis.get = AsyncMock(return_value=None)
    call_count = {"n": 0}

    async def mock_incr(key):
        call_count["n"] += 1
        return call_count["n"]

    mock_redis.incr = AsyncMock(side_effect=mock_incr)
    mock_redis.expire = AsyncMock()
    mock_redis.delete = AsyncMock()

    # One wrong attempt (401, counter goes to 1)
    wrong = await client.post(
        REVEAL_URL,
        json={"password": "clave-incorrecta"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert wrong.status_code == 401

    # Correct password before exhaustion: 200 with credentials in clear
    ok = await client.post(
        REVEAL_URL,
        json={"password": "clave-correcta"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert ok.status_code == 200
    body = ok.json()
    assert body["app_id"] == "app-id-123"
    assert body["app_secret"] == "app-secret-123"

    # Lockout counter reset on success
    lockout_key = f"social_reveal_lockout:{user.id}:meta"
    delete_calls = [c.args[0] for c in mock_redis.delete.await_args_list]
    assert lockout_key in delete_calls
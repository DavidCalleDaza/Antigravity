"""
DonApp API — Social persistence across sessions.

SocialAccount / SocialToken / SocialAppCredential are persisted in the DB
keyed by user_id, not tied to the HTTP session. This test proves that a
brand-new session token for the same user still sees the connected accounts
and saved app credentials.
"""

import uuid

import pytest
from httpx import AsyncClient

from app.core.security import create_access_token
from app.modules.auth.models import User
from app.modules.social.models import SocialAccount, SocialAppCredential

pytestmark = pytest.mark.asyncio

ACCOUNTS_URL = "/api/v1/social/accounts"
APP_CREDS_URL = "/api/v1/social/accounts/app-credentials"


# ── Helpers ──────────────────────────────────────────────────────────────────

async def _create_user_with_token(db_session, role: str = "seller", email: str = "persist@example.com"):
    """Create a user and return (user, first-session token)."""
    user = User(email=email, full_name="Persist User", role=role, hashed_password="dummy")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    token = create_access_token({"sub": str(user.id)})
    return user, token


async def _create_social_account(db_session, user_id: uuid.UUID, platform: str, is_default: bool = False, display_label: str = None):
    account = SocialAccount(
        user_id=user_id,
        platform=platform,
        platform_user_id=f"{platform}_{uuid.uuid4()}",
        is_default=is_default,
        display_label=display_label,
    )
    db_session.add(account)
    await db_session.commit()
    await db_session.refresh(account)
    return account


async def _create_app_credential(db_session, user_id: uuid.UUID, platform_group: str = "meta"):
    cred = SocialAppCredential(
        user_id=user_id,
        platform_group=platform_group,
        app_id="app-id-persist",
        app_secret="secret-persist",
    )
    db_session.add(cred)
    await db_session.commit()
    await db_session.refresh(cred)
    return cred


# ═══════════════════════════════════════════════════════════════════════════════
# Tests
# ═══════════════════════════════════════════════════════════════════════════════

async def test_connected_accounts_survive_new_session_token(client: AsyncClient, db_session):
    """A SocialAccount created in session A is still returned by a fresh
    session token (B) with the same data."""
    user, _token_a = await _create_user_with_token(db_session, email="persist_a@example.com")
    account = await _create_social_account(
        db_session, user.id, "facebook", is_default=True, display_label="Mi Página"
    )

    # Simulates a later, fully independent login: same user, brand-new JWT
    token_b = create_access_token({"sub": str(user.id)})

    response = await client.get(ACCOUNTS_URL, headers={"Authorization": f"Bearer {token_b}"})
    assert response.status_code == 200

    accounts = response.json()
    assert len(accounts) == 1
    got = accounts[0]
    assert got["platform"] == account.platform
    assert got["platform_user_id"] == account.platform_user_id
    assert got["display_label"] == "Mi Página"
    assert got["is_default"] is True


async def test_app_credentials_survive_new_session_token(client: AsyncClient, db_session):
    """Saved app credentials are still returned by the listing endpoint with a
    fresh session token (B)."""
    user, _token_a = await _create_user_with_token(db_session, email="persist_b@example.com")
    await _create_app_credential(db_session, user.id, "meta")

    token_b = create_access_token({"sub": str(user.id)})

    response = await client.get(
        f"{APP_CREDS_URL}/meta",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert response.status_code == 200

    body = response.json()
    assert body["has_credential"] is True
    assert body["app_id"] == "app-id-persist"
"""
DonApp API — Social Module OAuth Tests.

Covers the Meta/Facebook/Instagram OAuth flow:
- Authorization URL shape for GET /social/authorize/meta.
- Signed-state validation on GET /social/callback/{platform} (missing / invalid /
  expired) — all must redirect to the frontend, never return a raw 500.
- Happy-path callback with mocked Graph API: page selected, Instagram business
  account resolved, and the IG username fetched with the page access token.
- Role gating: sellers/admins can access, clients get 403.
- Multi-account: multiple pages create multiple accounts with correct is_default.
"""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from app.core.config import settings
from app.core.security import create_access_token
from app.modules.auth.models import User
from app.modules.social.router import STATE_MAX_AGE

pytestmark = pytest.mark.asyncio

AUTHORIZE_URL = "/api/v1/social/authorize/meta"
CALLBACK_URL = "/api/v1/social/callback/meta"

# Same serializer config as app/modules/social/router.py — used to mint valid states.
_state_serializer = URLSafeTimedSerializer(settings.SECRET_KEY, salt="social-oauth-state")


def _signed_state(user_id: uuid.UUID, platform: str = "meta") -> str:
    return _state_serializer.dumps({"user_id": str(user_id), "platform": platform})


# ── Helper: create a user with a given role and return a Bearer token ───────

async def _create_user_with_token(db_session, role: str = "seller", email: str = "social@example.com"):
    """Create a user and return (user, token)."""
    user = User(email=email, full_name="Social User", role=role, hashed_password="dummy")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    token = create_access_token({"sub": str(user.id)})
    return user, token


# ═══════════════════════════════════════════════════════════════════════════════
# Role gating tests (Phase 5)
# ═══════════════════════════════════════════════════════════════════════════════


async def test_authorize_meta_returns_well_formed_auth_url(client: AsyncClient, db_session):
    """Authenticated GET /authorize/meta returns a fully formed Facebook auth URL."""
    user, token = await _create_user_with_token(db_session, role="seller")
    response = await client.get(AUTHORIZE_URL, headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    body = response.json()
    auth_url = body["url"]

    # Facebook dialog host + Graph API version from settings
    assert auth_url.startswith(f"https://www.facebook.com/{settings.META_API_VERSION}/dialog/oauth?")
    assert f"client_id={settings.META_APP_ID}" in auth_url
    assert f"redirect_uri={settings.META_REDIRECT_URI}" in auth_url
    # Six required scopes present
    assert "pages_show_list" in auth_url
    assert "pages_read_engagement" in auth_url
    assert "pages_manage_posts" in auth_url
    assert "instagram_basic" in auth_url
    assert "instagram_content_publish" in auth_url
    assert "business_management" in auth_url
    # State must be signed and loadable with the router's serializer
    state_param = auth_url.split("state=")[1]
    payload = _state_serializer.loads(state_param, max_age=STATE_MAX_AGE)
    assert payload["user_id"] == str(user.id)
    assert payload["platform"] == "meta"


async def test_authorize_meta_forbidden_for_client_role(client: AsyncClient, db_session):
    """GET /authorize/meta with role='client' must return 403 (role gating)."""
    _, token = await _create_user_with_token(db_session, role="client", email="client@example.com")
    response = await client.get(AUTHORIZE_URL, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403


async def test_authorize_meta_allowed_for_admin_role(client: AsyncClient, db_session):
    """GET /authorize/meta with role='admin' must return 200."""
    _, token = await _create_user_with_token(db_session, role="admin", email="admin@example.com")
    response = await client.get(AUTHORIZE_URL, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200


async def test_authorize_meta_requires_auth(client: AsyncClient):
    """GET /authorize/meta without a Bearer token must return 401."""
    response = await client.get(AUTHORIZE_URL)
    assert response.status_code == 401


# ═══════════════════════════════════════════════════════════════════════════════
# Callback redirect tests (no Bearer needed — uses signed state)
# ═══════════════════════════════════════════════════════════════════════════════


async def test_callback_missing_state_redirects_to_frontend(client: AsyncClient):
    """Callback without `state` redirects to the frontend with an error, not a 500."""
    response = await client.get(CALLBACK_URL, follow_redirects=False)
    assert response.status_code == 307
    location = response.headers.get("location", "")
    assert location.startswith(settings.FRONTEND_URL + "/products")
    assert "social_status=error" in location
    assert "detail=missing_state" in location


async def test_callback_invalid_state_redirects_to_frontend(client: AsyncClient):
    """Callback with a tampered/garbage state redirects with invalid_state."""
    response = await client.get(
        f"{CALLBACK_URL}?code=abc&state=not-a-valid-state",
        follow_redirects=False,
    )
    assert response.status_code == 307
    location = response.headers.get("location", "")
    assert location.startswith(settings.FRONTEND_URL + "/products")
    assert "detail=invalid_state" in location


async def test_callback_expired_state_redirects_to_frontend(client: AsyncClient, monkeypatch):
    """Callback with an expired state redirects with state_expired."""
    expired_serializer = MagicMock()
    expired_serializer.loads.side_effect = SignatureExpired("expired")
    monkeypatch.setattr("app.modules.social.router._state_serializer", expired_serializer)

    response = await client.get(
        f"{CALLBACK_URL}?code=abc&state={_signed_state(uuid.uuid4())}",
        follow_redirects=False,
    )
    assert response.status_code == 307
    location = response.headers.get("location", "")
    assert location.startswith(settings.FRONTEND_URL + "/products")
    assert "detail=state_expired" in location


async def test_callback_provider_cancellation_redirects(client: AsyncClient):
    """Provider-side cancellation (error=access_denied) redirects gracefully."""
    user_id = uuid.uuid4()
    response = await client.get(
        f"{CALLBACK_URL}?error=access_denied&error_description=User+cancelled"
        f"&state={_signed_state(user_id)}",
        follow_redirects=False,
    )
    assert response.status_code == 307
    location = response.headers.get("location", "")
    assert location.startswith(settings.FRONTEND_URL + "/products")
    assert "social_status=error" in location
    assert "platform=meta" in location
    assert "User+cancelled" in location


async def test_callback_missing_code_with_valid_state_redirects(client: AsyncClient):
    """Valid state but no `code` (and no provider error) redirects with missing_code."""
    response = await client.get(
        f"{CALLBACK_URL}?state={_signed_state(uuid.uuid4())}",
        follow_redirects=False,
    )
    assert response.status_code == 307
    location = response.headers.get("location", "")
    assert "detail=missing_code" in location


async def test_callback_no_pages_redirects_to_frontend(client: AsyncClient):
    """Meta token exchange succeeds but the user manages no pages -> no_pages."""
    async def _fake_exchange(code, redirect_uri):
        return {"access_token": "long-lived-token", "expires_in": 5_184_000}

    with patch("app.modules.social.router.service.exchange_meta_code", new=_fake_exchange):
        with patch("app.modules.social.router.httpx.AsyncClient") as mock_client:
            mock_instance = MagicMock()
            mock_me_resp = MagicMock()
            mock_me_resp.json.return_value = {"data": []}
            mock_instance.get = AsyncMock(return_value=mock_me_resp)
            mock_client.return_value.__aenter__.return_value = mock_instance

            response = await client.get(
                f"{CALLBACK_URL}?code=abc&state={_signed_state(uuid.uuid4())}",
                follow_redirects=False,
            )

    assert response.status_code == 307
    location = response.headers.get("location", "")
    assert location.startswith(settings.FRONTEND_URL + "/products")
    assert "detail=no_facebook_pages" in location


async def test_callback_success_fetches_ig_username_with_page_token(client: AsyncClient, db_session):
    """
    Full Meta callback: token exchange, page lookup, IG business account
    resolution and IG username fetch (using the page access token). Ends in a
    success redirect to the frontend.
    """
    async def _fake_exchange(code, redirect_uri):
        return {"access_token": "long-lived-token", "expires_in": 5_184_000}

    user_id = uuid.uuid4()

    def _make_me_accounts_response():
        return {
            "data": [
                {
                    "id": "page_123",
                    "name": "DonApp-test",
                    "access_token": "page-access-token",
                    "instagram_business_account": {"id": "ig_456"},
                }
            ]
        }

    def _make_ig_response():
        return {"username": "donappdpr"}

    with patch("app.modules.social.router.service.exchange_meta_code", new=_fake_exchange):
        with patch("app.modules.social.router.httpx.AsyncClient") as mock_client:
            mock_instance = MagicMock()

            def _fake_get(url, **kwargs):
                if url.endswith("/me/accounts"):
                    return MagicMock(json=MagicMock(return_value=_make_me_accounts_response()))
                if url.endswith("/ig_456"):
                    resp = MagicMock()
                    resp.json.return_value = _make_ig_response()
                    return resp
                return MagicMock()

            mock_instance.get = AsyncMock(side_effect=_fake_get)
            mock_client.return_value.__aenter__.return_value = mock_instance

            response = await client.get(
                f"{CALLBACK_URL}?code=abc&state={_signed_state(user_id)}",
                follow_redirects=False,
            )

    assert response.status_code == 307
    location = response.headers.get("location", "")
    assert location.startswith(settings.FRONTEND_URL + "/products")
    assert "social_status=success" in location
    assert "platform=meta" in location

    # The IG username lookup must have used the PAGE access token, not the user token.
    ig_calls = [
        call for call in mock_instance.get.call_args_list if str(call.args[0]).endswith("/ig_456")
    ]
    assert len(ig_calls) == 1
    assert ig_calls[0].kwargs["params"]["access_token"] == "page-access-token"
    assert ig_calls[0].kwargs["params"]["fields"] == "username"


# ═══════════════════════════════════════════════════════════════════════════════
# Multi-account: two pages → two accounts, only first is_default (Phase 8)
# ═══════════════════════════════════════════════════════════════════════════════


async def test_callback_two_pages_creates_two_fb_accounts_first_is_default(
    client: AsyncClient, db_session,
):
    """When the Meta callback returns two pages, both are saved as separate
    SocialAccount rows and only the first one is marked is_default=True."""
    from sqlalchemy.future import select
    from app.modules.social.models import SocialAccount

    async def _fake_exchange(code, redirect_uri):
        return {"access_token": "long-lived-token", "expires_in": 5_184_000}

    user_id = uuid.uuid4()

    def _make_me_accounts_response():
        return {
            "data": [
                {
                    "id": "page_AAA",
                    "name": "Page A",
                    "access_token": "pat-a",
                },
                {
                    "id": "page_BBB",
                    "name": "Page B",
                    "access_token": "pat-b",
                    "instagram_business_account": {"id": "ig_999"},
                },
            ]
        }

    def _make_ig_response():
        return {"username": "ig_user_b"}

    with patch("app.modules.social.router.service.exchange_meta_code", new=_fake_exchange):
        with patch("app.modules.social.router.httpx.AsyncClient") as mock_client:
            mock_instance = MagicMock()

            def _fake_get(url, **kwargs):
                if url.endswith("/me/accounts"):
                    return MagicMock(json=MagicMock(return_value=_make_me_accounts_response()))
                if url.endswith("/ig_999"):
                    resp = MagicMock()
                    resp.json.return_value = _make_ig_response()
                    return resp
                return MagicMock()

            mock_instance.get = AsyncMock(side_effect=_fake_get)
            mock_client.return_value.__aenter__.return_value = mock_instance

            response = await client.get(
                f"{CALLBACK_URL}?code=abc&state={_signed_state(user_id)}",
                follow_redirects=False,
            )

    assert response.status_code == 307
    assert "social_status=success" in response.headers.get("location", "")

    # Query the DB for all facebook accounts of that user
    async with db_session as session:
        result = await session.execute(
            select(SocialAccount)
            .where(SocialAccount.user_id == user_id, SocialAccount.platform == "facebook")
            .order_by(SocialAccount.created_at)
        )
        fb_accounts = list(result.scalars().all())

    assert len(fb_accounts) == 2
    assert fb_accounts[0].platform_user_id == "page_AAA"
    assert fb_accounts[0].is_default is True
    assert fb_accounts[1].platform_user_id == "page_BBB"
    assert fb_accounts[1].is_default is False

    # Instagram account should also exist (from page B)
    async with db_session as session:
        result = await session.execute(
            select(SocialAccount)
            .where(SocialAccount.user_id == user_id, SocialAccount.platform == "instagram")
        )
        ig_accounts = list(result.scalars().all())

    assert len(ig_accounts) == 1
    assert ig_accounts[0].platform_user_id == "ig_999"
    assert ig_accounts[0].platform_username == "ig_user_b"

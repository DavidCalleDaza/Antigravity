"""
Servinow API — Social Module: API Routes.

Handles OAuth authorization, callbacks, account listing,
content publishing, and post status polling for Facebook, Instagram, and TikTok.
"""

import uuid
import logging
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.db.session import get_db
from app.modules.auth.deps import get_current_user
from app.core.config import settings

from . import crud, schemas, service

router = APIRouter(tags=["social"])
logger = logging.getLogger(__name__)

# ── State signer for OAuth ──────────────────────────────────────────────────
_state_serializer = URLSafeTimedSerializer(settings.SECRET_KEY)
STATE_MAX_AGE = 600  # 10 minutes


# ── 2.1 — Authorization URL ────────────────────────────────────────────────

@router.get("/authorize/{platform}")
async def authorize_platform(
    platform: str,
    current_user=Depends(get_current_user),
):
    """
    Returns the OAuth authorization URL for the requested platform.
    Generates a signed `state` containing user_id and the original platform name.
    """
    target = platform.lower()

    # Sign state with user_id + original platform for the callback
    state = _state_serializer.dumps({
        "user_id": str(current_user.id),
        "platform": target,
    })

    if target in ("facebook", "instagram", "meta"):
        url = (
            f"https://www.facebook.com/{settings.META_API_VERSION}/dialog/oauth"
            f"?client_id={settings.META_APP_ID}"
            f"&redirect_uri={settings.META_REDIRECT_URI}"
            f"&scope=business_management,pages_show_list,pages_manage_posts,pages_read_engagement,"
            f"instagram_basic,instagram_content_publish"
            f"&state={state}"
        )
        return {"url": url}
    elif target == "tiktok":
        url = (
            f"https://www.tiktok.com/v2/auth/authorize/"
            f"?client_key={settings.TIKTOK_CLIENT_KEY}"
            f"&response_type=code"
            f"&scope=video.publish,video.upload,user.info.basic"
            f"&redirect_uri={settings.TIKTOK_REDIRECT_URI}"
            f"&state={state}"
        )
        return {"url": url}
    else:
        raise HTTPException(status_code=400, detail="Invalid platform")


# ── Helper: build frontend redirect URL ─────────────────────────────────────

def _frontend_redirect(status_val: str, **extra) -> RedirectResponse:
    """Build a RedirectResponse back to the frontend with query params."""
    base = settings.FRONTEND_URL or "http://localhost:5173"
    params = {"social_status": status_val, **extra}
    return RedirectResponse(url=f"{base}/products?{urlencode(params)}")


# ── 2.2 / 2.3 / 2.4 / 2.5 — OAuth Callback ────────────────────────────────

@router.get("/callback/{platform}")
async def callback_platform(
    platform: str,
    code: Optional[str] = None,
    error: Optional[str] = None,
    error_description: Optional[str] = None,
    state: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Handles the OAuth callback from Facebook/TikTok.
    - No Bearer token required (browser redirect, not API call).
    - Validates signed `state` to recover user_id and requested platform.
    - Handles cancellation gracefully with a redirect.
    - Creates separate SocialAccount entries for facebook and instagram (Option A).
    """

    # ── Validate state ──────────────────────────────────────────────────
    if not state:
        return _frontend_redirect("error", detail="missing_state")

    try:
        state_data = _state_serializer.loads(state, max_age=STATE_MAX_AGE)
        user_id = uuid.UUID(state_data["user_id"])
        requested_platform = state_data["platform"]
    except SignatureExpired:
        return _frontend_redirect("error", detail="state_expired")
    except (BadSignature, KeyError, ValueError):
        return _frontend_redirect("error", detail="invalid_state")

    # ── Handle cancellation / error from provider ───────────────────────
    if error or not code:
        detail = error_description or error or "missing_code"
        return _frontend_redirect("error", detail=detail, platform=requested_platform)

    # ── Exchange code for token ─────────────────────────────────────────
    target = requested_platform if requested_platform not in ("facebook", "instagram") else "meta"

    try:
        if target == "meta":
            token_data = await service.exchange_meta_code(code, settings.META_REDIRECT_URI)
            access_token = token_data.get("access_token")
            expires_in = token_data.get("expires_in")
            refresh_token = None  # Meta long-lived tokens don't have refresh_token

        elif target == "tiktok":
            token_data = await service.exchange_tiktok_code(code, settings.TIKTOK_REDIRECT_URI)
            tiktok_data = token_data.get("data", token_data)
            access_token = tiktok_data.get("access_token")
            expires_in = tiktok_data.get("expires_in")
            refresh_token = tiktok_data.get("refresh_token")
        else:
            return _frontend_redirect("error", detail="invalid_platform", platform=requested_platform)

        if not access_token:
            return _frontend_redirect("error", detail="no_access_token", platform=requested_platform)

        # Calculate expires_at
        expires_at = None
        if expires_in:
            expires_at = datetime.now(timezone.utc) + timedelta(seconds=int(expires_in))

    except HTTPException as e:
        return _frontend_redirect("error", detail=str(e.detail), platform=requested_platform)
    except Exception as e:
        logger.error(f"OAuth token exchange failed: {e}")
        return _frontend_redirect("error", detail="token_exchange_failed", platform=requested_platform)

    # ── Save account(s) — Option A: separate facebook + instagram ───────
    try:
        if target == "meta":
            # Fetch page info and instagram business account
            import httpx
            async with httpx.AsyncClient() as client:
                me_resp = await client.get(
                    f"https://graph.facebook.com/{settings.META_API_VERSION}/me/accounts",
                    params={
                        "access_token": access_token,
                        "fields": "id,name,instagram_business_account",
                    },
                )
                me_data = me_resp.json()
                print(f"DEBUG META ME/ACCOUNTS RESPONSE: {me_data}")

            pages = me_data.get("data", [])
            if not pages:
                print("DEBUG: NO PAGES FOUND IN META RESPONSE")
                return _frontend_redirect("error", detail="no_facebook_pages", platform=requested_platform)

            page = pages[0]
            page_id = page["id"]
            page_name = page.get("name")

            # ── Create/update Facebook account ──
            fb_account_in = schemas.SocialAccountCreate(
                platform="facebook",
                platform_user_id=page_id,
                platform_username=page_name,
                access_token=access_token,
                refresh_token=None,
                expires_at=expires_at,
            )
            await crud.create_or_update_social_account(db, user_id, fb_account_in)

            # ── Create/update Instagram account (if linked) ──
            ig_biz = page.get("instagram_business_account")
            if ig_biz:
                ig_id = ig_biz.get("id")
                ig_account_in = schemas.SocialAccountCreate(
                    platform="instagram",
                    platform_user_id=ig_id,
                    platform_username=None,  # Could fetch IG username with another API call
                    access_token=access_token,
                    refresh_token=None,
                    expires_at=expires_at,
                )
                await crud.create_or_update_social_account(db, user_id, ig_account_in)

        elif target == "tiktok":
            tiktok_account_in = schemas.SocialAccountCreate(
                platform="tiktok",
                access_token=access_token,
                refresh_token=refresh_token,
                expires_at=expires_at,
            )
            await crud.create_or_update_social_account(db, user_id, tiktok_account_in)

    except Exception as e:
        logger.error(f"Failed to save social account: {e}")
        return _frontend_redirect("error", detail="account_save_failed", platform=requested_platform)

    return _frontend_redirect("success", platform=requested_platform)


# ── Account management ──────────────────────────────────────────────────────

@router.get("/accounts", response_model=List[schemas.SocialAccountResponse])
async def list_accounts(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await crud.get_user_social_accounts(db, current_user.id)


@router.delete("/accounts/{platform}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    platform: str,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    deleted = await crud.delete_social_account(db, current_user.id, platform)
    if not deleted:
        raise HTTPException(status_code=404, detail="Account not found")
    return None


# ── Publishing ──────────────────────────────────────────────────────────────

@router.post("/publish", response_model=schemas.SocialPostResponse, status_code=status.HTTP_202_ACCEPTED)
async def publish_content(
    post_in: schemas.SocialPostCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Enqueue a new social media post for publishing."""
    account = await crud.get_social_account(db, current_user.id, post_in.platform)
    if not account:
        raise HTTPException(status_code=400, detail=f"No account connected for platform: {post_in.platform}")

    db_post = await crud.create_social_post(db, current_user.id, post_in)

    local_path = post_in.media_url.lstrip('/') if post_in.media_url else None
    if not local_path:
        raise HTTPException(status_code=400, detail="media_url is required for publishing")

    from app.modules.social.tasks import publish_to_social_task

    publish_to_social_task.delay(
        post_id_str=str(db_post.id),
        user_id_str=str(current_user.id),
        platform=post_in.platform,
        local_path=local_path,
        caption=post_in.caption or "",
    )

    return db_post


# ── Post status polling ─────────────────────────────────────────────────────

@router.get("/post-status/{post_id}", response_model=schemas.SocialPostResponse)
async def get_post_status(
    post_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns the current status of a social post (pending/success/failed)."""
    post = await crud.get_social_post(db, post_id, current_user.id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post

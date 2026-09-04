"""
DonApp API — Social Module: API Routes.

Handles OAuth authorization, callbacks, multi-account management,
content publishing, and post status polling for Facebook, Instagram, and TikTok.
"""

import uuid
import logging
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
import redis.asyncio as redis
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional

from app.db.session import get_db
from app.modules.auth.deps import require_seller
from app.core.config import settings
from app.core.security import verify_password

from . import crud, schemas, service
from .models import SocialAppCredential, SocialToken

router = APIRouter(tags=["social"])
logger = logging.getLogger(__name__)

# ── Rate limiting para reveal de credenciales ───────────────────────────────
# Mismo patrón que el lockout de OTP de WhatsApp: Redis, 5 intentos / 10 min.
redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
REVEAL_MAX_ATTEMPTS = 5
REVEAL_LOCKOUT_SECONDS = 600

# ── State signer for OAuth ──────────────────────────────────────────────────
# Salt namespaces the social state so it can never be replayed against other
# flows that sign with the same SECRET_KEY (e.g. Google OAuth state).
_state_serializer = URLSafeTimedSerializer(settings.SECRET_KEY, salt="social-oauth-state")
STATE_MAX_AGE = 600  # 10 minutes


# ── 2.1 — Authorization URL ────────────────────────────────────────────────

@router.get("/authorize/{platform}")
async def authorize_platform(
    platform: str,
    origin: Optional[str] = None,
    current_user=Depends(require_seller),
):
    """
    Returns the OAuth authorization URL for the requested platform.
    Generates a signed `state` containing user_id and the original platform name.
    """
    target = platform.lower()

    # Sign state with user_id + original platform for the callback
    state_payload = {
        "user_id": str(current_user.id),
        "platform": target,
    }
    if origin:
        state_payload["origin"] = origin

    state = _state_serializer.dumps(state_payload)

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

def _frontend_redirect(status_val: str, origin: Optional[str] = None, **extra) -> RedirectResponse:
    """Build a RedirectResponse back to the frontend with query params.

    *origin* comes from the signed state and lets the callback redirect to
    /profile instead of /products when the OAuth flow started from Settings.
    """
    base = settings.FRONTEND_URL or "http://localhost:5173"
    # Default to /products for backward compat; /profile when origin says so
    landing = "/profile" if origin == "settings" else "/products"
    params = {"social_status": status_val, **extra}
    return RedirectResponse(url=f"{base}{landing}?{urlencode(params)}")


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
    - Creates separate SocialAccount entries for each Facebook page + its
      linked Instagram business account (multi-account aware).
    """

    # ── Validate state ──────────────────────────────────────────────────
    if not state:
        return _frontend_redirect("error", detail="missing_state")

    try:
        state_data = _state_serializer.loads(state, max_age=STATE_MAX_AGE)
        user_id = uuid.UUID(state_data["user_id"])
        requested_platform = state_data["platform"]
        origin = state_data.get("origin")
    except SignatureExpired:
        return _frontend_redirect("error", detail="state_expired")
    except (BadSignature, KeyError, ValueError):
        return _frontend_redirect("error", detail="invalid_state")

    # ── Handle cancellation / error from provider ───────────────────────
    if error or not code:
        detail = error_description or error or "missing_code"
        return _frontend_redirect("error", origin=origin, detail=detail, platform=requested_platform)

    # ── Exchange code for token ─────────────────────────────────────────
    target = requested_platform if requested_platform not in ("facebook", "instagram") else "meta"

    try:
        if target == "meta":
            token_data = await service.exchange_meta_code(code, settings.META_REDIRECT_URI)
            access_token = token_data.get("access_token")
            expires_in = token_data.get("expires_in")
            refresh_token = None  # Meta long-lived tokens don't have refresh_token

        elif target == "tiktok":
            is_manual = state_data.get("is_manual", False)
            client_key = None
            client_secret = None
            
            if is_manual:
                app_cred_result = await db.execute(
                    select(SocialAppCredential).where(
                        SocialAppCredential.user_id == user_id,
                        SocialAppCredential.platform_group == "tiktok"
                    )
                )
                app_cred = app_cred_result.scalar_one_or_none()
                if not app_cred or not app_cred.app_id or not app_cred.app_secret:
                    return _frontend_redirect("error", origin=origin, detail="missing_app_credentials", platform=requested_platform)
                
                client_key = app_cred.app_id
                client_secret = app_cred.app_secret

            token_data = await service.exchange_tiktok_code(
                code, 
                settings.TIKTOK_REDIRECT_URI,
                client_key=client_key,
                client_secret=client_secret
            )
            tiktok_data = token_data.get("data", token_data)
            access_token = tiktok_data.get("access_token")
            expires_in = tiktok_data.get("expires_in")
            refresh_token = tiktok_data.get("refresh_token")
        else:
            return _frontend_redirect("error", origin=origin, detail="invalid_platform", platform=requested_platform)

        if not access_token:
            return _frontend_redirect("error", origin=origin, detail="no_access_token", platform=requested_platform)

        # Calculate expires_at
        expires_at = None
        if expires_in:
            expires_at = datetime.now(timezone.utc) + timedelta(seconds=int(expires_in))

    except HTTPException as e:
        return _frontend_redirect("error", origin=origin, detail=str(e.detail), platform=requested_platform)
    except Exception as e:
        logger.error(f"OAuth token exchange failed: {e}")
        return _frontend_redirect("error", origin=origin, detail="token_exchange_failed", platform=requested_platform)

    # ── Save account(s) — Loop over ALL pages + linked IG ───────────────
    try:
        if target == "meta":
            # Fetch page info and instagram business account
            async with httpx.AsyncClient() as client:
                me_resp = await client.get(
                    f"https://graph.facebook.com/{settings.META_API_VERSION}/me/accounts",
                    params={
                        "access_token": access_token,
                        "fields": "id,name,access_token,instagram_business_account",
                    },
                )
                me_data = me_resp.json()
                logger.debug("META ME/ACCOUNTS RESPONSE: %s", me_data)

            pages = me_data.get("data", [])
            if not pages:
                logger.warning("No Facebook pages found for user %s", user_id)
                return _frontend_redirect("error", origin=origin, detail="no_facebook_pages", platform=requested_platform)

            # Loop over ALL pages — first page becomes is_default via
            # create_or_update_social_account's first-account logic.
            for page in pages:
                page_id = page["id"]
                page_name = page.get("name")
                # Se usa únicamente para consultar la cuenta de Instagram vinculada;
                # se persiste el token de usuario de larga duración.
                page_access_token = page.get("access_token") or access_token

                # ── Create/update Facebook account ──
                fb_account_in = schemas.SocialAccountCreate(
                    platform="facebook",
                    platform_user_id=page_id,
                    platform_username=page_name,
                    access_token=access_token,
                    refresh_token=None,
                    expires_at=expires_at,
                    connection_method="oauth",
                )
                await crud.create_or_update_social_account(db, user_id, fb_account_in)

                # ── Create/update Instagram account (if linked) ──
                ig_biz = page.get("instagram_business_account")
                if ig_biz:
                    ig_id = ig_biz.get("id")
                    ig_username = None
                    try:
                        async with httpx.AsyncClient() as ig_client:
                            ig_resp = await ig_client.get(
                                f"https://graph.facebook.com/{settings.META_API_VERSION}/{ig_id}",
                                params={
                                    "fields": "username",
                                    "access_token": page_access_token,
                                },
                            )
                            ig_data = ig_resp.json()
                            ig_username = ig_data.get("username")
                    except Exception as e:
                        logger.warning("Failed to fetch Instagram username for %s: %s", ig_id, e)

                    ig_account_in = schemas.SocialAccountCreate(
                        platform="instagram",
                        platform_user_id=ig_id,
                        platform_username=ig_username,
                        access_token=access_token,
                        refresh_token=None,
                        expires_at=expires_at,
                        connection_method="oauth",
                    )
                    await crud.create_or_update_social_account(db, user_id, ig_account_in)

        elif target == "tiktok":
            # Fetch TikTok user info to get the open_id as platform_user_id
            tiktok_open_id = tiktok_data.get("open_id")
            tiktok_account_in = schemas.SocialAccountCreate(
                platform="tiktok",
                platform_user_id=tiktok_open_id,
                access_token=access_token,
                refresh_token=refresh_token,
                expires_at=expires_at,
                connection_method="oauth",
            )
            await crud.create_or_update_social_account(db, user_id, tiktok_account_in)

    except Exception as e:
        logger.error(f"Failed to save social account: {e}")
        return _frontend_redirect("error", origin=origin, detail="account_save_failed", platform=requested_platform)

    return _frontend_redirect("success", origin=origin, platform=requested_platform)


# ── Account management ──────────────────────────────────────────────────────

from app.modules.social.manual_credentials_service import (
    save_manual_credentials,
    validate_meta_token,
    validate_tiktok_token,
)


@router.post("/accounts/manual/authorize-tiktok")
async def manual_authorize_tiktok(
    req: schemas.ManualAuthorizeRequest,
    current_user=Depends(require_seller),
    db: AsyncSession = Depends(get_db),
):
    """
    Saves the user's custom TikTok App credentials and returns the OAuth URL.
    This enables a multi-tenant dynamic OAuth flow.
    """
    app_secret = req.app_secret
    if not app_secret:
        existing_cred_result = await db.execute(
            select(SocialAppCredential).where(
                SocialAppCredential.user_id == current_user.id,
                SocialAppCredential.platform_group == "tiktok",
            )
        )
        existing_cred = existing_cred_result.scalar_one_or_none()
        if not existing_cred:
            raise HTTPException(
                status_code=400,
                detail="Debes ingresar el App Secret la primera vez que conectas esta plataforma."
            )
        app_secret = existing_cred.app_secret

    # Save/Update credentials
    result = await db.execute(
        select(SocialAppCredential).where(
            SocialAppCredential.user_id == current_user.id,
            SocialAppCredential.platform_group == "tiktok"
        )
    )
    app_cred = result.scalar_one_or_none()
    
    if app_cred:
        app_cred.app_id = req.app_id
        app_cred.app_secret = app_secret
        app_cred.last_modified_by = current_user.id
    else:
        app_cred = SocialAppCredential(
            user_id=current_user.id,
            platform_group="tiktok",
            app_id=req.app_id,
            app_secret=app_secret,
            last_modified_by=current_user.id
        )
        db.add(app_cred)
    await db.commit()

    # Generate OAuth URL
    state_data = {
        "user_id": str(current_user.id),
        "platform": "tiktok",
        "is_manual": True
    }
    signed_state = _state_serializer.dumps(state_data)
    
    url = (
        f"https://www.tiktok.com/v2/auth/authorize/?"
        f"client_key={req.app_id}&"
        f"response_type=code&"
        f"scope=user.info.basic,video.publish,video.upload&"
        f"redirect_uri={settings.TIKTOK_REDIRECT_URI}&"
        f"state={signed_state}"
    )
    return {"url": url}

@router.post("/accounts/manual/validate")
async def manual_validate(
    req: schemas.ManualValidateRequest,
    current_user=Depends(require_seller),
    db: AsyncSession = Depends(get_db),
):
    """Validates token and returns available accounts/pages."""
    return await save_manual_credentials(
        db=db,
        target_user_id=current_user.id,
        acting_user_id=current_user.id,
        platform_group=req.platform_group,
        app_id=req.app_id,
        app_secret=req.app_secret,
        access_token=req.access_token,
    )


@router.post("/accounts/manual/confirm")
async def manual_confirm(
    req: schemas.ManualConfirmRequest,
    current_user=Depends(require_seller),
    db: AsyncSession = Depends(get_db),
):
    """Creates SocialAccount and SocialToken based on the selected account.

    Multi-account aware: uses (user_id, platform, platform_user_id) as key,
    so a second account with a different page/open_id won't overwrite the first.
    Persists connection_method='manual' and links app_credential_id.
    """
    # Resolve the app_credential for this user+platform_group
    cred_result = await db.execute(
        select(SocialAppCredential).where(
            SocialAppCredential.user_id == current_user.id,
            SocialAppCredential.platform_group == req.platform_group,
        )
    )
    app_cred = cred_result.scalar_one_or_none()
    app_credential_id = app_cred.id if app_cred else None

    if req.platform_group == "meta":
        # Create Facebook account
        fb_in = schemas.SocialAccountCreate(
            platform="facebook",
            platform_user_id=req.selected_account_id,
            platform_username=req.selected_account_name,
            access_token=req.access_token,
            connection_method="manual",
            account_type=req.account_type,
            display_label=req.display_label,
            app_credential_id=app_credential_id,
        )
        fb_account = await crud.create_or_update_social_account(db, current_user.id, fb_in)
        fb_account.last_modified_by = current_user.id

        if req.instagram_business_account_id:
            ig_in = schemas.SocialAccountCreate(
                platform="instagram",
                platform_user_id=req.instagram_business_account_id,
                platform_username=req.instagram_username,
                access_token=req.access_token,
                connection_method="manual",
                account_type=req.account_type,
                display_label=req.display_label,
                app_credential_id=app_credential_id,
            )
            ig_account = await crud.create_or_update_social_account(db, current_user.id, ig_in)
            ig_account.last_modified_by = current_user.id

    elif req.platform_group == "tiktok":
        tiktok_in = schemas.SocialAccountCreate(
            platform="tiktok",
            platform_user_id=req.selected_account_id,
            platform_username=req.selected_account_name,
            access_token=req.access_token,
            connection_method="manual",
            account_type=req.account_type,
            display_label=req.display_label,
            app_credential_id=app_credential_id,
        )
        tk_account = await crud.create_or_update_social_account(db, current_user.id, tiktok_in)
        tk_account.last_modified_by = current_user.id

    await db.commit()
    return {"status": "success"}


@router.get("/accounts/app-credentials/{platform_group}", response_model=schemas.AppCredentialResponse)
async def get_app_credentials(
    platform_group: str,
    current_user=Depends(require_seller),
    db: AsyncSession = Depends(get_db),
):
    """Devuelve el App ID guardado para precargar el formulario. Nunca el secret."""
    result = await db.execute(
        select(SocialAppCredential).where(
            SocialAppCredential.user_id == current_user.id,
            SocialAppCredential.platform_group == platform_group,
        )
    )
    cred = result.scalar_one_or_none()
    if not cred:
        return schemas.AppCredentialResponse(app_id=None, has_credential=False)
    return schemas.AppCredentialResponse(app_id=cred.app_id, has_credential=True)


@router.post("/accounts/app-credentials/{platform_group}/reveal", response_model=schemas.AppCredentialReveal)
async def reveal_app_credentials(
    platform_group: str,
    req: schemas.RevealCredentialRequest,
    current_user=Depends(require_seller),
    db: AsyncSession = Depends(get_db),
):
    """Re-autentica con la contraseña de la cuenta y devuelve App ID/Secret en claro."""
    lockout_key = f"social_reveal_lockout:{current_user.id}:{platform_group}"
    attempts = await redis_client.get(lockout_key)
    if attempts and int(attempts) >= REVEAL_MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Demasiados intentos fallidos. Espera unos minutos antes de volver a intentarlo.")

    if not current_user.hashed_password or not verify_password(req.password, current_user.hashed_password):
        new_count = await redis_client.incr(lockout_key)
        if new_count == 1:
            await redis_client.expire(lockout_key, REVEAL_LOCKOUT_SECONDS)
        raise HTTPException(status_code=401, detail="Contraseña incorrecta.")

    await redis_client.delete(lockout_key)

    result = await db.execute(
        select(SocialAppCredential).where(
            SocialAppCredential.user_id == current_user.id,
            SocialAppCredential.platform_group == platform_group,
        )
    )
    cred = result.scalar_one_or_none()
    if not cred:
        raise HTTPException(status_code=404, detail="No hay credenciales guardadas para esta plataforma.")

    return schemas.AppCredentialReveal(app_id=cred.app_id, app_secret=cred.app_secret)


@router.get("/accounts", response_model=List[schemas.SocialAccountResponse])
async def list_accounts(
    current_user=Depends(require_seller),
    db: AsyncSession = Depends(get_db),
):
    """List all connected social accounts for the current user."""
    return await crud.list_accounts(db, current_user.id)


@router.patch("/accounts/{account_id}", response_model=schemas.SocialAccountResponse)
async def patch_account(
    account_id: uuid.UUID,
    update_in: schemas.SocialAccountUpdate,
    current_user=Depends(require_seller),
    db: AsyncSession = Depends(get_db),
):
    """Edit account_type, display_label, or promote to default."""
    fields = update_in.model_dump(exclude_none=True)
    if not fields:
        raise HTTPException(status_code=422, detail="No fields to update")

    account = await crud.update_account(db, account_id, current_user.id, **fields)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


@router.patch("/accounts/{account_id}/token", response_model=schemas.SocialAccountResponse)
async def renew_account_token(
    account_id: uuid.UUID,
    req: schemas.TokenRenewRequest,
    current_user=Depends(require_seller),
    db: AsyncSession = Depends(get_db),
):
    """Renueva SOLO el access token de una cuenta conectada.

    Valida el token nuevo contra la plataforma antes de guardarlo; si la
    validación falla, responde 400 y NO toca el registro existente.
    """
    account = await crud.get_account_by_id(db, account_id, current_user.id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    platform = account.platform

    # ── 1. Validate the new token against the platform ──────────────────────
    expires_at = None
    try:
        if platform in ("facebook", "instagram"):
            app_id = account.app_credential.app_id if account.app_credential else None
            app_secret = account.app_credential.app_secret if account.app_credential else None
            token_info = await validate_meta_token(req.access_token, app_id, app_secret)
            raw_expires = token_info.get("expires_at")
            if raw_expires and int(raw_expires) > 0:
                expires_at = datetime.fromtimestamp(int(raw_expires), tz=timezone.utc)
        elif platform == "tiktok":
            await validate_tiktok_token(req.access_token)
        else:
            raise HTTPException(status_code=400, detail=f"Plataforma no soportada: {platform}")
    except HTTPException:
        raise  # validation failed → do NOT touch the existing record

    # ── 2. Update the token (same lookup as create_or_update_social_account) ──
    result = await db.execute(
        select(SocialToken).where(SocialToken.account_id == account.id)
    )
    token_obj = result.scalar_one_or_none()
    if not token_obj:
        raise HTTPException(status_code=404, detail="No token found for this account")

    token_obj.access_token = req.access_token
    if expires_at:
        token_obj.expires_at = expires_at

    account.status = "active"
    account.last_error = None
    account.last_verified_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(account)
    return account


# IMPORTANT: DELETE by UUID must be registered BEFORE DELETE by platform string
# so FastAPI tries UUID parsing first and falls through on non-UUID paths.

@router.delete("/accounts/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account_by_id(
    account_id: uuid.UUID,
    current_user=Depends(require_seller),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single social account by its UUID.

    If the deleted account was the default, the oldest remaining sibling is promoted.
    """
    deleted = await crud.delete_account_by_id(db, account_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Account not found")
    return None


@router.delete(
    "/accounts/platform/{platform}",
    status_code=status.HTTP_204_NO_CONTENT,
    deprecated=True,
)
async def delete_accounts_by_platform(
    platform: str,
    current_user=Depends(require_seller),
    db: AsyncSession = Depends(get_db),
):
    """(Deprecated) Bulk-delete all accounts for a platform.

    Use DELETE /accounts/{account_id} instead.
    """
    deleted = await crud.delete_accounts_by_platform(db, current_user.id, platform)
    if not deleted:
        raise HTTPException(status_code=404, detail="Account not found")
    return None


def _is_audio(url_or_path: str) -> bool:
    if not url_or_path:
        return False
    lower = url_or_path.lower().split('?')[0]
    return lower.endswith(('.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.wma', '.opus'))


def _is_video(url_or_path: str) -> bool:
    if not url_or_path:
        return False
    lower = url_or_path.lower().split('?')[0]
    return lower.endswith(('.mp4', '.webm', '.mov', '.avi', '.m4v', '.mkv'))


# ── Publishing ──────────────────────────────────────────────────────────────

@router.post("/publish", response_model=schemas.SocialPostResponse, status_code=status.HTTP_202_ACCEPTED)
async def publish_content(
    post_in: schemas.SocialPostCreate,
    current_user=Depends(require_seller),
    db: AsyncSession = Depends(get_db),
):
    """Enqueue a new social media post for publishing.

    If account_id is provided, resolve and validate that specific account.
    Otherwise, fall back to the default account for the given platform (retrocompat).
    """
    if post_in.account_id:
        account = await crud.get_account_by_id(db, post_in.account_id, current_user.id)
        if not account:
            raise HTTPException(status_code=404, detail="Account not found or not owned by you")
        if account.status != "active":
            raise HTTPException(
                status_code=400,
                detail=f"Account is {account.status}. Please reconnect before publishing.",
            )
        # Derive platform from account if not explicitly provided
        platform = account.platform
    else:
        # Retrocompat: resolve by platform name
        if not post_in.platform:
            raise HTTPException(status_code=422, detail="Either account_id or platform is required")
        platform = post_in.platform
        account = await crud.get_default_account(db, current_user.id, platform)
        if not account:
            raise HTTPException(status_code=400, detail=f"No account connected for platform: {platform}")
        if account.status != "active":
            raise HTTPException(
                status_code=400,
                detail=f"Account is {account.status}. Please reconnect before publishing.",
            )

    # ── Resolve effective media URLs (filter out any audio files) ──────────────
    raw_urls = []
    if post_in.media_urls and len(post_in.media_urls) > 0:
        raw_urls = post_in.media_urls
    elif post_in.media_url:
        raw_urls = [post_in.media_url]

    effective_urls = [u for u in raw_urls if not _is_audio(u)]

    if len(effective_urls) == 0:
        raise HTTPException(status_code=400, detail="Se requiere al menos una imagen o video para publicar (los archivos de audio se ignoran para redes sociales)")

    # TikTok only accepts a single video or multiple photos
    is_vid = _is_video(effective_urls[0])
    if platform == "tiktok" and is_vid and len(effective_urls) > 1:
        raise HTTPException(
            status_code=400,
            detail="TikTok solo permite un video por publicación."
        )

    # Ensure platform is set on the post data
    if not post_in.platform:
        post_in.platform = platform

    post_in.media_urls = effective_urls
    post_in.media_url = effective_urls[0]

    db_post = await crud.create_social_post(db, current_user.id, post_in, account_id=account.id)

    # Strip leading slash for local filesystem path resolution
    local_paths = [u.lstrip('/') for u in effective_urls]

    from app.modules.social.tasks import publish_to_social_task

    publish_to_social_task.delay(
        post_id_str=str(db_post.id),
        user_id_str=str(current_user.id),
        platform=platform,
        local_path=local_paths[0],       # retrocompat: first path as singular
        local_paths=local_paths,          # new: full list for multi-image
        caption=post_in.caption or "",
        is_ai_generated=post_in.is_ai_generated,
        account_id_str=str(account.id),
    )

    return db_post


@router.post("/publish/batch", response_model=schemas.SocialBatchPostResponse, status_code=status.HTTP_202_ACCEPTED)
async def publish_batch_content(
    batch_in: schemas.SocialBatchPostCreate,
    current_user=Depends(require_seller),
    db: AsyncSession = Depends(get_db),
):
    """Decompose and enqueue a batch publication across multiple accounts and media types.

    - Audios are completely filtered out (kept only for catalog).
    - Images are grouped into 1 Carousel post per account.
    - Videos are decomposed into individual video posts (1 per video) per account.
    - Dispatches Celery tasks asynchronously with staggered countdowns.
    """
    if not batch_in.account_ids:
        raise HTTPException(status_code=400, detail="Debe seleccionar al menos una cuenta para publicar.")

    # Clean and partition media (ignore audios)
    raw_images = batch_in.images or []
    raw_videos = batch_in.videos or []

    clean_images = [u for u in raw_images if u and not _is_audio(u)]
    clean_videos = [u for u in raw_videos if u and not _is_audio(u)]

    if not clean_images and not clean_videos:
        raise HTTPException(
            status_code=400,
            detail="Se requiere al menos una imagen o video válido para publicar en redes."
        )

    from app.modules.social.tasks import publish_to_social_task

    created_posts = []
    task_delay_seconds = 0

    for acc_id in batch_in.account_ids:
        account = await crud.get_account_by_id(db, acc_id, current_user.id)
        if not account or account.status != "active":
            logger.warning(f"Skipping inactive/invalid account {acc_id} for batch publishing")
            continue

        platform = account.platform

        # ── 1. Create image post / carousel if images exist ──────────────────
        if clean_images:
            img_post_in = schemas.SocialPostCreate(
                account_id=account.id,
                platform=platform,
                caption=batch_in.caption,
                media_url=clean_images[0],
                media_urls=clean_images,
                product_id=batch_in.product_id,
                service_id=batch_in.service_id,
                is_ai_generated=batch_in.is_ai_generated,
            )
            db_img_post = await crud.create_social_post(db, current_user.id, img_post_in, account_id=account.id)
            created_posts.append(db_img_post)

            local_img_paths = [u.lstrip('/') for u in clean_images]
            publish_to_social_task.apply_async(
                kwargs={
                    "post_id_str": str(db_img_post.id),
                    "user_id_str": str(current_user.id),
                    "platform": platform,
                    "local_path": local_img_paths[0],
                    "local_paths": local_img_paths,
                    "caption": batch_in.caption or "",
                    "is_ai_generated": batch_in.is_ai_generated,
                    "account_id_str": str(account.id),
                },
                countdown=task_delay_seconds,
            )
            task_delay_seconds += 3

        # ── 2. Create individual video post for EACH video ───────────────────
        for vid_url in clean_videos:
            vid_post_in = schemas.SocialPostCreate(
                account_id=account.id,
                platform=platform,
                caption=batch_in.caption,
                media_url=vid_url,
                media_urls=[vid_url],
                product_id=batch_in.product_id,
                service_id=batch_in.service_id,
                is_ai_generated=batch_in.is_ai_generated,
            )
            db_vid_post = await crud.create_social_post(db, current_user.id, vid_post_in, account_id=account.id)
            created_posts.append(db_vid_post)

            local_vid_path = vid_url.lstrip('/')
            publish_to_social_task.apply_async(
                kwargs={
                    "post_id_str": str(db_vid_post.id),
                    "user_id_str": str(current_user.id),
                    "platform": platform,
                    "local_path": local_vid_path,
                    "local_paths": [local_vid_path],
                    "caption": batch_in.caption or "",
                    "is_ai_generated": batch_in.is_ai_generated,
                    "account_id_str": str(account.id),
                },
                countdown=task_delay_seconds,
            )
            task_delay_seconds += 4

    if not created_posts:
        raise HTTPException(
            status_code=400,
            detail="No se pudo encolar ninguna publicación. Verifica que tus cuentas sociales estén activas."
        )

    return schemas.SocialBatchPostResponse(
        total_posts=len(created_posts),
        posts=created_posts
    )


@router.post("/posts/reconcile-tiktok", status_code=status.HTTP_202_ACCEPTED)
async def reconcile_tiktok_processing(
    current_user=Depends(require_seller),
):
    """Fire-and-forget: enqueues the TikTok 'processing' reconciliation task.

    TikTok may take far longer than the bounded publish polling window, so
    posts left in 'processing' are re-checked on demand via this endpoint
    (works in production without Celery beat). Responds 202 immediately.
    """
    from app.modules.social.tasks import reconcile_tiktok_processing_task

    reconcile_tiktok_processing_task.delay()
    return {"status": "queued"}


# ── Post status polling ─────────────────────────────────────────────────────

@router.get("/post-status/{post_id}", response_model=schemas.SocialPostResponse)
async def get_post_status(
    post_id: uuid.UUID,
    current_user=Depends(require_seller),
    db: AsyncSession = Depends(get_db),
):
    """Returns the current status of a social post (pending/success/failed)."""
    post = await crud.get_social_post(db, post_id, current_user.id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post

"""
DonApp API — Social Module: Celery Tasks.

Background task for publishing content to social media platforms.
Supports Facebook, Instagram, and TikTok.

Multi-account aware: prefers account_id resolution; falls back to
(user_id, platform) for retrocompatibility with in-flight messages
during deployment (decision #6).
"""

import asyncio
import uuid
import logging

from app.core.celery_app import celery_app
from app.db.session import async_session_factory
from app.modules.social import crud, service
import app.db.base  # Ensure all models are registered

logger = logging.getLogger(__name__)

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.core.config import settings
from app.db.session import get_connect_args

# ── Exceptions that indicate the token is dead (no point retrying) ──────────
_AUTH_ERRORS = (
    "OAuthException",
    "Invalid OAuth",
    "token has expired",
    "token is invalid",
    "Error validating access token",
    "access_token_invalid",
    "token_expired",
)


def _is_auth_error(exc: Exception) -> bool:
    """Return True if the exception looks like a permanent auth/token failure."""
    msg = str(exc).lower()
    return any(sentinel.lower() in msg for sentinel in _AUTH_ERRORS)


async def _publish_async(
    engine,
    post_id_str: str,
    user_id_str: str,
    platform: str,
    local_path: str,
    caption: str,
    is_ai_generated: bool = False,
    account_id_str: str | None = None,
):
    post_id = uuid.UUID(post_id_str)
    user_id = uuid.UUID(user_id_str)

    local_session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with local_session_factory() as db:
        try:
            # ── 1. Resolve the account ──────────────────────────────────────
            from sqlalchemy.future import select
            from sqlalchemy.orm import selectinload
            from app.modules.social.models import SocialAccount

            if account_id_str:
                # New path: resolve by PK with eager-loaded tokens + credential
                account_id = uuid.UUID(account_id_str)
                result = await db.execute(
                    select(SocialAccount)
                    .options(
                        selectinload(SocialAccount.tokens),
                        selectinload(SocialAccount.app_credential),
                    )
                    .where(
                        SocialAccount.id == account_id,
                        SocialAccount.user_id == user_id,
                    )
                )
                account_with_tokens = result.scalar_one_or_none()
            else:
                # Retrocompat path: resolve by (user_id, platform) — picks the
                # default account.  Handles in-flight tasks dispatched before
                # the code was updated to pass account_id (decision #6).
                result = await db.execute(
                    select(SocialAccount)
                    .options(
                        selectinload(SocialAccount.tokens),
                        selectinload(SocialAccount.app_credential),
                    )
                    .where(
                        SocialAccount.user_id == user_id,
                        SocialAccount.platform == platform,
                        SocialAccount.is_default.is_(True),
                    )
                )
                account_with_tokens = result.scalar_one_or_none()

            if not account_with_tokens or not account_with_tokens.tokens:
                raise ValueError(f"No token found for platform: {platform}")

            access_token = account_with_tokens.tokens[0].access_token
            platform_user_id = account_with_tokens.platform_user_id

            # ── 2. Token refresh (lazy, at publish time) ─────────────
            token_obj = account_with_tokens.tokens[0]
            from datetime import datetime, timezone, timedelta
            
            now_utc = datetime.now(timezone.utc)
            expires_at = token_obj.expires_at
            if expires_at and expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)

            if platform == "tiktok":
                is_expired = False
                if expires_at and expires_at <= now_utc + timedelta(minutes=5):
                    is_expired = True

                if is_expired and token_obj.refresh_token:
                    logger.info("TikTok access token is expired or close to expiration. Refreshing...")
                    try:
                        # Use the account's own app credentials if available,
                        # otherwise fall back to global settings (Phase 4 prep).
                        client_key = None
                        client_secret = None
                        if account_with_tokens.app_credential:
                            client_key = account_with_tokens.app_credential.app_id
                            client_secret = account_with_tokens.app_credential.app_secret

                        refresh_data = await service.refresh_tiktok_token(
                            token_obj.refresh_token,
                            client_key=client_key,
                            client_secret=client_secret,
                        )
                        tiktok_data = refresh_data.get("data", refresh_data)
                        new_access_token = tiktok_data.get("access_token")
                        new_expires_in = tiktok_data.get("expires_in")
                        new_refresh_token = tiktok_data.get("refresh_token")

                        if new_access_token:
                            token_obj.access_token = new_access_token
                            access_token = new_access_token
                            if new_expires_in:
                                token_obj.expires_at = datetime.now(timezone.utc) + timedelta(seconds=int(new_expires_in))
                            if new_refresh_token:
                                token_obj.refresh_token = new_refresh_token

                            # Mark the account as verified
                            account_with_tokens.last_verified_at = datetime.now(timezone.utc)
                            account_with_tokens.status = "active"
                            account_with_tokens.last_error = None
                            await db.commit()
                            logger.info("TikTok access token refreshed successfully.")
                    except Exception as refresh_err:
                        logger.error(f"Failed to refresh TikTok token: {refresh_err}")
                        # Mark account as expired so the UI shows the right status
                        account_with_tokens.status = "expired"
                        account_with_tokens.last_error = str(refresh_err)[:500]
                        await db.commit()
                        raise refresh_err

            elif platform in ("facebook", "instagram"):
                is_expired = False
                if expires_at and expires_at <= now_utc + timedelta(days=2):
                    is_expired = True

                if is_expired:
                    logger.info(f"{platform.title()} access token is close to expiration. Extending...")
                    try:
                        client_key = None
                        client_secret = None
                        if account_with_tokens.app_credential:
                            client_key = account_with_tokens.app_credential.app_id
                            client_secret = account_with_tokens.app_credential.app_secret

                        refresh_data = await service.extend_meta_token(
                            token_obj.access_token,
                            client_id=client_key,
                            client_secret=client_secret,
                        )
                        new_access_token = refresh_data.get("access_token")
                        new_expires_in = refresh_data.get("expires_in")
                        
                        if new_access_token:
                            token_obj.access_token = new_access_token
                            access_token = new_access_token
                            if new_expires_in:
                                token_obj.expires_at = datetime.now(timezone.utc) + timedelta(seconds=int(new_expires_in))
                            
                            account_with_tokens.last_verified_at = datetime.now(timezone.utc)
                            account_with_tokens.status = "active"
                            account_with_tokens.last_error = None
                            await db.commit()
                            logger.info(f"{platform.title()} access token extended successfully.")
                    except Exception as refresh_err:
                        logger.error(f"Failed to extend {platform.title()} token: {refresh_err}")
                        account_with_tokens.status = "expired"
                        account_with_tokens.last_error = str(refresh_err)[:500]
                        await db.commit()
                        raise refresh_err

            # ── 3. Publish to the specific platform ─────────────────────────
            if platform == "facebook":
                publish_result = await service.publish_to_meta(
                    access_token, local_path, caption
                )
                platform_post_id = publish_result.get("id")

            elif platform == "instagram":
                if not platform_user_id:
                    raise ValueError(
                        "Instagram Business Account ID not found. "
                        "Please reconnect your Instagram account."
                    )

                # Instagram requires a public HTTPS URL. We derive it from our ngrok base url
                base_url = settings.META_REDIRECT_URI.split("/api/v1")[0]

                # local_path could be 'uploads/...' or '/uploads/...'. Make sure it's absolute for the URL.
                path_part = local_path if local_path.startswith("/") else f"/{local_path}"
                public_image_url = f"{base_url}{path_part}"

                publish_result = await service.publish_to_instagram(
                    access_token, public_image_url, caption, platform_user_id
                )
                platform_post_id = publish_result.get("id")

            elif platform == "tiktok":
                # TikTok requires strictly 9:16 aspect ratio (1080x1920) for best compatibility
                try:
                    from PIL import Image, ImageOps
                    abs_path = f"/app/{local_path}" if not local_path.startswith("/app") else local_path
                    import os
                    if not os.path.exists(abs_path):
                        abs_path = os.path.join(os.getcwd(), local_path.lstrip("/"))
                    if os.path.exists(abs_path):
                        img = Image.open(abs_path)
                        rgb_im = img.convert('RGB')

                        # Strictly resize and crop to 1080x1920 (9:16)
                        target_size = (1080, 1920)
                        rgb_im = ImageOps.fit(rgb_im, target_size, Image.Resampling.LANCZOS)

                        new_abs_path = abs_path.rsplit(".", 1)[0] + ".tiktok.jpg"
                        rgb_im.save(new_abs_path, quality=90)
                        local_path = local_path.rsplit(".", 1)[0] + ".tiktok.jpg"
                except Exception as e:
                    print(f"Failed to process image for TikTok: {e}")

                # TikTok requires a public HTTPS URL for photos (PULL_FROM_URL)
                base_url = settings.TIKTOK_REDIRECT_URI.split("/api/v1")[0]
                path_part = local_path if local_path.startswith("/") else f"/{local_path}"
                public_image_url = f"{base_url}{path_part}"

                publish_result = await service.publish_to_tiktok(
                    access_token, local_path, caption, public_image_url
                )
                platform_post_id = publish_result.get("platform_post_id")

            else:
                raise ValueError(f"Invalid platform: {platform}")

            # ── 4. Update post status to success ────────────────────────────
            from datetime import datetime, timezone
            account_with_tokens.last_verified_at = datetime.now(timezone.utc)
            await crud.update_social_post_status(
                db, post_id, status="success", platform_post_id=platform_post_id
            )

            return {"status": "success", "platform_post_id": platform_post_id}

        except Exception as e:
            logger.error(f"Social publish failed for {platform}: {e}")

            # ── Differentiated error handling ───────────────────────────────
            # Auth errors (401, revoked token) → mark account, do NOT retry
            if _is_auth_error(e):
                try:
                    status_val = "revoked" if "revok" in str(e).lower() else "expired"
                    account_with_tokens.status = status_val
                    account_with_tokens.last_error = str(e)[:500]
                    await db.commit()
                except Exception:
                    pass  # best-effort status update
                # Update post as permanently failed
                await crud.update_social_post_status(
                    db, post_id, status="failed", error_message=str(e)
                )
                # Raise WITHOUT triggering Celery retry
                raise ValueError(f"Permanent auth error (not retrying): {e}") from e

            # All other errors → update post status and let Celery retry
            await crud.update_social_post_status(
                db, post_id, status="failed", error_message=str(e)
            )
            raise e


@celery_app.task(
    name="social.publish",
    bind=True,
    max_retries=3,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=600,
)
def publish_to_social_task(
    self,
    post_id_str: str,
    user_id_str: str,
    platform: str,
    local_path: str,
    caption: str,
    is_ai_generated: bool = False,
    # ── Retrocompatible: new param is optional (decision #6) ─────────────
    account_id_str: str | None = None,
):
    """
    Celery task to publish content to social platforms in the background.

    Accepts account_id_str for multi-account resolution. When absent
    (in-flight messages from pre-update code), falls back to resolving
    the default account for (user_id, platform).
    """
    loop = celery_app._worker_loop
    engine = create_async_engine(settings.DATABASE_URL, connect_args=get_connect_args(settings.DATABASE_URL))

    try:
        loop.run_until_complete(
            _publish_async(
                engine, post_id_str, user_id_str, platform,
                local_path, caption, is_ai_generated,
                account_id_str=account_id_str,
            )
        )
    except ValueError as ve:
        # Permanent errors (auth failures) — do NOT retry
        logger.error(f"Permanent publish failure: {ve}")
        return
    except Exception as exc:
        raise self.retry(exc=exc, countdown=10)
    finally:
        loop.run_until_complete(engine.dispose())


# ── Phase 4.3: Background Token Refresh (WRITTEN BUT INACTIVE) ──────────────
#
# The following task is designed to periodically sweep the database for tokens
# that are expiring soon and refresh them before they die. 
#
# DO NOT ACTIVATE THIS YET. In the current production environment (Render),
# there is NO Celery worker deployed, only Redis. We rely on lazy refresh 
# at publish time (above). If we add a worker in the future, uncomment this 
# and the corresponding beat_schedule in celery_app.py.
#
# @celery_app.task(name="social.refresh_expiring_tokens")
# def refresh_expiring_tokens_task():
#     """
#     Find tokens expiring in < 3 days and refresh them.
#     """
#     loop = celery_app._worker_loop
#     engine = create_async_engine(settings.DATABASE_URL, connect_args=get_connect_args(settings.DATABASE_URL))
#
#     async def _refresh_batch():
#         from sqlalchemy.orm import selectinload
#         from sqlalchemy.future import select
#         from datetime import datetime, timezone, timedelta
#         from app.modules.social.models import SocialAccount
#         
#         async with AsyncSession(engine) as db:
#             now_utc = datetime.now(timezone.utc)
#             threshold = now_utc + timedelta(days=3)
#
#             # Fetch all active accounts with tokens that expire before threshold
#             # Needs a proper join with SocialToken to check expiration
#             # ... logic to refresh each token ...
#             pass
#
#     try:
#         loop.run_until_complete(_refresh_batch())
#     except Exception as exc:
#         logger.error(f"Failed to run periodic token refresh: {exc}")
#     finally:
#         loop.run_until_complete(engine.dispose())


"""
Servinow API — Social Module: Celery Tasks.

Background task for publishing content to social media platforms.
Supports Facebook, Instagram, and TikTok.
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

async def _publish_async(
    engine,
    post_id_str: str,
    user_id_str: str,
    platform: str,
    local_path: str,
    caption: str,
    is_ai_generated: bool = False,
):
    post_id = uuid.UUID(post_id_str)
    user_id = uuid.UUID(user_id_str)
    
    local_session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with local_session_factory() as db:
        try:
            # 1. Get the account with tokens eagerly loaded
            from sqlalchemy.future import select
            from sqlalchemy.orm import selectinload
            from app.modules.social.models import SocialAccount

            result = await db.execute(
                select(SocialAccount)
                .options(selectinload(SocialAccount.tokens))
                .where(
                    SocialAccount.user_id == user_id,
                    SocialAccount.platform == platform,
                )
            )
            account_with_tokens = result.scalar_one_or_none()

            if not account_with_tokens or not account_with_tokens.tokens:
                raise ValueError(f"No token found for platform: {platform}")

            access_token = account_with_tokens.tokens[0].access_token
            platform_user_id = account_with_tokens.platform_user_id

            if platform == "tiktok":
                token_obj = account_with_tokens.tokens[0]
                from datetime import datetime, timezone, timedelta
                is_expired = False
                if token_obj.expires_at:
                    now_utc = datetime.now(timezone.utc)
                    expires_at = token_obj.expires_at
                    if expires_at.tzinfo is None:
                        expires_at = expires_at.replace(tzinfo=timezone.utc)
                    if expires_at <= now_utc + timedelta(minutes=5):
                        is_expired = True

                if is_expired and token_obj.refresh_token:
                    logger.info("TikTok access token is expired or close to expiration. Refreshing...")
                    try:
                        refresh_data = await service.refresh_tiktok_token(token_obj.refresh_token)
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

                            await db.commit()
                            logger.info("TikTok access token refreshed successfully.")
                    except Exception as refresh_err:
                        logger.error(f"Failed to refresh TikTok token: {refresh_err}")
                        raise refresh_err

            # 2. Publish to the specific platform
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

            # 3. Update post status to success
            await crud.update_social_post_status(
                db, post_id, status="success", platform_post_id=platform_post_id
            )

            return {"status": "success", "platform_post_id": platform_post_id}

        except Exception as e:
            logger.error(f"Social publish failed for {platform}: {e}")
            # Update post status to failed
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
):
    """
    Celery task to publish content to social platforms in the background.
    """
    loop = celery_app._worker_loop
    engine = create_async_engine(settings.DATABASE_URL, connect_args=get_connect_args(settings.DATABASE_URL))

    try:
        loop.run_until_complete(
            _publish_async(engine, post_id_str, user_id_str, platform, local_path, caption, is_ai_generated)
        )
    except Exception as exc:
        raise self.retry(exc=exc, countdown=10)
    finally:
        loop.run_until_complete(engine.dispose())

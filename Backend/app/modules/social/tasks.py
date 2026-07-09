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

async def _publish_async(
    post_id_str: str,
    user_id_str: str,
    platform: str,
    local_path: str,
    caption: str,
):
    post_id = uuid.UUID(post_id_str)
    user_id = uuid.UUID(user_id_str)
    
    # Create a local engine and session factory bound to this specific asyncio event loop
    engine = create_async_engine(settings.DATABASE_URL)
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
        finally:
            await engine.dispose()


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
):
    """
    Celery task to publish content to social platforms in the background.
    """
    return asyncio.run(
        _publish_async(post_id_str, user_id_str, platform, local_path, caption)
    )

"""
DonApp API — Social Module: Service Layer.

Handles OAuth token exchange and content publishing for
Facebook, Instagram, and TikTok platforms.
"""

import asyncio
import os
import logging

import httpx
from fastapi import HTTPException

from app.core.config import settings

logger = logging.getLogger(__name__)


# ── OAuth Token Exchange ────────────────────────────────────────────────────


async def exchange_meta_code(code: str, redirect_uri: str) -> dict:
    """Exchange a Meta OAuth code for a long-lived access token."""
    async with httpx.AsyncClient(timeout=60.0) as client:
        # 1. Exchange code for short-lived token
        response = await client.get(
            f"https://graph.facebook.com/{settings.META_API_VERSION}/oauth/access_token",
            params={
                "client_id": settings.META_APP_ID,
                "redirect_uri": redirect_uri,
                "client_secret": settings.META_APP_SECRET,
                "code": code,
            },
        )
        data = response.json()
        if "error" in data:
            raise HTTPException(
                status_code=400,
                detail=f"Meta OAuth error: {data['error'].get('message')}",
            )

        short_lived_token = data["access_token"]

        # 2. Exchange short-lived token for long-lived token
        long_response = await client.get(
            f"https://graph.facebook.com/{settings.META_API_VERSION}/oauth/access_token",
            params={
                "grant_type": "fb_exchange_token",
                "client_id": settings.META_APP_ID,
                "client_secret": settings.META_APP_SECRET,
                "fb_exchange_token": short_lived_token,
            },
        )
        long_data = long_response.json()
        if "error" in long_data:
            logger.warning("Failed to upgrade to long-lived token, falling back to short-lived")
            return data  # fallback to short-lived if upgrade fails
        return long_data


async def extend_meta_token(
    access_token: str,
    client_id: str | None = None,
    client_secret: str | None = None,
) -> dict:
    """Extend a Meta long-lived access token.
    
    When *client_id* / *client_secret* are provided (manual-credential accounts),
    they are used instead of the global settings.
    """
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.get(
            f"https://graph.facebook.com/{settings.META_API_VERSION}/oauth/access_token",
            params={
                "grant_type": "fb_exchange_token",
                "client_id": client_id or settings.META_APP_ID,
                "client_secret": client_secret or settings.META_APP_SECRET,
                "fb_exchange_token": access_token,
            },
        )
        data = response.json()
        if "error" in data:
            raise ValueError(f"Meta OAuth error (extend token): {data['error'].get('message')}")
        return data



async def exchange_tiktok_code(code: str, redirect_uri: str, client_key: str | None = None, client_secret: str | None = None) -> dict:
    """Exchange a TikTok OAuth code for an access token."""
    ckey = client_key or settings.TIKTOK_CLIENT_KEY
    csecret = client_secret or settings.TIKTOK_CLIENT_SECRET
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            "https://open.tiktokapis.com/v2/oauth/token/",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            data={
                "client_key": ckey,
                "client_secret": csecret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
            },
        )
        data = response.json()
        if data.get("error", "") and data["error"] != "ok":
            raise HTTPException(
                status_code=400,
                detail=f"TikTok OAuth error: {data.get('error_description', data)}",
            )
        return data


# ── Content Publishing ──────────────────────────────────────────────────────


async def publish_to_meta(access_token: str, local_image_paths: str | list, caption: str, is_ai_generated: bool = False) -> dict:
    """
    Publish a photo (or carousel) to a Facebook Page.

    - Single image: uses /{page_id}/photos with direct file upload (existing behaviour).
    - Multiple images: creates carousel containers (is_carousel_item=true) then
      posts a feed entry with attached_media referencing all containers.

    Facebook Photos API accepts direct file upload — no Cloudinary needed.
    """
    # Normalise to list
    if isinstance(local_image_paths, str):
        paths = [local_image_paths]
    else:
        paths = list(local_image_paths)

    # Validate all files exist first
    abs_paths = []
    for p in paths:
        ap = os.path.abspath(p)
        if not os.path.exists(ap):
            raise HTTPException(status_code=400, detail=f"Local image file not found: {ap}")
        abs_paths.append(ap)

    async with httpx.AsyncClient(timeout=60.0) as client:
        # Get the user's page(s)
        me_resp = await client.get(
            f"https://graph.facebook.com/{settings.META_API_VERSION}/me/accounts",
            params={
                "access_token": access_token,
                "fields": "id,name,access_token",
            },
        )
        me_data = me_resp.json()
        if "error" in me_data or not me_data.get("data"):
            raise HTTPException(
                status_code=400,
                detail=f"Meta API error (get accounts): {me_data.get('error', 'No pages found')}",
            )

        page = me_data["data"][0]
        page_id = page["id"]
        page_access_token = page.get("access_token", access_token)

        logger.info(f"Publishing to Meta Page {page_id}. Images: {len(abs_paths)}. AI Generated: {is_ai_generated}")

        if len(abs_paths) == 1:
            # ── Single image: existing flow ────────────────────────────────
            with open(abs_paths[0], "rb") as f:
                post_resp = await client.post(
                    f"https://graph.facebook.com/{settings.META_API_VERSION}/{page_id}/photos",
                    data={
                        "message": caption,
                        "access_token": page_access_token,
                    },
                    files={"source": f},
                )
            post_data = post_resp.json()
            if "error" in post_data:
                raise HTTPException(
                    status_code=400,
                    detail=f"Meta API error (publish): {post_data['error'].get('message')}",
                )
            return post_data

        else:
            # ── Multi-image carousel: upload each as unpublished, then feed post ──
            media_fbids = []
            for ap in abs_paths:
                with open(ap, "rb") as f:
                    photo_resp = await client.post(
                        f"https://graph.facebook.com/{settings.META_API_VERSION}/{page_id}/photos",
                        data={
                            "published": "false",
                            "is_carousel_item": "true",
                            "access_token": page_access_token,
                        },
                        files={"source": f},
                    )
                photo_data = photo_resp.json()
                if "error" in photo_data:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Meta API error (carousel upload): {photo_data['error'].get('message')}",
                    )
                media_fbids.append({"media_fbid": photo_data["id"]})
                logger.info(f"Uploaded carousel item: {photo_data['id']}")

            # Create the feed post attaching all carousel items
            feed_resp = await client.post(
                f"https://graph.facebook.com/{settings.META_API_VERSION}/{page_id}/feed",
                data={
                    "message": caption,
                    "access_token": page_access_token,
                    "attached_media": str(media_fbids).replace("'", '"'),
                },
            )
            feed_data = feed_resp.json()
            if "error" in feed_data:
                raise HTTPException(
                    status_code=400,
                    detail=f"Meta API error (carousel feed post): {feed_data['error'].get('message')}",
                )
            return feed_data


async def publish_to_instagram(access_token: str, image_url: str | list, caption: str, ig_user_id: str, is_ai_generated: bool = False) -> dict:
    """
    Publish a photo (or carousel) to Instagram using the Instagram Graph API.

    IMPORTANT: Instagram requires publicly accessible HTTPS URLs for images.

    - Single image: 2-step process (create container → media_publish) — existing behaviour.
    - Multiple images: carousel — create N item containers (is_carousel_item=true),
      create a CAROUSEL container referencing all of them, then media_publish.

    Args:
        access_token: Page/user access token with instagram_content_publish scope.
        image_url: A public HTTPS URL (str) or list of URLs for carousel.
        caption: The post caption.
        ig_user_id: The Instagram Business Account ID.
    """
    # Normalise to list
    if isinstance(image_url, str):
        image_urls = [image_url]
    else:
        image_urls = list(image_url)

    async with httpx.AsyncClient(timeout=60.0) as client:
        logger.info(f"Publishing to Instagram {ig_user_id}. Images: {len(image_urls)}. AI Generated: {is_ai_generated}")

        if len(image_urls) == 1:
            # ── Single image: existing 2-step flow ────────────────────────
            container_resp = await client.post(
                f"https://graph.facebook.com/{settings.META_API_VERSION}/{ig_user_id}/media",
                data={
                    "image_url": image_urls[0],
                    "caption": caption,
                    "access_token": access_token,
                },
            )
            container_data = container_resp.json()
            if "error" in container_data:
                raise HTTPException(
                    status_code=400,
                    detail=f"Instagram API error (create container): {container_data['error'].get('message')}",
                )

            creation_id = container_data.get("id")
            if not creation_id:
                raise HTTPException(
                    status_code=400,
                    detail="Instagram API error: no creation_id returned",
                )

            publish_resp = await client.post(
                f"https://graph.facebook.com/{settings.META_API_VERSION}/{ig_user_id}/media_publish",
                data={
                    "creation_id": creation_id,
                    "access_token": access_token,
                },
            )
            publish_data = publish_resp.json()
            if "error" in publish_data:
                raise HTTPException(
                    status_code=400,
                    detail=f"Instagram API error (publish): {publish_data['error'].get('message')}",
                )
            return publish_data

        else:
            # ── Multi-image carousel ──────────────────────────────────────
            # Step 1: Create a media container for each image (is_carousel_item=true)
            child_ids = []
            for url in image_urls:
                item_resp = await client.post(
                    f"https://graph.facebook.com/{settings.META_API_VERSION}/{ig_user_id}/media",
                    data={
                        "image_url": url,
                        "is_carousel_item": "true",
                        "access_token": access_token,
                    },
                )
                item_data = item_resp.json()
                if "error" in item_data:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Instagram API error (carousel item): {item_data['error'].get('message')}",
                    )
                child_id = item_data.get("id")
                if not child_id:
                    raise HTTPException(
                        status_code=400,
                        detail="Instagram API error: no id returned for carousel item",
                    )
                child_ids.append(child_id)
                logger.info(f"Created IG carousel item: {child_id}")

            # Step 2: Create the CAROUSEL container
            carousel_resp = await client.post(
                f"https://graph.facebook.com/{settings.META_API_VERSION}/{ig_user_id}/media",
                data={
                    "media_type": "CAROUSEL",
                    "children": ",".join(child_ids),
                    "caption": caption,
                    "access_token": access_token,
                },
            )
            carousel_data = carousel_resp.json()
            if "error" in carousel_data:
                raise HTTPException(
                    status_code=400,
                    detail=f"Instagram API error (carousel container): {carousel_data['error'].get('message')}",
                )

            carousel_id = carousel_data.get("id")
            if not carousel_id:
                raise HTTPException(
                    status_code=400,
                    detail="Instagram API error: no carousel container id returned",
                )

            # Step 3: Publish the carousel
            publish_resp = await client.post(
                f"https://graph.facebook.com/{settings.META_API_VERSION}/{ig_user_id}/media_publish",
                data={
                    "creation_id": carousel_id,
                    "access_token": access_token,
                },
            )
            publish_data = publish_resp.json()
            if "error" in publish_data:
                raise HTTPException(
                    status_code=400,
                    detail=f"Instagram API error (carousel publish): {publish_data['error'].get('message')}",
                )
            return publish_data


async def fetch_tiktok_publish_status(access_token: str, publish_id: str) -> dict:
    """Poll TikTok's publish status for an already-accepted publish_id.

    TikTok processes the publication asynchronously (it may still have to
    download the media from our public URL), so a 200 OK from the init call
    only means the request was accepted. This endpoint reports the real status.

    Documented statuses include: PROCESSING_DOWNLOAD, PROCESSING_UPLOAD,
    SEND_TO_USER_INBOX, PUBLISH_COMPLETE, FAILED (with fail_reason).

    Returns the `data` of the response. If the API itself reports an error
    (error.code != "ok"), the error info is propagated in the returned dict
    instead of raising, so the caller can decide whether to keep polling.
    """
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            "https://open.tiktokapis.com/v2/post/publish/status/fetch/",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json; charset=UTF-8",
            },
            json={"publish_id": publish_id},
        )
        payload = resp.json()
        error_info = payload.get("error", {})
        if error_info.get("code", "ok") != "ok":
            return {"status": "API_ERROR", "error": error_info, "data": payload.get("data", {})}
        return payload.get("data", {})


async def _poll_tiktok_publish(access_token: str, publish_id: str, max_attempts: int = 5, sleep_seconds: float = 3.0) -> dict:
    """Poll TikTok until the publication resolves, or return 'processing'.

    - PUBLISH_COMPLETE -> {"status": "success", "platform_post_id": publish_id}
    - FAILED           -> raises HTTPException(400) with the fail_reason
    - Timeout          -> {"status": "processing", "platform_post_id": publish_id}
      (TikTok may still be processing after our polling window)
    """
    for attempt in range(max_attempts):
        status_data = await fetch_tiktok_publish_status(access_token, publish_id)
        status = status_data.get("status")
        if status == "PUBLISH_COMPLETE":
            return {"status": "success", "platform_post_id": publish_id}
        if status == "FAILED":
            fail_reason = status_data.get("fail_reason") or status_data
            raise HTTPException(
                status_code=400,
                detail=f"TikTok no completó la publicación: {fail_reason}",
            )
        if attempt < max_attempts - 1:
            await asyncio.sleep(sleep_seconds)
    return {"status": "processing", "platform_post_id": publish_id}


async def publish_to_tiktok(access_token: str, local_image_path: str, caption: str, public_image_url: str = None, is_ai_generated: bool = False) -> dict:
    """
    Publish a photo or video to TikTok using the Content Posting API.
    """
    abs_path = os.path.abspath(local_image_path)
    if not os.path.exists(abs_path):
        raise HTTPException(status_code=400, detail=f"Local image file not found: {abs_path}")

    file_size = os.path.getsize(abs_path)
    ext = os.path.splitext(abs_path)[1].lower()
    is_video = ext in (".mp4", ".webm", ".mov", ".avi")

    async with httpx.AsyncClient(timeout=60.0) as client:
        if is_video:
            # Video upload flow
            logger.info(f"Publishing Video to TikTok. AI Generated: {is_ai_generated}")
            init_resp = await client.post(
                "https://open.tiktokapis.com/v2/post/publish/video/init/",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json; charset=UTF-8",
                },
                json={
                    "post_info": {
                        "title": caption,
                        "privacy_level": "SELF_ONLY",
                        "disable_duet": False,
                        "disable_comment": False,
                        "disable_stitch": False,
                        "aigc_info": {"aigc_label_type": "AIGC_GENERATED"} if is_ai_generated else {}
                    },
                    "source_info": {
                        "source": "FILE_UPLOAD",
                        "video_size": file_size,
                        "chunk_size": file_size,
                        "total_chunk_count": 1,
                    },
                },
            )
            init_data = init_resp.json()
            if init_data.get("error", {}).get("code", "ok") != "ok":
                raise HTTPException(
                    status_code=400,
                    detail=f"TikTok API error (video init): {init_data.get('error', {}).get('message', init_data)}",
                )

            upload_url = init_data["data"]["upload_url"]

            with open(abs_path, "rb") as f:
                upload_resp = await client.put(
                    upload_url,
                    headers={
                        "Content-Range": f"bytes 0-{file_size - 1}/{file_size}",
                        "Content-Type": "video/mp4",
                    },
                    content=f.read(),
                )

            if upload_resp.status_code not in (200, 201):
                raise HTTPException(
                    status_code=400,
                    detail=f"TikTok API error (video upload): {upload_resp.text}",
                )

            publish_id = init_data["data"].get("publish_id")
            return await _poll_tiktok_publish(access_token, publish_id)

        else:
            # Photo upload flow — TikTok Content Posting API for photos
            logger.info(f"Publishing Photo to TikTok. AI Generated: {is_ai_generated}")
            init_resp = await client.post(
                "https://open.tiktokapis.com/v2/post/publish/content/init/",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json; charset=UTF-8",
                },
                json={
                    "post_info": {
                        "title": caption[:80] + "..." if len(caption) > 80 else caption,
                        "description": caption,
                        "privacy_level": "SELF_ONLY",
                        "aigc_info": {"aigc_label_type": "AIGC_GENERATED"} if is_ai_generated else {}
                    },
                    "source_info": {
                        "source": "PULL_FROM_URL",
                        "photo_images": [public_image_url] if public_image_url else []
                    },
                    "post_mode": "DIRECT_POST",
                    "media_type": "PHOTO",
                },
            )
            init_data = init_resp.json()
            error_info = init_data.get("error", {})
            if error_info.get("code", "ok") != "ok":
                raise HTTPException(
                    status_code=400,
                    detail=f"TikTok API error (photo init): {error_info.get('message', init_data)}",
                )

            publish_id = init_data.get("data", {}).get("publish_id")
            return await _poll_tiktok_publish(access_token, publish_id)


async def refresh_tiktok_token(
    refresh_token: str,
    client_key: str | None = None,
    client_secret: str | None = None,
) -> dict:
    """Refresh a TikTok access token using the refresh token.

    When *client_key* / *client_secret* are provided (manual-credential accounts),
    they are used instead of the global settings.  Falls back to
    ``settings.TIKTOK_CLIENT_KEY`` / ``settings.TIKTOK_CLIENT_SECRET`` otherwise.
    """
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            "https://open.tiktokapis.com/v2/oauth/token/",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            data={
                "client_key": client_key or settings.TIKTOK_CLIENT_KEY,
                "client_secret": client_secret or settings.TIKTOK_CLIENT_SECRET,
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
            },
        )
        data = response.json()
        if data.get("error", "") and data["error"] != "ok":
            raise HTTPException(
                status_code=400,
                detail=f"TikTok OAuth refresh error: {data.get('error_description', data)}",
            )
        return data


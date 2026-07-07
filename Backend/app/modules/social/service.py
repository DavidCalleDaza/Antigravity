import httpx
from app.core.config import settings

async def post_to_meta(access_token: str, platform_user_id: str, caption: str, media_url: str | None) -> dict:
    # Basic implementation using Meta Graph API
    # Since we need to post to a Page or Instagram, this is a simplified version.
    # A robust version requires Page Access Tokens or Instagram Business Account IDs.
    async with httpx.AsyncClient() as client:
        if media_url:
            response = await client.post(
                f"https://graph.facebook.com/v19.0/{platform_user_id}/photos",
                data={
                    "url": media_url,
                    "caption": caption,
                    "access_token": access_token
                }
            )
        else:
            response = await client.post(
                f"https://graph.facebook.com/v19.0/{platform_user_id}/feed",
                data={
                    "message": caption,
                    "access_token": access_token
                }
            )
        response.raise_for_status()
        return response.json()

async def post_to_tiktok(access_token: str, caption: str, media_url: str) -> dict:
    # Simplified TikTok Direct Post API
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://open.tiktokapis.com/v2/post/publish/inbox/video/init/",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json; charset=UTF-8"
            },
            json={
                "source_info": {
                    "source": "PULL_FROM_URL",
                    "video_url": media_url
                },
                "post_info": {
                    "title": caption,
                    "privacy_level": "PUBLIC_TO_EVERYONE",
                    "disable_duet": False,
                    "disable_comment": False,
                    "disable_stitch": False
                }
            }
        )
        response.raise_for_status()
        return response.json()

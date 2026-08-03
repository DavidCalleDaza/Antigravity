import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import httpx
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.modules.social.models import SocialAppCredential, SocialAccount, SocialToken
from app.core.config import settings

async def save_manual_credentials(
    db: AsyncSession,
    target_user_id: uuid.UUID,
    acting_user_id: uuid.UUID,
    platform_group: str,
    app_id: str,
    app_secret: Optional[str],
    access_token: str,
) -> Dict[str, Any]:
    """
    1. Validate token against the real API.
    2. Save/update SocialAppCredential.
    3. Return accounts list (for Meta) or success (for TikTok).
    """
    
    if platform_group not in ("meta", "tiktok"):
        raise HTTPException(status_code=400, detail="Invalid platform group")

    # Si no mandaron app_secret, reusa el guardado de una conexión anterior
    if not app_secret:
        existing_cred_result = await db.execute(
            select(SocialAppCredential).where(
                SocialAppCredential.user_id == target_user_id,
                SocialAppCredential.platform_group == platform_group,
            )
        )
        existing_cred = existing_cred_result.scalar_one_or_none()
        if not existing_cred:
            raise HTTPException(
                status_code=400,
                detail="Debes ingresar el App Secret la primera vez que conectas esta plataforma."
            )
        app_secret = existing_cred.app_secret

    accounts_data = []

    async with httpx.AsyncClient(timeout=60.0) as client:
        if platform_group == "meta":
            # 1. Validate with debug_token
            debug_resp = await client.get(
                f"https://graph.facebook.com/{settings.META_API_VERSION}/debug_token",
                params={
                    "input_token": access_token,
                    "access_token": f"{app_id}|{app_secret}"
                }
            )
            debug_data = debug_resp.json()
            if "error" in debug_data:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Meta Token Validation Error: {debug_data['error'].get('message', 'Invalid App ID or Secret')}"
                )
                
            token_info = debug_data.get("data", {})
            if not token_info.get("is_valid"):
                err_msg = token_info.get("error", {}).get("message", "Invalid access token")
                raise HTTPException(status_code=400, detail=f"Invalid Meta Token: {err_msg}")
                
            # 2. Get pages/accounts
            me_resp = await client.get(
                f"https://graph.facebook.com/{settings.META_API_VERSION}/me/accounts",
                params={
                    "access_token": access_token,
                    "fields": "id,name,instagram_business_account{id,username}",
                }
            )
            me_data = me_resp.json()
            if "error" in me_data:
                raise HTTPException(
                    status_code=400,
                    detail=f"Meta Accounts Fetch Error: {me_data['error'].get('message')}"
                )
                
            for page in me_data.get("data", []):
                accounts_data.append({
                    "id": page["id"],
                    "name": page.get("name"),
                    "platform": "facebook",
                    "type": "page",
                    "instagram_business_account": page.get("instagram_business_account")
                })
                
        elif platform_group == "tiktok":
            # TikTok validation via /user/info/
            user_resp = await client.get(
                "https://open.tiktokapis.com/v2/user/info/",
                headers={
                    "Authorization": f"Bearer {access_token}",
                },
                params={
                    "fields": "open_id,display_name"
                }
            )
            user_data = user_resp.json()
            error_info = user_data.get("error", {})
            if error_info.get("code", "ok") != "ok":
                raise HTTPException(
                    status_code=400,
                    detail=f"TikTok Token Validation Error: {error_info.get('message', 'Invalid access token')}"
                )
            
            tiktok_user = user_data.get("data", {}).get("user", {})
            accounts_data.append({
                "id": tiktok_user.get("open_id"),
                "name": tiktok_user.get("display_name"),
                "platform": "tiktok",
                "type": "account"
            })

    # Save/Update SocialAppCredential
    result = await db.execute(
        select(SocialAppCredential).where(
            SocialAppCredential.user_id == target_user_id,
            SocialAppCredential.platform_group == platform_group
        )
    )
    app_cred = result.scalar_one_or_none()
    
    if app_cred:
        app_cred.app_id = app_id
        app_cred.app_secret = app_secret
        app_cred.last_modified_by = acting_user_id
    else:
        app_cred = SocialAppCredential(
            user_id=target_user_id,
            platform_group=platform_group,
            app_id=app_id,
            app_secret=app_secret,
            last_modified_by=acting_user_id
        )
        db.add(app_cred)
        
    await db.commit()
    
    return {
        "status": "success",
        "platform_group": platform_group,
        "accounts": accounts_data
    }

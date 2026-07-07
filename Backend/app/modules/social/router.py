from fastapi import APIRouter, Depends, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.responses import JSONResponse, RedirectResponse

from app.db.session import get_db
from app.modules.auth.deps import get_current_user
from app.modules.auth.models import User
from app.modules.social.schemas import SocialAccountResponse, SocialPostResponse, SocialPostCreate
from app.modules.social import crud
from app.modules.social import service
from app.core.config import settings
import urllib.parse

router = APIRouter()

@router.get("/authorize/{platform}")
async def get_authorize_url(
    platform: str,
    current_user: User = Depends(get_current_user)
):
    """Return the OAuth authorization URL for the given platform."""
    if platform == "meta" or platform == "facebook" or platform == "instagram":
        url = (
            f"https://www.facebook.com/v19.0/dialog/oauth"
            f"?client_id={settings.META_APP_ID}"
            f"&redirect_uri={settings.META_REDIRECT_URI}"
            f"&state={current_user.id}"
            f"&scope=pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish"
        )
        return {"url": url}
    elif platform == "tiktok":
        url = (
            f"https://www.tiktok.com/v2/auth/authorize/"
            f"?client_key={settings.TIKTOK_CLIENT_KEY}"
            f"&response_type=code"
            f"&scope=user.info.basic,video.publish,video.upload"
            f"&redirect_uri={settings.TIKTOK_REDIRECT_URI}"
            f"&state={current_user.id}"
        )
        return {"url": url}
    return JSONResponse(status_code=400, content={"detail": "Plataforma no soportada"})

@router.get("/callback/{platform}")
async def oauth_callback(
    platform: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Handle OAuth callback and save the access token."""
    code = request.query_params.get("code")
    user_id = request.query_params.get("state")
    
    if not code or not user_id:
        return JSONResponse(status_code=400, content={"detail": "Falta código o estado (user_id)"})
    
    # En un entorno real, aquí se intercambiaría el 'code' por un 'access_token' real
    # mediante una petición HTTP al servidor de Meta o TikTok.
    # Para propósitos de este entorno, simularemos que el code es el token.
    access_token = f"simulated_token_{code[:10]}"
    
    await crud.create_or_update_social_account(
        db, user_id=user_id, platform=platform, data={"access_token": access_token}
    )
    
    # Redirigimos al frontend (a la página principal o donde estaba el usuario)
    return RedirectResponse(url="/")

@router.get("/accounts", response_model=list[SocialAccountResponse])
async def list_social_accounts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all connected social media accounts for the current user."""
    return await crud.get_social_accounts(db, current_user.id)

@router.post("/publish", response_model=SocialPostResponse, status_code=status.HTTP_201_CREATED)
async def publish_content(
    post_in: SocialPostCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new social media post (will be processed in background)."""
    return await crud.create_social_post(db, current_user.id, post_in)

@router.get("/posts", response_model=list[SocialPostResponse])
async def list_social_posts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get history of social media posts."""
    return await crud.get_social_posts(db, current_user.id)

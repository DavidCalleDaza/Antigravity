from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.modules.auth.deps import get_current_user
from app.modules.auth.models import User
from app.modules.social.schemas import SocialAccountResponse, SocialPostResponse, SocialPostCreate
from app.modules.social import crud

router = APIRouter()

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

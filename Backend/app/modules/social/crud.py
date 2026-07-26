from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import uuid
from typing import List, Optional

from .models import SocialAccount, SocialPost, SocialToken
from .schemas import SocialAccountCreate, SocialPostCreate


async def get_social_account(db: AsyncSession, user_id: uuid.UUID, platform: str) -> Optional[SocialAccount]:
    result = await db.execute(
        select(SocialAccount).where(
            SocialAccount.user_id == user_id,
            SocialAccount.platform == platform
        )
    )
    return result.scalar_one_or_none()

async def get_user_social_accounts(db: AsyncSession, user_id: uuid.UUID) -> List[SocialAccount]:
    result = await db.execute(
        select(SocialAccount).where(SocialAccount.user_id == user_id)
    )
    return list(result.scalars().all())

async def create_or_update_social_account(db: AsyncSession, user_id: uuid.UUID, account_in: SocialAccountCreate) -> SocialAccount:
    existing = await get_social_account(db, user_id, account_in.platform)
    account_data = account_in.model_dump(exclude={"access_token", "refresh_token", "expires_at"})
    
    if existing:
        for key, value in account_data.items():
            setattr(existing, key, value)
        db_account = existing
    else:
        db_account = SocialAccount(user_id=user_id, **account_data)
        db.add(db_account)
        await db.commit()
        await db.refresh(db_account)
    
    # Handle the token
    result = await db.execute(
        select(SocialToken).where(SocialToken.account_id == db_account.id)
    )
    existing_token = result.scalar_one_or_none()
    
    if existing_token:
        existing_token.access_token = account_in.access_token
        if account_in.refresh_token:
            existing_token.refresh_token = account_in.refresh_token
        if account_in.expires_at:
            existing_token.expires_at = account_in.expires_at
    else:
        new_token = SocialToken(
            account_id=db_account.id,
            platform=account_in.platform,
            access_token=account_in.access_token,
            refresh_token=account_in.refresh_token,
            expires_at=account_in.expires_at
        )
        db.add(new_token)
    
    await db.commit()
    await db.refresh(db_account)
    return db_account

async def delete_social_account(db: AsyncSession, user_id: uuid.UUID, platform: str) -> bool:
    account = await get_social_account(db, user_id, platform)
    if account:
        await db.delete(account)
        await db.commit()
        return True
    return False

async def create_social_post(db: AsyncSession, user_id: uuid.UUID, post_in: SocialPostCreate) -> SocialPost:
    db_post = SocialPost(user_id=user_id, **post_in.model_dump())
    db.add(db_post)
    await db.commit()
    await db.refresh(db_post)
    return db_post

async def update_social_post_status(
    db: AsyncSession, 
    post_id: uuid.UUID, 
    status: str, 
    platform_post_id: Optional[str] = None, 
    error_message: Optional[str] = None
) -> Optional[SocialPost]:
    result = await db.execute(select(SocialPost).where(SocialPost.id == post_id))
    post = result.scalar_one_or_none()
    if post:
        post.status = status
        if platform_post_id:
            post.platform_post_id = platform_post_id
        if error_message is not None:
            post.error_message = error_message
        await db.commit()
        await db.refresh(post)
    return post


async def get_social_post(db: AsyncSession, post_id: uuid.UUID, user_id: uuid.UUID) -> Optional[SocialPost]:
    """Get a specific social post by ID, scoped to the requesting user."""
    result = await db.execute(
        select(SocialPost).where(
            SocialPost.id == post_id,
            SocialPost.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()

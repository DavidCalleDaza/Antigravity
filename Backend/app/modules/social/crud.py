from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.social.models import SocialAccount, SocialPost, SocialPlatform
from app.modules.social.schemas import SocialPostCreate

async def get_social_accounts(db: AsyncSession, user_id: str) -> list[SocialAccount]:
    stmt = select(SocialAccount).where(SocialAccount.user_id == user_id)
    result = await db.execute(stmt)
    return list(result.scalars().all())

async def get_social_account_by_platform(db: AsyncSession, user_id: str, platform: SocialPlatform) -> SocialAccount | None:
    stmt = select(SocialAccount).where(
        SocialAccount.user_id == user_id,
        SocialAccount.platform == platform
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()

async def create_or_update_social_account(db: AsyncSession, user_id: str, platform: SocialPlatform, data: dict) -> SocialAccount:
    existing = await get_social_account_by_platform(db, user_id, platform)
    if existing:
        for key, value in data.items():
            setattr(existing, key, value)
        db_account = existing
    else:
        db_account = SocialAccount(user_id=user_id, platform=platform, **data)
        db.add(db_account)
    
    await db.commit()
    await db.refresh(db_account)
    return db_account

async def delete_social_account(db: AsyncSession, user_id: str, platform: SocialPlatform) -> bool:
    account = await get_social_account_by_platform(db, user_id, platform)
    if account:
        await db.delete(account)
        await db.commit()
        return True
    return False

async def create_social_post(db: AsyncSession, user_id: str, post_in: SocialPostCreate) -> SocialPost:
    db_post = SocialPost(user_id=user_id, **post_in.model_dump())
    db.add(db_post)
    await db.commit()
    await db.refresh(db_post)
    return db_post

async def get_social_posts(db: AsyncSession, user_id: str) -> list[SocialPost]:
    stmt = select(SocialPost).where(SocialPost.user_id == user_id).order_by(SocialPost.created_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())

"""
DonApp API — Social Module: CRUD Operations.

Multi-account aware: accounts are keyed by (user_id, platform, platform_user_id).
Each (user_id, platform) group has exactly one is_default account.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import asc
import uuid
from typing import List, Optional

from .models import SocialAccount, SocialPost, SocialToken
from .schemas import SocialAccountCreate, SocialPostCreate


# ═══════════════════════════════════════════════════════════════════════════════
# Account queries
# ═══════════════════════════════════════════════════════════════════════════════

async def get_default_account(
    db: AsyncSession, user_id: uuid.UUID, platform: str,
) -> Optional[SocialAccount]:
    """Return the default account for a (user, platform) pair, or None."""
    result = await db.execute(
        select(SocialAccount)
        .where(
            SocialAccount.user_id == user_id,
            SocialAccount.platform == platform,
            SocialAccount.is_default.is_(True),
        )
        .limit(1)
    )
    return result.scalar_one_or_none()


async def get_account_by_id(
    db: AsyncSession, account_id: uuid.UUID, user_id: uuid.UUID,
) -> Optional[SocialAccount]:
    """Fetch a single account by PK, scoped to the owning user."""
    result = await db.execute(
        select(SocialAccount).where(
            SocialAccount.id == account_id,
            SocialAccount.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


async def list_accounts(
    db: AsyncSession, user_id: uuid.UUID, platform: Optional[str] = None,
) -> List[SocialAccount]:
    """List all social accounts for a user, optionally filtered by platform."""
    stmt = select(SocialAccount).where(SocialAccount.user_id == user_id)
    if platform:
        stmt = stmt.where(SocialAccount.platform == platform)
    stmt = stmt.order_by(SocialAccount.platform, asc(SocialAccount.created_at))
    result = await db.execute(stmt)
    return list(result.scalars().all())


# ═══════════════════════════════════════════════════════════════════════════════
# Account mutations
# ═══════════════════════════════════════════════════════════════════════════════

async def create_or_update_social_account(
    db: AsyncSession,
    user_id: uuid.UUID,
    account_in: SocialAccountCreate,
) -> SocialAccount:
    """
    Create or update by (user_id, platform, platform_user_id).
    First account for a platform becomes is_default=True.
    """
    # Lookup by the new multi-account key
    existing: Optional[SocialAccount] = None
    if account_in.platform_user_id:
        result = await db.execute(
            select(SocialAccount).where(
                SocialAccount.user_id == user_id,
                SocialAccount.platform == account_in.platform,
                SocialAccount.platform_user_id == account_in.platform_user_id,
            )
        )
        existing = result.scalar_one_or_none()

    account_data = account_in.model_dump(
        exclude={"access_token", "refresh_token", "expires_at"}
    )

    # Determine if this is the first account for (user, platform)
    is_first = False
    if not existing:
        siblings = await db.execute(
            select(SocialAccount.id)
            .where(
                SocialAccount.user_id == user_id,
                SocialAccount.platform == account_in.platform,
            )
            .limit(1)
        )
        is_first = siblings.scalar_one_or_none() is None

    if existing:
        for key, value in account_data.items():
            if value is not None:
                setattr(existing, key, value)
        # Re-activate if reconnecting a previously expired/revoked account
        existing.status = "active"
        existing.last_error = None
        db_account = existing
    else:
        db_account = SocialAccount(
            user_id=user_id,
            is_default=is_first,  # First for this platform → default
            **account_data,
        )
        db.add(db_account)
        await db.commit()
        await db.refresh(db_account)

    # ── Handle the token ────────────────────────────────────────────────────
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
            expires_at=account_in.expires_at,
        )
        db.add(new_token)

    await db.commit()
    await db.refresh(db_account)
    return db_account


async def update_account(
    db: AsyncSession,
    account_id: uuid.UUID,
    user_id: uuid.UUID,
    **fields,
) -> Optional[SocialAccount]:
    """
    PATCH mutable fields on a social account.
    If is_default is set to True, demote the current default for the same platform.
    """
    account = await get_account_by_id(db, account_id, user_id)
    if not account:
        return None

    if fields.get("is_default") is True and not account.is_default:
        await _set_default(db, account)

    for key, value in fields.items():
        if key == "is_default":
            continue  # handled above
        if value is not None:
            setattr(account, key, value)

    await db.commit()
    await db.refresh(account)
    return account


async def set_default_account(
    db: AsyncSession, account_id: uuid.UUID, user_id: uuid.UUID,
) -> Optional[SocialAccount]:
    """Promote an account to default, demoting the previous one."""
    account = await get_account_by_id(db, account_id, user_id)
    if not account:
        return None
    await _set_default(db, account)
    await db.commit()
    await db.refresh(account)
    return account


async def _set_default(db: AsyncSession, account: SocialAccount) -> None:
    """Demote current default for the platform and promote *account*."""
    current_default = await get_default_account(db, account.user_id, account.platform)
    if current_default and current_default.id != account.id:
        current_default.is_default = False
    account.is_default = True


async def delete_account_by_id(
    db: AsyncSession, account_id: uuid.UUID, user_id: uuid.UUID,
) -> bool:
    """
    Delete a single account. If it was the default and siblings remain,
    promote the oldest sibling.
    """
    account = await get_account_by_id(db, account_id, user_id)
    if not account:
        return False

    was_default = account.is_default
    platform = account.platform

    await db.delete(account)
    await db.flush()  # flush to update relationships before re-querying

    if was_default:
        # Promote oldest remaining sibling
        result = await db.execute(
            select(SocialAccount)
            .where(
                SocialAccount.user_id == user_id,
                SocialAccount.platform == platform,
            )
            .order_by(asc(SocialAccount.created_at))
            .limit(1)
        )
        next_default = result.scalar_one_or_none()
        if next_default:
            next_default.is_default = True

    await db.commit()
    return True


async def delete_accounts_by_platform(
    db: AsyncSession, user_id: uuid.UUID, platform: str,
) -> bool:
    """
    Bulk-delete all accounts for (user, platform).
    Required by the frozen admin_social endpoint (decision #4).
    """
    result = await db.execute(
        select(SocialAccount).where(
            SocialAccount.user_id == user_id,
            SocialAccount.platform == platform,
        )
    )
    accounts = list(result.scalars().all())
    if not accounts:
        return False
    for acc in accounts:
        await db.delete(acc)
    await db.commit()
    return True


# ═══════════════════════════════════════════════════════════════════════════════
# Posts
# ═══════════════════════════════════════════════════════════════════════════════

async def create_social_post(
    db: AsyncSession,
    user_id: uuid.UUID,
    post_in: SocialPostCreate,
    account_id: Optional[uuid.UUID] = None,
) -> SocialPost:
    """Create a social post record, optionally linked to a specific account."""
    post_data = post_in.model_dump(exclude={"account_id"})
    db_post = SocialPost(user_id=user_id, account_id=account_id, **post_data)
    db.add(db_post)
    await db.commit()
    await db.refresh(db_post)
    return db_post


async def update_social_post_status(
    db: AsyncSession,
    post_id: uuid.UUID,
    status: str,
    platform_post_id: Optional[str] = None,
    error_message: Optional[str] = None,
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


async def get_social_post(
    db: AsyncSession, post_id: uuid.UUID, user_id: uuid.UUID,
) -> Optional[SocialPost]:
    """Get a specific social post by ID, scoped to the requesting user."""
    result = await db.execute(
        select(SocialPost).where(
            SocialPost.id == post_id,
            SocialPost.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()

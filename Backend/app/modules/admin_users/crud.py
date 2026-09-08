"""
DonApp API — Admin Users: CRUD Operations.
Database operations for searching, modifying, and managing users and roles.
"""

import os
import shutil
import uuid
from typing import Optional, Tuple, List
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import hash_password
from app.modules.auth.models import User
from app.modules.admin_users.schemas import (
    AdminUserCreateRequest,
    AdminUserUpdateRequest,
    AdminUserStatsResponse,
)


async def get_users_paginated(
    db: AsyncSession,
    search: Optional[str] = None,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    is_approved: Optional[bool] = None,
    skip: int = 0,
    limit: int = 50,
) -> Tuple[List[User], int]:
    """Retrieve filtered and paginated list of users along with total count."""
    base_conditions = []

    if search and search.strip():
        term = f"%{search.strip()}%"
        base_conditions.append(
            or_(
                User.full_name.ilike(term),
                User.email.ilike(term),
                User.business_name.ilike(term),
            )
        )

    if role and role.strip() and role.lower() != "all":
        base_conditions.append(User.role == role.strip().lower())

    if is_active is not None:
        base_conditions.append(User.is_active == is_active)

    if is_approved is not None:
        base_conditions.append(User.is_approved == is_approved)

    # Count Query
    count_stmt = select(func.count(User.id))
    if base_conditions:
        count_stmt = count_stmt.where(*base_conditions)
    total_res = await db.execute(count_stmt)
    total = total_res.scalar() or 0

    # Data Query
    stmt = (
        select(User)
        .options(selectinload(User.location))
        .order_by(User.created_at.desc())
    )
    if base_conditions:
        stmt = stmt.where(*base_conditions)

    stmt = stmt.offset(skip).limit(limit)
    result = await db.execute(stmt)
    users = list(result.scalars().all())

    return users, total


async def get_users_stats(db: AsyncSession) -> AdminUserStatsResponse:
    """Consolidated KPI counters for administrative overview."""
    total_stmt = select(func.count(User.id))
    admins_stmt = select(func.count(User.id)).where(User.role == "admin")
    sellers_stmt = select(func.count(User.id)).where(User.role == "seller")
    clients_stmt = select(func.count(User.id)).where(User.role == "client")
    active_stmt = select(func.count(User.id)).where(User.is_active == True) # noqa: E712
    inactive_stmt = select(func.count(User.id)).where(User.is_active == False) # noqa: E712
    pending_stmt = select(func.count(User.id)).where(User.is_approved == False) # noqa: E712

    total = (await db.execute(total_stmt)).scalar() or 0
    admins = (await db.execute(admins_stmt)).scalar() or 0
    sellers = (await db.execute(sellers_stmt)).scalar() or 0
    clients = (await db.execute(clients_stmt)).scalar() or 0
    active = (await db.execute(active_stmt)).scalar() or 0
    inactive = (await db.execute(inactive_stmt)).scalar() or 0
    pending = (await db.execute(pending_stmt)).scalar() or 0

    return AdminUserStatsResponse(
        total_users=total,
        total_admins=admins,
        total_sellers=sellers,
        total_clients=clients,
        total_active=active,
        total_inactive=inactive,
        total_pending_approval=pending,
    )


async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> Optional[User]:
    """Retrieve user by UUID."""
    stmt = select(User).options(selectinload(User.location)).where(User.id == user_id)
    res = await db.execute(stmt)
    return res.scalar_one_or_none()


async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    """Retrieve user by Email."""
    stmt = select(User).options(selectinload(User.location)).where(User.email == email.strip().lower())
    res = await db.execute(stmt)
    return res.scalar_one_or_none()


async def admin_create_user(db: AsyncSession, user_in: AdminUserCreateRequest) -> User:
    """Create a new user directly from admin."""
    new_user = User(
        email=user_in.email.strip().lower(),
        full_name=user_in.full_name.strip(),
        hashed_password=hash_password(user_in.password),
        role=user_in.role.strip().lower(),
        business_name=user_in.business_name.strip() if user_in.business_name else None,
        is_active=user_in.is_active,
        is_staff=user_in.is_staff or (user_in.role == "admin"),
        is_approved=user_in.is_approved,
        needs_onboarding=False,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user


async def admin_update_user(
    db: AsyncSession,
    user: User,
    user_in: AdminUserUpdateRequest,
) -> User:
    """Update user fields, role, permissions or password."""
    if user_in.email is not None and user_in.email.strip():
        user.email = user_in.email.strip().lower()

    if user_in.full_name is not None and user_in.full_name.strip():
        user.full_name = user_in.full_name.strip()

    if user_in.role is not None and user_in.role.strip():
        user.role = user_in.role.strip().lower()
        if user.role == "admin":
            user.is_staff = True

    if user_in.business_name is not None:
        user.business_name = user_in.business_name.strip() if user_in.business_name else None

    if user_in.is_active is not None:
        user.is_active = user_in.is_active

    if user_in.is_staff is not None:
        user.is_staff = user_in.is_staff

    if user_in.is_approved is not None:
        user.is_approved = user_in.is_approved
        if user_in.is_approved:
            user.activation_code = None

    if user_in.password and user_in.password.strip():
        user.hashed_password = hash_password(user_in.password.strip())

    await db.commit()
    await db.refresh(user)
    return user


async def admin_delete_user(db: AsyncSession, user: User, permanent: bool = False) -> None:
    """Delete or deactivate user."""
    if permanent:
        # Clean up avatar directory
        avatar_dir = os.path.join("uploads", "avatars", str(user.id))
        if os.path.exists(avatar_dir):
            shutil.rmtree(avatar_dir)

        await db.delete(user)
        await db.commit()
    else:
        user.is_active = False
        await db.commit()
        await db.refresh(user)


async def admin_bulk_delete_users(
    db: AsyncSession,
    user_ids: List[uuid.UUID],
    current_admin_id: uuid.UUID,
    permanent: bool = False,
) -> Tuple[int, int]:
    """Bulk delete or deactivate users, safeguarding the requesting admin's own ID."""
    valid_ids = [uid for uid in user_ids if uid != current_admin_id]
    skipped_count = len(user_ids) - len(valid_ids)

    if not valid_ids:
        return 0, skipped_count

    stmt = select(User).where(User.id.in_(valid_ids))
    result = await db.execute(stmt)
    users = list(result.scalars().all())

    if not users:
        return 0, skipped_count

    if permanent:
        for u in users:
            avatar_dir = os.path.join("uploads", "avatars", str(u.id))
            if os.path.exists(avatar_dir):
                shutil.rmtree(avatar_dir)
            await db.delete(u)
    else:
        for u in users:
            u.is_active = False

    await db.commit()
    return len(users), skipped_count

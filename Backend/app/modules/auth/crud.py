"""
Servinow API — Auth Module: CRUD Operations.

Provides async database operations for user management.
All functions receive an ``AsyncSession`` injected by FastAPI's
dependency system and return ORM model instances.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import hash_password
from app.modules.auth.models import User
from app.modules.auth.schemas import UserCreate, UserUpdateMe


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    """
    Retrieve a user by their email address.

    Args:
        db: Active async database session.
        email: Email address to search for (case-sensitive).

    Returns:
        The ``User`` instance if found, or ``None``.
    """
    stmt = select(User).options(selectinload(User.location)).where(User.email == email)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: str) -> User | None:
    """Retrieve a user by their UUID."""
    stmt = select(User).options(selectinload(User.location)).where(User.id == user_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_user(db: AsyncSession, user_in: UserCreate) -> User:
    """
    Create a new user in the database.

    The plain-text password from ``user_in`` is hashed before storage.
    After committing, the ORM instance is refreshed to load
    server-generated defaults (``id``, ``created_at``).

    Args:
        db: Active async database session.
        user_in: Validated registration payload.

    Returns:
        The newly created ``User`` instance with all fields populated.
    """
    db_user = User(
        email=user_in.email,
        hashed_password=hash_password(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role.value,
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user


async def update_user(db: AsyncSession, user: User, user_in: UserUpdateMe) -> User:
    """
    Update a user's profile fields.

    Args:
        db: Active async database session.
        user: The current user ORM instance.
        user_in: Validated update payload.

    Returns:
        The updated ``User`` instance.
    """
    update_data = user_in.model_dump(exclude_unset=True, exclude={"location"})
    for field, value in update_data.items():
        if value is not None:
            setattr(user, field, value)
            
    if user_in.location is not None:
        from app.modules.locations.models import Location
        if user.location:
            for k, v in user_in.location.model_dump(exclude_unset=True).items():
                setattr(user.location, k, v)
        else:
            user.location = Location(**user_in.location.model_dump())

    await db.commit()
    await db.refresh(user)
    return user


async def deactivate_user(db: AsyncSession, user: User) -> User:
    """
    Soft-deactivate a user account (is_active = False).

    Args:
        db: Active async database session.
        user: The user ORM instance to deactivate.

    Returns:
        The deactivated ``User`` instance.
    """
    user.is_active = False
    await db.commit()
    await db.refresh(user)
    return user


async def delete_user(db: AsyncSession, user: User) -> None:
    """
    Permanently delete a user from the database.

    Args:
        db: Active async database session.
        user: The user ORM instance to delete.
    """
    await db.delete(user)
    await db.commit()

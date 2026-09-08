"""
DonApp API — Auth Module: CRUD Operations.

Provides async database operations for user management.
All functions receive an ``AsyncSession`` injected by FastAPI's
dependency system and return ORM model instances.
"""

import logging
import os
import shutil

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import BadRequestException
from app.core.security import hash_password
from app.modules.auth.models import User
from app.modules.auth.schemas import UserCreate, UserRole, UserUpdateMe

logger = logging.getLogger(__name__)


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


async def create_user(
    db: AsyncSession,
    user_in: UserCreate,
    is_approved: bool = True,
    activation_code: str | None = None,
) -> User:
    """
    Create a new user in the database.

    The plain-text password from ``user_in`` is hashed before storage.
    After committing, the ORM instance is refreshed to load
    server-generated defaults (``id``, ``created_at``).

    Args:
        db: Active async database session.
        user_in: Validated registration payload.
        is_approved: Whether the user is approved/activated.
        activation_code: Secret code for first login validation.

    Returns:
        The newly created ``User`` instance with all fields populated.
    """
    role_val = user_in.role.value if hasattr(user_in.role, "value") else str(user_in.role)
    is_admin = role_val == "admin"
    db_user = User(
        email=user_in.email.strip().lower(),
        hashed_password=hash_password(user_in.password),
        full_name=user_in.full_name.strip(),
        role=role_val,
        is_staff=is_admin,
        is_approved=is_approved,
        activation_code=activation_code,
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
    if user_in.role is not None:
        if not user.needs_onboarding:
            raise BadRequestException(
                detail="No puedes cambiar tu rol una vez completado el registro."
            )
        if user_in.role not in (UserRole.CLIENT, UserRole.SELLER, UserRole.ADMIN):
            raise BadRequestException(detail="Rol no permitido.")
        user.role = user_in.role.value
        if user.role == UserRole.ADMIN.value:
            user.is_staff = True

    update_data = user_in.model_dump(exclude_unset=True, exclude={"location", "password", "role"})
    for field, value in update_data.items():
        if value is not None:
            setattr(user, field, value)

    if user_in.password:
        user.hashed_password = hash_password(user_in.password)

    if user_in.location is not None:
        from app.modules.locations.models import Location
        from app.modules.country_settings.models import CountrySetting
        loc_data = user_in.location.model_dump(exclude_unset=True)

        raw_code = loc_data.get("country_code")
        if raw_code and str(raw_code).strip():
            clean_code = str(raw_code).strip().upper()
            cs_stmt = select(CountrySetting).where(CountrySetting.country_code == clean_code)
            cs_res = await db.execute(cs_stmt)
            cs_obj = cs_res.scalar_one_or_none()
            if cs_obj:
                loc_data["country_code"] = clean_code
            else:
                default_countries = {
                    "CO": ("Colombia", 19.0, "COP", "$"),
                    "EC": ("Ecuador", 15.0, "USD", "$"),
                    "PE": ("Perú", 18.0, "PEN", "S/."),
                    "PA": ("Panamá", 7.0, "PAB", "B/."),
                    "US": ("Estados Unidos", 0.0, "USD", "$"),
                    "MX": ("México", 16.0, "MXN", "$"),
                    "ES": ("España", 21.0, "EUR", "€"),
                    "AR": ("Argentina", 21.0, "ARS", "$"),
                    "CL": ("Chile", 19.0, "CLP", "$"),
                }
                if clean_code in default_countries:
                    c_name, c_tax, c_curr, c_sym = default_countries[clean_code]
                    new_cs = CountrySetting(
                        country_code=clean_code,
                        country_name=loc_data.get("country") or c_name,
                        default_tax_rate=c_tax,
                        currency_code=c_curr,
                        currency_symbol=c_sym,
                        is_active=True,
                    )
                    db.add(new_cs)
                    await db.flush()
                    loc_data["country_code"] = clean_code
                else:
                    loc_data["country_code"] = None
        else:
            loc_data["country_code"] = None

        if user.location:
            for k, v in loc_data.items():
                setattr(user.location, k, v)
        else:
            new_loc = Location(**loc_data)
            db.add(new_loc)
            user.location = new_loc

    was_onboarding = user.needs_onboarding
    if user.needs_onboarding:
        is_complete = (
            bool(user.full_name and user.full_name.strip())
            and (user.role != "seller" or bool(user.business_name and user.business_name.strip()))
            and user.hashed_password is not None
        )
        user.needs_onboarding = not is_complete
    onboarding_just_completed = was_onboarding and not user.needs_onboarding

    await db.commit()
    await db.refresh(user)

    if onboarding_just_completed:
        try:
            from app.core.config import settings
            from app.core.email import send_email
            role_label = (
                "Administrador"
                if user.role == "admin"
                else ("Vendedor" if user.role == "seller" else "Cliente")
            )
            send_email(
                to=user.email,
                subject="¡Bienvenido a DonApp!",
                template_name="welcome.html",
                context={
                    "full_name": user.full_name,
                    "company_name": settings.SMTP_FROM_NAME or "DonApp",
                    "role_label": role_label,
                },
            )
        except Exception as e:
            logger.warning(f"No se pudo enviar el correo de bienvenida a {user.email}: {e}")

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
    Permanently delete a user from the database and clean up their avatar files.

    Args:
        db: Active async database session.
        user: The user ORM instance to delete.
    """
    # Remove avatar directory if it exists
    user_avatar_dir = os.path.join("uploads", "avatars", str(user.id))
    if os.path.exists(user_avatar_dir):
        shutil.rmtree(user_avatar_dir)

    await db.delete(user)
    await db.commit()

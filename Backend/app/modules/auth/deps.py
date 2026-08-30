"""
DonApp API — Auth Module: Route Dependencies.

Provides FastAPI dependencies for authenticated routes, including JWT
validation and current user resolution.
"""

import hashlib

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from redis.asyncio import Redis

from app.core.config import settings
from app.core.security import decode_access_token
from app.core.redis_client import get_redis
from app.db.session import get_db
from app.modules.auth.models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
    redis_client: Redis = Depends(get_redis),
) -> User:
    """
    FastAPI dependency that resolves the current authenticated user.

    Workflow:
        1. Decode and validate the JWT from the Authorization header.
        2. Raise 401 if the token is missing, invalid, or expired.
        3. Extract the user ID from the token payload.
        4. Load the user from the database.  Raise 401 if not found.
        5. Raise 403 if the user is inactive.

    Args:
        token: JWT bearer token (injected by FastAPI via oauth2_scheme).
        db: Async database session (injected).

    Returns:
        The authenticated ``User`` ORM instance.

    Raises:
        HTTPException 401: Invalid/expired token or user not found.
        HTTPException 403: User account is inactive.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido o expirado.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    # --- JWT blocklist check (logout invalidation) ---
    # For tokens issued after the jti fix: use jti as the blocklist key.
    # For older tokens (no jti claim): fall back to SHA1 of the raw token.
    jti = payload.get("jti")
    blocklist_key = (
        f"jwt:blocklist:{jti}"
        if jti
        else f"jwt:blocklist:{hashlib.sha1(token.encode()).hexdigest()}"
    )
    if await redis_client.exists(blocklist_key):
        raise credentials_exception

    user_id_str: str | None = payload.get("sub")
    if user_id_str is None:
        raise credentials_exception

    try:
        import uuid
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise credentials_exception

    from sqlalchemy.orm import selectinload
    stmt = select(User).options(selectinload(User.location)).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cuenta desactivada.",
        )

    return user

async def require_staff(current_user: User = Depends(get_current_user)) -> User:
    """Dependency that requires the user to be staff."""
    if not current_user.is_staff:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Acceso restringido al equipo interno"
        )
    return current_user


async def require_seller(current_user: User = Depends(get_current_user)) -> User:
    """Dependency that requires the user to have an admin or seller role.

    Used by /social/* endpoints.  Existing inline checks in products/,
    services/, categories/, locations/ routers use the same logic but are
    NOT migrated here — this dependency is available for future cleanup.
    """
    if current_user.role not in ("admin", "seller"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso restringido a administradores y vendedores",
        )
    return current_user

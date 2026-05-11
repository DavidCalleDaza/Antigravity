"""
Servinow API — Auth Module: Route Dependencies.

Provides FastAPI dependencies for authenticated routes, including JWT
validation and current user resolution.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.db.session import get_db
from app.modules.auth.models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
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

    user_id_str: str | None = payload.get("sub")
    if user_id_str is None:
        raise credentials_exception

    try:
        import uuid
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise credentials_exception

    stmt = select(User).where(User.id == user_id)
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

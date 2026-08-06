"""
DonApp API — Auth Module: API Routes.

Defines endpoints for user registration and (future) authentication.
All routes are mounted under ``/api/v1/auth`` via the main application.
"""

from fastapi import APIRouter, Depends, status, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException, ConflictException, UnauthorizedException
from app.core.security import verify_password, hash_password
from app.db.session import get_db
from app.modules.auth.crud import create_user, deactivate_user, delete_user, get_user_by_email, update_user
from app.modules.auth.deps import get_current_user
from app.modules.auth.models import User
from app.modules.auth.schemas import TokenResponse, UserCreate, UserLogin, UserResponse, UserUpdateMe, PasswordRecoveryRequest, PasswordRecoveryReset
from app.modules.auth.google import router as google_router, redis_client
from app.core.email import send_email

router = APIRouter()
router.include_router(google_router)

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar nuevo usuario",
    description=(
        "Crea una nueva cuenta de usuario en la plataforma. "
        "Valida que el correo no esté previamente registrado y "
        "almacena la contraseña de forma segura mediante bcrypt."
    ),
)
async def register_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """
    Register a new user account.

    Workflow:
        1. Check if a user with the given email already exists.
        2. If it does, raise a 409 Conflict.
        3. Otherwise, hash the password and persist the new user.
        4. Return the created user (without the password hash).

    Args:
        user_in: Registration payload validated by Pydantic.
        db: Async database session (injected).

    Returns:
        The newly created user as ``UserResponse``.

    Raises:
        ConflictException: If the email is already registered.
    """
    existing_user = await get_user_by_email(db, user_in.email)
    if existing_user:
        raise ConflictException(
            detail=f"El correo '{user_in.email}' ya está registrado."
        )

    new_user = await create_user(db, user_in)
    return new_user


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Iniciar sesión",
    description="Autentica al usuario con email y contraseña, devolviendo un JWT.",
)
async def login(
    credentials: UserLogin,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Authenticate a user and return a JWT token.

    Workflow:
        1. Look up the user by email.
        2. Verify the password against the stored hash.
        3. Generate and return a JWT access token.

    Args:
        credentials: Email and password.
        db: Async database session (injected).

    Returns:
        TokenResponse with access_token, token_type, and user data.

    Raises:
        UnauthorizedException: If credentials are invalid.
    """
    from app.core.security import create_access_token

    user = await get_user_by_email(db, credentials.email)
    if not user:
        raise UnauthorizedException(detail="Credenciales inválidas.")

    if user.hashed_password is None:
        raise UnauthorizedException(detail="Credenciales inválidas.")

    if not verify_password(credentials.password, user.hashed_password):
        raise UnauthorizedException(detail="Credenciales inválidas.")

    if not user.is_active:
        raise UnauthorizedException(detail="Cuenta desactivada.")

    access_token = create_access_token(data={"sub": str(user.id), "email": user.email, "role": user.role})
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Usuario actual",
    description="Retorna los datos del usuario autenticado actualmente.",
)
async def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    """
    Return the currently authenticated user's profile.

    Args:
        current_user: User resolved by ``get_current_user`` dependency.

    Returns:
        ``UserResponse`` with the authenticated user's data.
    """
    return UserResponse.model_validate(current_user)


@router.patch(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Actualizar perfil",
    description="Permite al usuario actualizar su nombre, email o avatar_url.",
)
async def patch_me(
    user_in: UserUpdateMe,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """
    Update the current authenticated user's profile.

    Args:
        user_in: Fields to update.
        current_user: Resolved from JWT.
        db: Async database session.

    Returns:
        Updated ``UserResponse``.
    """
    if user_in.email and user_in.email != current_user.email:
        existing = await get_user_by_email(db, user_in.email)
        if existing:
            raise ConflictException(detail="El correo ya está en uso por otra cuenta.")

    updated = await update_user(db, current_user, user_in)
    return UserResponse.model_validate(updated)


@router.delete(
    "/me",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar o desactivar cuenta",
    description="Si permanent=true elimina la cuenta. Si permanent=false la desactiva.",
)
async def delete_me(
    permanent: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Delete or deactivate the current user's account.

    Args:
        permanent: If True, permanently deletes the user.
                  If False, sets is_active = False.
        current_user: Resolved from JWT.
        db: Async database session.
    """
    if permanent:
        await delete_user(db, current_user)
    else:
        await deactivate_user(db, current_user)


ALLOWED_AVATAR_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
MAX_AVATAR_SIZE = 10 * 1024 * 1024


@router.post(
    "/me/avatar",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Subir avatar",
    description="Permite subir una imagen de perfil (jpg, png, gif, webp, max 10MB).",
)
async def upload_avatar(
    file: UploadFile,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """
    Upload a profile avatar image.

    Validates file type (image only) and size (max 10MB).
    Saves to /uploads/avatars/{user_id}/{filename}.

    Args:
        file: Uploaded image file.
        current_user: Resolved from JWT.
        db: Async database session.

    Returns:
        Updated ``UserResponse`` with new avatar_url.
    """
    import os
    import uuid

    if file.content_type not in ALLOWED_AVATAR_TYPES:
        raise BadRequestException(
            detail=f"Tipo de archivo no permitido. Usa: {', '.join(ALLOWED_AVATAR_TYPES)}"
        )

    contents = await file.read()
    if len(contents) > MAX_AVATAR_SIZE:
        raise BadRequestException(detail="El archivo excede el tamaño máximo de 10MB.")

    user_id_str = str(current_user.id)
    upload_dir = os.path.join("uploads", "avatars", user_id_str)

    # Remove old avatar file if it exists
    if current_user.avatar_url:
        old_filename = os.path.basename(current_user.avatar_url)
        old_path = os.path.join(upload_dir, old_filename)
        if os.path.exists(old_path):
            os.remove(old_path)

    os.makedirs(upload_dir, exist_ok=True)

    ext = os.path.splitext(file.filename or ".jpg")[1] or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(upload_dir, filename)

    with open(file_path, "wb") as f:
        f.write(contents)

    avatar_url = f"/uploads/avatars/{user_id_str}/{filename}"
    current_user.avatar_url = avatar_url
    await db.commit()
    await db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.post(
    "/password-recovery/request",
    status_code=status.HTTP_200_OK,
    summary="Solicitar recuperación de contraseña",
    description="Genera un código de 6 dígitos, lo guarda en Redis y lo envía por correo.",
)
async def request_password_recovery(
    payload: PasswordRecoveryRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    import random
    from app.core.config import settings

    user = await get_user_by_email(db, payload.email)
    if not user:
        raise BadRequestException(detail="Usuario no encontrado.")

    if user.hashed_password is None:
        raise BadRequestException(
            detail="Esta cuenta está vinculada con Google. Inicia sesión directamente usando Google."
        )

    # Generate 6 digit numeric code
    code = f"{random.randint(100000, 999999)}"

    # Save to Redis with 10 min (600s) TTL
    redis_key = f"password-reset:code:{payload.email}"
    await redis_client.setex(redis_key, 600, code)

    # Send email
    subject = "Código de recuperación — DonApp"
    context = {
        "code": code,
        "company_name": settings.SMTP_FROM_NAME or "DonApp",
    }
    
    email_sent = send_email(
        to=payload.email,
        subject=subject,
        template_name="password_recovery.html",
        context=context
    )

    if not email_sent:
        raise BadRequestException(
            detail="No se pudo enviar el correo de recuperación. Configuración de SMTP inválida."
        )

    return {"detail": "Código de recuperación enviado."}


@router.post(
    "/password-recovery/reset",
    status_code=status.HTTP_200_OK,
    summary="Restablecer contraseña usando código",
    description="Valida el código de recuperación de Redis y actualiza la contraseña del usuario.",
)
async def reset_password_with_code(
    payload: PasswordRecoveryReset,
    db: AsyncSession = Depends(get_db),
) -> dict:
    redis_key = f"password-reset:code:{payload.email}"
    stored_code = await redis_client.get(redis_key)

    if not stored_code or stored_code != payload.code:
        raise BadRequestException(detail="Código inválido o expirado.")

    user = await get_user_by_email(db, payload.email)
    if not user:
        raise BadRequestException(detail="Usuario no encontrado.")

    # Update password and commit
    user.hashed_password = hash_password(payload.new_password)
    db.add(user)
    await db.commit()

    # Delete code from Redis immediately
    await redis_client.delete(redis_key)

    return {"detail": "Contraseña restablecida exitosamente."}


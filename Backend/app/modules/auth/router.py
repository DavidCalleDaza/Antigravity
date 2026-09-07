"""
DonApp API — Auth Module: API Routes.

Defines endpoints for user registration and (future) authentication.
All routes are mounted under ``/api/v1/auth`` via the main application.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status, UploadFile
from fastapi.responses import HTMLResponse
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException, ConflictException, UnauthorizedException
from app.core.security import verify_password, hash_password
from app.db.session import get_db
from app.modules.auth.crud import create_user, deactivate_user, delete_user, get_user_by_email, get_user_by_id, update_user
from app.modules.auth.deps import get_current_user
from app.modules.auth.models import User
from app.modules.auth.schemas import (
    EmailChangeRequest,
    PasswordRecoveryRequest,
    PasswordRecoveryReset,
    TokenResponse,
    UpgradeToSellerRequest,
    UserCreate,
    UserLogin,
    UserResponse,
    UserUpdateMe,
)
from app.modules.auth.google import router as google_router
from app.core.redis_client import get_redis
from redis.asyncio import Redis
from pydantic import BaseModel
import logging
import random
import secrets
import uuid
from datetime import datetime
from app.core.config import settings
from app.core.email import send_email

logger = logging.getLogger(__name__)

router = APIRouter()
router.include_router(google_router)

email_change_serializer = URLSafeTimedSerializer(settings.SECRET_KEY, salt="email-change-approval")


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar nuevo usuario",
    description=(
        "Crea una nueva cuenta de usuario en la plataforma con estado pendiente de activación. "
        "Genera un código de acceso único y notifica al administrador por correo para su validación."
    ),
)
async def register_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """
    Register a new user account with security approval protocol.

    Workflow:
        1. Check if a user with the given email already exists.
        2. If it does, raise a 409 Conflict.
        3. Generate a secure random activation code (e.g. DON-XXXXXX).
        4. Hash the password and persist user with is_approved=False and activation_code.
        5. Send approval notification email to administrator with the generated code.
        6. Return the created user.
    """
    existing_user = await get_user_by_email(db, user_in.email)
    if existing_user:
        raise ConflictException(
            detail=f"El correo '{user_in.email}' ya está registrado."
        )

    # Generar código de activación criptográficamente seguro de 6 dígitos con prefijo DON-
    code_digits = f"{secrets.randbelow(900000) + 100000}"
    activation_code = f"DON-{code_digits}"

    new_user = await create_user(
        db,
        user_in,
        is_approved=False,
        activation_code=activation_code,
    )

    # Notificar al administrador por correo
    role_labels = {
        "admin": "Administrador",
        "seller": "Comerciante / Negocio",
        "client": "Cliente",
    }
    role_value = user_in.role.value if hasattr(user_in.role, 'value') else str(user_in.role)
    role_label = role_labels.get(role_value, role_value)
    created_str = datetime.now().strftime("%d/%m/%Y %H:%M:%S")

    try:
        send_email(
            to=settings.CONTACT_NOTIFICATION_EMAIL,
            subject=f"[DonApp] Nueva solicitud de registro — {user_in.full_name}",
            template_name="new_user_approval.html",
            context={
                "full_name": user_in.full_name,
                "email": user_in.email,
                "role_label": role_label,
                "created_at": created_str,
                "activation_code": activation_code,
            },
        )
        logger.info(
            "Notificación de nuevo usuario enviada a %s (User: %s, Code: %s)",
            settings.CONTACT_NOTIFICATION_EMAIL,
            user_in.email,
            activation_code,
        )
    except Exception as e:
        logger.error("Error al enviar notificación de registro al admin: %s", e)

    return new_user


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Iniciar sesión",
    description="Autentica al usuario con email y contraseña. Requiere código de activación en el primer ingreso.",
)
async def login(
    credentials: UserLogin,
    db: AsyncSession = Depends(get_db),
    redis_client: Redis = Depends(get_redis),
) -> TokenResponse:
    """
    Authenticate a user and return a JWT token.

    Workflow:
        1. Check Redis lockout key — 429 if locked.
        2. Look up the user by email.
        3. Verify the password against the stored hash.
        4. Check if account requires first-time activation:
           - If not approved and no code provided -> 403 Forbidden with ACTIVATION_REQUIRED.
           - If not approved and code provided -> validate code, activate user, continue.
        5. On success: clear attempt counters and issue JWT.
    """
    from fastapi import status as http_status
    from app.core.security import create_access_token

    _LOGIN_MAX_ATTEMPTS = 5
    _LOGIN_WINDOW_SECONDS = 900   # 15 minutes
    _LOGIN_LOCKOUT_SECONDS = 900  # 15 minutes

    attempts_key = f"login:attempts:{credentials.email}"
    lockout_key = f"login:lockout:{credentials.email}"

    # --- Step 1: Check lockout before doing *any* DB query ---
    if await redis_client.exists(lockout_key):
        from app.core.exceptions import TooManyRequestsException
        raise TooManyRequestsException(
            detail=(
                "Demasiados intentos fallidos. Tu cuenta ha sido bloqueada temporalmente. "
                "Inténtalo de nuevo en 15 minutos."
            )
        )

    # --- Step 2 & 3: Validate credentials ---
    user = await get_user_by_email(db, credentials.email)
    credentials_invalid = (
        user is None
        or user.hashed_password is None
        or not verify_password(credentials.password, user.hashed_password)
    )

    if credentials_invalid:
        count = await redis_client.incr(attempts_key)
        if count == 1:
            await redis_client.expire(attempts_key, _LOGIN_WINDOW_SECONDS)
        if count >= _LOGIN_MAX_ATTEMPTS:
            await redis_client.set(lockout_key, 1, ex=_LOGIN_LOCKOUT_SECONDS)
        raise UnauthorizedException(detail="Credenciales inválidas.")

    if not user.is_active:
        raise UnauthorizedException(detail="Cuenta desactivada.")

    # --- Step 4: Validar protocolo de activación en el primer ingreso ---
    if not user.is_approved:
        if not credentials.activation_code:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tu cuenta está en proceso de validación. Ingresa el código de activación proporcionado por el administrador para tu primer acceso.",
                headers={"X-Auth-Status": "ACTIVATION_REQUIRED"},
            )

        provided_code = credentials.activation_code.strip().upper()
        expected_code = (user.activation_code or "").strip().upper()

        if not expected_code or provided_code != expected_code:
            raise BadRequestException(
                detail="Código de activación incorrecto. Verifica el código proporcionado por el administrador."
            )

        # Código válido: activar cuenta definitivamente
        user.is_approved = True
        user.activation_code = None
        db.add(user)
        await db.commit()
        await db.refresh(user)
        logger.info("Usuario %s activado exitosamente con código en primer ingreso.", user.email)

    # --- Step 5: Successful login — clear counters ---
    await redis_client.delete(attempts_key, lockout_key)

    access_token = create_access_token(data={"sub": str(user.id), "email": user.email, "role": user.role})
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


class AccountActivationRequest(BaseModel):
    email: str
    activation_code: str


@router.post(
    "/activate",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Activar cuenta con código de primer ingreso",
    description="Activa una cuenta pendiente de validación mediante el código de acceso proporcionado por el administrador.",
)
async def activate_account(
    payload: AccountActivationRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    from app.core.security import create_access_token

    user = await get_user_by_email(db, payload.email.strip())
    if not user:
        raise BadRequestException(detail="Usuario no encontrado.")

    if not user.is_active:
        raise UnauthorizedException(detail="Cuenta desactivada.")

    if user.is_approved:
        raise BadRequestException(detail="Esta cuenta ya se encuentra activada. Inicia sesión normalmente.")

    provided_code = payload.activation_code.strip().upper()
    expected_code = (user.activation_code or "").strip().upper()

    if not expected_code or provided_code != expected_code:
        raise BadRequestException(detail="Código de activación incorrecto. Verifica el código proporcionado por el administrador.")

    user.is_approved = True
    user.activation_code = None
    db.add(user)
    await db.commit()
    await db.refresh(user)
    logger.info("Cuenta de usuario %s activada exitosamente vía /activate.", user.email)

    access_token = create_access_token(data={"sub": str(user.id), "email": user.email, "role": user.role})
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )



import hashlib as _hashlib
from datetime import timezone as _tz, datetime as _datetime
from fastapi.security import OAuth2PasswordBearer as _OAuth2

_oauth2_scheme_logout = _OAuth2(tokenUrl="/api/v1/auth/login")


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Cerrar sesión",
    description="Invalida el JWT actual. Requests subsecuentes con ese token recibirán 401.",
)
async def logout(
    raw_token: str = Depends(_oauth2_scheme_logout),
    _current_user: User = Depends(get_current_user),
    redis_client: Redis = Depends(get_redis),
) -> None:
    """Invalidate the current JWT by adding it to the Redis blocklist.

    Uses the token's ``jti`` claim as the blocklist key.  For older tokens
    without ``jti``, falls back to a SHA1 hash of the raw token string.

    TTL is set equal to the token's remaining lifetime so the Redis key is
    automatically evicted — no stale entry accumulation.

    Concurrency: ``SET key value EX ttl`` is atomic.  Calling logout with
    the same token from two tabs simultaneously is idempotent and safe.
    """
    from app.core.security import decode_access_token

    payload = decode_access_token(raw_token)
    if payload is None:
        return  # Already invalid — nothing to blocklist

    jti = payload.get("jti")
    blocklist_key = (
        f"jwt:blocklist:{jti}"
        if jti
        else f"jwt:blocklist:{_hashlib.sha1(raw_token.encode()).hexdigest()}"
    )

    exp = payload.get("exp")
    if exp:
        remaining = int(exp - _datetime.now(_tz.utc).timestamp())
        ttl = max(remaining, 1)
    else:
        ttl = 1

    await redis_client.set(blocklist_key, 1, ex=ttl)


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
    if user_in.email and user_in.email.strip().lower() != current_user.email.strip().lower():
        raise BadRequestException(
            detail="El correo electrónico no se puede modificar directamente. Debes solicitar el cambio a administración."
        )

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
    redis_client: Redis = Depends(get_redis),
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
    redis_client: Redis = Depends(get_redis),
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


@router.post(
    "/request-email-change",
    status_code=status.HTTP_200_OK,
    summary="Solicitar cambio de correo electrónico",
    description="Envía una notificación al administrador para solicitar el cambio de correo del usuario.",
)
async def request_email_change(
    payload: EmailChangeRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    new_email = payload.new_email.strip().lower()
    current_email = (current_user.email or "").strip().lower()

    if new_email == current_email:
        raise BadRequestException(detail="El nuevo correo no puede ser igual al correo actual.")

    # Check if new email is already taken by another account
    existing_user = await get_user_by_email(db, new_email)
    if existing_user and str(existing_user.id) != str(current_user.id):
        raise ConflictException(detail="El nuevo correo electrónico ya está registrado en otra cuenta.")

    # Generate secure timed approval token (valid for 7 days)
    token_payload = {
        "user_id": str(current_user.id),
        "current_email": current_user.email,
        "new_email": new_email,
    }
    token = email_change_serializer.dumps(token_payload)

    # Determine approval URL using request host/headers
    proto = request.headers.get("x-forwarded-proto", request.url.scheme)
    host = request.headers.get("x-forwarded-host", request.headers.get("host", f"localhost:{settings.PORT}"))
    base_url = f"{proto}://{host}"
    approval_url = f"{base_url}/api/v1/auth/approve-email-change?token={token}"

    created_str = datetime.now().strftime("%d/%m/%Y %H:%M:%S")

    # Send notification email exclusively to the administrator
    try:
        send_email(
            to=settings.CONTACT_NOTIFICATION_EMAIL,
            subject=f"[DonApp] Solicitud de cambio de correo — {current_user.full_name}",
            template_name="email_change_request.html",
            context={
                "full_name": current_user.full_name,
                "current_email": current_user.email,
                "new_email": new_email,
                "reason": payload.reason or "No especificado por el usuario.",
                "date": created_str,
                "approval_url": approval_url,
            },
        )
        logger.info(
            "Solicitud de cambio de correo enviada a %s para usuario %s (Nuevo: %s)",
            settings.CONTACT_NOTIFICATION_EMAIL,
            current_user.email,
            new_email,
        )
    except Exception as exc:
        logger.error("Error al enviar correo de solicitud de cambio de correo: %s", exc)
        raise BadRequestException(
            detail="No se pudo enviar la solicitud de cambio de correo. Intente más tarde."
        )

    return {
        "detail": "Solicitud de cambio de correo enviada exitosamente a administración para su aprobación."
    }


@router.get(
    "/approve-email-change",
    response_class=HTMLResponse,
    summary="Aprobar cambio de correo electrónico (Admin)",
    description="Valida el token de aprobación y actualiza el correo del usuario, notificándole por email.",
)
async def approve_email_change(
    token: str,
    db: AsyncSession = Depends(get_db),
) -> HTMLResponse:
    try:
        data = email_change_serializer.loads(token, max_age=604800)  # 7 days
    except SignatureExpired:
        return HTMLResponse(
            content="""
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 60px auto; padding: 32px; border: 1px solid #fee2e2; border-radius: 12px; background: #fff; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <h2 style="color: #dc2626; margin-top: 0;">Enlace Expirado</h2>
                <p style="color: #475569;">Este enlace de aprobación ha expirado. El usuario debe generar una nueva solicitud de cambio de correo.</p>
            </div>
            """,
            status_code=status.HTTP_400_BAD_REQUEST,
        )
    except BadSignature:
        return HTMLResponse(
            content="""
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 60px auto; padding: 32px; border: 1px solid #fee2e2; border-radius: 12px; background: #fff; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <h2 style="color: #dc2626; margin-top: 0;">Enlace Inválido</h2>
                <p style="color: #475569;">El token de aprobación de cambio de correo no es válido o está incompleto.</p>
            </div>
            """,
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    user_id_str = data.get("user_id")
    new_email = (data.get("new_email") or "").strip().lower()

    if not user_id_str or not new_email:
        return HTMLResponse(
            content="""
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 60px auto; padding: 32px; border: 1px solid #fee2e2; border-radius: 12px; background: #fff; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <h2 style="color: #dc2626; margin-top: 0;">Datos Incompletos</h2>
                <p style="color: #475569;">La solicitud no contiene los parámetros requeridos.</p>
            </div>
            """,
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    try:
        user_uuid = uuid.UUID(user_id_str)
    except ValueError:
        return HTMLResponse(
            content="<p>Identificador de usuario inválido.</p>",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    user = await get_user_by_id(db, user_uuid)
    if not user:
        return HTMLResponse(
            content="""
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 60px auto; padding: 32px; border: 1px solid #fee2e2; border-radius: 12px; background: #fff; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <h2 style="color: #dc2626; margin-top: 0;">Usuario no encontrado</h2>
                <p style="color: #475569;">El usuario asociado a esta solicitud ya no existe en la plataforma.</p>
            </div>
            """,
            status_code=status.HTTP_404_NOT_FOUND,
        )

    # Check if user already has this new email
    if (user.email or "").lower() == new_email:
        return HTMLResponse(
            content=f"""
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 60px auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <h2 style="color: #0f172a; margin-top: 0;">Don<span style="color: #2e7d32;">App</span></h2>
                <div style="display: inline-block; background-color: #f1f5f9; color: #475569; font-weight: 700; padding: 4px 14px; border-radius: 20px; font-size: 13px; margin-bottom: 16px;">
                    Ya Procesado
                </div>
                <p style="color: #334155; font-size: 16px; margin: 0 0 16px 0;">El correo del usuario <strong>{user.full_name}</strong> ya se encuentra actualizado a <strong>{new_email}</strong>.</p>
            </div>
            """,
            status_code=status.HTTP_200_OK,
        )

    # Check if another user registered with new_email in the meantime
    existing_other = await get_user_by_email(db, new_email)
    if existing_other and str(existing_other.id) != str(user.id):
        return HTMLResponse(
            content=f"""
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 60px auto; padding: 32px; border: 1px solid #fee2e2; border-radius: 12px; background: #fff; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <h2 style="color: #dc2626; margin-top: 0;">Conflicto de Correo</h2>
                <p style="color: #475569;">El correo '<strong>{new_email}</strong>' ya fue registrado por otra cuenta. No se puede completar el cambio.</p>
            </div>
            """,
            status_code=status.HTTP_409_CONFLICT,
        )

    old_email = user.email
    user.email = new_email
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Notify the user at their NEW email address
    frontend_url = settings.FRONTEND_URL or "http://localhost:5173"
    login_url = f"{frontend_url}/login"

    try:
        send_email(
            to=new_email,
            subject="[DonApp] Tu correo electrónico ha sido actualizado",
            template_name="email_change_approved.html",
            context={
                "full_name": user.full_name,
                "new_email": new_email,
                "login_url": login_url,
            },
        )
        logger.info("Notificación de cambio de correo enviada exitosamente a %s", new_email)
    except Exception as exc:
        logger.error("Error al enviar notificación de confirmación al usuario: %s", exc)

    return HTMLResponse(
        content=f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Cambio de Correo Aprobado — DonApp</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 40px 20px;">
            <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 36px; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <h2 style="color: #0f172a; margin: 0 0 8px 0; font-size: 26px; font-weight: 800;">
                    Don<span style="color: #2e7d32;">App</span>
                </h2>
                <p style="color: #64748b; font-size: 14px; margin: 0 0 24px 0;">Panel de Administración</p>
                
                <div style="width: 56px; height: 56px; background-color: #f0fdf4; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px; color: #166534; font-size: 28px; line-height: 56px;">
                    &#10003;
                </div>

                <h3 style="color: #0f172a; margin: 0 0 12px 0; font-size: 20px;">
                    ¡Cambio de Correo Aprobado Exitosamente!
                </h3>
                <p style="color: #475569; font-size: 15px; margin: 0 0 20px 0;">
                    El correo de <strong>{user.full_name}</strong> ha sido actualizado correctamente en la plataforma.
                </p>

                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 20px; margin-bottom: 24px; text-align: left; font-size: 14px;">
                    <div style="margin-bottom: 6px;"><span style="color: #64748b;">Anterior:</span> <span style="color: #94a3b8; text-decoration: line-through;">{old_email}</span></div>
                    <div><span style="color: #64748b;">Nuevo:</span> <strong style="color: #2e7d32;">{new_email}</strong></div>
                </div>

                <p style="color: #64748b; font-size: 13px; margin: 0;">
                    Se ha enviado un correo electrónico de confirmación al usuario informándole que su nuevo correo está activo para iniciar sesión.
                </p>
            </div>
        </body>
        </html>
        """,
        status_code=status.HTTP_200_OK,
    )


@router.post(
    "/upgrade-to-seller",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Actualizar cuenta de cliente a vendedor",
    description="Permite que un usuario autenticado con rol de cliente active su perfil de vendedor completando sus datos comerciales.",
)
async def upgrade_to_seller(
    body: UpgradeToSellerRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Promote current user to seller role and update commercial details.
    """
    current_user.role = "seller"
    if body.business_name and body.business_name.strip():
        current_user.full_name = body.business_name.strip()
    if body.phone and body.phone.strip():
        current_user.phone = body.phone.strip()

    await db.commit()
    await db.refresh(current_user)

    logger.info("Usuario %s (%s) ascendido a VENDEDOR exitosamente.", current_user.email, current_user.full_name)
    return current_user




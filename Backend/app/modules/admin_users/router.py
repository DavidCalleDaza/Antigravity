"""
DonApp API — Admin Users: API Routes.
Exposes endpoints to manage users, update roles, toggle states, and generate stats.
Mounted at /api/v1/admin/users.
"""

import uuid
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.exceptions import ConflictException, BadRequestException
from app.modules.auth.deps import require_staff
from app.modules.auth.models import User
from app.modules.admin_users import crud, schemas

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/users", tags=["Admin Users"])


@router.get(
    "/stats",
    response_model=schemas.AdminUserStatsResponse,
    summary="Estadísticas de usuarios",
    description="Retorna métricas globales de usuarios por rol y estado para el panel de administración.",
)
async def get_user_stats(
    current_staff: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
) -> schemas.AdminUserStatsResponse:
    return await crud.get_users_stats(db)


@router.get(
    "",
    response_model=schemas.AdminUserListResponse,
    summary="Listar usuarios",
    description="Obtiene el listado paginado y filtrable de usuarios del sistema.",
)
async def list_users(
    search: Optional[str] = Query(None, description="Búsqueda por nombre, email o negocio"),
    role: Optional[str] = Query(None, description="Filtrar por rol: admin, seller, client"),
    is_active: Optional[bool] = Query(None, description="Filtrar por estado activo/inactivo"),
    is_approved: Optional[bool] = Query(None, description="Filtrar por estado de aprobación"),
    page: int = Query(1, ge=1, description="Número de página"),
    size: int = Query(20, ge=1, le=100, description="Cantidad por página"),
    current_staff: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
) -> schemas.AdminUserListResponse:
    skip = (page - 1) * size
    users, total = await crud.get_users_paginated(
        db,
        search=search,
        role=role,
        is_active=is_active,
        is_approved=is_approved,
        skip=skip,
        limit=size,
    )
    return schemas.AdminUserListResponse(
        items=[schemas.AdminUserResponse.model_validate(u) for u in users],
        total=total,
        page=page,
        size=size,
    )


@router.get(
    "/{user_id}",
    response_model=schemas.AdminUserResponse,
    summary="Obtener usuario",
    description="Retorna la información detallada de un usuario por su UUID.",
)
async def get_user_detail(
    user_id: uuid.UUID,
    current_staff: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
) -> schemas.AdminUserResponse:
    user = await crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
    return schemas.AdminUserResponse.model_validate(user)


@router.post(
    "",
    response_model=schemas.AdminUserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear usuario (Admin)",
    description="Permite al administrador crear directamente un usuario con cualquier rol asignado.",
)
async def create_user_by_admin(
    payload: schemas.AdminUserCreateRequest,
    current_staff: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
) -> schemas.AdminUserResponse:
    existing = await crud.get_user_by_email(db, payload.email)
    if existing:
        raise ConflictException(detail=f"El correo '{payload.email}' ya está registrado.")

    new_user = await crud.admin_create_user(db, payload)
    logger.info("Admin %s creó el usuario %s con rol %s", current_staff.email, new_user.email, new_user.role)
    return schemas.AdminUserResponse.model_validate(new_user)


@router.patch(
    "/{user_id}",
    response_model=schemas.AdminUserResponse,
    summary="Actualizar usuario / rol (Admin)",
    description="Actualiza datos, rol, permisos, estado o contraseña de un usuario.",
)
async def update_user_by_admin(
    user_id: uuid.UUID,
    payload: schemas.AdminUserUpdateRequest,
    current_staff: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
) -> schemas.AdminUserResponse:
    user = await crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")

    if payload.email and payload.email.strip().lower() != user.email.lower():
        existing = await crud.get_user_by_email(db, payload.email)
        if existing and existing.id != user.id:
            raise ConflictException(detail=f"El correo '{payload.email}' ya pertenece a otra cuenta.")

    # Guard: prevent removing own admin role by accident
    if user.id == current_staff.id and payload.role and payload.role != "admin":
        raise BadRequestException(detail="No puedes quitarte el rol de Administrador a ti mismo.")

    updated = await crud.admin_update_user(db, user, payload)
    logger.info("Admin %s actualizó al usuario %s (ID: %s)", current_staff.email, updated.email, updated.id)
    return schemas.AdminUserResponse.model_validate(updated)


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar o desactivar usuario (Admin)",
    description="Desactiva o elimina permanentemente un usuario.",
)
async def delete_user_by_admin(
    user_id: uuid.UUID,
    permanent: bool = Query(False, description="Si es True, elimina el registro permanentemente"),
    current_staff: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
) -> None:
    if user_id == current_staff.id:
        raise BadRequestException(detail="No puedes eliminar o desactivar tu propia cuenta de Administrador.")

    user = await crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")

    await crud.admin_delete_user(db, user, permanent=permanent)
    logger.info("Admin %s eliminó (permanent=%s) al usuario %s (ID: %s)", current_staff.email, permanent, user.email, user.id)


@router.post(
    "/bulk-delete",
    response_model=schemas.AdminUserBulkDeleteResponse,
    summary="Eliminar o desactivar usuarios de forma masiva (Admin)",
    description="Desactiva o elimina permanentemente una lista de usuarios especificada por sus IDs.",
)
async def bulk_delete_users_by_admin(
    payload: schemas.AdminUserBulkDeleteRequest,
    current_staff: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
) -> schemas.AdminUserBulkDeleteResponse:
    deleted_count, skipped_count = await crud.admin_bulk_delete_users(
        db,
        user_ids=payload.user_ids,
        current_admin_id=current_staff.id,
        permanent=payload.permanent,
    )
    action_label = "eliminados permanentemente" if payload.permanent else "desactivados"
    msg = f"{deleted_count} usuario(s) {action_label} con éxito."
    if skipped_count > 0:
        msg += f" ({skipped_count} omitido(s) por seguridad)."

    logger.info("Admin %s ejecutó borrado masivo (%s): %s", current_staff.email, action_label, msg)
    return schemas.AdminUserBulkDeleteResponse(
        deleted_count=deleted_count,
        skipped_count=skipped_count,
        message=msg,
    )


@router.post(
    "/{user_id}/send-activation-code",
    status_code=status.HTTP_200_OK,
    summary="Enviar código de activación por correo (Admin)",
    description="Permite al administrador enviar o reenviar el código de activación al correo de un usuario.",
)
async def send_activation_code_by_admin(
    user_id: uuid.UUID,
    current_staff: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
) -> dict:
    from app.core.email import send_email
    from app.core.config import settings

    user = await crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")

    if user.is_approved and not user.activation_code:
        return {"detail": f"El usuario {user.full_name} ya completó su activación y se encuentra activo."}

    import secrets
    activation_code = user.activation_code
    if not activation_code:
        code_digits = f"{secrets.randbelow(900000) + 100000}"
        activation_code = f"DON-{code_digits}"
        user.activation_code = activation_code
        db.add(user)
        await db.commit()

    frontend_url = settings.FRONTEND_URL or "http://localhost:5173"
    login_url = f"{frontend_url}/login"

    try:
        send_email(
            to=user.email,
            subject="[DonApp] ¡Tu solicitud de registro ha sido aprobada! Código de activación",
            template_name="user_activation_code.html",
            context={
                "full_name": user.full_name,
                "email": user.email,
                "activation_code": activation_code,
                "login_url": login_url,
            },
        )
        logger.info("Admin %s envió código de activación %s a %s", current_staff.email, activation_code, user.email)
    except Exception as exc:
        logger.error("Error al enviar código de activación a %s: %s", user.email, exc)
        raise BadRequestException(detail=f"No se pudo enviar el correo de activación: {exc}")

    return {
        "detail": f"Código de activación ({activation_code}) enviado exitosamente a {user.email}.",
        "activation_code": activation_code,
    }


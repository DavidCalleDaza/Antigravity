"""
Servinow API — Services Module: API Routes.
"""

import logging
import uuid
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.uploads import schedule_file_cleanup
from app.db.session import get_db
from app.modules.auth.deps import get_current_user
from app.modules.auth.models import User
from app.modules.services.crud import (
    create_service,
    delete_service,
    get_categories,
    get_service,
    get_services,
    update_service,
)
from app.modules.services.schemas import (
    ServiceCategoryResponse,
    ServiceCreate,
    ServiceResponse,
    ServiceUpdate,
)

router = APIRouter()
logger = logging.getLogger(__name__)


def _build_service_response(service) -> ServiceResponse:
    resp = ServiceResponse.model_validate(service)
    if service.user:
        resp.seller_name = service.user.full_name
        resp.seller_avatar = service.user.avatar_url
        if service.user.location:
            resp.seller_city = service.user.location.city
    if service.store_location:
        resp.store_name = service.store_location.name
    return resp


@router.get("/categories", response_model=list[ServiceCategoryResponse], status_code=status.HTTP_200_OK)
async def list_categories(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[ServiceCategoryResponse]:
    categories = await get_categories(db)
    return [ServiceCategoryResponse.model_validate(c) for c in categories]


@router.get("", response_model=list[ServiceResponse], status_code=status.HTTP_200_OK)
async def list_services(
    skip: Annotated[int, Query(description="Número de registros a omitir.", ge=0)] = 0,
    limit: Annotated[int, Query(description="Máximo de servicios a retornar.", ge=1, le=100)] = 50,
    category_id: Annotated[uuid.UUID | None, Query(description="Filtrar por categoría ID.")] = None,
    status: Annotated[str | None, Query(description="Filtrar por estado.")] = None,
    seller_id: Annotated[uuid.UUID | None, Query(description="Filtrar por vendedor (solo clientes).")] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ServiceResponse]:
    try:
        if current_user.role == "client":
            services = await get_services(
                db, skip=skip, limit=limit, category_id=category_id,
                status=status, user_id=seller_id,
            )
        else:
            services = await get_services(
                db, skip=skip, limit=limit, category_id=category_id,
                status=status, user_id=current_user.id,
            )
        return [_build_service_response(s) for s in services]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
async def create_new_service(
    service_in: ServiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ServiceResponse:
    if current_user.role not in ("admin", "seller"):
        raise HTTPException(status_code=403, detail="Solo vendedores pueden crear servicios")
    service = await create_service(db, service_in, current_user.id)
    return _build_service_response(service)


@router.get("/{service_id}", response_model=ServiceResponse)
async def get_single_service(
    service_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ServiceResponse:
    service = await get_service(db, service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return _build_service_response(service)


@router.patch("/{service_id}", response_model=ServiceResponse)
async def update_existing_service(
    service_id: uuid.UUID,
    service_in: ServiceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ServiceResponse:
    db_service = await get_service(db, service_id)
    if not db_service:
        raise HTTPException(status_code=404, detail="Service not found")
    service = await update_service(db, db_service, service_in)
    return _build_service_response(service)


@router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_service(
    service_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_service = await get_service(db, service_id)
    if not db_service:
        raise HTTPException(status_code=404, detail="Service not found")

    image_url = db_service.image_url
    video_url = db_service.video_url

    await delete_service(db, db_service)

    if image_url:
        filename = image_url.split("/")[-1]
        background_tasks.add_task(schedule_file_cleanup, filename)
    if video_url:
        filename = video_url.split("/")[-1]
        background_tasks.add_task(schedule_file_cleanup, filename)

    return None

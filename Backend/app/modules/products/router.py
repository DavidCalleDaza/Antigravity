"""
DonApp API — Products Module: API Routes.
"""

import logging
import uuid
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.uploads import schedule_file_cleanup
from app.db.session import get_db
from app.modules.auth.deps import get_current_user, require_seller
from app.modules.auth.models import User
from app.modules.products.crud import (
    create_product,
    delete_product,
    get_product,
    get_products,
    update_product,
)
from app.modules.products.schemas import (
    ProductCreate,
    ProductResponse,
    ProductUpdate,
)

router = APIRouter()
logger = logging.getLogger(__name__)


def _build_product_response(product) -> ProductResponse:
    resp = ProductResponse.model_validate(product)
    if product.user:
        resp.seller_name = product.user.full_name
        resp.seller_avatar = product.user.avatar_url
        if product.user.location:
            resp.seller_city = product.user.location.city
    if product.store_location:
        resp.store_name = product.store_location.name
    return resp


@router.get("", response_model=list[ProductResponse], status_code=status.HTTP_200_OK)
async def list_products(
    skip: Annotated[int, Query(description="Número de registros a omitir.", ge=0)] = 0,
    limit: Annotated[int, Query(description="Máximo de productos a retornar.", ge=1, le=100)] = 50,
    category_id: Annotated[uuid.UUID | None, Query(description="Filtrar por ID de categoría (UUID).")] = None,
    status: Annotated[str | None, Query(description="Filtrar por estado.")] = None,
    seller_id: Annotated[uuid.UUID | None, Query(description="Filtrar por vendedor (solo clientes).")] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ProductResponse]:
    try:
        if current_user.role in ("client", "admin"):
            products = await get_products(
                db, skip=skip, limit=limit, category_id=category_id,
                status=status, user_id=seller_id,
            )
        else:
            products = await get_products(
                db, skip=skip, limit=limit, category_id=category_id,
                status=status, user_id=current_user.id,
            )
        return [_build_product_response(p) for p in products]
    except Exception as e:
        logger.error(f"Error fetching products: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_new_product(
    product_in: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_seller),
) -> ProductResponse:
    # Role check delegated to require_seller dependency above.
    # Infer image_url from media_urls if not provided
    if product_in.media_urls and len(product_in.media_urls) > 0:
        if not product_in.image_url:
            product_in.image_url = product_in.media_urls[0]

    try:
        product = await create_product(db, product_in, current_user.id)
        return _build_product_response(product)
    except Exception as e:
        logger.error(f"Error creating product: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise


@router.get("/{product_id}", response_model=ProductResponse)
async def get_single_product(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ProductResponse:
    product = await get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return _build_product_response(product)


@router.patch("/{product_id}", response_model=ProductResponse)
async def update_existing_product(
    product_id: uuid.UUID,
    product_in: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProductResponse:
    db_product = await get_product(db, product_id)
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    if db_product.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="No tienes permiso para modificar este producto")

    # Infer image_url from media_urls if not provided
    if product_in.media_urls and len(product_in.media_urls) > 0:
        if not product_in.image_url:
            product_in.image_url = product_in.media_urls[0]

    product = await update_product(db, db_product, product_in)
    return _build_product_response(product)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_product(
    product_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_product = await get_product(db, product_id)
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    if db_product.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="No tienes permiso para modificar este producto")

    image_url = db_product.image_url
    video_url = db_product.video_url

    await delete_product(db, db_product)

    if image_url:
        filename = image_url.split("/")[-1]
        background_tasks.add_task(schedule_file_cleanup, filename)
    if video_url:
        filename = video_url.split("/")[-1]
        background_tasks.add_task(schedule_file_cleanup, filename)
    return None

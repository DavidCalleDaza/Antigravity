"""
Servinow API — Products Module: API Routes.

Defines endpoints for product management.
Mounted under ``/api/v1/products`` via the main application.
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


@router.get("", response_model=list[ProductResponse], status_code=status.HTTP_200_OK)
async def list_products(
    skip: Annotated[int, Query(description="Número de registros a omitir.", ge=0)] = 0,
    limit: Annotated[int, Query(description="Máximo de productos a retornar.", ge=1, le=100)] = 50,
    category: Annotated[str | None, Query(description="Filtrar por categoría.")] = None,
    status: Annotated[str | None, Query(description="Filtrar por estado.")] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ProductResponse]:
    try:
        logger.info(f"Fetching products: skip={skip}, limit={limit}, category={category}, status={status}, user_id={current_user.id}")
        products = await get_products(db, skip=skip, limit=limit, category=category, status=status, user_id=current_user.id)
        logger.info(f"Found {len(products)} products")
        return [ProductResponse.model_validate(p) for p in products]
    except Exception as e:
        logger.error(f"Error fetching products: {e}")
        logger.error(f"Exception type: {type(e).__name__}")
        logger.error(f"Exception details: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_new_product(
    product_in: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProductResponse:
    try:
        logger.info(f"Creating product: {product_in.name}, category={product_in.category}, price={product_in.price}")
        product = await create_product(db, product_in, current_user.id)
        logger.info(f"Product created successfully with id={product.id}")
        return ProductResponse.model_validate(product)
    except Exception as e:
        logger.error(f"Error creating product: {e}")
        logger.error(f"Exception type: {type(e).__name__}")
        logger.error(f"Exception details: {str(e)}")
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
    return ProductResponse.model_validate(product)


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
    product = await update_product(db, db_product, product_in)
    return ProductResponse.model_validate(product)


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
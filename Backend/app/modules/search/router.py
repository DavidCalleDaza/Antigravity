"""
DonApp API — Global Search Router.
Provides multi-entity live search across products, services, businesses, and users.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.db.session import get_db
from app.modules.auth.models import User
from app.modules.products.models import Product
from app.modules.services.models import Service

router = APIRouter(tags=["Global Search"])


class SearchResultItem(BaseModel):
    id: str
    type: str  # "product" | "service" | "business" | "user"
    title: str
    subtitle: Optional[str] = None
    badge_label: str
    badge_type: str  # "product" | "service" | "business" | "user"
    image_url: Optional[str] = None
    price: Optional[float] = None
    url: str
    category_name: Optional[str] = None


class SearchResponse(BaseModel):
    query: str
    total: int
    results: List[SearchResultItem]


@router.get(
    "",
    response_model=SearchResponse,
    status_code=status.HTTP_200_OK,
    summary="Búsqueda Global Inteligente",
    description="Busca en tiempo real entre usuarios, negocios, productos y servicios.",
)
async def global_search(
    q: str = Query(..., min_length=1, description="Texto de búsqueda"),
    limit: int = Query(20, ge=1, le=50, description="Límite máximo de resultados"),
    db: AsyncSession = Depends(get_db),
) -> SearchResponse:
    query_str = q.strip()
    if not query_str:
        return SearchResponse(query=q, total=0, results=[])

    search_pattern = f"%{query_str}%"
    results: List[SearchResultItem] = []

    # 1. Buscar Productos (activos)
    product_stmt = (
        select(Product)
        .options(selectinload(Product.category), selectinload(Product.user))
        .where(
            Product.status == "active",
            or_(
                Product.name.ilike(search_pattern),
                Product.description.ilike(search_pattern),
            ),
        )
        .limit(limit)
    )
    product_res = await db.execute(product_stmt)
    products = product_res.scalars().all()

    for p in products:
        cat_name = p.category.name if p.category else None
        subtitle_parts = []
        if cat_name:
            subtitle_parts.append(cat_name)
        if p.price is not None:
            subtitle_parts.append(f"${float(p.price):,.2f}")

        results.append(
            SearchResultItem(
                id=str(p.id),
                type="product",
                title=p.name,
                subtitle=" • ".join(subtitle_parts) if subtitle_parts else "Producto",
                badge_label="Producto",
                badge_type="product",
                image_url=p.image_url,
                price=float(p.price) if p.price is not None else None,
                url="/products",
                category_name=cat_name,
            )
        )

    # 2. Buscar Servicios (activos)
    service_stmt = (
        select(Service)
        .options(joinedload(Service.category), joinedload(Service.user))
        .where(
            Service.status == "active",
            or_(
                Service.name.ilike(search_pattern),
                Service.description.ilike(search_pattern),
            ),
        )
        .limit(limit)
    )
    service_res = await db.execute(service_stmt)
    services = service_res.scalars().all()

    for s in services:
        cat_name = s.category.name if s.category else None
        subtitle_parts = []
        if cat_name:
            subtitle_parts.append(cat_name)
        if s.price is not None:
            subtitle_parts.append(f"${float(s.price):,.2f}")
        if s.duration:
            subtitle_parts.append(f"{s.duration} min")

        results.append(
            SearchResultItem(
                id=str(s.id),
                type="service",
                title=s.name,
                subtitle=" • ".join(subtitle_parts) if subtitle_parts else "Servicio",
                badge_label="Servicio",
                badge_type="service",
                image_url=s.image_url,
                price=float(s.price) if s.price is not None else None,
                url="/services",
                category_name=cat_name,
            )
        )

    # 3. Buscar Usuarios y Negocios (activos y aprobados)
    user_stmt = (
        select(User)
        .options(selectinload(User.location))
        .where(
            User.is_active == True,
            User.is_approved == True,
            or_(
                User.full_name.ilike(search_pattern),
                User.email.ilike(search_pattern),
                User.business_name.ilike(search_pattern),
            ),
        )
        .limit(limit)
    )
    user_res = await db.execute(user_stmt)
    users = user_res.scalars().all()

    for u in users:
        is_seller_or_business = bool(u.business_name) or u.role in ("seller", "admin")
        location_str = (
            f"{u.location.city}, {u.location.country}"
            if u.location and u.location.city
            else None
        )

        if is_seller_or_business and u.business_name and query_str.lower() in u.business_name.lower():
            # Match prioritario como Negocio
            sub = f"Propietario: {u.full_name}"
            if location_str:
                sub += f" • {location_str}"
            results.append(
                SearchResultItem(
                    id=str(u.id),
                    type="business",
                    title=u.business_name,
                    subtitle=sub,
                    badge_label="Negocio",
                    badge_type="business",
                    image_url=u.avatar_url,
                    url="/wall",
                    category_name="Comercio",
                )
            )
        else:
            # Match como Usuario / Cliente
            role_map = {"admin": "Administrador", "seller": "Comerciante", "client": "Cliente"}
            user_role_label = role_map.get(u.role, "Usuario")
            sub = u.email
            if location_str:
                sub += f" • {location_str}"

            results.append(
                SearchResultItem(
                    id=str(u.id),
                    type="user",
                    title=u.full_name,
                    subtitle=sub,
                    badge_label=user_role_label,
                    badge_type="user",
                    image_url=u.avatar_url,
                    url="/wall",
                    category_name=user_role_label,
                )
            )

    # Limitar y ordenar resultados
    final_results = results[:limit]
    return SearchResponse(query=query_str, total=len(final_results), results=final_results)

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_
from typing import List
import uuid

from app.db.session import get_db
from app.modules.auth.deps import require_staff
from app.modules.auth.models import User
from app.modules.social import crud, schemas
from app.modules.social.manual_credentials_service import save_manual_credentials
from pydantic import BaseModel

router = APIRouter(prefix="/admin/social", tags=["admin_social"])

class UserSearchResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: str

@router.get("/users", response_model=List[UserSearchResponse])
async def search_users(
    search: str = Query(..., min_length=2),
    current_staff=Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Search users for administrative purposes."""
    stmt = select(User).where(
        or_(
            User.email.ilike(f"%{search}%"),
            User.full_name.ilike(f"%{search}%")
        )
    ).limit(20)
    result = await db.execute(stmt)
    users = result.scalars().all()
    return users

@router.get("/accounts/{user_id}", response_model=List[schemas.SocialAccountResponse])
async def admin_get_accounts(
    user_id: uuid.UUID,
    current_staff=Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """View connected accounts for a specific user."""
    return await crud.get_user_social_accounts(db, user_id)

@router.post("/accounts/{user_id}/manual/validate")
async def admin_manual_validate(
    user_id: uuid.UUID,
    req: schemas.ManualValidateRequest,
    current_staff=Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Validate credentials for a specific user."""
    return await save_manual_credentials(
        db=db,
        target_user_id=user_id,
        acting_user_id=current_staff.id,
        platform_group=req.platform_group,
        app_id=req.app_id,
        app_secret=req.app_secret,
        access_token=req.access_token,
    )

@router.post("/accounts/{user_id}/manual/confirm")
async def admin_manual_confirm(
    user_id: uuid.UUID,
    req: schemas.ManualConfirmRequest,
    current_staff=Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Confirm connection for a specific user."""
    if req.platform_group == "meta":
        fb_in = schemas.SocialAccountCreate(
            platform="facebook",
            platform_user_id=req.selected_account_id,
            platform_username=req.selected_account_name,
            access_token=req.access_token,
        )
        fb_account = await crud.create_or_update_social_account(db, user_id, fb_in)
        fb_account.last_modified_by = current_staff.id
        
        if req.instagram_business_account_id:
            ig_in = schemas.SocialAccountCreate(
                platform="instagram",
                platform_user_id=req.instagram_business_account_id,
                platform_username=None,
                access_token=req.access_token,
            )
            ig_account = await crud.create_or_update_social_account(db, user_id, ig_in)
            ig_account.last_modified_by = current_staff.id
            
    elif req.platform_group == "tiktok":
        tiktok_in = schemas.SocialAccountCreate(
            platform="tiktok",
            platform_user_id=req.selected_account_id,
            platform_username=req.selected_account_name,
            access_token=req.access_token,
        )
        tk_account = await crud.create_or_update_social_account(db, user_id, tiktok_in)
        tk_account.last_modified_by = current_staff.id
        
    await db.commit()
    return {"status": "success"}

@router.delete("/accounts/{user_id}/{platform}", status_code=204)
async def admin_delete_account(
    user_id: uuid.UUID,
    platform: str,
    current_staff=Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Delete a social account for a specific user."""
    deleted = await crud.delete_social_account(db, user_id, platform)
    if not deleted:
        raise HTTPException(status_code=404, detail="Account not found")
    return None

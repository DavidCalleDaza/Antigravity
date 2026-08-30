import uuid
from datetime import datetime, time, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from app.modules.ai.models import AiGenerationTask, ArchivedCopy, CopyRequest
from app.core.config import settings

async def create_ai_task(
    db: AsyncSession,
    user_id: uuid.UUID,
    product_id: uuid.UUID = None,
    service_id: uuid.UUID = None,
    task_type: str = "generate_video",
) -> AiGenerationTask:
    db_obj = AiGenerationTask(
        user_id=user_id,
        product_id=product_id,
        service_id=service_id,
        status="pending",
        task_type=task_type,
    )
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

async def update_ai_task_status(
    db: AsyncSession,
    task_id: uuid.UUID,
    status: str,
    video_url: str = None,
    media_url: str = None,
    error_message: str = None,
    estimated_cost_usd: float = None,
) -> AiGenerationTask:
    result = await db.execute(select(AiGenerationTask).where(AiGenerationTask.id == task_id))
    task = result.scalar_one_or_none()
    if task:
        task.status = status
        if video_url:
            task.video_url = video_url
        if media_url:
            task.media_url = media_url
        if error_message:
            task.error_message = error_message
        if estimated_cost_usd is not None:
            task.estimated_cost_usd = estimated_cost_usd
        if status in ["success", "failed"]:
            task.completed_at = func.now()
        await db.commit()
        await db.refresh(task)
    return task

async def get_ai_task(db: AsyncSession, task_id: uuid.UUID) -> AiGenerationTask:
    result = await db.execute(select(AiGenerationTask).where(AiGenerationTask.id == task_id))
    return result.scalar_one_or_none()

async def count_video_tasks_today(db: AsyncSession) -> int:
    """Cuenta solo tareas de generación de video (Veo) — no mejoras de audio/video."""
    today_start = datetime.combine(datetime.now(timezone.utc).date(), time.min).replace(tzinfo=timezone.utc)
    result = await db.execute(
        select(func.count(AiGenerationTask.id)).where(
            AiGenerationTask.created_at >= today_start,
            AiGenerationTask.task_type == "generate_video",
        )
    )
    return result.scalar_one() or 0


# --- Copy requests (CR-3) ---

async def create_copy_request(
    db: AsyncSession,
    user_id: uuid.UUID,
    product_name: str,
    description: str,
    tone: str | None,
    platform: str | None,
    product_id: uuid.UUID | None = None,
    service_id: uuid.UUID | None = None,
) -> CopyRequest:
    db_obj = CopyRequest(
        user_id=user_id,
        status="pending",
        product_name=product_name,
        description=description,
        tone=tone,
        platform=platform,
        product_id=product_id,
        service_id=service_id,
    )
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj


async def complete_copy_request(
    db: AsyncSession,
    request_id: uuid.UUID,
    generated_text: str,
) -> CopyRequest:
    result = await db.execute(select(CopyRequest).where(CopyRequest.id == request_id))
    request = result.scalar_one_or_none()
    if request is None:
        return None
    request.status = "success"
    request.generated_text = generated_text
    request.completed_at = func.now()
    await db.commit()
    await db.refresh(request)
    return request


async def fail_copy_request(
    db: AsyncSession,
    request_id: uuid.UUID,
    error_message: str,
) -> CopyRequest:
    result = await db.execute(select(CopyRequest).where(CopyRequest.id == request_id))
    request = result.scalar_one_or_none()
    if request is None:
        return None
    request.status = "failed"
    request.error_message = error_message
    request.completed_at = func.now()
    await db.commit()
    await db.refresh(request)
    return request


async def get_copy_request(db: AsyncSession, request_id: uuid.UUID) -> CopyRequest:
    result = await db.execute(select(CopyRequest).where(CopyRequest.id == request_id))
    return result.scalar_one_or_none()


async def list_copy_requests(db: AsyncSession, user_id: uuid.UUID, limit: int = 20) -> list[CopyRequest]:
    result = await db.execute(
        select(CopyRequest)
        .where(CopyRequest.user_id == user_id)
        .order_by(CopyRequest.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


# --- Archived copies ---

async def create_archived_copy(
    db: AsyncSession,
    user_id: uuid.UUID,
    title: str,
    content: str,
    kind: str = "copy",
    source_task_id: uuid.UUID | None = None,
) -> ArchivedCopy:
    db_obj = ArchivedCopy(
        user_id=user_id,
        title=title,
        content=content,
        kind=kind,
        source_task_id=source_task_id,
    )
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj


async def list_archived_copies(db: AsyncSession, user_id: uuid.UUID, limit: int = 50) -> list[ArchivedCopy]:
    result = await db.execute(
        select(ArchivedCopy)
        .where(ArchivedCopy.user_id == user_id)
        .order_by(ArchivedCopy.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())

import uuid
from datetime import datetime, time, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from app.modules.ai.models import AiGenerationTask
from app.core.config import settings

async def create_ai_task(db: AsyncSession, user_id: uuid.UUID, product_id: uuid.UUID = None, service_id: uuid.UUID = None) -> AiGenerationTask:
    db_obj = AiGenerationTask(
        user_id=user_id,
        product_id=product_id,
        service_id=service_id,
        status="pending"
    )
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

async def update_ai_task_status(db: AsyncSession, task_id: uuid.UUID, status: str, video_url: str = None, error_message: str = None, estimated_cost_usd: float = None) -> AiGenerationTask:
    result = await db.execute(select(AiGenerationTask).where(AiGenerationTask.id == task_id))
    task = result.scalar_one_or_none()
    if task:
        task.status = status
        if video_url:
            task.video_url = video_url
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
    today_start = datetime.combine(datetime.now(timezone.utc).date(), time.min).replace(tzinfo=timezone.utc)
    result = await db.execute(
        select(func.count(AiGenerationTask.id)).where(AiGenerationTask.created_at >= today_start)
    )
    return result.scalar_one() or 0

import asyncio
import uuid
from app.core.celery_app import celery_app
from app.db.session import async_session_factory
from app.modules.ai import crud, service

async def _process_video_task(task_id_str: str, image_gcs_uri: str, prompt: str):
    task_id = uuid.UUID(task_id_str)
    
    async with async_session_factory() as db:
        try:
            # Generate the video
            video_uri = await service.generate_video_from_image(image_gcs_uri, prompt)
            
            # Update the task status to success
            await crud.update_ai_task_status(
                db, 
                task_id, 
                status="success", 
                video_url=video_uri,
                estimated_cost_usd=0.60 # Default estimated cost for Veo Fast mode
            )
        except Exception as e:
            # Update task status to failed
            await crud.update_ai_task_status(
                db, 
                task_id, 
                status="failed", 
                error_message=str(e)
            )
            raise e

@celery_app.task(
    name="ai.generate_video",
    bind=True,
    max_retries=1, # Veo tasks shouldn't be retried too many times due to cost
)
def generate_video_task(self, task_id_str: str, image_gcs_uri: str, prompt: str):
    """
    Celery task to generate a video using Veo in the background.
    """
    loop = celery_app._worker_loop
    try:
        loop.run_until_complete(
            _process_video_task(task_id_str, image_gcs_uri, prompt)
        )
    except Exception as exc:
        raise self.retry(exc=exc, countdown=10)

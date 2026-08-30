import asyncio
import os
import uuid
from app.core.celery_app import celery_app
from app.db.session import async_session_factory
from app.modules.ai import crud, service

async def _process_video_task(task_id_str: str, image_gcs_uri: str, prompt: str):
    task_id = uuid.UUID(task_id_str)

    from app.modules.tokens.pricing import estimate_cost_usd
    from app.modules.tokens.service import record_usage

    # Decisión confirmada: la API de Veo no expone la duración; se estima el
    # mínimo de Veo Fast (3s) y se marca el registro como is_estimated.
    video_seconds = 3
    cost_usd = estimate_cost_usd(
        "veo-3.1-fast-generate-preview",
        video_seconds=video_seconds,
        video_quality="720p",
    )

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
                estimated_cost_usd=cost_usd,
            )

            # Record real token/cost usage (replaces the old 0.60 hardcode).
            task = await crud.get_ai_task(db, task_id)
            if task is not None:
                await record_usage(
                    db,
                    user_id=task.user_id,
                    ai_action="generate_video",
                    model_name="veo-3.1-fast-generate-preview",
                    cost_usd=cost_usd,
                    video_seconds=video_seconds,
                    is_estimated=True,
                    product_id=task.product_id,
                    service_id=task.service_id,
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


async def _run_enhance_task(
    task_id_str: str,
    local_input_path: str,
    enhance_fn,
    ai_action: str,
    model_name: str,
    output_ext: str,
):
    """
    Estructura compartida por las mejoras de audio/video con IA: lee el
    archivo local, llama al servicio del proveedor (Auphonic/Replicate),
    guarda el resultado en uploads/ai_enhance/ y actualiza el AiGenerationTask.
    """
    task_id = uuid.UUID(task_id_str)

    from app.modules.tokens.pricing import estimate_cost_usd
    from app.modules.tokens.service import record_usage

    async with async_session_factory() as db:
        try:
            with open(local_input_path, "rb") as f:
                file_bytes = f.read()

            import mimetypes
            content_type = mimetypes.guess_type(local_input_path)[0] or "application/octet-stream"
            filename = os.path.basename(local_input_path)

            enhanced_bytes, _mime_type = await enhance_fn(file_bytes, filename, content_type)

            os.makedirs("uploads/ai_enhance", exist_ok=True)
            result_filename = f"{uuid.uuid4()}.{output_ext}"
            result_path = f"uploads/ai_enhance/{result_filename}"
            with open(result_path, "wb") as f:
                f.write(enhanced_bytes)
            media_url = f"/uploads/ai_enhance/{result_filename}"

            cost_usd = estimate_cost_usd(model_name)

            await crud.update_ai_task_status(
                db,
                task_id,
                status="success",
                media_url=media_url,
                estimated_cost_usd=cost_usd,
            )

            task = await crud.get_ai_task(db, task_id)
            if task is not None:
                await record_usage(
                    db,
                    user_id=task.user_id,
                    ai_action=ai_action,
                    model_name=model_name,
                    cost_usd=cost_usd,
                    is_estimated=True,
                    product_id=task.product_id,
                    service_id=task.service_id,
                )
        except Exception as e:
            await crud.update_ai_task_status(db, task_id, status="failed", error_message=str(e))
            raise e
        finally:
            try:
                os.remove(local_input_path)
            except OSError:
                pass


async def _process_audio_enhance_task(task_id_str: str, local_input_path: str):
    await _run_enhance_task(
        task_id_str, local_input_path, service.enhance_audio, "enhance_audio", "auphonic-enhance", "mp3"
    )


async def _process_video_enhance_task(task_id_str: str, local_input_path: str):
    await _run_enhance_task(
        task_id_str, local_input_path, service.enhance_video, "enhance_video", "lucataco/real-esrgan-video", "mp4"
    )


@celery_app.task(name="ai.enhance_audio", bind=True, max_retries=1)
def enhance_audio_task(self, task_id_str: str, local_input_path: str):
    """Celery task to enhance an audio file (noise reduction + leveling) via Auphonic."""
    loop = celery_app._worker_loop
    try:
        loop.run_until_complete(_process_audio_enhance_task(task_id_str, local_input_path))
    except Exception as exc:
        raise self.retry(exc=exc, countdown=10)


@celery_app.task(name="ai.enhance_video", bind=True, max_retries=1)
def enhance_video_task(self, task_id_str: str, local_input_path: str):
    """Celery task to upscale a video file via Replicate (lucataco/real-esrgan-video)."""
    loop = celery_app._worker_loop
    try:
        loop.run_until_complete(_process_video_enhance_task(task_id_str, local_input_path))
    except Exception as exc:
        raise self.retry(exc=exc, countdown=10)

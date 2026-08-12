import os
from celery import Celery
from celery.signals import worker_process_init
from app.core.config import settings

celery_app = Celery(
    "donapp_worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.modules.social.tasks", "app.modules.ai.tasks", "app.modules.whatsapp.tasks", "app.modules.agenda.tasks", "app.modules.wall.tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
)


@worker_process_init.connect
def init_worker(**kwargs):
    """
    Runs in each child process after fork.
    Creates a persistent event loop and refreshes the shared engine pool
    so every ForkPoolWorker has its own loop + fresh connections.
    """
    import asyncio
    from app.db.session import engine

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    # Dispose the shared engine to drop any connections inherited from
    # the parent process; fresh ones will be created on this child's loop.
    loop.run_until_complete(engine.dispose())

    # Store the loop so task modules can reference it
    celery_app._worker_loop = loop


# ── Phase 4.3: Background Token Refresh (WRITTEN BUT INACTIVE) ──────────────
#
# DO NOT ACTIVATE THIS YET. In the current production environment (Render),
# there is NO Celery worker deployed, only Redis. We rely on lazy refresh 
# at publish time (in tasks.py). If we add a worker in the future, uncomment this.
#
# from celery.schedules import crontab
# celery_app.conf.beat_schedule = {
#     "refresh-expiring-tokens-daily": {
#         "task": "social.refresh_expiring_tokens",
#         "schedule": crontab(hour=2, minute=0),  # Run daily at 2:00 AM UTC
#     },
# }

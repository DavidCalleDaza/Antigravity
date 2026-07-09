import os
from celery import Celery
from app.core.config import settings

# Setup Celery
celery_app = Celery(
    "servinow_worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.modules.social.tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
)

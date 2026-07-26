import logging
import uuid
from app.core.celery_app import celery_app
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.db.session import async_session_factory
from app.core.email import send_email
from app.modules.agenda.models import Appointment
from app.modules.notifications.crud import create_notification
from app.modules.notifications.ws import manager
from app.core.config import settings

logger = logging.getLogger(__name__)

async def _notify_seller(appointment_id: str, retries: int = 0):
    async with async_session_factory() as db:
        stmt = (
            select(Appointment)
            .options(
                selectinload(Appointment.seller),
                selectinload(Appointment.client),
                selectinload(Appointment.service),
            )
            .where(Appointment.id == uuid.UUID(appointment_id))
        )
        result = await db.execute(stmt)
        apt = result.scalar_one_or_none()

        if not apt or not apt.seller:
            logger.warning(f"Cita {appointment_id} no encontrada o sin vendedor, no se puede notificar.")
            return

        # 1. Crear notificación en DB
        notif_data = {"appointment_id": str(apt.id)}
        notif_msg = f"Nueva solicitud de cita de {apt.client.full_name if apt.client else 'Cliente'}"
        notif = await create_notification(
            db=db,
            user_id=apt.seller.id,
            type="appointment_request",
            title="Nueva Cita Solicitada",
            message=notif_msg,
            data_json=notif_data
        )

        # 2. Push WebSocket
        await manager.send_to_user(apt.seller.id, {
            "id": str(notif.id),
            "type": notif.type,
            "title": notif.title,
            "message": notif.message,
            "is_read": notif.is_read,
            "data_json": notif.data_json,
            "created_at": notif.created_at
        })

        # 3. Enviar Email
        if apt.seller.email:
            send_email(
                to=apt.seller.email,
                subject="Tienes una nueva solicitud de cita",
                template_name="appointment_request.html",
                context={
                    "company_name": settings.COMPANY_NAME,
                    "company_phone": settings.COMPANY_PHONE,
                    "company_city": settings.COMPANY_CITY,
                    "client_name": apt.client.full_name if apt.client else 'Cliente',
                    "service_name": apt.service.name if apt.service else 'General',
                    "date": str(apt.date),
                    "start_time": apt.start_time.strftime("%H:%M") if apt.start_time else "",
                    "frontend_url": settings.FRONTEND_URL
                }
            )

async def _notify_client(appointment_id: str, retries: int = 0):
    async with async_session_factory() as db:
        stmt = (
            select(Appointment)
            .options(
                selectinload(Appointment.seller),
                selectinload(Appointment.client),
                selectinload(Appointment.service),
                selectinload(Appointment.store_location)
            )
            .where(Appointment.id == uuid.UUID(appointment_id))
        )
        result = await db.execute(stmt)
        apt = result.scalar_one_or_none()

        if not apt or not apt.client:
            logger.warning(f"Cita {appointment_id} no encontrada o sin cliente, no se puede notificar.")
            return

        # 1. Crear notificación en DB
        notif_data = {"appointment_id": str(apt.id)}
        notif_msg = f"Tu cita con {apt.seller.full_name if apt.seller else 'el vendedor'} ha sido confirmada"
        notif = await create_notification(
            db=db,
            user_id=apt.client.id,
            type="appointment_confirmed",
            title="Cita Confirmada",
            message=notif_msg,
            data_json=notif_data
        )

        # 2. Push WebSocket
        await manager.send_to_user(apt.client.id, {
            "id": str(notif.id),
            "type": notif.type,
            "title": notif.title,
            "message": notif.message,
            "is_read": notif.is_read,
            "data_json": notif.data_json,
            "created_at": notif.created_at
        })

        # 3. Enviar Email
        if apt.client.email:
            send_email(
                to=apt.client.email,
                subject="Tu cita ha sido confirmada",
                template_name="appointment_confirmed.html",
                context={
                    "company_name": settings.COMPANY_NAME,
                    "company_phone": settings.COMPANY_PHONE,
                    "company_city": settings.COMPANY_CITY,
                    "client_name": apt.client.full_name,
                    "seller_name": apt.seller.full_name if apt.seller else 'Vendedor',
                    "service_name": apt.service.name if apt.service else 'General',
                    "date": str(apt.date),
                    "start_time": apt.start_time.strftime("%H:%M") if apt.start_time else "",
                    "location_name": apt.store_location.name if apt.store_location else "",
                    "frontend_url": settings.FRONTEND_URL
                }
            )


async def _notify_cancellation(appointment_id: str, retries: int = 0):
    """Notify the other party when an appointment is cancelled."""
    async with async_session_factory() as db:
        stmt = (
            select(Appointment)
            .options(
                selectinload(Appointment.seller),
                selectinload(Appointment.client),
                selectinload(Appointment.service),
            )
            .where(Appointment.id == uuid.UUID(appointment_id))
        )
        result = await db.execute(stmt)
        apt = result.scalar_one_or_none()

        if not apt:
            logger.warning(f"Cita {appointment_id} no encontrada, no se puede notificar cancelación.")
            return

        notif_data = {"appointment_id": str(apt.id)}

        # Determine who cancelled and notify the other party
        # If seller cancelled, notify client; if client cancelled, notify seller
        # The last status update determines who made the change
        notify_user = None
        notif_msg = ""
        notif_type = "appointment_cancelled"
        notif_title = "Cita Cancelada"

        if apt.client:
            # Notify seller that the client cancelled
            notify_user = apt.seller
            notif_msg = f"La cita con {apt.client.full_name} ha sido cancelada"
        elif apt.seller:
            # Notify client that the seller cancelled
            notify_user = apt.client
            notif_msg = f"La cita con {apt.seller.full_name} ha sido cancelada"

        if not notify_user:
            return

        # 1. Crear notificación en DB
        notif = await create_notification(
            db=db,
            user_id=notify_user.id,
            type=notif_type,
            title=notif_title,
            message=notif_msg,
            data_json=notif_data
        )

        # 2. Push WebSocket
        await manager.send_to_user(notify_user.id, {
            "id": str(notif.id),
            "type": notif.type,
            "title": notif.title,
            "message": notif.message,
            "is_read": notif.is_read,
            "data_json": notif.data_json,
            "created_at": notif.created_at
        })

        # 3. Enviar Email
        if notify_user.email:
            send_email(
                to=notify_user.email,
                subject="Tu cita ha sido cancelada",
                template_name="appointment_cancelled.html",
                context={
                    "company_name": settings.COMPANY_NAME,
                    "company_phone": settings.COMPANY_PHONE,
                    "company_city": settings.COMPANY_CITY,
                    "client_name": apt.client.full_name if apt.client else 'Cliente',
                    "seller_name": apt.seller.full_name if apt.seller else 'Vendedor',
                    "service_name": apt.service.name if apt.service else 'General',
                    "date": str(apt.date),
                    "start_time": apt.start_time.strftime("%H:%M") if apt.start_time else "",
                    "cancellation_reason": apt.cancellation_reason or "",
                    "frontend_url": settings.FRONTEND_URL
                }
            )


@celery_app.task(name="send_appointment_request_notification", bind=True, max_retries=3)
def send_appointment_request_notification(self, appointment_id: str):
    loop = celery_app._worker_loop
    try:
        loop.run_until_complete(_notify_seller(appointment_id, retries=self.request.retries))
    except Exception as exc:
        logger.error(f"Error en send_appointment_request_notification: {exc}")
        raise self.retry(exc=exc, countdown=10)

@celery_app.task(name="send_appointment_confirmation_notification", bind=True, max_retries=3)
def send_appointment_confirmation_notification(self, appointment_id: str):
    loop = celery_app._worker_loop
    try:
        loop.run_until_complete(_notify_client(appointment_id, retries=self.request.retries))
    except Exception as exc:
        logger.error(f"Error en send_appointment_confirmation_notification: {exc}")
        raise self.retry(exc=exc, countdown=10)

@celery_app.task(name="send_appointment_cancellation_notification", bind=True, max_retries=3)
def send_appointment_cancellation_notification(self, appointment_id: str):
    loop = celery_app._worker_loop
    try:
        loop.run_until_complete(_notify_cancellation(appointment_id, retries=self.request.retries))
    except Exception as exc:
        logger.error(f"Error en send_appointment_cancellation_notification: {exc}")
        raise self.retry(exc=exc, countdown=10)

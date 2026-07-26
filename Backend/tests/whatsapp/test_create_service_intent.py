"""Tests for create_service intent handling in whatsapp/tasks.py."""

import pytest
from unittest.mock import patch, AsyncMock, MagicMock

from app.modules.whatsapp.tasks import async_process_message

pytestmark = pytest.mark.asyncio


def _make_text_payload(text: str, message_id: str = "msg_svc_123", from_phone: str = "+14444444444"):
    """Build a WhatsApp text message payload."""
    return {
        "entry": [
            {
                "changes": [
                    {
                        "value": {
                            "messages": [
                                {
                                    "id": message_id,
                                    "from": from_phone,
                                    "type": "text",
                                    "text": {"body": text},
                                }
                            ]
                        }
                    }
                ]
            }
        ]
    }


def _make_mock_session_with_identity(user_id="user-svc-uuid"):
    """Mock session that returns a linked identity."""
    mock_identity = MagicMock()
    mock_identity.user.id = user_id

    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = mock_identity

    mock_session = MagicMock()
    mock_session.execute = AsyncMock(return_value=mock_result)

    mock_factory = MagicMock()
    mock_factory.return_value.__aenter__ = AsyncMock(return_value=mock_session)
    mock_factory.return_value.__aexit__ = AsyncMock(return_value=False)

    return mock_factory


@patch("app.modules.whatsapp.tasks.create_service", new_callable=AsyncMock)
@patch("app.modules.whatsapp.tasks.create_product", new_callable=AsyncMock)
@patch("app.modules.whatsapp.tasks.whatsapp_service")
@patch("app.modules.whatsapp.tasks.parse_whatsapp_intent", new_callable=AsyncMock)
@patch("app.modules.whatsapp.tasks.redis_client")
async def test_create_service_intent(
    mock_redis, mock_parse_intent, mock_service,
    mock_create_product, mock_create_service
):
    """Message with create_service intent and complete fields should call create_service."""
    mock_service.send_text_message = AsyncMock()
    from_phone = "+14444444444"
    mock_factory = _make_mock_session_with_identity()

    mock_redis.get = AsyncMock(return_value=None)  # no draft
    mock_redis.delete = AsyncMock()
    mock_redis.set = AsyncMock(return_value="1")  # dedup: first time

    mock_parse_intent.return_value = MagicMock(
        intent="create_service",
        entities={"name": "corte de cabello", "price": 15000, "description": None, "category": None},
        missing_fields=[],
        bot_reply="Voy a crear el servicio corte de cabello por $15000",
    )

    mock_service_obj = MagicMock()
    mock_service_obj.name = "corte de cabello"
    mock_service_obj.price = 15000.0
    mock_create_service.return_value = mock_service_obj

    with patch("app.modules.whatsapp.tasks.async_session_factory", mock_factory):
        await async_process_message(_make_text_payload("Crear servicio corte de cabello por 15000", from_phone=from_phone), retries=0)

    # create_service should be called, NOT create_product
    mock_create_service.assert_called_once()
    mock_create_product.assert_not_called()

    # Verify the service was created with correct data
    call_args = mock_create_service.call_args
    service_in = call_args.args[1]  # second positional arg is ServiceCreate
    assert service_in.name == "corte de cabello"
    assert service_in.price == 15000.0


@patch("app.modules.whatsapp.tasks.create_service", new_callable=AsyncMock)
@patch("app.modules.whatsapp.tasks.create_product", new_callable=AsyncMock)
@patch("app.modules.whatsapp.tasks.whatsapp_service")
@patch("app.modules.whatsapp.tasks.parse_whatsapp_intent", new_callable=AsyncMock)
@patch("app.modules.whatsapp.tasks.redis_client")
async def test_create_service_sends_correct_confirmation(
    mock_redis, mock_parse_intent, mock_service,
    mock_create_product, mock_create_service
):
    """create_service should send confirmation with 'Servicio' word, not 'Producto'."""
    mock_service.send_text_message = AsyncMock()
    from_phone = "+14444444444"
    mock_factory = _make_mock_session_with_identity()

    mock_redis.get = AsyncMock(return_value=None)
    mock_redis.delete = AsyncMock()
    mock_redis.set = AsyncMock(return_value="1")

    mock_parse_intent.return_value = MagicMock(
        intent="create_service",
        entities={"name": "manicure", "price": 25000},
        missing_fields=[],
        bot_reply="Creando servicio...",
    )

    mock_service_obj = MagicMock()
    mock_service_obj.name = "manicure"
    mock_service_obj.price = 25000.0
    mock_create_service.return_value = mock_service_obj

    with patch("app.modules.whatsapp.tasks.async_session_factory", mock_factory):
        await async_process_message(_make_text_payload("servicio manicure 25000", from_phone=from_phone), retries=0)

    # Confirmation message should mention "Servicio", not "Producto"
    sent_message = mock_service.send_text_message.call_args[0][1]
    assert "Servicio" in sent_message
    assert "manicure" in sent_message

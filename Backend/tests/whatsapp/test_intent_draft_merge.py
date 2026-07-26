"""Tests for intent draft merging and effective_intent fallback in whatsapp/tasks.py."""

import json
import pytest
from unittest.mock import patch, AsyncMock, MagicMock

from app.modules.whatsapp.tasks import async_process_message

pytestmark = pytest.mark.asyncio


def _make_text_payload(text: str, message_id: str = "msg_123", from_phone: str = "+15555555555"):
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


def _make_mock_session_with_identity(user_id="user-draft-uuid"):
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


def _mock_intent_response(intent="create_product", entities=None, missing_fields=None, bot_reply="¿Cuál es el precio?"):
    """Create a mock WhatsAppIntentResponse."""
    mock = MagicMock()
    mock.intent = intent
    mock.entities = entities or {}
    mock.missing_fields = missing_fields or ["name", "price"]
    mock.bot_reply = bot_reply
    return mock


@patch("app.modules.whatsapp.tasks.create_product", new_callable=AsyncMock)
@patch("app.modules.whatsapp.tasks.whatsapp_service")
@patch("app.modules.whatsapp.tasks.parse_whatsapp_intent", new_callable=AsyncMock)
@patch("app.modules.whatsapp.tasks.redis_client")
async def test_draft_saved_when_price_missing(
    mock_redis, mock_parse_intent, mock_service, mock_create_product
):
    """Message 1 with name but no price should save a draft."""
    mock_service.send_text_message = AsyncMock()
    from_phone = "+15555555555"
    mock_factory = _make_mock_session_with_identity()

    # LLM says: name present, price missing
    mock_parse_intent.return_value = _mock_intent_response(
        entities={"name": "empanada", "price": None},
        missing_fields=["price"],
        bot_reply="¿Cuánto cuesta la empanada?",
    )

    # No existing draft
    mock_redis.get = AsyncMock(return_value=None)
    mock_redis.setex = AsyncMock()
    mock_redis.set = AsyncMock(return_value="1")  # dedup: first time

    with patch("app.modules.whatsapp.tasks.async_session_factory", mock_factory):
        await async_process_message(_make_text_payload("Quiero vender empanadas", from_phone=from_phone), retries=0)

    # Draft should be saved
    mock_redis.setex.assert_called()
    draft_call = mock_redis.setex.call_args
    assert "wa_draft" in draft_call.args[0]
    draft_data = json.loads(draft_call.args[2])
    assert draft_data["intent"] == "create_product"
    assert draft_data["entities"]["name"] == "empanada"


@patch("app.modules.whatsapp.tasks.create_product", new_callable=AsyncMock)
@patch("app.modules.whatsapp.tasks.whatsapp_service")
@patch("app.modules.whatsapp.tasks.parse_whatsapp_intent", new_callable=AsyncMock)
@patch("app.modules.whatsapp.tasks.redis_client")
async def test_draft_merged_with_second_message(
    mock_redis, mock_parse_intent, mock_service, mock_create_product
):
    """Message 2 with only price should merge with draft and create product."""
    mock_service.send_text_message = AsyncMock()
    from_phone = "+15555555555"
    user_id = "user-draft-uuid"
    mock_factory = _make_mock_session_with_identity(user_id)

    # Existing draft from message 1
    existing_draft = json.dumps({
        "intent": "create_product",
        "entities": {"name": "empanada", "price": None},
    })

    async def mock_get(key):
        if "wa_draft" in key:
            return existing_draft
        return None

    mock_redis.get = AsyncMock(side_effect=mock_get)
    mock_redis.delete = AsyncMock()
    mock_redis.setex = AsyncMock()
    mock_redis.set = AsyncMock(return_value="1")

    # LLM says: only price this time
    mock_parse_intent.return_value = _mock_intent_response(
        entities={"name": None, "price": 3000},
        missing_fields=[],
        bot_reply="Perfecto, voy a crear empanada por $3000",
    )

    # Mock create_product to return an object with name/price
    mock_product = MagicMock()
    mock_product.name = "empanada"
    mock_product.price = 3000.0
    mock_create_product.return_value = mock_product

    with patch("app.modules.whatsapp.tasks.async_session_factory", mock_factory):
        await async_process_message(_make_text_payload("3000 pesos", from_phone=from_phone), retries=0)

    # create_product should be called with merged data
    mock_create_product.assert_called_once()
    call_args = mock_create_product.call_args
    product_in = call_args.args[1]  # second positional arg is ProductCreate
    assert product_in.name == "empanada"
    assert product_in.price == 3000.0


@patch("app.modules.whatsapp.tasks.create_product", new_callable=AsyncMock)
@patch("app.modules.whatsapp.tasks.whatsapp_service")
@patch("app.modules.whatsapp.tasks.parse_whatsapp_intent", new_callable=AsyncMock)
@patch("app.modules.whatsapp.tasks.redis_client")
async def test_unknown_intent_rescues_draft_intent(
    mock_redis, mock_parse_intent, mock_service, mock_create_product
):
    """When LLM returns 'unknown' but draft has 'create_product', use draft's intent."""
    mock_service.send_text_message = AsyncMock()
    from_phone = "+15555555555"
    user_id = "user-draft-uuid"
    mock_factory = _make_mock_session_with_identity(user_id)

    # Existing draft with create_product intent
    existing_draft = json.dumps({
        "intent": "create_product",
        "entities": {"name": "empanada", "price": None},
    })

    async def mock_get(key):
        if "wa_draft" in key:
            return existing_draft
        return None

    mock_redis.get = AsyncMock(side_effect=mock_get)
    mock_redis.delete = AsyncMock()
    mock_redis.setex = AsyncMock()
    mock_redis.set = AsyncMock(return_value="1")

    # LLM fails to understand (returns unknown) but provides price
    mock_parse_intent.return_value = _mock_intent_response(
        intent="unknown",
        entities={"name": None, "price": 3000},
        missing_fields=[],
        bot_reply="Voy a crear empanada por $3000",
    )

    mock_product = MagicMock()
    mock_product.name = "empanada"
    mock_product.price = 3000.0
    mock_create_product.return_value = mock_product

    with patch("app.modules.whatsapp.tasks.async_session_factory", mock_factory):
        await async_process_message(_make_text_payload("vale 3000", from_phone=from_phone), retries=0)

    # Should use draft's intent (create_product), not unknown
    mock_create_product.assert_called_once()

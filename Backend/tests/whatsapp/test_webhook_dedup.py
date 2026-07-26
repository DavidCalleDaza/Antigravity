"""Tests for message deduplication in whatsapp/tasks.py."""

import pytest
from unittest.mock import patch, AsyncMock, MagicMock

from app.modules.whatsapp.tasks import async_process_message

pytestmark = pytest.mark.asyncio


def _make_payload(message_id: str, from_phone: str = "+1234567890", text: str = "hola"):
    """Build a minimal WhatsApp webhook payload."""
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


def _make_mock_session_no_identity():
    """Mock session that returns no linked identity."""
    mock_identity_result = MagicMock()
    mock_identity_result.scalars.return_value.first.return_value = None

    mock_session = MagicMock()
    mock_session.execute = AsyncMock(return_value=mock_identity_result)

    mock_factory = MagicMock()
    mock_factory.return_value.__aenter__ = AsyncMock(return_value=mock_session)
    mock_factory.return_value.__aexit__ = AsyncMock(return_value=False)

    return mock_factory


@patch("app.modules.whatsapp.tasks.whatsapp_service")
@patch("app.modules.whatsapp.tasks.redis_client")
async def test_duplicate_message_skipped(mock_redis, mock_service):
    """Same message_id sent twice should only process once."""
    mock_service.send_text_message = AsyncMock()
    message_id = "msg_abc123"
    payload = _make_payload(message_id)
    mock_factory = _make_mock_session_no_identity()

    # First call: SETNX returns "1" (key was set)
    mock_redis.set = AsyncMock(return_value="1")
    mock_redis.get = AsyncMock(return_value=None)  # no identity found

    with patch("app.modules.whatsapp.tasks.async_session_factory", mock_factory):
        await async_process_message(payload, retries=0)

    # send_text_message should be called (unlinked user prompt)
    mock_service.send_text_message.assert_called()

    # Reset mock to track second call
    mock_service.send_text_message.reset_mock()

    # Second call: SETNX returns None (key already exists = duplicate)
    mock_redis.set = AsyncMock(return_value=None)

    await async_process_message(payload, retries=0)

    # send_text_message should NOT be called for duplicate
    mock_service.send_text_message.assert_not_called()


@patch("app.modules.whatsapp.tasks.whatsapp_service")
@patch("app.modules.whatsapp.tasks.redis_client")
async def test_duplicate_skipped_on_retry(mock_redis, mock_service):
    """On retry (retries > 0), dedup check is skipped even for same message_id."""
    mock_service.send_text_message = AsyncMock()
    message_id = "msg_retry123"
    payload = _make_payload(message_id)
    mock_factory = _make_mock_session_no_identity()

    # First call with retries=0: SETNX returns "1" (key set)
    mock_redis.set = AsyncMock(return_value="1")
    mock_redis.get = AsyncMock(return_value=None)

    with patch("app.modules.whatsapp.tasks.async_session_factory", mock_factory):
        await async_process_message(payload, retries=0)
    call_count_first = mock_service.send_text_message.call_count

    # Second call with retries=1: dedup should be skipped
    mock_redis.set = AsyncMock(return_value=None)
    mock_redis.get = AsyncMock(return_value=None)

    with patch("app.modules.whatsapp.tasks.async_session_factory", mock_factory):
        await async_process_message(payload, retries=1)

    # Should still process (send_text_message called again)
    assert mock_service.send_text_message.call_count > call_count_first

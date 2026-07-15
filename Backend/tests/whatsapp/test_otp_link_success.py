"""Tests for successful OTP linking in whatsapp/tasks.py."""

import pytest
from unittest.mock import patch, AsyncMock, MagicMock

from app.modules.whatsapp.tasks import async_process_message

pytestmark = pytest.mark.asyncio


def _make_otp_payload(code: str, from_phone: str = "+17777777777"):
    """Build a payload simulating a 6-digit OTP message."""
    return {
        "entry": [
            {
                "changes": [
                    {
                        "value": {
                            "messages": [
                                {
                                    "id": f"msg_otp_ok_{code}",
                                    "from": from_phone,
                                    "type": "text",
                                    "text": {"body": code},
                                }
                            ]
                        }
                    }
                ]
            }
        ]
    }


def _make_mock_session():
    """Build a properly mocked DB session with context manager support."""
    mock_identity_result = MagicMock()
    mock_identity_result.scalars.return_value.first.return_value = None  # no linked identity

    mock_session = MagicMock()
    mock_session.execute = AsyncMock(return_value=mock_identity_result)
    mock_session.commit = AsyncMock()

    mock_factory = MagicMock()
    mock_factory.return_value.__aenter__ = AsyncMock(return_value=mock_session)
    mock_factory.return_value.__aexit__ = AsyncMock(return_value=False)

    return mock_factory, mock_session


@patch("app.modules.whatsapp.tasks.whatsapp_service")
@patch("app.modules.whatsapp.tasks.redis_client")
async def test_valid_otp_creates_identity(mock_redis, mock_service):
    """Valid OTP should create a UserIdentity and send confirmation."""
    mock_service.send_text_message = AsyncMock()
    from_phone = "+17777777777"
    valid_code = "654321"
    user_id = "user-uuid-456"

    mock_factory, mock_session = _make_mock_session()

    async def mock_get(key):
        if key == f"wa_otp:{valid_code}":
            return user_id
        return None

    mock_redis.get = AsyncMock(side_effect=mock_get)
    mock_redis.delete = AsyncMock()

    with patch("app.modules.whatsapp.tasks.async_session_factory", mock_factory):
        await async_process_message(_make_otp_payload(valid_code, from_phone), retries=0)

    # UserIdentity should be created
    mock_session.add.assert_called_once()
    identity = mock_session.add.call_args[0][0]
    assert identity.provider == "whatsapp"
    assert identity.provider_id == from_phone.lstrip("+")
    assert str(identity.user_id) == user_id

    # Confirmation message should be sent
    mock_service.send_text_message.assert_called_once()
    sent_message = mock_service.send_text_message.call_args[0][1]
    assert "vinculado exitosamente" in sent_message


@patch("app.modules.whatsapp.tasks.whatsapp_service")
@patch("app.modules.whatsapp.tasks.redis_client")
async def test_valid_otp_cleans_redis_keys(mock_redis, mock_service):
    """Valid OTP should clean up OTP and user OTP keys from Redis."""
    mock_service.send_text_message = AsyncMock()
    from_phone = "+17777777777"
    valid_code = "999999"
    user_id = "user-uuid-789"

    mock_factory, mock_session = _make_mock_session()

    async def mock_get(key):
        if key == f"wa_otp:{valid_code}":
            return user_id
        return None

    mock_redis.get = AsyncMock(side_effect=mock_get)
    mock_redis.delete = AsyncMock()

    with patch("app.modules.whatsapp.tasks.async_session_factory", mock_factory):
        await async_process_message(_make_otp_payload(valid_code, from_phone), retries=0)

    # Verify all relevant keys were deleted
    delete_calls = [call.args[0] for call in mock_redis.delete.await_args_list]
    assert f"wa_otp:{valid_code}" in delete_calls
    assert f"wa_otp_user:{user_id}" in delete_calls


@patch("app.modules.whatsapp.tasks.whatsapp_service")
@patch("app.modules.whatsapp.tasks.redis_client")
async def test_invalid_otp_sends_error_message(mock_redis, mock_service):
    """Invalid OTP should send error message without creating identity."""
    mock_service.send_text_message = AsyncMock()
    from_phone = "+16666666666"
    wrong_code = "111111"

    mock_factory, mock_session = _make_mock_session()

    async def mock_get(key):
        return None  # No valid OTP

    mock_redis.get = AsyncMock(side_effect=mock_get)
    mock_redis.incr = AsyncMock(return_value=1)
    mock_redis.expire = AsyncMock()

    with patch("app.modules.whatsapp.tasks.async_session_factory", mock_factory):
        await async_process_message(_make_otp_payload(wrong_code, from_phone), retries=0)

    # Should send error message
    mock_service.send_text_message.assert_called_once()
    sent_message = mock_service.send_text_message.call_args[0][1]
    assert "inválido" in sent_message

"""Tests for OTP lockout mechanism in whatsapp/tasks.py."""

import pytest
from unittest.mock import patch, AsyncMock, MagicMock

from app.modules.whatsapp.tasks import async_process_message, OTP_MAX_ATTEMPTS

pytestmark = pytest.mark.asyncio


def _make_otp_payload(code: str, from_phone: str = "+19999999999"):
    """Build a payload simulating a 6-digit OTP message."""
    return {
        "entry": [
            {
                "changes": [
                    {
                        "value": {
                            "messages": [
                                {
                                    "id": f"msg_otp_{code}",
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


@patch("app.modules.whatsapp.tasks.whatsapp_service")
@patch("app.modules.whatsapp.tasks.redis_client")
async def test_lockout_after_max_attempts(mock_redis, mock_service):
    """After OTP_MAX_ATTEMPTS failed tries, the 6th attempt should be blocked."""
    mock_service.send_text_message = AsyncMock()
    from_phone = "+19999999999"
    wrong_code = "000000"

    # No identity exists for this phone — need to mock db too
    mock_identity_result = MagicMock()
    mock_identity_result.scalars.return_value.first.return_value = None

    mock_session = MagicMock()
    mock_session.execute = AsyncMock(return_value=mock_identity_result)
    mock_session.commit = AsyncMock()

    mock_factory = MagicMock()
    mock_factory.return_value.__aenter__ = AsyncMock(return_value=mock_session)
    mock_factory.return_value.__aexit__ = AsyncMock(return_value=False)

    # No OTP in Redis, lockout counter increments
    mock_redis.get = AsyncMock(return_value=None)
    call_count = {"n": 0}

    async def mock_incr(key):
        call_count["n"] += 1
        return call_count["n"]

    mock_redis.incr = AsyncMock(side_effect=mock_incr)
    mock_redis.expire = AsyncMock()

    # Send OTP_MAX_ATTEMPTS wrong codes
    with patch("app.modules.whatsapp.tasks.async_session_factory", mock_factory):
        for i in range(OTP_MAX_ATTEMPTS):
            await async_process_message(_make_otp_payload(wrong_code, from_phone), retries=0)

    # All should have been processed (incorrect code message sent)
    assert mock_service.send_text_message.call_count == OTP_MAX_ATTEMPTS

    # Now mock lockout check: the key returns OTP_MAX_ATTEMPTS
    async def mock_get_with_lockout(key):
        if "wa_otp_lockout" in key:
            return str(OTP_MAX_ATTEMPTS)
        return None

    mock_redis.get = AsyncMock(side_effect=mock_get_with_lockout)
    mock_service.send_text_message.reset_mock()

    # 6th attempt should be blocked
    with patch("app.modules.whatsapp.tasks.async_session_factory", mock_factory):
        await async_process_message(_make_otp_payload("111111", from_phone), retries=0)

    # Should send the lockout message, not the "invalid code" message
    mock_service.send_text_message.assert_called_once()
    sent_message = mock_service.send_text_message.call_args[0][1]
    assert "Demasiados intentos fallidos" in sent_message


@patch("app.modules.whatsapp.tasks.whatsapp_service")
@patch("app.modules.whatsapp.tasks.redis_client")
async def test_lockout_cleared_on_successful_otp(mock_redis, mock_service):
    """Successful OTP should clear the lockout counter."""
    mock_service.send_text_message = AsyncMock()
    from_phone = "+18888888888"
    valid_code = "123456"
    user_id = "user-uuid-123"

    # No identity found → OTP path triggered, but OTP is valid
    mock_identity_result = MagicMock()
    mock_identity_result.scalars.return_value.first.return_value = None

    mock_session = MagicMock()
    mock_session.execute = AsyncMock(return_value=mock_identity_result)
    mock_session.commit = AsyncMock()

    mock_factory = MagicMock()
    mock_factory.return_value.__aenter__ = AsyncMock(return_value=mock_session)
    mock_factory.return_value.__aexit__ = AsyncMock(return_value=False)

    async def mock_get(key):
        if key == f"wa_otp:{valid_code}":
            return user_id
        return None

    mock_redis.get = AsyncMock(side_effect=mock_get)
    mock_redis.delete = AsyncMock()

    with patch("app.modules.whatsapp.tasks.async_session_factory", mock_factory):
        await async_process_message(_make_otp_payload(valid_code, from_phone), retries=0)

    # Lockout key should be deleted on success
    delete_calls = [call.args[0] for call in mock_redis.delete.await_args_list]
    assert any("wa_otp_lockout" in k for k in delete_calls)

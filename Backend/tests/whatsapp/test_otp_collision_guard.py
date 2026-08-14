"""Tests for the OTP collision guard in whatsapp/router.py generate_whatsapp_otp.

The `wa_otp:{otp}` key is global (keyed by the code itself, not by user), so if
two users generated the same 6-digit code inside the 10-minute window, the last
writer would win and the phone sending that code could link to the wrong
account. The guard regenerates the OTP on collision, up to 5 attempts, then
fails with 500 instead of looping forever.
"""

import pytest
from fastapi import HTTPException
from unittest.mock import AsyncMock, MagicMock, patch

from app.modules.whatsapp import router as whatsapp_router

pytestmark = pytest.mark.asyncio


@patch("app.modules.whatsapp.router.redis_client")
async def test_generate_otp_regenerates_on_collision(mock_redis):
    """When the first random OTP is already taken, a fresh one is generated."""
    mock_redis.get = AsyncMock(return_value=None)
    mock_redis.delete = AsyncMock()
    mock_redis.setex = AsyncMock()
    mock_redis.exists = AsyncMock(side_effect=[True, False])  # taken, then free

    with patch(
        "app.modules.whatsapp.router.random.choices",
        side_effect=[["1", "1", "1", "1", "1", "1"], ["2", "2", "2", "2", "2", "2"]],
    ):
        result = await whatsapp_router.generate_whatsapp_otp(current_user=MagicMock(id="user-otp-1"))

    assert result["otp"] == "222222"
    mock_redis.exists.assert_awaited()
    assert mock_redis.exists.await_args_list[0].args[0] == "wa_otp:111111"
    assert mock_redis.exists.await_args_list[1].args[0] == "wa_otp:222222"
    mock_redis.setex.assert_any_call("wa_otp:222222", 600, "user-otp-1")
    mock_redis.setex.assert_any_call("wa_otp_user:user-otp-1", 600, "222222")


@patch("app.modules.whatsapp.router.redis_client")
async def test_generate_otp_happy_path_no_collision(mock_redis):
    """Without collision the original OTP is used as-is."""
    mock_redis.get = AsyncMock(return_value=None)
    mock_redis.delete = AsyncMock()
    mock_redis.setex = AsyncMock()
    mock_redis.exists = AsyncMock(return_value=False)

    with patch(
        "app.modules.whatsapp.router.random.choices",
        return_value=["9", "8", "7", "6", "5", "4"],
    ):
        result = await whatsapp_router.generate_whatsapp_otp(current_user=MagicMock(id="user-otp-2"))

    assert result["otp"] == "987654"
    mock_redis.exists.assert_awaited_once_with("wa_otp:987654")
    mock_redis.setex.assert_any_call("wa_otp:987654", 600, "user-otp-2")
    mock_redis.setex.assert_any_call("wa_otp_user:user-otp-2", 600, "987654")


@patch("app.modules.whatsapp.router.redis_client")
async def test_generate_otp_raises_500_after_5_collisions(mock_redis):
    """Five consecutive collisions must raise HTTP 500, not loop forever."""
    mock_redis.exists = AsyncMock(return_value=True)  # always taken

    with patch(
        "app.modules.whatsapp.router.random.choices",
        return_value=["5", "5", "5", "5", "5", "5"],
    ):
        with pytest.raises(HTTPException) as exc_info:
            await whatsapp_router.generate_whatsapp_otp(current_user=MagicMock(id="user-otp-3"))

    assert exc_info.value.status_code == 500
    assert exc_info.value.detail == "No se pudo generar un código único, intenta de nuevo"
    assert mock_redis.exists.await_count == 5
    mock_redis.setex.assert_not_called()

"""
DonApp API — TikTok publish status polling tests.

Covers the fix for "declared success before TikTok actually publishes":
publish_to_tiktok now polls the status endpoint after init; only
PUBLISH_COMPLETE counts as success, FAILED raises, and an unresolved
polling window returns "processing".

Style reference: tests/test_social_crud.py (mocks via unittest.mock,
no real TikTok API calls).
"""

import json
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.modules.social.service import (
    fetch_tiktok_publish_status,
    publish_to_tiktok,
)

pytestmark = pytest.mark.asyncio

OK_ERROR = {"code": "ok"}


def _make_resp(payload: dict, status_code: int = 200):
    resp = MagicMock()
    resp.json.return_value = payload
    resp.status_code = status_code
    resp.text = json.dumps(payload)
    return resp


class _FakeTikTokClient:
    """AsyncClient stand-in: serves init responses and queued status responses."""

    def __init__(self, init_payload: dict, status_payloads=None):
        self.init_payload = init_payload
        self.status_payloads = list(status_payloads or [])
        self.status_calls = 0
        self.put_calls = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return False

    async def post(self, url, **kwargs):
        if "init" in url:
            return _make_resp(self.init_payload)
        self.status_calls += 1
        return _make_resp(self.status_payloads.pop(0))

    async def put(self, url, **kwargs):
        self.put_calls.append(url)
        return _make_resp({}, status_code=200)


def _init_payload(publish_id: str = "pub-123", upload_url: str | None = None) -> dict:
    data = {"publish_id": publish_id}
    if upload_url:
        data["upload_url"] = upload_url
    return {"data": data, "error": OK_ERROR}


def _status_payload(status: str, fail_reason: str | None = None) -> dict:
    data = {"status": status}
    if fail_reason:
        data["fail_reason"] = fail_reason
    return {"data": data, "error": OK_ERROR}


def _patch_client(fake: _FakeTikTokClient):
    return patch("app.modules.social.service.httpx.AsyncClient", return_value=fake)


# ═══════════════════════════════════════════════════════════════════════════════
# publish_to_tiktok — photo branch (PULL_FROM_URL, the reproduced bug)
# ═══════════════════════════════════════════════════════════════════════════════

async def test_tiktok_photo_returns_success_when_publish_complete(tmp_path):
    """PUBLISH_COMPLETE on the first poll → success, and only one status call."""
    image = tmp_path / "image.jpg"
    image.write_bytes(b"fake-jpeg-bytes")

    fake = _FakeTikTokClient(
        init_payload=_init_payload("pub-123"),
        status_payloads=[_status_payload("PUBLISH_COMPLETE")],
    )

    with _patch_client(fake):
        result = await publish_to_tiktok("tok", str(image), "caption", "https://ngrok.test/image.jpg")

    assert result == {"status": "success", "platform_post_id": "pub-123"}
    assert fake.status_calls == 1


async def test_tiktok_photo_raises_when_status_failed(tmp_path):
    """FAILED on the first poll → HTTPException(400) including the fail_reason."""
    image = tmp_path / "image.jpg"
    image.write_bytes(b"fake-jpeg-bytes")

    fake = _FakeTikTokClient(
        init_payload=_init_payload("pub-456"),
        status_payloads=[_status_payload("FAILED", fail_reason="DOWNLOAD_FAILED")],
    )

    with _patch_client(fake):
        with pytest.raises(HTTPException) as exc_info:
            await publish_to_tiktok("tok", str(image), "caption", "https://ngrok.test/image.jpg")

    assert exc_info.value.status_code == 400
    assert "TikTok no completó la publicación" in exc_info.value.detail
    assert "DOWNLOAD_FAILED" in exc_info.value.detail


@patch("app.modules.social.service.asyncio.sleep", new_callable=AsyncMock)
async def test_tiktok_photo_returns_processing_after_exhausted_polls(mock_sleep, tmp_path):
    """Five polls without resolution → 'processing', never a false 'success'."""
    image = tmp_path / "image.jpg"
    image.write_bytes(b"fake-jpeg-bytes")

    fake = _FakeTikTokClient(
        init_payload=_init_payload("pub-789"),
        status_payloads=[_status_payload("PROCESSING_DOWNLOAD")] * 5,
    )

    with _patch_client(fake):
        result = await publish_to_tiktok("tok", str(image), "caption", "https://ngrok.test/image.jpg")

    assert result == {"status": "processing", "platform_post_id": "pub-789"}
    assert fake.status_calls == 5
    assert mock_sleep.await_count == 4


# ═══════════════════════════════════════════════════════════════════════════════
# publish_to_tiktok — video branch (FILE_UPLOAD)
# ═══════════════════════════════════════════════════════════════════════════════

async def test_tiktok_video_returns_success_when_publish_complete(tmp_path):
    """Video branch also polls: PUBLISH_COMPLETE → success after the upload."""
    video = tmp_path / "video.mp4"
    video.write_bytes(b"fake-mp4-bytes")

    fake = _FakeTikTokClient(
        init_payload=_init_payload("pub-video", upload_url="https://upload.test/chunk"),
        status_payloads=[_status_payload("PUBLISH_COMPLETE")],
    )

    with _patch_client(fake):
        result = await publish_to_tiktok("tok", str(video), "caption")

    assert result == {"status": "success", "platform_post_id": "pub-video"}
    assert len(fake.put_calls) == 1


# ═══════════════════════════════════════════════════════════════════════════════
# fetch_tiktok_publish_status — error propagation (no raise)
# ═══════════════════════════════════════════════════════════════════════════════

async def test_fetch_tiktok_status_propagates_api_error_without_raising():
    """When TikTok reports error.code != 'ok', the info is returned in the dict."""
    fake = _FakeTikTokClient(init_payload={}, status_payloads=[])
    fake.status_payloads.append(
        {"error": {"code": "invalid_params", "message": "bad publish_id"}, "data": {}}
    )

    with _patch_client(fake):
        result = await fetch_tiktok_publish_status("tok", "bad-pid")

    assert result["status"] == "API_ERROR"
    assert result["error"]["code"] == "invalid_params"


# ═══════════════════════════════════════════════════════════════════════════════
# _publish_async — 'processing' must reach SocialPost.status
# ═══════════════════════════════════════════════════════════════════════════════

async def test_publish_async_marks_post_as_processing_when_tiktok_still_processing(db_session):
    """When publish_to_tiktok returns 'processing', the post must be stored as
    'processing' (not 'success')."""
    from tests.conftest import test_engine

    from app.modules.auth.models import User
    from app.modules.social.models import SocialAccount, SocialPost, SocialToken
    from app.modules.social.tasks import _publish_async

    user = User(email="tiktok_proc@example.com", full_name="TikTok User", role="seller", hashed_password="dummy")
    db_session.add(user)
    await db_session.flush()

    account = SocialAccount(
        user_id=user.id, platform="tiktok", platform_user_id="open_id_1",
        is_default=True, status="active",
    )
    db_session.add(account)
    await db_session.flush()

    db_session.add(SocialToken(account_id=account.id, platform="tiktok", access_token="tok-proc"))
    post = SocialPost(user_id=user.id, account_id=account.id, platform="tiktok", status="pending", caption="c")
    db_session.add(post)
    await db_session.commit()
    await db_session.refresh(post)

    with patch(
        "app.modules.social.tasks.service.publish_to_tiktok",
        new_callable=AsyncMock,
        return_value={"status": "processing", "platform_post_id": "pub-proc"},
    ):
        await _publish_async(
            test_engine,
            str(post.id), str(user.id), "tiktok",
            "uploads/__nonexistent_tiktok_test__.jpg", "caption",
            account_id_str=str(account.id),
        )

    await db_session.refresh(post)
    assert post.status == "processing"
    assert post.platform_post_id == "pub-proc"
    assert "sigue procesando" in (post.error_message or "")
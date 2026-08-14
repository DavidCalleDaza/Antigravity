"""
DonApp API — TikTok 'processing' state reconciliation tests.

Covers _reconcile_tiktok_async (one status/fetch per pending post per run):
- PUBLISH_COMPLETE → success
- FAILED → failed with fail_reason
- still processing / API_ERROR → left as 'processing'
- older than max_age_hours → failed directly, without asking TikTok

Style reference: tests/test_social_tiktok_publish.py (test_engine from
conftest, db_session for seeding, mock of fetch_tiktok_publish_status).
"""

from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.modules.auth.models import User
from app.modules.social.models import SocialAccount, SocialPost, SocialToken
from app.modules.social.tasks import _reconcile_tiktok_async

pytestmark = pytest.mark.asyncio

STALE_ERROR = "TikTok no confirmó la publicación tras 24 horas; verificar manualmente."


async def _seed_processing_post(
    db_session,
    *,
    created_at: datetime | None = None,
    platform_post_id: str = "pub-1",
    email: str = "reconcile@example.com",
):
    """Seed user + tiktok account + token + a post in 'processing'."""
    user = User(email=email, full_name="Reconcile User", role="seller", hashed_password="dummy")
    db_session.add(user)
    await db_session.flush()

    account = SocialAccount(
        user_id=user.id, platform="tiktok", platform_user_id="open_id_rec",
        is_default=True, status="active",
    )
    db_session.add(account)
    await db_session.flush()

    db_session.add(SocialToken(account_id=account.id, platform="tiktok", access_token="tok-rec"))
    post = SocialPost(
        user_id=user.id, account_id=account.id, platform="tiktok",
        status="processing", caption="c", platform_post_id=platform_post_id,
    )
    if created_at is not None:
        post.created_at = created_at
    db_session.add(post)
    await db_session.commit()
    await db_session.refresh(post)
    return post


def _patch_status(payload: dict):
    return patch(
        "app.modules.social.tasks.service.fetch_tiktok_publish_status",
        new_callable=AsyncMock,
        return_value=payload,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# Tests
# ═══════════════════════════════════════════════════════════════════════════════

async def test_reconcile_marks_success_when_publish_complete(db_session):
    """A 'processing' post whose status/fetch now returns PUBLISH_COMPLETE
    becomes 'success'."""
    from tests.conftest import test_engine

    post = await _seed_processing_post(db_session)

    with _patch_status({"status": "PUBLISH_COMPLETE"}):
        result = await _reconcile_tiktok_async(test_engine)

    await db_session.refresh(post)
    assert result["checked"] == 1
    assert result["updated"] == 1
    assert post.status == "success"
    assert post.error_message is None


async def test_reconcile_marks_failed_with_fail_reason(db_session):
    """A 'processing' post whose status/fetch returns FAILED becomes 'failed'
    with the fail_reason in error_message."""
    from tests.conftest import test_engine

    post = await _seed_processing_post(db_session)

    with _patch_status({"status": "FAILED", "fail_reason": "SCHEDULE_NOT_ELIGIBLE"}):
        result = await _reconcile_tiktok_async(test_engine)

    await db_session.refresh(post)
    assert result["updated"] == 1
    assert post.status == "failed"
    assert "SCHEDULE_NOT_ELIGIBLE" in (post.error_message or "")


async def test_reconcile_leaves_post_unchanged_when_still_processing(db_session):
    """Still PROCESSING_DOWNLOAD → the post stays 'processing' untouched."""
    from tests.conftest import test_engine

    post = await _seed_processing_post(db_session)

    with _patch_status({"status": "PROCESSING_DOWNLOAD"}):
        result = await _reconcile_tiktok_async(test_engine)

    await db_session.refresh(post)
    assert result["updated"] == 0
    assert post.status == "processing"
    assert post.error_message is None


async def test_reconcile_marks_old_post_failed_without_api_call(db_session):
    """A 'processing' post older than max_age_hours is marked 'failed' without
    any signal from TikTok (no status/fetch call)."""
    from tests.conftest import test_engine

    old_created_at = datetime.now(timezone.utc) - timedelta(hours=25)
    post = await _seed_processing_post(db_session, created_at=old_created_at)

    with _patch_status({"status": "PROCESSING_DOWNLOAD"}) as mock_fetch:
        result = await _reconcile_tiktok_async(test_engine)

    await db_session.refresh(post)
    assert result["updated"] == 1
    assert post.status == "failed"
    assert post.error_message == STALE_ERROR
    mock_fetch.assert_not_called()


async def test_reconcile_endpoint_queues_task_and_returns_202(client, db_session):
    """POST /social/posts/reconcile-tiktok → 202 {'status': 'queued'} and the
    Celery task is enqueued (fire-and-forget)."""
    from app.core.security import create_access_token

    user = User(email="reconcile_endpoint@example.com", full_name="Rec User", role="seller", hashed_password="dummy")
    db_session.add(user)
    await db_session.commit()
    token = create_access_token({"sub": str(user.id)})

    with patch("app.modules.social.tasks.reconcile_tiktok_processing_task.delay") as mock_delay:
        response = await client.post(
            "/api/v1/social/posts/reconcile-tiktok",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 202
    assert response.json() == {"status": "queued"}
    mock_delay.assert_called_once()
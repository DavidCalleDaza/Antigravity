"""Tests for webhook signature validation in whatsapp/router.py."""

import hashlib
import hmac
import json
import pytest
from unittest.mock import patch, MagicMock

from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

TEST_SECRET = "test_webhook_secret_123"
WEBHOOK_URL = "/api/v1/whatsapp/webhook"


def _make_signature(secret: str, body: bytes) -> str:
    """Calculate HMAC-SHA256 signature matching Meta's format."""
    return "sha256=" + hmac.new(
        secret.encode("utf-8"), body, hashlib.sha256
    ).hexdigest()


@patch("app.modules.whatsapp.router.settings")
async def test_invalid_signature_returns_403(mock_settings, client: AsyncClient):
    """Payload with invalid X-Hub-Signature-256 should be rejected with 403."""
    mock_settings.META_APP_SECRET = TEST_SECRET

    payload = json.dumps({"entry": []})
    response = await client.post(
        WEBHOOK_URL,
        content=payload,
        headers={
            "Content-Type": "application/json",
            "X-Hub-Signature-256": "sha256=invalidsignature",
        },
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "Invalid signature"


@patch("app.modules.whatsapp.router.settings")
async def test_missing_signature_returns_403(mock_settings, client: AsyncClient):
    """Payload with no X-Hub-Signature-256 header should be rejected with 403."""
    mock_settings.META_APP_SECRET = TEST_SECRET

    payload = json.dumps({"entry": []})
    response = await client.post(
        WEBHOOK_URL,
        content=payload,
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 403


@patch("app.modules.whatsapp.router.settings")
async def test_valid_signature_returns_200_and_enqueues_task(
    mock_settings, client: AsyncClient
):
    """Payload with valid signature should return 200 and enqueue Celery task."""
    mock_settings.META_APP_SECRET = TEST_SECRET

    payload = json.dumps({"entry": [{"changes": []}]})
    body_bytes = payload.encode("utf-8")
    signature = _make_signature(TEST_SECRET, body_bytes)

    # process_whatsapp_message is imported inside the endpoint function,
    # so we patch it at the tasks module level where it's looked up
    with patch("app.modules.whatsapp.tasks.process_whatsapp_message") as mock_task:
        response = await client.post(
            WEBHOOK_URL,
            content=payload,
            headers={
                "Content-Type": "application/json",
                "X-Hub-Signature-256": signature,
            },
        )
        assert response.status_code == 200
        mock_task.delay.assert_called_once()

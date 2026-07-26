"""Shared fixtures and helpers for WhatsApp module tests."""

from unittest.mock import AsyncMock, MagicMock


def make_whatsapp_service_mock():
    """Create a MagicMock whatsapp_service with async send_text_message."""
    svc = MagicMock()
    svc.send_text_message = AsyncMock()
    return svc

"""WhatsApp multi-user isolation tests.

Two different phones linked to two different users: drafts must live under
their own `wa_draft:{from_phone}` key, and the resulting product creation
must carry each phone's user_id — never the other conversation's data.

Style reference: tests/whatsapp/test_intent_draft_merge.py (mocked redis,
LLM and WhatsApp service) but with a real in-memory DB session factory
(tests/conftest.py) so the created products are asserted end-to-end.
"""

import json

import pytest
from sqlalchemy.future import select
from unittest.mock import AsyncMock, MagicMock, patch

from app.modules.auth.models import User, UserIdentity
from app.modules.products.models import Product
from app.modules.whatsapp.tasks import async_process_message

pytestmark = pytest.mark.asyncio

PHONE_A = "15551111111"
PHONE_B = "15552222222"


def _make_text_payload(text: str, message_id: str, from_phone: str) -> dict:
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


def _mock_intent_response(intent="create_product", entities=None, bot_reply="respuesta"):
    """Create a mock WhatsAppIntentResponse."""
    mock = MagicMock()
    mock.intent = intent
    mock.entities = entities or {}
    mock.missing_fields = ["name", "price"]
    mock.bot_reply = bot_reply
    return mock


async def _seed_user_with_whatsapp_identity(db_session, email: str, phone: str) -> User:
    """Create a seller user linked to the given phone number via ORM fixtures."""
    user = User(email=email, full_name=f"Seller {phone}", role="seller", hashed_password="dummy")
    db_session.add(user)
    await db_session.flush()
    db_session.add(UserIdentity(user_id=user.id, provider="whatsapp", provider_id=phone))
    await db_session.commit()
    await db_session.refresh(user)
    return user


@patch("app.modules.whatsapp.tasks.whatsapp_service")
@patch("app.modules.whatsapp.tasks.parse_whatsapp_intent", new_callable=AsyncMock)
@patch("app.modules.whatsapp.tasks.async_session_factory")
async def test_two_phones_drafts_and_products_never_mix(
    mock_factory, mock_parse_intent, mock_service, db_session, client
):
    """Interleaved conversations from two phones must not leak drafts, product
    ownership or confirmation messages between users."""
    from tests.conftest import TestSessionLocal

    user_a = await _seed_user_with_whatsapp_identity(db_session, "wa_a@example.com", PHONE_A)
    user_b = await _seed_user_with_whatsapp_identity(db_session, "wa_b@example.com", PHONE_B)

    mock_service.send_text_message = AsyncMock()
    mock_factory.side_effect = lambda: TestSessionLocal()  # real in-memory DB sessions

    # ── Redis state simulation ────────────────────────────────────────────
    redis_state: dict[str, str] = {}

    async def mock_get(key: str):
        return redis_state.get(key)

    async def mock_setex(key: str, ttl: int, value: str):
        redis_state[key] = value

    async def mock_delete(key: str):
        redis_state.pop(key, None)

    async def mock_set(key: str, value: str, **kwargs):
        if key in redis_state:
            return None  # nx=True: already seen
        redis_state[key] = value
        return "1"

    mock_redis = MagicMock()
    mock_redis.get = AsyncMock(side_effect=mock_get)
    mock_redis.setex = AsyncMock(side_effect=mock_setex)
    mock_redis.delete = AsyncMock(side_effect=mock_delete)
    mock_redis.set = AsyncMock(side_effect=mock_set)

    # ── LLM: interleaved two-step conversations ──────────────────────────
    # A msg 1: name only -> draft. B msg 1: name only -> draft.
    # A msg 2: price only -> merged with A's draft. B msg 2: same for B.
    mock_parse_intent.side_effect = [
        _mock_intent_response(entities={"name": "empanada", "price": None}, bot_reply="¿Cuánto cuesta la empanada?"),
        _mock_intent_response(entities={"name": "arepa", "price": None}, bot_reply="¿Cuánto cuesta la arepa?"),
        _mock_intent_response(entities={"name": None, "price": 3000}, bot_reply="Perfecto"),
        _mock_intent_response(entities={"name": None, "price": 5000}, bot_reply="Perfecto"),
    ]

    with patch("app.modules.whatsapp.tasks.redis_client", mock_redis):
        # Message 1 from phone A: saves A's draft
        await async_process_message(_make_text_payload("Quiero vender empanadas", "msg_a1", PHONE_A), retries=0)
        # Message 1 from phone B: saves B's draft
        await async_process_message(_make_text_payload("Quiero vender arepas", "msg_b1", PHONE_B), retries=0)

        # Drafts live under separate keys with the right entities
        draft_a = json.loads(redis_state[f"wa_draft:{PHONE_A}"])
        draft_b = json.loads(redis_state[f"wa_draft:{PHONE_B}"])
        assert draft_a["entities"]["name"] == "empanada"
        assert draft_b["entities"]["name"] == "arepa"

        # Message 2 from phone A: completes empanada (B's draft untouched)
        await async_process_message(_make_text_payload("3000 pesos", "msg_a2", PHONE_A), retries=0)
        # Message 2 from phone B: completes arepa (A's draft already cleared)
        await async_process_message(_make_text_payload("5000 pesos", "msg_b2", PHONE_B), retries=0)

    # Drafts cleared for each phone after creation, never cross-deleted
    assert f"wa_draft:{PHONE_A}" not in redis_state
    assert f"wa_draft:{PHONE_B}" not in redis_state
    delete_calls = [c.args[0] for c in mock_redis.delete.await_args_list]
    assert f"wa_draft:{PHONE_A}" in delete_calls
    assert f"wa_draft:{PHONE_B}" in delete_calls

    # Products created with each phone's own user_id
    result = await db_session.execute(select(Product).order_by(Product.name))
    products = list(result.scalars().all())
    assert len(products) == 2
    by_name = {p.name: p.user_id for p in products}
    assert by_name == {"empanada": user_a.id, "arepa": user_b.id}

    # Each phone received its own confirmation with its own product name,
    # never the other conversation's data
    sent = {c.args[0]: c.args[1] for c in mock_service.send_text_message.await_args_list}
    assert sent[PHONE_A].startswith("✅ Producto 'empanada'")
    assert sent[PHONE_B].startswith("✅ Producto 'arepa'")
    assert "arepa" not in sent[PHONE_A]
    assert "empanada" not in sent[PHONE_B]

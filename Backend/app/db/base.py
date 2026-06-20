"""
Servinow API — Model Registry for Alembic.

This module imports the declarative Base AND every ORM model in
the application.  Alembic's ``env.py`` imports ``Base`` from here
so that ``Base.metadata`` contains the full table catalog at
autogenerate time.

**IMPORTANT:** Every time you add a new model in any module, you
MUST add a corresponding import here.
"""

# ── Declarative Base ─────────────────────────────────────────────────────────
from app.db.base_class import Base  # noqa: F401

# ── ORM Models (import order does not matter) ────────────────────────────────
from app.modules.auth.models import User  # noqa: F401
from app.modules.wall.models import Comment, Post  # noqa: F401
from app.modules.products.models import Product  # noqa: F401
from app.modules.services.models import Service  # noqa: F401
from app.modules.billing.models import (
    Customer,
    Invoice,
    InvoiceItem,
    InvoiceSequence,
    CreditNote,
    CreditNoteItem,
    DianEvent,
)  # noqa: F401


# Future models — add imports here as modules are built:
# from app.modules.products.models import Product  # noqa: F401
# from app.modules.billing.models import Invoice   # noqa: F401
# from app.modules.agenda.models import Appointment # noqa: F401
# from app.modules.wall.models import Post          # noqa: F401

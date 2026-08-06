"""
DonApp API — Model Registry for Alembic.

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
from app.modules.categories.models import Category  # noqa: F401
from app.modules.services.models import Service  # noqa: F401
from app.modules.social.models import SocialAccount, SocialPost  # noqa: F401
from app.modules.locations.models import Neighborhood, Location, StoreLocation  # noqa: F401
from app.modules.billing.models import (
    Customer,
    Invoice,
    InvoiceItem,
    InvoiceSequence,
    CreditNote,
    CreditNoteItem,
    DianEvent,
)  # noqa: F401
from app.modules.ai.models import AiGenerationTask  # noqa: F401
from app.modules.agenda.models import Appointment, AvailabilityOverride, AvailabilityTemplate  # noqa: F401
from app.modules.notifications.models import Notification  # noqa: F401

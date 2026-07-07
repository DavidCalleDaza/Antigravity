"""merge heads

Revision ID: 9213c30e2635
Revises: aaa96a5d6d50, d67a5c2fa5fb
Create Date: 2026-07-06 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9213c30e2635'
down_revision: Union[str, Sequence[str], None] = ('aaa96a5d6d50', 'd67a5c2fa5fb')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

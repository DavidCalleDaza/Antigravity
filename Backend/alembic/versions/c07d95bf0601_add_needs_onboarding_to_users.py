"""add needs_onboarding to users

Revision ID: c07d95bf0601
Revises: f4d9d3c032ca
Create Date: 2026-08-06 00:54:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c07d95bf0601'
down_revision: Union[str, Sequence[str], None] = 'f4d9d3c032ca'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('needs_onboarding', sa.Boolean(), server_default='false', nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'needs_onboarding')

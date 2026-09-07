"""add_approval_and_activation_code_to_users

Revision ID: 99b1649d36ec
Revises: b3c8f1a29e7d
Create Date: 2026-09-07 01:14:22.388200

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '99b1649d36ec'
down_revision: Union[str, Sequence[str], None] = 'b3c8f1a29e7d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('is_approved', sa.Boolean(), server_default='true', nullable=False))
    op.add_column('users', sa.Column('activation_code', sa.String(length=50), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'activation_code')
    op.drop_column('users', 'is_approved')

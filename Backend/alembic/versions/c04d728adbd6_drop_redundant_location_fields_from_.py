"""drop redundant location fields from users

Revision ID: c04d728adbd6
Revises: 3c1d61fcb248
Create Date: 2026-07-06 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c04d728adbd6'
down_revision: Union[str, Sequence[str], None] = '3c1d61fcb248'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column('users', 'address')
    op.drop_column('users', 'neighborhood')
    op.drop_column('users', 'city')
    op.drop_column('users', 'state')
    op.drop_column('users', 'country')


def downgrade() -> None:
    op.add_column('users', sa.Column('country', sa.String(length=100), nullable=True))
    op.add_column('users', sa.Column('state', sa.String(length=100), nullable=True))
    op.add_column('users', sa.Column('city', sa.String(length=100), nullable=True))
    op.add_column('users', sa.Column('neighborhood', sa.String(length=150), nullable=True))
    op.add_column('users', sa.Column('address', sa.String(length=255), nullable=True))

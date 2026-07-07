"""add location fields to users

Revision ID: d67a5c2fa5fb
Revises: c67ad7e81f0c
Create Date: 2026-07-06 10:24:14.000889

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd67a5c2fa5fb'
down_revision: Union[str, Sequence[str], None] = 'c67ad7e81f0c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('country', sa.String(length=100), nullable=True))
    op.add_column('users', sa.Column('state', sa.String(length=100), nullable=True))
    op.add_column('users', sa.Column('city', sa.String(length=100), nullable=True))
    op.add_column('users', sa.Column('neighborhood', sa.String(length=150), nullable=True))
    op.add_column('users', sa.Column('address', sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'address')
    op.drop_column('users', 'neighborhood')
    op.drop_column('users', 'city')
    op.drop_column('users', 'state')
    op.drop_column('users', 'country')

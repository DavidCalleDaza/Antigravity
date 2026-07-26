"""add cancellation_reason to appointments

Revision ID: a1b2c3d4e5f6
Revises: 9f50a3defb7b
Create Date: 2026-07-24

"""
from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4e5f6'
down_revision = '9f50a3defb7b'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'appointments',
        sa.Column('cancellation_reason', sa.Text(), nullable=True),
    )


def downgrade():
    op.drop_column('appointments', 'cancellation_reason')

"""add media and expiry columns to ai_generation_tasks

Revision ID: a1a1a1a1a1a1
Revises: a101b2c3d4e5
Create Date: 2026-08-10 10:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1a1a1a1a1a1'
down_revision: Union[str, Sequence[str], None] = 'a101b2c3d4e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('ai_generation_tasks', sa.Column('media_url', sa.String(), nullable=True))
    op.add_column('ai_generation_tasks', sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index('ix_ai_generation_tasks_status', 'ai_generation_tasks', ['status'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_ai_generation_tasks_status', table_name='ai_generation_tasks')
    op.drop_column('ai_generation_tasks', 'expires_at')
    op.drop_column('ai_generation_tasks', 'media_url')
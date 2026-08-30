"""add task_type to ai_generation_tasks

Revision ID: b3c8f1a29e7d
Revises: 6b8b3f369d2d
Create Date: 2026-08-29 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b3c8f1a29e7d'
down_revision: Union[str, Sequence[str], None] = '6b8b3f369d2d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'ai_generation_tasks',
        sa.Column('task_type', sa.String(), nullable=False, server_default='generate_video'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('ai_generation_tasks', 'task_type')

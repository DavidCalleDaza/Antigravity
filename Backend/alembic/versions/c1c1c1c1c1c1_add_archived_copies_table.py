"""add archived_copies table

Revision ID: c1c1c1c1c1c1
Revises: b1b1b1b1b1b1
Create Date: 2026-08-10 10:07:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1c1c1c1c1c1'
down_revision: Union[str, Sequence[str], None] = 'b1b1b1b1b1b1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('archived_copies',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('title', sa.String(), nullable=True),
    sa.Column('content', sa.Text(), nullable=False),
    sa.Column('kind', sa.String(), nullable=False),
    sa.Column('source_task_id', sa.UUID(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['source_task_id'], ['ai_copy_requests.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_archived_copies_user_id', 'archived_copies', ['user_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_archived_copies_user_id', table_name='archived_copies')
    op.drop_table('archived_copies')
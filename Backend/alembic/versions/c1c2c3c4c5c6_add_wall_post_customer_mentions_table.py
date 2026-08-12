"""add wall_post_customer_mentions table

Revision ID: c1c2c3c4c5c6
Revises: b1b2b3b4b5b6
Create Date: 2026-08-10 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1c2c3c4c5c6'
down_revision: Union[str, Sequence[str], None] = 'b1b2b3b4b5b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('wall_post_customer_mentions',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('post_id', sa.UUID(), nullable=False),
    sa.Column('customer_id', sa.UUID(), nullable=False),
    sa.Column('mentioned_by_user_id', sa.UUID(), nullable=False),
    sa.Column('status', sa.String(length=20), server_default='pending', nullable=False),
    sa.Column('confirm_token', sa.String(length=64), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('responded_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['mentioned_by_user_id'], ['users.id'], ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['post_id'], ['posts.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_wall_post_customer_mentions_post_id'), 'wall_post_customer_mentions', ['post_id'], unique=False)
    op.create_index(op.f('ix_wall_post_customer_mentions_customer_id'), 'wall_post_customer_mentions', ['customer_id'], unique=False)
    op.create_index(op.f('ix_wall_post_customer_mentions_mentioned_by_user_id'), 'wall_post_customer_mentions', ['mentioned_by_user_id'], unique=False)
    op.create_index(op.f('ix_wall_post_customer_mentions_status'), 'wall_post_customer_mentions', ['status'], unique=False)
    op.create_index(op.f('ix_wall_post_customer_mentions_confirm_token'), 'wall_post_customer_mentions', ['confirm_token'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_wall_post_customer_mentions_confirm_token'), table_name='wall_post_customer_mentions')
    op.drop_index(op.f('ix_wall_post_customer_mentions_status'), table_name='wall_post_customer_mentions')
    op.drop_index(op.f('ix_wall_post_customer_mentions_mentioned_by_user_id'), table_name='wall_post_customer_mentions')
    op.drop_index(op.f('ix_wall_post_customer_mentions_customer_id'), table_name='wall_post_customer_mentions')
    op.drop_index(op.f('ix_wall_post_customer_mentions_post_id'), table_name='wall_post_customer_mentions')
    op.drop_table('wall_post_customer_mentions')
"""add ai_copy_requests table

Revision ID: b1b1b1b1b1b1
Revises: a1a1a1a1a1a1
Create Date: 2026-08-10 10:06:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1b1b1b1b1b1'
down_revision: Union[str, Sequence[str], None] = 'a1a1a1a1a1a1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('ai_copy_requests',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('status', sa.String(), nullable=False),
    sa.Column('product_name', sa.String(), nullable=False),
    sa.Column('description', sa.Text(), nullable=False),
    sa.Column('tone', sa.String(), nullable=True),
    sa.Column('platform', sa.String(), nullable=True),
    sa.Column('generated_text', sa.Text(), nullable=True),
    sa.Column('product_id', sa.UUID(), nullable=True),
    sa.Column('service_id', sa.UUID(), nullable=True),
    sa.Column('error_message', sa.String(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['service_id'], ['services.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_ai_copy_requests_user_id', 'ai_copy_requests', ['user_id'])
    op.create_index('ix_ai_copy_requests_status', 'ai_copy_requests', ['status'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_ai_copy_requests_status', table_name='ai_copy_requests')
    op.drop_index('ix_ai_copy_requests_user_id', table_name='ai_copy_requests')
    op.drop_table('ai_copy_requests')
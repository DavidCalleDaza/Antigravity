"""add token_usage and exchange_rates tables

Revision ID: d1d2d3d4d5d6
Revises: c1c2c3c4c5c6
Create Date: 2026-08-10 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd1d2d3d4d5d6'
down_revision: Union[str, Sequence[str], None] = 'c1c2c3c4c5c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('exchange_rates',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('usd_to_cop', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_by_user_id', sa.UUID(), nullable=True),
    sa.ForeignKeyConstraint(['updated_by_user_id'], ['users.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('token_usage',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('customer_id', sa.UUID(), nullable=True),
    sa.Column('post_id', sa.UUID(), nullable=True),
    sa.Column('product_id', sa.UUID(), nullable=True),
    sa.Column('service_id', sa.UUID(), nullable=True),
    sa.Column('ai_action', sa.String(length=50), nullable=False),
    sa.Column('model_name', sa.String(length=100), nullable=False),
    sa.Column('input_tokens', sa.Integer(), server_default='0', nullable=False),
    sa.Column('output_tokens', sa.Integer(), server_default='0', nullable=False),
    sa.Column('image_count', sa.Integer(), server_default='0', nullable=False),
    sa.Column('video_seconds', sa.Integer(), server_default='0', nullable=False),
    sa.Column('cost_usd', sa.Numeric(precision=12, scale=6), server_default='0', nullable=False),
    sa.Column('is_estimated', sa.Boolean(), server_default='false', nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['post_id'], ['posts.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['service_id'], ['services.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_token_usage_ai_action'), 'token_usage', ['ai_action'], unique=False)
    op.create_index(op.f('ix_token_usage_created_at'), 'token_usage', ['created_at'], unique=False)

    # Seed initial manual USD→COP rate (official TRM, 2026-08-10).
    op.execute(
        "INSERT INTO exchange_rates (id, usd_to_cop, updated_at, updated_by_user_id) "
        "VALUES (gen_random_uuid(), 3157.43, now(), NULL)"
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_token_usage_created_at'), table_name='token_usage')
    op.drop_index(op.f('ix_token_usage_ai_action'), table_name='token_usage')
    op.drop_table('token_usage')
    op.drop_table('exchange_rates')
"""add product and service link to posts

Revision ID: a101b2c3d4e5
Revises: c07d95bf0601
Create Date: 2026-08-10 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a101b2c3d4e5'
down_revision: Union[str, Sequence[str], None] = 'c07d95bf0601'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('posts', sa.Column('product_id', sa.UUID(), nullable=True))
    op.add_column('posts', sa.Column('service_id', sa.UUID(), nullable=True))
    op.create_foreign_key('fk_posts_product_id', 'posts', 'products', ['product_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('fk_posts_service_id', 'posts', 'services', ['service_id'], ['id'], ondelete='SET NULL')
    op.create_index('ix_posts_product_id', 'posts', ['product_id'])
    op.create_index('ix_posts_service_id', 'posts', ['service_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_posts_service_id', table_name='posts')
    op.drop_index('ix_posts_product_id', table_name='posts')
    op.drop_constraint('fk_posts_service_id', 'posts', type_='foreignkey')
    op.drop_constraint('fk_posts_product_id', 'posts', type_='foreignkey')
    op.drop_column('posts', 'service_id')
    op.drop_column('posts', 'product_id')
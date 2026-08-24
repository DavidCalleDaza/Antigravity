"""Add media_urls to products and services

Revision ID: 7936d3d9925e
Revises: 7e6a9807985b
Create Date: 2026-08-23 13:10:00.000000

Adds a nullable JSONB column `media_urls` to `products` and `services` tables
to support multiple images per item. The existing `image_url` is preserved
as the primary/cover image.

Safe migration: ADD COLUMN nullable with no default.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers, used by Alembic.
revision: str = '7936d3d9925e'
down_revision: Union[str, Sequence[str], None] = '7e6a9807985b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'products',
        sa.Column('media_urls', JSONB, nullable=True, comment='List of media URLs for multi-image product gallery')
    )
    op.add_column(
        'services',
        sa.Column('media_urls', JSONB, nullable=True, comment='List of media URLs for multi-image service gallery')
    )


def downgrade() -> None:
    op.drop_column('services', 'media_urls')
    op.drop_column('products', 'media_urls')

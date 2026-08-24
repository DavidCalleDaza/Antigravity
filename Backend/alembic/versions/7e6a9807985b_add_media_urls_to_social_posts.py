"""Add media_urls JSONB column to social_posts

Revision ID: 7e6a9807985b
Revises: d1d2d3d4d5d6
Create Date: 2026-08-23 12:42:00.000000

Adds a nullable JSONB column `media_urls` to `social_posts` to support
multi-image carousel posts (Facebook / Instagram). The existing `media_url`
(single string) is preserved for backward compatibility.

Safe migration: ADD COLUMN nullable with no default — no table rewrite needed.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers, used by Alembic.
revision: str = '7e6a9807985b'
down_revision: Union[str, Sequence[str], None] = 'd1d2d3d4d5d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'social_posts',
        sa.Column('media_urls', JSONB, nullable=True, comment='List of media URLs for multi-image carousel posts')
    )


def downgrade() -> None:
    op.drop_column('social_posts', 'media_urls')

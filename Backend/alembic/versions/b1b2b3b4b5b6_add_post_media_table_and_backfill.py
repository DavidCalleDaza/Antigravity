"""add post_media table and backfill from posts

Revision ID: b1b2b3b4b5b6
Revises: c1c1c1c1c1c1
Create Date: 2026-08-10 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1b2b3b4b5b6'
down_revision: Union[str, Sequence[str], None] = 'c1c1c1c1c1c1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('post_media',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('post_id', sa.UUID(), nullable=False),
    sa.Column('media_url', sa.String(length=255), nullable=False),
    sa.Column('media_type', sa.String(length=50), nullable=True),
    sa.Column('position', sa.Integer(), server_default='0', nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['post_id'], ['posts.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_post_media_post_id'), 'post_media', ['post_id'], unique=False)

    # Backfill: copy legacy posts.media_url/media_type rows into post_media.
    op.execute("""
        INSERT INTO post_media (id, post_id, media_url, media_type, position, created_at)
        SELECT gen_random_uuid(), id, media_url, media_type, 0, created_at
        FROM posts
        WHERE media_url IS NOT NULL
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_post_media_post_id'), table_name='post_media')
    op.drop_table('post_media')

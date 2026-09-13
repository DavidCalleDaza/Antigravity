"""fix_cascade_delete_on_user_foreign_keys

Revision ID: 821b8d4af17a
Revises: 99b1649d36ec
Create Date: 2026-09-13 21:37:16.688733

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '821b8d4af17a'
down_revision: Union[str, Sequence[str], None] = '99b1649d36ec'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. social_posts: drop non-cascade FK and recreate with ondelete='CASCADE'
    op.drop_constraint('social_posts_user_id_fkey', 'social_posts', type_='foreignkey')
    op.create_foreign_key(
        'social_posts_user_id_fkey',
        'social_posts',
        'users',
        ['user_id'],
        ['id'],
        ondelete='CASCADE',
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('social_posts_user_id_fkey', 'social_posts', type_='foreignkey')
    op.create_foreign_key(
        'social_posts_user_id_fkey',
        'social_posts',
        'users',
        ['user_id'],
        ['id'],
    )

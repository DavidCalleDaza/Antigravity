"""merge auth and country settings heads

Revision ID: 9f50a3defb7b
Revises: 480f316c4bfc, 8d38138f3974
Create Date: 2026-07-25 17:01:10.325734

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9f50a3defb7b'
down_revision: Union[str, Sequence[str], None] = ('480f316c4bfc', '8d38138f3974')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass

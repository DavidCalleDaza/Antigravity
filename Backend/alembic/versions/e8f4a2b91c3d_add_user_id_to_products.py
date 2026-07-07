"""add user_id to products

Revision ID: e8f4a2b91c3d
Revises: c04d728adbd6
Create Date: 2026-07-06 23:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'e8f4a2b91c3d'
down_revision: Union[str, Sequence[str], None] = 'c04d728adbd6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "products",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_products_user_id_users",
        "products",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint("fk_products_user_id_users", "products", type_="foreignkey")
    op.drop_column("products", "user_id")

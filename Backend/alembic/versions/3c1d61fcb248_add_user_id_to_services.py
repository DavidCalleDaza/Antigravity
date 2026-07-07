"""add user_id to services
Revision ID: 3c1d61fcb248
Revises: 9213c30e2635
Create Date: 2026-07-06 21:34:44.730850
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
# revision identifiers, used by Alembic.
revision: str = '3c1d61fcb248'
down_revision: Union[str, Sequence[str], None] = '9213c30e2635'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None
def upgrade() -> None:
    op.add_column(
        "services",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_services_user_id_users",
        "services",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
def downgrade() -> None:
    op.drop_constraint("fk_services_user_id_users", "services", type_="foreignkey")
    op.drop_column("services", "user_id")

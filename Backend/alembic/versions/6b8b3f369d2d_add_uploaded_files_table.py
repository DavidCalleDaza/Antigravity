"""add uploaded_files table

Revision ID: 6b8b3f369d2d
Revises: 7936d3d9925e
Create Date: 2026-08-29 05:27:05.334374

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '6b8b3f369d2d'
down_revision = '7936d3d9925e'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'uploaded_files',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_uploaded_files_filename'), 'uploaded_files', ['filename'], unique=True)
    op.create_index(op.f('ix_uploaded_files_user_id'), 'uploaded_files', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_uploaded_files_user_id'), table_name='uploaded_files')
    op.drop_index(op.f('ix_uploaded_files_filename'), table_name='uploaded_files')
    op.drop_table('uploaded_files')

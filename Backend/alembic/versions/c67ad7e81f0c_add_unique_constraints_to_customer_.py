"""add_unique_constraints_to_customer_email_and_phone

Revision ID: c67ad7e81f0c
Revises: a7b3c5d8e21f
Create Date: 2026-06-26 14:19:27.633249

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c67ad7e81f0c'
down_revision: Union[str, Sequence[str], None] = 'a7b3c5d8e21f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Crear índice único para la columna 'email' en la tabla 'customers'
    op.create_index('ix_customers_email', 'customers', ['email'], unique=True)
    
    # 2. Crear índice único para la columna 'phone' en la tabla 'customers'
    # (PostgreSQL permite múltiples nulos dentro de índices UNIQUE sin conflicto)
    op.create_index('ix_customers_phone', 'customers', ['phone'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    # 1. Eliminar el índice único de la columna 'phone'
    op.drop_index('ix_customers_phone', table_name='customers')
    
    # 2. Eliminar el índice único de la columna 'email'
    op.drop_index('ix_customers_email', table_name='customers')
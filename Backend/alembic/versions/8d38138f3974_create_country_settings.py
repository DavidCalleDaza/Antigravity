"""create_country_settings

Revision ID: 8d38138f3974
Revises: e8f4a2b91c3d
Create Date: 2026-07-08 20:36:44.511362

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8d38138f3974'
down_revision: Union[str, Sequence[str], None] = 'e8f4a2b91c3d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Crear tabla country_settings
    op.create_table(
        'country_settings',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('country_code', sa.String(length=10), nullable=False),
        sa.Column('country_name', sa.String(length=100), nullable=False),
        sa.Column('default_tax_rate', sa.Numeric(precision=5, scale=2), nullable=False, server_default='0.00'),
        sa.Column('currency_code', sa.String(length=10), nullable=True),
        sa.Column('currency_symbol', sa.String(length=10), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('country_code')
    )
    op.create_index(op.f('ix_country_settings_country_code'), 'country_settings', ['country_code'], unique=True)

    # 2. Insertar semillas
    # Usaremos una consulta de inserción manual
    op.execute("""
        INSERT INTO country_settings (id, country_code, country_name, default_tax_rate, currency_code, currency_symbol, is_active)
        VALUES 
        ('99e9842a-9e7b-402a-91db-7517c5b1612a', 'CO', 'Colombia', 19.00, 'COP', '$', true),
        ('a3a316c2-073e-4b47-ba8e-cbf385b0d014', 'EC', 'Ecuador', 15.00, 'USD', '$', true),
        ('2ab1c49b-734e-41db-8be9-e092100877eb', 'PE', 'Perú', 18.00, 'PEN', 'S/.', true),
        ('0df4e28e-5b12-4217-bc21-6a2c38db02c9', 'PA', 'Panamá', 7.00, 'PAB', 'B/.', true),
        ('ff5eac12-c2e4-4d89-b88a-36b9e28dc390', 'US', 'Estados Unidos', 0.00, 'USD', '$', true)
    """)

    # 3. Relacionar locations.country_code con country_settings.country_code.
    # Limpiamos primero cualquier country_code de prueba que no coincida
    # con los códigos recién sembrados, para que el FK no falle.
    op.execute(
        """
        UPDATE locations
        SET country_code = NULL
        WHERE country_code IS NOT NULL
          AND country_code NOT IN (SELECT country_code FROM country_settings)
        """
    )
    op.create_index(
        op.f("ix_locations_country_code"),
        "locations",
        ["country_code"],
    )
    op.create_foreign_key(
        "fk_locations_country_code_country_settings",
        source_table="locations",
        referent_table="country_settings",
        local_cols=["country_code"],
        remote_cols=["country_code"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_locations_country_code_country_settings",
        "locations",
        type_="foreignkey",
    )
    op.drop_index(op.f("ix_locations_country_code"), table_name="locations")
    op.drop_index(op.f('ix_country_settings_country_code'), table_name='country_settings')
    op.drop_table('country_settings')
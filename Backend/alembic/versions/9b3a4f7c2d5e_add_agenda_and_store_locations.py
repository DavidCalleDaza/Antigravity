"""add agenda and store locations

Revision ID: 9b3a4f7c2d5e
Revises: cead60bc2af0
Create Date: 2026-07-14

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = '9b3a4f7c2d5e'
down_revision = 'cead60bc2af0'
branch_labels = None
depends_on = None


def upgrade():
    # ── store_locations ───────────────────────────────────────────────
    op.create_table(
        'store_locations',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('location_id', UUID(as_uuid=True), sa.ForeignKey('locations.id', ondelete='SET NULL'), nullable=True),
        sa.Column('name', sa.String(150), nullable=False),
        sa.Column('phone', sa.String(20), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('is_primary', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index(op.f('ix_store_locations_user_id'), 'store_locations', ['user_id'])

    # ── availability_templates ────────────────────────────────────────
    op.create_table(
        'availability_templates',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('day_of_week', sa.Integer(), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_time', sa.Time(), nullable=False),
        sa.Column('is_available', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index(op.f('ix_availability_templates_user_id'), 'availability_templates', ['user_id'])

    # ── availability_overrides ────────────────────────────────────────
    op.create_table(
        'availability_overrides',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_time', sa.Time(), nullable=False),
        sa.Column('is_available', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('reason', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index(op.f('ix_availability_overrides_user_id'), 'availability_overrides', ['user_id'])
    op.create_index(op.f('ix_availability_overrides_date'), 'availability_overrides', ['date'])

    # ── appointments ──────────────────────────────────────────────────
    op.create_table(
        'appointments',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('seller_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('client_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('service_id', UUID(as_uuid=True), sa.ForeignKey('services.id', ondelete='SET NULL'), nullable=True),
        sa.Column('store_location_id', UUID(as_uuid=True), sa.ForeignKey('store_locations.id', ondelete='SET NULL'), nullable=True),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_time', sa.Time(), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default=sa.text("'pending'")),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True, onupdate=sa.func.now()),
    )
    op.create_index(op.f('ix_appointments_seller_id'), 'appointments', ['seller_id'])
    op.create_index(op.f('ix_appointments_client_id'), 'appointments', ['client_id'])
    op.create_index(op.f('ix_appointments_date'), 'appointments', ['date'])

    # ── Add store_location_id to products ─────────────────────────────
    op.add_column('products', sa.Column('store_location_id', UUID(as_uuid=True), sa.ForeignKey('store_locations.id', ondelete='SET NULL'), nullable=True))

    # ── Add store_location_id to services ─────────────────────────────
    op.add_column('services', sa.Column('store_location_id', UUID(as_uuid=True), sa.ForeignKey('store_locations.id', ondelete='SET NULL'), nullable=True))


def downgrade():
    op.drop_column('services', 'store_location_id')
    op.drop_column('products', 'store_location_id')
    op.drop_table('appointments')
    op.drop_table('availability_overrides')
    op.drop_table('availability_templates')
    op.drop_table('store_locations')

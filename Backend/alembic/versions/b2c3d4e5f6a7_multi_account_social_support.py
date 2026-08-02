"""multi_account_social_support

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-08-01

Adds multi-account support for social integrations:
- New columns on social_accounts for identity, status, connection tracking
- Backfills platform_user_id for legacy TikTok rows (legacy-<id>)
- Unique constraint (user_id, platform, platform_user_id)
- Partial unique index for is_default per (user_id, platform)
- Unique constraint on social_tokens.account_id (one token per account)
- account_id FK on social_posts with backfill from (user_id, platform)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ──────────────────────────────────────────────────────────────────────────
    # Step 1: Add new columns to social_accounts (all with server_default → safe for NOT NULL)
    # ──────────────────────────────────────────────────────────────────────────
    op.add_column('social_accounts', sa.Column(
        'account_type', sa.String(20), nullable=False, server_default='personal',
    ))
    op.add_column('social_accounts', sa.Column(
        'display_label', sa.String(120), nullable=True,
    ))
    op.add_column('social_accounts', sa.Column(
        'is_default', sa.Boolean(), nullable=False, server_default='false',
    ))
    op.add_column('social_accounts', sa.Column(
        'status', sa.String(20), nullable=False, server_default='active',
    ))
    op.add_column('social_accounts', sa.Column(
        'last_error', sa.Text(), nullable=True,
    ))
    op.add_column('social_accounts', sa.Column(
        'last_verified_at', sa.DateTime(timezone=True), nullable=True,
    ))
    op.add_column('social_accounts', sa.Column(
        'connection_method', sa.String(20), nullable=False, server_default='oauth',
    ))
    op.add_column('social_accounts', sa.Column(
        'app_credential_id', sa.UUID(), nullable=True,
    ))
    op.create_foreign_key(
        'fk_social_accounts_app_credential_id',
        'social_accounts', 'social_app_credentials',
        ['app_credential_id'], ['id'],
        ondelete='SET NULL',
    )

    # ──────────────────────────────────────────────────────────────────────────
    # Step 2: Backfill existing data BEFORE adding constraints
    # ──────────────────────────────────────────────────────────────────────────

    # 2a) Fill NULL platform_user_id with synthetic value (TikTok OAuth accounts
    #     created by router.py:228-233 never set it). The publish flow only uses
    #     the access_token for TikTok, so this sentinel is functionally harmless.
    #     It self-corrects when the user reconnects.
    op.execute(
        "UPDATE social_accounts "
        "SET platform_user_id = 'legacy-' || id::text "
        "WHERE platform_user_id IS NULL"
    )

    # 2b) Mark all existing accounts as default (today there's at most one per
    #     (user_id, platform), so this doesn't violate the partial unique index).
    op.execute("UPDATE social_accounts SET is_default = true")

    # 2c) For accounts created via manual credential flow: set connection_method
    #     and link app_credential_id from the matching social_app_credentials row.
    #     Platform group mapping: facebook/instagram → 'meta', tiktok → 'tiktok'.
    op.execute("""
        UPDATE social_accounts sa
        SET connection_method = 'manual',
            app_credential_id = sac.id
        FROM social_app_credentials sac
        WHERE sa.user_id = sac.user_id
          AND (
              (sa.platform IN ('facebook', 'instagram') AND sac.platform_group = 'meta')
              OR (sa.platform = 'tiktok' AND sac.platform_group = 'tiktok')
          )
    """)

    # ──────────────────────────────────────────────────────────────────────────
    # Step 3: Make platform_user_id NOT NULL (safe after backfill)
    # ──────────────────────────────────────────────────────────────────────────
    op.alter_column('social_accounts', 'platform_user_id', nullable=False,
                    existing_type=sa.String(255))

    # ──────────────────────────────────────────────────────────────────────────
    # Step 4: Create constraints and indexes on social_accounts
    # ──────────────────────────────────────────────────────────────────────────
    op.create_unique_constraint(
        'uq_social_account_user_platform_ext',
        'social_accounts',
        ['user_id', 'platform', 'platform_user_id'],
    )
    # Partial unique index: only one default per (user_id, platform)
    op.execute(
        "CREATE UNIQUE INDEX ix_social_accounts_default_per_platform "
        "ON social_accounts (user_id, platform) "
        "WHERE is_default"
    )
    op.create_index(
        'ix_social_accounts_user_platform',
        'social_accounts',
        ['user_id', 'platform'],
    )

    # ──────────────────────────────────────────────────────────────────────────
    # Step 5: social_tokens — dedupe + unique constraint on account_id
    # ──────────────────────────────────────────────────────────────────────────
    # Defensively remove duplicate tokens per account_id, keeping the most recent
    op.execute("""
        DELETE FROM social_tokens
        WHERE id IN (
            SELECT id FROM (
                SELECT id,
                       ROW_NUMBER() OVER (
                           PARTITION BY account_id
                           ORDER BY created_at DESC
                       ) AS rn
                FROM social_tokens
            ) ranked
            WHERE rn > 1
        )
    """)
    op.create_unique_constraint(
        'uq_social_tokens_account_id',
        'social_tokens',
        ['account_id'],
    )

    # ──────────────────────────────────────────────────────────────────────────
    # Step 6: social_posts — add account_id FK with backfill
    # ──────────────────────────────────────────────────────────────────────────
    op.add_column('social_posts', sa.Column(
        'account_id', sa.UUID(), nullable=True,
    ))
    # Backfill: join social_posts to social_accounts on (user_id, platform).
    # For multi-account scenarios this picks the default; but since this migration
    # runs before multi-account creation is possible, the join is 1:1.
    op.execute("""
        UPDATE social_posts sp
        SET account_id = sa.id
        FROM social_accounts sa
        WHERE sp.user_id = sa.user_id
          AND sp.platform = sa.platform
    """)
    op.create_foreign_key(
        'fk_social_posts_account_id',
        'social_posts', 'social_accounts',
        ['account_id'], ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    # social_posts: drop FK and column
    op.drop_constraint('fk_social_posts_account_id', 'social_posts', type_='foreignkey')
    op.drop_column('social_posts', 'account_id')

    # social_tokens: drop unique constraint
    op.drop_constraint('uq_social_tokens_account_id', 'social_tokens', type_='unique')

    # social_accounts: drop indexes and constraints
    op.drop_index('ix_social_accounts_user_platform', table_name='social_accounts')
    op.execute("DROP INDEX IF EXISTS ix_social_accounts_default_per_platform")
    op.drop_constraint('uq_social_account_user_platform_ext', 'social_accounts', type_='unique')

    # Revert platform_user_id to nullable
    op.alter_column('social_accounts', 'platform_user_id', nullable=True,
                    existing_type=sa.String(255))

    # Drop FK and new columns (reverse order of add)
    op.drop_constraint('fk_social_accounts_app_credential_id', 'social_accounts', type_='foreignkey')
    op.drop_column('social_accounts', 'app_credential_id')
    op.drop_column('social_accounts', 'connection_method')
    op.drop_column('social_accounts', 'last_verified_at')
    op.drop_column('social_accounts', 'last_error')
    op.drop_column('social_accounts', 'status')
    op.drop_column('social_accounts', 'is_default')
    op.drop_column('social_accounts', 'display_label')
    op.drop_column('social_accounts', 'account_type')

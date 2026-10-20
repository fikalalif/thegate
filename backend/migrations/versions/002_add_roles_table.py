"""Add roles table for team personas and office NPCs.

Revision ID: 002_add_roles_table
Revises: 001_initial_schema
Create Date: 2026-10-19 15:40:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "002_add_roles_table"
down_revision: str | None = "001_initial_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "roles",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("role_key", sa.String(length=64), nullable=False, unique=True),
        sa.Column("department", sa.String(length=128), nullable=False),
        sa.Column("context_behavior", sa.Text(), nullable=False),
        sa.Column("preferred_model_id", sa.String(length=128), nullable=True),
        sa.Column("hair_color", sa.String(length=32), nullable=False, server_default="#4B2E1E"),
        sa.Column("shirt_color", sa.String(length=32), nullable=False, server_default="#2B5278"),
        sa.Column("tie_color", sa.String(length=32), nullable=True),
        sa.Column("has_glasses", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("has_headset", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("current_activity", sa.String(length=64), nullable=False, server_default="idle"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_roles_role_key", "roles", ["role_key"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_roles_role_key", table_name="roles")
    op.drop_table("roles")

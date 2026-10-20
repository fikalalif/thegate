"""Initial schema migration for TheGate entities.

Revision ID: 001_initial_schema
Revises:
Create Date: 2026-10-13 16:45:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "001_initial_schema"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. api_keys
    op.create_table(
        "api_keys",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("key_prefix", sa.String(length=16), nullable=False),
        sa.Column("key_hash", sa.String(length=64), nullable=False, unique=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_api_keys_key_prefix", "api_keys", ["key_prefix"])
    op.create_index("ix_api_keys_key_hash", "api_keys", ["key_hash"], unique=True)

    # 2. routing_policies
    op.create_table(
        "routing_policies",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("mode", sa.String(length=32), nullable=False),
        sa.Column("configuration", sa.JSON(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )

    # 3. models_registry
    op.create_table(
        "models_registry",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("internal_name", sa.String(length=128), nullable=False, unique=True),
        sa.Column("backend_model_id", sa.String(length=128), nullable=False),
        sa.Column(
            "provider_adapter", sa.String(length=64), nullable=False, server_default="9router"
        ),
        sa.Column("capabilities", sa.JSON(), nullable=False),
        sa.Column("context_limit", sa.Integer(), nullable=True),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index(
        "ix_models_registry_internal_name", "models_registry", ["internal_name"], unique=True
    )

    # 4. model_pricing
    op.create_table(
        "model_pricing",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "model_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("models_registry.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("input_price_per_million", sa.Numeric(precision=12, scale=6), nullable=True),
        sa.Column("output_price_per_million", sa.Numeric(precision=12, scale=6), nullable=True),
        sa.Column("currency", sa.String(length=8), nullable=False, server_default="USD"),
        sa.Column(
            "effective_from",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("effective_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("source", sa.String(length=128), nullable=True),
        sa.Column("validated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_model_pricing_model_id", "model_pricing", ["model_id"])

    # 5. requests (Privacy by Default: No prompt/response content columns)
    op.create_table(
        "requests",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "api_key_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("api_keys.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "routing_policy_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("routing_policies.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("routing_policy_version", sa.Integer(), nullable=True),
        sa.Column(
            "timestamp", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column(
            "selected_model_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("models_registry.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("input_tokens", sa.Integer(), nullable=True),
        sa.Column("output_tokens", sa.Integer(), nullable=True),
        sa.Column("cost_amount", sa.Numeric(precision=12, scale=6), nullable=True),
        sa.Column("cost_currency", sa.String(length=8), nullable=False, server_default="USD"),
        sa.Column("cost_type", sa.String(length=32), nullable=False, server_default="UNKNOWN"),
        sa.Column("baseline_cost_amount", sa.Numeric(precision=12, scale=6), nullable=True),
        sa.Column("estimated_savings_percent", sa.Numeric(precision=6, scale=2), nullable=True),
        sa.Column("routing_latency_ms", sa.Integer(), nullable=True),
        sa.Column("provider_latency_ms", sa.Integer(), nullable=True),
        sa.Column("total_duration_ms", sa.Integer(), nullable=True),
        sa.Column("stream_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("error_category", sa.String(length=64), nullable=True),
    )
    op.create_index("ix_requests_timestamp", "requests", ["timestamp"])
    op.create_index("ix_requests_status", "requests", ["status"])
    op.create_index("ix_requests_api_key_id", "requests", ["api_key_id"])
    op.create_index("ix_requests_selected_model_id", "requests", ["selected_model_id"])

    # 6. routing_decisions
    op.create_table(
        "routing_decisions",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "request_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("requests.id", ondelete="CASCADE"),
            unique=True,
            nullable=False,
        ),
        sa.Column("strategy_name", sa.String(length=64), nullable=False),
        sa.Column("strategy_version", sa.String(length=32), nullable=False, server_default="1.0.0"),
        sa.Column(
            "selected_model_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("models_registry.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("decision_reason", sa.String(length=512), nullable=True),
        sa.Column("candidate_summary", sa.JSON(), nullable=True),
        sa.Column("estimated_cost", sa.Numeric(precision=12, scale=6), nullable=True),
        sa.Column("decision_latency_ms", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index(
        "ix_routing_decisions_request_id", "routing_decisions", ["request_id"], unique=True
    )

    # 7. request_attempts
    op.create_table(
        "request_attempts",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "request_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("requests.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("attempt_number", sa.Integer(), nullable=False, server_default="1"),
        sa.Column(
            "model_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("models_registry.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("error_category", sa.String(length=64), nullable=True),
        sa.Column(
            "started_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("usage_metadata", sa.JSON(), nullable=True),
    )
    op.create_index("ix_request_attempts_request_id", "request_attempts", ["request_id"])


def downgrade() -> None:
    op.drop_index("ix_request_attempts_request_id", table_name="request_attempts")
    op.drop_table("request_attempts")

    op.drop_index("ix_routing_decisions_request_id", table_name="routing_decisions")
    op.drop_table("routing_decisions")

    op.drop_index("ix_requests_selected_model_id", table_name="requests")
    op.drop_index("ix_requests_api_key_id", table_name="requests")
    op.drop_index("ix_requests_status", table_name="requests")
    op.drop_index("ix_requests_timestamp", table_name="requests")
    op.drop_table("requests")

    op.drop_index("ix_model_pricing_model_id", table_name="model_pricing")
    op.drop_table("model_pricing")

    op.drop_index("ix_models_registry_internal_name", table_name="models_registry")
    op.drop_table("models_registry")

    op.drop_table("routing_policies")

    op.drop_index("ix_api_keys_key_hash", table_name="api_keys")
    op.drop_index("ix_api_keys_key_prefix", table_name="api_keys")
    op.drop_table("api_keys")

"""add waitlist

Revision ID: 0004
Revises: 0003
Create Date: 2025-01-04 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        "waitlist",
        sa.Column("id",          UUID(as_uuid=False), primary_key=True),
        sa.Column("tenant_id",   UUID(as_uuid=False), sa.ForeignKey("tenants.id"),   nullable=False),
        sa.Column("client_id",   UUID(as_uuid=False), sa.ForeignKey("clients.id"),   nullable=False),
        sa.Column("provider_id", UUID(as_uuid=False), sa.ForeignKey("providers.id"), nullable=False),
        sa.Column("service_id",  UUID(as_uuid=False), sa.ForeignKey("services.id"),  nullable=True),
        sa.Column("preferred_date_from", sa.Date(), nullable=True),
        sa.Column("preferred_date_to",   sa.Date(), nullable=True),
        sa.Column("preferred_time_from", sa.String(5), nullable=True),
        sa.Column("preferred_time_to",   sa.String(5), nullable=True),
        sa.Column("status",      sa.Enum("waiting","notified","booked","expired", name="waitliststatus"), nullable=False, server_default="waiting"),
        sa.Column("notified_at", sa.DateTime(), nullable=True),
        sa.Column("slot_id",     UUID(as_uuid=False), sa.ForeignKey("slots.id"), nullable=True),
        sa.Column("notes",       sa.Text(), nullable=True),
        sa.Column("created_at",  sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at",  sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_waitlist_tenant_id",   "waitlist", ["tenant_id"])
    op.create_index("ix_waitlist_provider_id", "waitlist", ["provider_id"])
    op.create_index("ix_waitlist_status",      "waitlist", ["status"])

def downgrade() -> None:
    op.drop_table("waitlist")
    op.execute("DROP TYPE IF EXISTS waitliststatus")
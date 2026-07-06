"""add tenant settings

Revision ID: 0003
Revises: 0002
Create Date: 2025-01-03 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        "tenant_settings",
        sa.Column("id",         UUID(as_uuid=False), primary_key=True),
        sa.Column("tenant_id",  UUID(as_uuid=False), sa.ForeignKey("tenants.id"), nullable=False, unique=True),
        sa.Column("settings",   sa.Text(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )

def downgrade() -> None:
    op.drop_table("tenant_settings")
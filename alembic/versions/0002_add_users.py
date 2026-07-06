"""add users table

Revision ID: 0002
Revises: 0001
Create Date: 2025-01-02 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id",              UUID(as_uuid=False), primary_key=True),
        sa.Column("tenant_id",       UUID(as_uuid=False), sa.ForeignKey("tenants.id"), nullable=True),
        sa.Column("username",        sa.String(128), nullable=False, unique=True),
        sa.Column("email",           sa.String(255)),
        sa.Column("full_name",       sa.String(255)),
        sa.Column("hashed_password", sa.String(512)),
        sa.Column("role",            sa.Enum("superadmin","admin","receptionist","provider","viewer", name="userrole", create_type=False), nullable=False),
        sa.Column("auth_provider",   sa.Enum("local","ldap", name="authprovider", create_type=False), nullable=False, server_default="local"),
        sa.Column("active",          sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("provider_id",     UUID(as_uuid=False), sa.ForeignKey("providers.id"), nullable=True),
        sa.Column("created_at",      sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at",      sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_users_username",  "users", ["username"])
    op.create_index("ix_users_tenant_id", "users", ["tenant_id"])

def downgrade() -> None:
    op.drop_table("users")

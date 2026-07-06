"""initial schema

Revision ID: 0001
Revises: 
Create Date: 2025-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # tenants
    op.create_table(
        "tenants",
        sa.Column("id",                  UUID(as_uuid=False), primary_key=True),
        sa.Column("slug",                sa.String(64),  nullable=False, unique=True),
        sa.Column("name",                sa.String(255), nullable=False),
        sa.Column("timezone",            sa.String(64),  nullable=False, server_default="Asia/Tbilisi"),
        sa.Column("phone",               sa.String(32)),
        sa.Column("active",              sa.Boolean(),   nullable=False, server_default="true"),
        sa.Column("provider_label",      sa.String(64),  nullable=False, server_default="Provider"),
        sa.Column("client_label",        sa.String(64),  nullable=False, server_default="Client"),
        sa.Column("require_personal_id", sa.Boolean(),   nullable=False, server_default="false"),
        sa.Column("require_dob",         sa.Boolean(),   nullable=False, server_default="false"),
        sa.Column("created_at",          sa.DateTime(),  nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at",          sa.DateTime(),  nullable=False, server_default=sa.text("now()")),
    )

    # providers
    op.create_table(
        "providers",
        sa.Column("id",                     UUID(as_uuid=False), primary_key=True),
        sa.Column("tenant_id",              UUID(as_uuid=False), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("first_name",             sa.String(128), nullable=False),
        sa.Column("last_name",              sa.String(128), nullable=False),
        sa.Column("specialty",              sa.String(255)),
        sa.Column("phone",                  sa.String(32)),
        sa.Column("email",                  sa.String(255)),
        sa.Column("photo_url",              sa.String(512)),
        sa.Column("active",                 sa.Boolean(),   nullable=False, server_default="true"),
        sa.Column("notes",                  sa.Text()),
        sa.Column("calendar_provider",      sa.Enum("google","outlook","caldav", name="calendarprovider"), nullable=True),
        sa.Column("calendar_id",            sa.String(512)),
        sa.Column("calendar_refresh_token", sa.Text()),
        sa.Column("calendar_sync_enabled",  sa.Boolean(), server_default="false"),
        sa.Column("created_at",             sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at",             sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_providers_tenant_id", "providers", ["tenant_id"])

    # clients
    op.create_table(
        "clients",
        sa.Column("id",          UUID(as_uuid=False), primary_key=True),
        sa.Column("tenant_id",   UUID(as_uuid=False), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("first_name",  sa.String(128), nullable=False),
        sa.Column("last_name",   sa.String(128), nullable=False),
        sa.Column("phone",       sa.String(32),  nullable=False),
        sa.Column("email",       sa.String(255)),
        sa.Column("personal_id", sa.String(64)),
        sa.Column("dob",         sa.Date()),
        sa.Column("created_at",  sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at",  sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_clients_tenant_id", "clients", ["tenant_id"])
    op.create_index("ix_clients_phone",     "clients", ["phone"])

    # services
    op.create_table(
        "services",
        sa.Column("id",           UUID(as_uuid=False), primary_key=True),
        sa.Column("tenant_id",    UUID(as_uuid=False), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("code",         sa.String(32),  nullable=False),
        sa.Column("name_ka",      sa.String(255), nullable=False),
        sa.Column("name_en",      sa.String(255)),
        sa.Column("duration_min", sa.Integer(),   nullable=False, server_default="30"),
        sa.Column("active",       sa.Boolean(),   nullable=False, server_default="true"),
        sa.Column("color",        sa.String(7),   nullable=False, server_default="#1D9E75"),
        sa.Column("created_at",   sa.DateTime(),  nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at",   sa.DateTime(),  nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_services_tenant_id", "services", ["tenant_id"])

    # provider_services (M2M)
    op.create_table(
        "provider_services",
        sa.Column("id",          UUID(as_uuid=False), primary_key=True),
        sa.Column("provider_id", UUID(as_uuid=False), sa.ForeignKey("providers.id"), nullable=False),
        sa.Column("service_id",  UUID(as_uuid=False), sa.ForeignKey("services.id"),  nullable=False),
        sa.UniqueConstraint("provider_id", "service_id", name="uq_provider_service"),
    )

    # slots
    op.create_table(
        "slots",
        sa.Column("id",              UUID(as_uuid=False), primary_key=True),
        sa.Column("provider_id",     UUID(as_uuid=False), sa.ForeignKey("providers.id"), nullable=False),
        sa.Column("service_id",      UUID(as_uuid=False), sa.ForeignKey("services.id"),  nullable=False),
        sa.Column("starts_at",       sa.DateTime(), nullable=False),
        sa.Column("ends_at",         sa.DateTime(), nullable=False),
        sa.Column("status",          sa.Enum("available","booked","blocked", name="slotstatus"), nullable=False, server_default="available"),
        sa.Column("google_event_id", sa.String(255)),
        sa.Column("created_at",      sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at",      sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_slots_provider_id", "slots", ["provider_id"])
    op.create_index("ix_slots_starts_at",   "slots", ["starts_at"])
    op.create_index("ix_slots_status",      "slots", ["status"])

    # appointments
    op.create_table(
        "appointments",
        sa.Column("id",              UUID(as_uuid=False), primary_key=True),
        sa.Column("tenant_id",       UUID(as_uuid=False), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("client_id",       UUID(as_uuid=False), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("slot_id",         UUID(as_uuid=False), sa.ForeignKey("slots.id"),   nullable=False, unique=True),
        sa.Column("status",          sa.Enum("pending","confirmed","cancelled","completed","no_show", name="appointmentstatus"), nullable=False, server_default="pending"),
        sa.Column("notes",           sa.Text()),
        sa.Column("google_event_id", sa.String(255)),
        sa.Column("created_at",      sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at",      sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_appointments_tenant_id", "appointments", ["tenant_id"])
    op.create_index("ix_appointments_client_id", "appointments", ["client_id"])
    op.create_index("ix_appointments_status",    "appointments", ["status"])

    # appointment_codes
    op.create_table(
        "appointment_codes",
        sa.Column("id",             UUID(as_uuid=False), primary_key=True),
        sa.Column("appointment_id", UUID(as_uuid=False), sa.ForeignKey("appointments.id"), nullable=False),
        sa.Column("code",           sa.String(32), nullable=False, unique=True),
        sa.Column("expires_at",     sa.DateTime(), nullable=False),
        sa.Column("used",           sa.Boolean(),  nullable=False, server_default="false"),
        sa.Column("created_at",     sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at",     sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_appointment_codes_code", "appointment_codes", ["code"])

    # seed: innova tenant
    op.execute("""
        INSERT INTO tenants (id, slug, name, timezone, provider_label, client_label, require_personal_id, require_dob)
        VALUES (
            gen_random_uuid(),
            'innova',
            'Innova Medical',
            'Asia/Tbilisi',
            'ექიმი',
            'პაციენტი',
            true,
            true
        )
    """)


def downgrade() -> None:
    op.drop_table("appointment_codes")
    op.drop_table("appointments")
    op.drop_table("slots")
    op.drop_table("provider_services")
    op.drop_table("services")
    op.drop_table("clients")
    op.drop_table("providers")
    op.drop_table("tenants")
    op.execute("DROP TYPE IF EXISTS calendarprovider")
    op.execute("DROP TYPE IF EXISTS slotstatus")
    op.execute("DROP TYPE IF EXISTS appointmentstatus")

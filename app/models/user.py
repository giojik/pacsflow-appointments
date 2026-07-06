import enum
from sqlalchemy import Column, String, Boolean, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import Base, TimestampMixin, gen_uuid

class UserRole(str, enum.Enum):
    superadmin   = "superadmin"
    admin        = "admin"
    receptionist = "receptionist"
    provider     = "provider"
    viewer       = "viewer"

class AuthProvider(str, enum.Enum):
    local = "local"
    ldap  = "ldap"

class User(Base, TimestampMixin):
    __tablename__ = "users"

    id            = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    tenant_id     = Column(UUID(as_uuid=False), ForeignKey("tenants.id"), nullable=True)
    # superadmin-ს tenant_id=None — ყველა tenant-ზე წვდომა

    username      = Column(String(128), unique=True, nullable=False)
    email         = Column(String(255))
    full_name     = Column(String(255))
    hashed_password = Column(String(512), nullable=True)  # LDAP-ისთვის null
    role          = Column(SAEnum(UserRole),     nullable=False, default=UserRole.viewer)
    auth_provider = Column(SAEnum(AuthProvider), nullable=False, default=AuthProvider.local)
    active        = Column(Boolean, default=True)

    # provider role-ისთვის — რომელ provider-თანაა დაკავშირებული
    provider_id   = Column(UUID(as_uuid=False), ForeignKey("providers.id"), nullable=True)

    tenant   = relationship("Tenant",   foreign_keys=[tenant_id])
    provider = relationship("Provider", foreign_keys=[provider_id])

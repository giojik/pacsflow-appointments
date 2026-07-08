from sqlalchemy import Column, String, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import Base, TimestampMixin, gen_uuid

class Tenant(Base, TimestampMixin):
    __tablename__ = "tenants"
    id                  = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    slug                = Column(String(64),  unique=True, nullable=False)
    name                = Column(String(255), nullable=False)
    timezone            = Column(String(64),  default="Asia/Tbilisi")
    phone               = Column(String(32))
    active              = Column(Boolean, default=True)
    provider_label      = Column(String(64),  default="Provider")
    client_label        = Column(String(64),  default="Client")
    require_personal_id = Column(Boolean, default=False)
    require_dob         = Column(Boolean, default=False)
    domains             = Column(String(1024), default="")
    path_slug           = Column(String(20), unique=True, nullable=True)

    providers    = relationship("Provider",    back_populates="tenant")
    clients      = relationship("Client",      back_populates="tenant")
    services     = relationship("Service",     back_populates="tenant")
    appointments = relationship("Appointment", back_populates="tenant")
    

from sqlalchemy import Column, String, Integer, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import Base, TimestampMixin, gen_uuid

class Service(Base, TimestampMixin):
    __tablename__ = "services"
    id           = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    tenant_id    = Column(UUID(as_uuid=False), ForeignKey("tenants.id"), nullable=False)
    code         = Column(String(32),  nullable=False)
    name_ka      = Column(String(255), nullable=False)
    name_en      = Column(String(255))
    duration_min = Column(Integer, default=30)
    active       = Column(Boolean, default=True)
    color        = Column(String(7),  default="#1D9E75")
    tenant            = relationship("Tenant",          back_populates="services")
    provider_services = relationship("ProviderService", back_populates="service")

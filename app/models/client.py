from sqlalchemy import Column, String, ForeignKey, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import Base, TimestampMixin, gen_uuid

class Client(Base, TimestampMixin):
    __tablename__ = "clients"
    id          = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    tenant_id   = Column(UUID(as_uuid=False), ForeignKey("tenants.id"), nullable=False)
    first_name  = Column(String(128), nullable=False)
    last_name   = Column(String(128), nullable=False)
    phone       = Column(String(32),  nullable=False)
    email       = Column(String(255))
    personal_id = Column(String(64))
    dob         = Column(Date)
    tenant       = relationship("Tenant", back_populates="clients")
    appointments = relationship("Appointment", back_populates="client")

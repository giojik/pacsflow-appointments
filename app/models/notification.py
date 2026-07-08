from sqlalchemy import Column, String, Boolean, ForeignKey, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import Base, gen_uuid
from datetime import datetime

class Notification(Base):
    __tablename__ = "notifications"
    id              = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    tenant_id       = Column(UUID(as_uuid=False), ForeignKey("tenants.id"), nullable=False)
    user_id         = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)
    provider_id     = Column(UUID(as_uuid=False), ForeignKey("providers.id"), nullable=True)
    title           = Column(String(255), nullable=False)
    body            = Column(Text)
    type            = Column(String(50), default="appointment")
    appointment_id  = Column(UUID(as_uuid=False), ForeignKey("appointments.id"), nullable=True)
    read            = Column(Boolean, default=False)
    created_at      = Column(DateTime, default=datetime.utcnow)

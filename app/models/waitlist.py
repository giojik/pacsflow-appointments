import enum
from sqlalchemy import Column, String, Date, DateTime, Enum as SAEnum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import Base, TimestampMixin, gen_uuid

class WaitlistStatus(str, enum.Enum):
    waiting  = "waiting"
    notified = "notified"
    booked   = "booked"
    expired  = "expired"

class Waitlist(Base, TimestampMixin):
    __tablename__ = "waitlist"

    id          = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    tenant_id   = Column(UUID(as_uuid=False), ForeignKey("tenants.id"),   nullable=False)
    client_id   = Column(UUID(as_uuid=False), ForeignKey("clients.id"),   nullable=False)
    provider_id = Column(UUID(as_uuid=False), ForeignKey("providers.id"), nullable=False)
    service_id  = Column(UUID(as_uuid=False), ForeignKey("services.id"),  nullable=True)
    preferred_date_from = Column(Date,      nullable=True)
    preferred_date_to   = Column(Date,      nullable=True)
    preferred_time_from = Column(String(5), nullable=True)
    preferred_time_to   = Column(String(5), nullable=True)
    status      = Column(SAEnum(WaitlistStatus), nullable=False, default=WaitlistStatus.waiting)
    notified_at = Column(DateTime, nullable=True)
    slot_id     = Column(UUID(as_uuid=False), ForeignKey("slots.id"), nullable=True)
    notes       = Column(Text, nullable=True)

    client   = relationship("Client",   foreign_keys=[client_id])
    provider = relationship("Provider", foreign_keys=[provider_id])
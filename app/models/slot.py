import enum
from sqlalchemy import Column, DateTime, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import Base, TimestampMixin, gen_uuid

class SlotStatus(str, enum.Enum):
    available = "available"
    booked    = "booked"
    blocked   = "blocked"

class Slot(Base, TimestampMixin):
    __tablename__ = "slots"
    id              = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    provider_id     = Column(UUID(as_uuid=False), ForeignKey("providers.id"), nullable=False)
    service_id      = Column(UUID(as_uuid=False), ForeignKey("services.id"),  nullable=False)
    starts_at       = Column(DateTime, nullable=False)
    ends_at         = Column(DateTime, nullable=False)
    status          = Column(Enum(SlotStatus), default=SlotStatus.available, nullable=False)
    google_event_id = Column(String(255))
    provider    = relationship("Provider", back_populates="slots")
    appointment = relationship("Appointment", back_populates="slot", uselist=False)

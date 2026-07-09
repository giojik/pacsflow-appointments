import enum
from sqlalchemy import Column, DateTime, Enum, ForeignKey, String, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import Base, TimestampMixin, gen_uuid

class AppointmentStatus(str, enum.Enum):
    pending   = "pending"
    confirmed = "confirmed"
    cancelled = "cancelled"
    completed = "completed"
    no_show   = "no_show"

class Appointment(Base, TimestampMixin):
    __tablename__ = "appointments"
    id              = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    tenant_id       = Column(UUID(as_uuid=False), ForeignKey("tenants.id"), nullable=False)
    client_id       = Column(UUID(as_uuid=False), ForeignKey("clients.id"), nullable=False)
    slot_id         = Column(UUID(as_uuid=False), ForeignKey("slots.id"),   nullable=False)
    status          = Column(Enum(AppointmentStatus), default=AppointmentStatus.pending)
    notes           = Column(Text)
    google_event_id = Column(String(255))
    reminder_sent   = Column(Boolean, default=False)
    cancelled_by    = Column(String(128))
    cancelled_at    = Column(DateTime)
    last_modified_by = Column(String(128))
    modified_from_ip = Column(String(64))
    modified_from_ua = Column(String(512))
    tenant = relationship("Tenant",          back_populates="appointments")
    client = relationship("Client",          back_populates="appointments")
    slot   = relationship("Slot",            back_populates="appointment")
    codes  = relationship("AppointmentCode", back_populates="appointment")

class AppointmentCode(Base, TimestampMixin):
    __tablename__ = "appointment_codes"
    id             = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    appointment_id = Column(UUID(as_uuid=False), ForeignKey("appointments.id"), nullable=False)
    code           = Column(String(32), unique=True, nullable=False)
    expires_at     = Column(DateTime, nullable=False)
    used           = Column(Boolean, default=False)
    appointment    = relationship("Appointment", back_populates="codes")

from sqlalchemy import Column, String, Boolean, ForeignKey, Text, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import Base, TimestampMixin, gen_uuid
import enum

class CalendarProvider(str, enum.Enum):
    google  = "google"
    outlook = "outlook"
    caldav  = "caldav"

class Provider(Base, TimestampMixin):
    __tablename__ = "providers"

    id         = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    tenant_id  = Column(UUID(as_uuid=False), ForeignKey("tenants.id"), nullable=False)
    first_name = Column(String(128), nullable=False)
    last_name  = Column(String(128), nullable=False)
    specialty  = Column(String(255))
    phone      = Column(String(32))
    email      = Column(String(255))
    photo_url  = Column(String(512))
    active     = Column(Boolean, default=True)
    notes      = Column(Text)

    # Calendar sync — provider-ი ირჩევს სერვისს
    calendar_provider    = Column(SAEnum(CalendarProvider), nullable=True)
    calendar_id          = Column(String(512))   # Google id / CalDAV URL / Outlook id
    calendar_refresh_token = Column(Text)
    calendar_sync_enabled  = Column(Boolean, default=False)

    # backward-compat aliases
    @property
    def google_calendar_id(self): return self.calendar_id
    @property
    def google_refresh_token(self): return self.calendar_refresh_token

    tenant            = relationship("Tenant",          back_populates="providers")
    provider_services = relationship("ProviderService", back_populates="provider")
    slots             = relationship("Slot",            back_populates="provider")

class ProviderService(Base):
    __tablename__ = "provider_services"
    id          = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    provider_id = Column(UUID(as_uuid=False), ForeignKey("providers.id"), nullable=False)
    service_id  = Column(UUID(as_uuid=False), ForeignKey("services.id"),  nullable=False)
    provider    = relationship("Provider", back_populates="provider_services")
    service     = relationship("Service",  back_populates="provider_services")

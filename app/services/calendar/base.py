"""
CalendarAdapter — abstract base.
ნებისმიერი კალენდარის სერვისი ამ interface-ს ახორციელებს.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

@dataclass
class CalendarEvent:
    """კალენდარში ერთი ჩანაწერი — platform-agnostic"""
    title: str
    starts_at: datetime
    ends_at: datetime
    description: str = ""
    location: str = ""
    attendee_email: Optional[str] = None
    external_id: Optional[str] = None   # Google event id, Outlook event id...

@dataclass
class CalendarCredentials:
    """Provider-ის კალენდარის კრედენციალები"""
    provider_type: str                  # "google" | "outlook" | "caldav"
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    calendar_id: Optional[str] = None   # Google calendar id / CalDAV url
    token_expiry: Optional[datetime] = None
    extra: Optional[dict] = None        # platform-specific extras

class CalendarAdapter(ABC):
    """Abstract interface — ყველა adapter ამ კლასს extend-ავს"""

    def __init__(self, credentials: CalendarCredentials):
        self.credentials = credentials

    @abstractmethod
    def create_event(self, event: CalendarEvent) -> str:
        """კალენდარში event შექმნა → external_id დაბრუნება"""

    @abstractmethod
    def update_event(self, external_id: str, event: CalendarEvent) -> bool:
        """არსებული event-ის განახლება"""

    @abstractmethod
    def delete_event(self, external_id: str) -> bool:
        """event-ის წაშლა (ჩაწერა გაუქმდა)"""

    @abstractmethod
    def get_busy_slots(self, start: datetime, end: datetime) -> list[tuple[datetime, datetime]]:
        """დაკავებული პერიოდების სია — slot გენერაციისთვის"""

    @abstractmethod
    def get_auth_url(self, state: str) -> str:
        """OAuth redirect URL — provider-ი ავტორიზებს"""

    @abstractmethod
    def exchange_code(self, code: str) -> CalendarCredentials:
        """OAuth code → credentials"""

    @abstractmethod
    def refresh_credentials(self) -> CalendarCredentials:
        """access_token-ის განახლება refresh_token-ით"""

    def build_event_title(self, client_name: str, service_name: str) -> str:
        return f"{client_name} — {service_name}"

    def build_event_description(self, appointment_id: str, client_phone: str,
                                 service_name: str, notes: str = "") -> str:
        lines = [
            f"PacsFlow Appointment: {appointment_id}",
            f"სერვისი: {service_name}",
            f"ტელეფონი: {client_phone}",
        ]
        if notes:
            lines.append(f"შენიშვნა: {notes}")
        return "\n".join(lines)

from .base import CalendarAdapter, CalendarCredentials
from .google import GoogleCalendarAdapter
from .outlook import OutlookCalendarAdapter
from .caldav import CalDAVAdapter

ADAPTERS: dict[str, type[CalendarAdapter]] = {
    "google":  GoogleCalendarAdapter,
    "outlook": OutlookCalendarAdapter,
    "caldav":  CalDAVAdapter,
}

def get_calendar_adapter(credentials: CalendarCredentials) -> CalendarAdapter:
    adapter_cls = ADAPTERS.get(credentials.provider_type)
    if not adapter_cls:
        supported = ", ".join(ADAPTERS.keys())
        raise ValueError(f"უცნობი კალენდარის სერვისი: '{credentials.provider_type}'. მხარდაჭერილია: {supported}")
    return adapter_cls(credentials)

def supported_providers() -> list[str]:
    return list(ADAPTERS.keys())

"""CalDAV adapter — placeholder"""
from datetime import datetime
from .base import CalendarAdapter, CalendarCredentials, CalendarEvent

class CalDAVAdapter(CalendarAdapter):
    def get_auth_url(self, state: str) -> str: raise NotImplementedError("CalDAV — არ საჭიროებს OAuth")
    def exchange_code(self, code: str) -> CalendarCredentials: raise NotImplementedError
    def refresh_credentials(self) -> CalendarCredentials: raise NotImplementedError
    def create_event(self, event: CalendarEvent) -> str: raise NotImplementedError
    def update_event(self, external_id: str, event: CalendarEvent) -> bool: raise NotImplementedError
    def delete_event(self, external_id: str) -> bool: raise NotImplementedError
    def get_busy_slots(self, start: datetime, end: datetime) -> list: return []

"""CalDAV adapter — Apple Calendar, Nextcloud, Fastmail, Proton და ა.შ."""
from datetime import datetime, timezone
from typing import Optional
from .base import CalendarAdapter, CalendarCredentials, CalendarEvent
import uuid

class CalDAVAdapter(CalendarAdapter):
    """
    CalDAV — open standard.
    calendar_id = CalDAV calendar URL
    access_token = Basic Auth password (ან app-specific password)
    extra = {"username": "user@example.com"}
    """

    def get_auth_url(self, state: str) -> str:
        # CalDAV uses username/password — no OAuth redirect
        raise NotImplementedError("CalDAV uses username + app password, not OAuth")

    def exchange_code(self, code: str) -> CalendarCredentials:
        raise NotImplementedError("CalDAV uses username + app password, not OAuth")

    def refresh_credentials(self) -> CalendarCredentials:
        return self.credentials  # Basic auth არ ვადაგასდის

    def _username(self) -> str:
        return (self.credentials.extra or {}).get("username", "")

    def _auth(self):
        return (self._username(), self.credentials.access_token or "")

    def _calendar_url(self) -> str:
        return self.credentials.calendar_id or ""

    def create_event(self, event: CalendarEvent) -> str:
        import httpx
        uid = str(uuid.uuid4())
        ical = self._build_ical(uid, event)
        url = f"{self._calendar_url().rstrip('/')}/{uid}.ics"
        r = httpx.put(
            url, content=ical.encode(),
            auth=self._auth(),
            headers={"Content-Type": "text/calendar; charset=utf-8"}
        )
        r.raise_for_status()
        return uid

    def update_event(self, external_id: str, event: CalendarEvent) -> bool:
        import httpx
        ical = self._build_ical(external_id, event)
        url = f"{self._calendar_url().rstrip('/')}/{external_id}.ics"
        r = httpx.put(
            url, content=ical.encode(),
            auth=self._auth(),
            headers={"Content-Type": "text/calendar; charset=utf-8"}
        )
        return r.status_code in (200, 201, 204)

    def delete_event(self, external_id: str) -> bool:
        import httpx
        url = f"{self._calendar_url().rstrip('/')}/{external_id}.ics"
        r = httpx.delete(url, auth=self._auth())
        return r.status_code == 204

    def get_busy_slots(self, start: datetime, end: datetime) -> list[tuple[datetime, datetime]]:
        import httpx
        report = (
            '<?xml version="1.0" encoding="utf-8"?>'
            '<C:free-busy-query xmlns:C="urn:ietf:params:xml:ns:caldav">'
            f'<C:time-range start="{self._dt(start)}" end="{self._dt(end)}"/>'
            '</C:free-busy-query>'
        )
        r = httpx.request(
            "REPORT", self._calendar_url(),
            content=report.encode(), auth=self._auth(),
            headers={"Content-Type": "application/xml", "Depth": "1"}
        )
        # Basic parsing — production-ში caldav library გამოიყენეთ
        return []  # TODO: parse VCALENDAR FREEBUSY response

    @staticmethod
    def _dt(dt: datetime) -> str:
        return dt.strftime("%Y%m%dT%H%M%SZ")

    def _build_ical(self, uid: str, event: CalendarEvent) -> str:
        now = datetime.now(timezone.utc)
        return "\r\n".join([
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//PacsFlow//Appointments//EN",
            "BEGIN:VEVENT",
            f"UID:{uid}",
            f"DTSTAMP:{self._dt(now)}",
            f"DTSTART:{self._dt(event.starts_at)}",
            f"DTEND:{self._dt(event.ends_at)}",
            f"SUMMARY:{event.title}",
            f"DESCRIPTION:{event.description.replace(chr(10), chr(92)+'n')}",
            "END:VEVENT",
            "END:VCALENDAR",
        ])

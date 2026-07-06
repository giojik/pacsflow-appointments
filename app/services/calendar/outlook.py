"""Microsoft Outlook / Office 365 Calendar adapter"""
from datetime import datetime
from app.core.config import settings
from .base import CalendarAdapter, CalendarCredentials, CalendarEvent

class OutlookCalendarAdapter(CalendarAdapter):

    AUTH_URL  = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
    TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
    API_BASE  = "https://graph.microsoft.com/v1.0/me"
    SCOPES    = ["Calendars.ReadWrite", "offline_access"]

    def get_auth_url(self, state: str) -> str:
        import urllib.parse
        params = {
            "client_id":     settings.OUTLOOK_CLIENT_ID,
            "redirect_uri":  settings.OUTLOOK_REDIRECT_URI,
            "response_type": "code",
            "scope":         " ".join(self.SCOPES),
            "state":         state,
        }
        return f"{self.AUTH_URL}?{urllib.parse.urlencode(params)}"

    def exchange_code(self, code: str) -> CalendarCredentials:
        import httpx
        r = httpx.post(self.TOKEN_URL, data={
            "code":          code,
            "client_id":     settings.OUTLOOK_CLIENT_ID,
            "client_secret": settings.OUTLOOK_CLIENT_SECRET,
            "redirect_uri":  settings.OUTLOOK_REDIRECT_URI,
            "grant_type":    "authorization_code",
        })
        r.raise_for_status()
        data = r.json()
        return CalendarCredentials(
            provider_type="outlook",
            access_token=data["access_token"],
            refresh_token=data.get("refresh_token"),
            calendar_id=None,   # default calendar
        )

    def refresh_credentials(self) -> CalendarCredentials:
        import httpx
        r = httpx.post(self.TOKEN_URL, data={
            "client_id":     settings.OUTLOOK_CLIENT_ID,
            "client_secret": settings.OUTLOOK_CLIENT_SECRET,
            "refresh_token": self.credentials.refresh_token,
            "grant_type":    "refresh_token",
        })
        r.raise_for_status()
        self.credentials.access_token = r.json()["access_token"]
        return self.credentials

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.credentials.access_token}",
            "Content-Type":  "application/json",
        }

    def _events_url(self) -> str:
        if self.credentials.calendar_id:
            return f"{self.API_BASE}/calendars/{self.credentials.calendar_id}/events"
        return f"{self.API_BASE}/calendar/events"

    def create_event(self, event: CalendarEvent) -> str:
        import httpx
        body = {
            "subject": event.title,
            "body":    {"contentType": "text", "content": event.description},
            "start":   {"dateTime": event.starts_at.isoformat(), "timeZone": "Georgian Standard Time"},
            "end":     {"dateTime": event.ends_at.isoformat(),   "timeZone": "Georgian Standard Time"},
        }
        if event.attendee_email:
            body["attendees"] = [{"emailAddress": {"address": event.attendee_email}, "type": "required"}]
        r = httpx.post(self._events_url(), json=body, headers=self._headers())
        r.raise_for_status()
        return r.json()["id"]

    def update_event(self, external_id: str, event: CalendarEvent) -> bool:
        import httpx
        body = {
            "subject": event.title,
            "start":   {"dateTime": event.starts_at.isoformat(), "timeZone": "Georgian Standard Time"},
            "end":     {"dateTime": event.ends_at.isoformat(),   "timeZone": "Georgian Standard Time"},
        }
        r = httpx.patch(f"{self._events_url()}/{external_id}", json=body, headers=self._headers())
        return r.status_code == 200

    def delete_event(self, external_id: str) -> bool:
        import httpx
        r = httpx.delete(f"{self._events_url()}/{external_id}", headers=self._headers())
        return r.status_code == 204

    def get_busy_slots(self, start: datetime, end: datetime) -> list[tuple[datetime, datetime]]:
        import httpx
        r = httpx.post(
            f"{self.API_BASE}/calendar/getSchedule",
            json={
                "schedules":       ["me"],
                "startTime":       {"dateTime": start.isoformat(), "timeZone": "Georgian Standard Time"},
                "endTime":         {"dateTime": end.isoformat(),   "timeZone": "Georgian Standard Time"},
                "availabilityViewInterval": 30,
            },
            headers=self._headers()
        )
        r.raise_for_status()
        items = r.json().get("value", [{}])[0].get("scheduleItems", [])
        return [
            (datetime.fromisoformat(i["start"]["dateTime"]),
             datetime.fromisoformat(i["end"]["dateTime"]))
            for i in items if i.get("status") == "busy"
        ]

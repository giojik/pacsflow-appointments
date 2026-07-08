"""Google Calendar adapter"""
from datetime import datetime
from typing import Optional
from app.core.config import settings
from .base import CalendarAdapter, CalendarCredentials, CalendarEvent
import httpx

TIMEOUT = 30

class GoogleCalendarAdapter(CalendarAdapter):

    SCOPES = ["https://www.googleapis.com/auth/calendar"]
    AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
    TOKEN_URL = "https://oauth2.googleapis.com/token"
    API_BASE  = "https://www.googleapis.com/calendar/v3"

    def get_auth_url(self, state: str) -> str:
        import urllib.parse
        params = {
            "client_id":     settings.GOOGLE_CLIENT_ID,
            "redirect_uri":  settings.GOOGLE_REDIRECT_URI,
            "response_type": "code",
            "scope":         " ".join(self.SCOPES),
            "access_type":   "offline",
            "prompt":        "consent",
            "state":         state,
        }
        return f"{self.AUTH_URL}?{urllib.parse.urlencode(params)}"

    def exchange_code(self, code: str) -> CalendarCredentials:
        r = httpx.post(self.TOKEN_URL, data={
            "code":          code,
            "client_id":     settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri":  settings.GOOGLE_REDIRECT_URI,
            "grant_type":    "authorization_code",
        }, timeout=TIMEOUT)
        r.raise_for_status()
        data = r.json()
        return CalendarCredentials(
            provider_type="google",
            access_token=data["access_token"],
            refresh_token=data.get("refresh_token"),
            calendar_id="primary",
        )

    def refresh_credentials(self) -> CalendarCredentials:
        r = httpx.post(self.TOKEN_URL, data={
            "client_id":     settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "refresh_token": self.credentials.refresh_token,
            "grant_type":    "refresh_token",
        }, timeout=TIMEOUT)
        r.raise_for_status()
        data = r.json()
        self.credentials.access_token = data["access_token"]
        return self.credentials

    def _headers(self) -> dict:
        return {"Authorization": f"Bearer {self.credentials.access_token}"}

    def _calendar_id(self) -> str:
        return self.credentials.calendar_id or "primary"

    def create_event(self, event: CalendarEvent) -> str:
        body = {
            "summary":     event.title,
            "description": event.description,
            "location":    event.location,
            "start": {"dateTime": event.starts_at.isoformat(), "timeZone": "Asia/Tbilisi"},
            "end":   {"dateTime": event.ends_at.isoformat(),   "timeZone": "Asia/Tbilisi"},
        }
        if event.attendee_email:
            body["attendees"] = [{"email": event.attendee_email}]
        r = httpx.post(
            f"{self.API_BASE}/calendars/{self._calendar_id()}/events",
            json=body, headers=self._headers(), timeout=TIMEOUT
        )
        if r.status_code == 401:
            self.refresh_credentials()
            r = httpx.post(
                f"{self.API_BASE}/calendars/{self._calendar_id()}/events",
                json=body, headers=self._headers(), timeout=TIMEOUT
            )
        r.raise_for_status()
        return r.json()["id"]

    def update_event(self, external_id: str, event: CalendarEvent) -> bool:
        body = {
            "summary":     event.title,
            "description": event.description,
            "start": {"dateTime": event.starts_at.isoformat(), "timeZone": "Asia/Tbilisi"},
            "end":   {"dateTime": event.ends_at.isoformat(),   "timeZone": "Asia/Tbilisi"},
        }
        r = httpx.put(
            f"{self.API_BASE}/calendars/{self._calendar_id()}/events/{external_id}",
            json=body, headers=self._headers(), timeout=TIMEOUT
        )
        if r.status_code == 401:
            self.refresh_credentials()
            r = httpx.put(
                f"{self.API_BASE}/calendars/{self._calendar_id()}/events/{external_id}",
                json=body, headers=self._headers(), timeout=TIMEOUT
            )
        return r.status_code == 200

    def delete_event(self, external_id: str) -> bool:
        r = httpx.delete(
            f"{self.API_BASE}/calendars/{self._calendar_id()}/events/{external_id}",
            headers=self._headers(), timeout=TIMEOUT
        )
        if r.status_code == 401:
            self.refresh_credentials()
            r = httpx.delete(
                f"{self.API_BASE}/calendars/{self._calendar_id()}/events/{external_id}",
                headers=self._headers(), timeout=TIMEOUT
            )
        return r.status_code in (204, 410)

    def get_busy_slots(self, start: datetime, end: datetime) -> list[tuple[datetime, datetime]]:
        r = httpx.post(
            f"{self.API_BASE}/freeBusy",
            json={
                "timeMin": start.isoformat() + "Z",
                "timeMax": end.isoformat() + "Z",
                "items":   [{"id": self._calendar_id()}],
            },
            headers=self._headers(), timeout=TIMEOUT
        )
        r.raise_for_status()
        busy = r.json().get("calendars", {}).get(self._calendar_id(), {}).get("busy", [])
        return [
            (datetime.fromisoformat(b["start"].rstrip("Z")),
             datetime.fromisoformat(b["end"].rstrip("Z")))
            for b in busy
        ]

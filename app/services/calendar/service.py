"""
CalendarService — appointment sync logic.
"""
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.appointment import Appointment
from app.models.provider import Provider
from .base import CalendarCredentials, CalendarEvent
from .factory import get_calendar_adapter

class CalendarService:

    def sync_appointment(self, appointment: Appointment, db: Session) -> bool:
        provider: Provider = appointment.slot.provider
        if not provider.calendar_sync_enabled or not provider.calendar_id:
            return False

        creds = self._get_credentials(provider)
        adapter = get_calendar_adapter(creds)

        # refresh access token
        try:
            adapter.refresh_credentials()
        except Exception as e:
            print(f"[calendar] token refresh error: {e}")
            return False

        slot    = appointment.slot
        client  = appointment.client
        service = slot.service if hasattr(slot, 'service') and slot.service_id else None

        service_name = "ჩაწერა"
        if service:
            service_name = getattr(service, 'name_ka', None) or getattr(service, 'name', 'ჩაწერა')

        event = CalendarEvent(
            title=adapter.build_event_title(
                f"{client.first_name} {client.last_name}",
                service_name
            ),
            starts_at=slot.starts_at,
            ends_at=slot.ends_at,
            description=adapter.build_event_description(
                appointment_id=str(appointment.id),
                client_phone=client.phone or "",
                service_name=service_name,
                notes=appointment.notes or "",
            ),
            attendee_email=client.email,
        )

        try:
            if appointment.google_event_id:
                adapter.update_event(appointment.google_event_id, event)
            else:
                event_id = adapter.create_event(event)
                appointment.google_event_id = event_id
                db.commit()
            return True
        except Exception as e:
            print(f"[calendar] sync error: {e}")
            return False

    def delete_appointment_event(self, appointment: Appointment, db: Session) -> bool:
        if not appointment.google_event_id:
            return False
        provider = appointment.slot.provider
        if not provider.calendar_sync_enabled:
            return False
        creds = self._get_credentials(provider)
        adapter = get_calendar_adapter(creds)
        try:
            adapter.refresh_credentials()
            ok = adapter.delete_event(appointment.google_event_id)
            if ok:
                appointment.google_event_id = None
                db.commit()
            return ok
        except Exception as e:
            print(f"[calendar] delete error: {e}")
            return False

    @staticmethod
    def _get_credentials(provider: Provider) -> CalendarCredentials:
        provider_type = str(provider.calendar_provider.value) if provider.calendar_provider else "google"
        return CalendarCredentials(
            provider_type=provider_type,
            access_token=None,
            refresh_token=provider.calendar_refresh_token,
            calendar_id=provider.calendar_id,
        )

calendar_service = CalendarService()

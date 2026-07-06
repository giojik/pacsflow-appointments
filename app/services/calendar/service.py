"""
CalendarService — appointment-ის მოვლენებთან კალენდარის სინქრონიზაცია.
ეს არის ბიზნეს-ლოგიკა — adapter-ი და model-ი ერთმანეთთან აკავშირებს.
"""
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.appointment import Appointment, AppointmentStatus
from app.models.provider import Provider
from .base import CalendarCredentials, CalendarEvent
from .factory import get_calendar_adapter

class CalendarService:

    def sync_appointment(self, appointment: Appointment, db: Session) -> bool:
        """ჩაწერა → კალენდარში event (შექმნა ან განახლება)"""
        provider: Provider = appointment.slot.provider
        if not provider.google_sync_enabled or not provider.google_calendar_id:
            return False

        creds = self._get_credentials(provider)
        adapter = get_calendar_adapter(creds)

        slot    = appointment.slot
        client  = appointment.client
        service = slot.service

        event = CalendarEvent(
            title=adapter.build_event_title(
                f"{client.first_name} {client.last_name}",
                service.name_ka if service else "ჩაწერა"
            ),
            starts_at=slot.starts_at,
            ends_at=slot.ends_at,
            description=adapter.build_event_description(
                appointment_id=appointment.id,
                client_phone=client.phone,
                service_name=service.name_ka if service else "",
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
        """ჩაწერა გაუქმდა → კალენდრიდან event წაიშლება"""
        if not appointment.google_event_id:
            return False
        provider = appointment.slot.provider
        creds = self._get_credentials(provider)
        adapter = get_calendar_adapter(creds)
        try:
            ok = adapter.delete_event(appointment.google_event_id)
            if ok:
                appointment.google_event_id = None
                db.commit()
            return ok
        except Exception as e:
            print(f"[calendar] delete error: {e}")
            return False

    def get_provider_busy_slots(
        self, provider: Provider, start: datetime, end: datetime
    ) -> list[tuple[datetime, datetime]]:
        """Provider-ის კალენდრიდან დაკავებული პერიოდები"""
        if not provider.google_sync_enabled:
            return []
        creds = self._get_credentials(provider)
        adapter = get_calendar_adapter(creds)
        try:
            return adapter.get_busy_slots(start, end)
        except Exception:
            return []

    @staticmethod
    def _get_credentials(provider: Provider) -> CalendarCredentials:
        """Provider model → CalendarCredentials"""
        # calendar_provider field — მომავალში provider model-ში დაემატება
        provider_type = getattr(provider, "calendar_provider", "google") or "google"
        return CalendarCredentials(
            provider_type=provider_type,
            access_token=None,  # DB-დან refresh token-ით განახლდება
            refresh_token=provider.google_refresh_token,
            calendar_id=provider.google_calendar_id,
        )

calendar_service = CalendarService()

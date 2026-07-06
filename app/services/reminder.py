"""SMS reminder — ხვალინდელი ჩაწერების ავტომატური შეხსენება"""
import json
from datetime import datetime, timedelta

from apscheduler.schedulers.background import BackgroundScheduler

_scheduler = None


def _load_tenant_settings(db, tenant_id: str) -> dict:
    from sqlalchemy import text
    row = db.execute(
        text("SELECT settings FROM tenant_settings WHERE tenant_id = :tid"),
        {"tid": tenant_id}
    ).fetchone()
    if not row or not row[0]:
        return {}
    try:
        return json.loads(row[0])
    except Exception:
        return {}


def run_reminders(dry_run: bool = False):
    """ყველა tenant-ისთვის ხვალინდელი ჩაწერების reminder-ები."""
    from app.db.session import SessionLocal
    from app.models.appointment import Appointment, AppointmentStatus
    from app.models.slot import Slot
    from app.models.client import Client
    from app.models.provider import Provider
    from app.models.service import Service
    from app.models.tenant import Tenant
    from app.services.templates import render, get_template
    from app.services.sms import send_sms

    db = SessionLocal()
    sent_count = 0
    try:
        # ხვალინდელი დღის ფანჯარა
        tomorrow = (datetime.now() + timedelta(days=1)).date()
        start = datetime.combine(tomorrow, datetime.min.time())
        end = start + timedelta(days=1)

        q = (
            db.query(Appointment, Slot, Client, Provider, Service, Tenant)
            .join(Slot, Slot.id == Appointment.slot_id)
            .join(Client, Client.id == Appointment.client_id)
            .join(Provider, Provider.id == Slot.provider_id)
            .outerjoin(Service, Service.id == Slot.service_id)
            .join(Tenant, Tenant.id == Appointment.tenant_id)
            .filter(Slot.starts_at >= start, Slot.starts_at < end)
            .filter(Appointment.status.in_([AppointmentStatus.pending, AppointmentStatus.confirmed]))
            .filter(Appointment.reminder_sent == False)
        )

        settings_cache = {}
        for appt, slot, client, provider, service, tenant in q.all():
            tid = str(tenant.id)
            if tid not in settings_cache:
                settings_cache[tid] = _load_tenant_settings(db, tid)
            s = settings_cache[tid]

            if not s.get("sms_enabled") and not dry_run:
                continue
            if not s.get("reminder_enabled", True):
                continue
            if not client.phone:
                continue

            text = get_template(s, "sms", "reminder")
            msg = render(text, {
                "name": f"{client.first_name} {client.last_name}",
                "provider": f"{provider.first_name} {provider.last_name}",
                "service": service.name_ka if service else "",
                "date": slot.starts_at.strftime("%d.%m.%Y"),
                "time": slot.starts_at.strftime("%H:%M"),
                "code": "",
                "clinic": s.get("clinic_name", tenant.name),
            })

            if dry_run:
                print(f"[reminder DRY-RUN] → {client.phone}: {msg}")
                sent_count += 1
            else:
                ok = send_sms(client.phone, msg)
                if ok:
                    appt.reminder_sent = True
                    db.commit()
                    sent_count += 1
                    print(f"[reminder SENT] → {client.phone}")
                else:
                    print(f"[reminder FAILED] → {client.phone}")

        print(f"[reminder] დასრულდა — {sent_count} შეხსენება ({'dry-run' if dry_run else 'real'})")
        return sent_count
    finally:
        db.close()


def start_scheduler(hour: int = 10, minute: int = 0):
    global _scheduler
    if _scheduler:
        return _scheduler
    _scheduler = BackgroundScheduler(timezone="Asia/Tbilisi")
    _scheduler.add_job(run_reminders, "cron", hour=hour, minute=minute, id="daily_reminders", replace_existing=True)
    _scheduler.start()
    print(f"[scheduler] reminder job started — ყოველდღე {hour:02d}:{minute:02d}")
    return _scheduler
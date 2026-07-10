"""საჯარო ჯავშნის endpoint-ები — auth-ის გარეშე, სპამის დაცვით"""
import time
from datetime import datetime, timedelta
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import update

from app.db.session import get_db
from app.core.tenant import resolve_slug
from app.models.tenant import Tenant
from app.models.service import Service
from app.models.provider import Provider, ProviderService
from app.models.slot import Slot, SlotStatus
from app.models.client import Client
from app.models.appointment import Appointment, AppointmentStatus

router = APIRouter()

# ── სპამის დაცვა: rate limiting (in-memory) ────────────────────────────────
_RATE: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT = 3          # მაქს. ჯავშანი
RATE_WINDOW = 3600      # 1 საათი (წამებში)


def _client_ip(request: Request) -> str:
    return request.headers.get("x-forwarded-for", "").split(",")[0].strip() \
        or (request.client.host if request.client else "unknown")


def _check_rate(ip: str):
    now = time.time()
    _RATE[ip] = [t for t in _RATE[ip] if now - t < RATE_WINDOW]
    if len(_RATE[ip]) >= RATE_LIMIT:
        raise HTTPException(429, "ძალიან ბევრი ჯავშანი. სცადეთ მოგვიანებით.")


def _record_rate(ip: str):
    _RATE[ip].append(time.time())


def _get_tenant(request: Request, db: Session, tenant_slug: str | None = None) -> Tenant:
    if tenant_slug:
        t = db.query(Tenant).filter(Tenant.slug == tenant_slug, Tenant.active == True).first()
        if t:
            return t
    slug = resolve_slug(request, db)
    t = db.query(Tenant).filter(Tenant.slug == slug, Tenant.active == True).first()
    if not t:
        raise HTTPException(404, "კომპანია ვერ მოიძებნა")
    return t


# ── სერვისები ──────────────────────────────────────────────────────────────
@router.get("/services")
def public_services(request: Request, tenant: str | None = None, db: Session = Depends(get_db)):
    t = _get_tenant(request, db, tenant)
    services = db.query(Service).filter(
        Service.tenant_id == t.id, Service.active == True
    ).all()
    return [{
        "id": s.id, "name": s.name_ka, "duration": s.duration_min, "color": s.color,
    } for s in services]


# ── ექიმები (სერვისის მიხედვით) ────────────────────────────────────────────
@router.get("/providers")
def public_providers(request: Request, service_id: str | None = None, tenant: str | None = None, db: Session = Depends(get_db)):
    t = _get_tenant(request, db, tenant)
    q = db.query(Provider).filter(Provider.tenant_id == t.id, Provider.active == True)

    if service_id:
        # მხოლოდ ის ექიმები ვინც ამ სერვისს უწევს
        provider_ids = [ps.provider_id for ps in db.query(ProviderService).filter(
            ProviderService.service_id == service_id).all()]
        q = q.filter(Provider.id.in_(provider_ids)) if provider_ids else q.filter(Provider.id == None)

    return [{
        "id": p.id, "name": f"{p.first_name} {p.last_name}",
        "specialty": p.specialty or "",
    } for p in q.all()]


# ── თავისუფალი სლოტები ─────────────────────────────────────────────────────
@router.get("/slots")
def public_slots(request: Request, provider_id: str, date_from: str | None = None,
                 date_to: str | None = None, tenant: str | None = None, db: Session = Depends(get_db)):
    t = _get_tenant(request, db, tenant)

    # ვამოწმებთ provider მართლა ამ tenant-ისაა
    prov = db.query(Provider).filter(Provider.id == provider_id, Provider.tenant_id == t.id).first()
    if not prov:
        raise HTTPException(404, "ექიმი ვერ მოიძებნა")

    q = db.query(Slot).filter(
        Slot.provider_id == provider_id,
        Slot.status == SlotStatus.available,
        Slot.starts_at >= datetime.now(),  # მხოლოდ მომავალი
    )
    if date_from:
        try:
            q = q.filter(Slot.starts_at >= datetime.strptime(date_from, "%Y-%m-%d"))
        except ValueError:
            pass
    if date_to:
        try:
            q = q.filter(Slot.starts_at < datetime.strptime(date_to, "%Y-%m-%d") + timedelta(days=1))
        except ValueError:
            pass

    slots = q.order_by(Slot.starts_at).limit(200).all()
    return [{
        "id": s.id,
        "date": s.starts_at.strftime("%Y-%m-%d"),
        "time": s.starts_at.strftime("%H:%M"),
        "starts_at": s.starts_at.isoformat(),
    } for s in slots]


# ── ჯავშნის შექმნა ─────────────────────────────────────────────────────────
class BookingCreate(BaseModel):
    slot_id: str
    first_name: str
    last_name: str
    phone: str
    email: str | None = None
    personal_id: str | None = None
    notes: str | None = None
    # სპამის დაცვა
    website: str | None = None      # honeypot — ბოტი შეავსებს
    form_time: float | None = None  # ფორმის შევსების დრო (წამებში)
    tenant: str | None = None


@router.post("/book")
def public_book(request: Request, body: BookingCreate, db: Session = Depends(get_db)):
    t = _get_tenant(request, db, body.tenant)
    ip = _client_ip(request)

    # 1. honeypot — თუ "website" შევსებულია, ბოტია
    if body.website:
        raise HTTPException(400, "ჯავშნა ვერ შესრულდა")

    # 2. დროის შემოწმება — თუ 3 წამზე ჩქარა შეივსო, ბოტია
    if body.form_time is not None and body.form_time < 3:
        raise HTTPException(400, "ფორმა ძალიან სწრაფად შეივსო")

    # 3. rate limit
    _check_rate(ip)

    # 4. ვალიდაცია
    if not body.first_name.strip() or not body.last_name.strip() or not body.phone.strip():
        raise HTTPException(400, "შეავსეთ სახელი, გვარი და ტელეფონი")

    t = _get_tenant(request, db)

    # slot არსებობს და თავისუფალია?
    slot = db.query(Slot).filter(Slot.id == body.slot_id, Slot.status == SlotStatus.available).first()
    if not slot:
        raise HTTPException(409, "ეს დრო უკვე დაკავებულია. აირჩიეთ სხვა.")

    # slot ამ tenant-ის ექიმისაა?
    prov = db.query(Provider).filter(Provider.id == slot.provider_id, Provider.tenant_id == t.id).first()
    if not prov:
        raise HTTPException(404, "ექიმი ვერ მოიძებნა")

    # 5. დუბლიკატის შემოწმება — იგივე ტელეფონი იმავე slot-ზე
    existing_client = db.query(Client).filter(
        Client.tenant_id == t.id, Client.phone == body.phone.strip()
    ).first()
    if existing_client:
        dup = (db.query(Appointment)
               .filter(Appointment.client_id == existing_client.id,
                       Appointment.slot_id == body.slot_id).first())
        if dup:
            raise HTTPException(409, "თქვენ უკვე დაჯავშნეთ ეს დრო")

    # კლიენტი — არსებული ან ახალი
    client = existing_client
    if not client:
        client = Client(
            tenant_id=t.id,
            first_name=body.first_name.strip(),
            last_name=body.last_name.strip(),
            phone=body.phone.strip(),
            email=(body.email or "").strip() or None,
            personal_id=(body.personal_id or "").strip() or None,
        )
        db.add(client)
        db.flush()

    # ჯავშანი
    appt = Appointment(
        tenant_id=t.id,
        client_id=client.id,
        slot_id=slot.id,
        status=AppointmentStatus.pending,
        notes=(body.notes or "").strip() or None,
    )
    db.add(appt)

    # ატომური conditional UPDATE — race condition-ის დაცვა.
    # თუ slot-ი ამასობაში სხვამ დაიკავა, rowcount იქნება 0.
    lock_result = db.execute(
        update(Slot)
        .where(Slot.id == slot.id, Slot.status == SlotStatus.available)
        .values(status=SlotStatus.booked)
    )
    if lock_result.rowcount == 0:
        db.rollback()
        raise HTTPException(409, "ეს დრო უკვე დაკავებულია. აირჩიეთ სხვა.")

    db.commit()
    db.refresh(appt)

    _record_rate(ip)

    # Google Calendar sync + notification
    try:
        from app.api.v1.endpoints.appointments import _calendar_sync, _notify_provider
        _calendar_sync(appt, db, "sync")
        _notify_provider(appt, db, "new")
    except Exception as e:
        print(f"[public_book] sync/notify error: {e}")

    return {
        "success": True,
        "appointment_id": appt.id,
        "date": slot.starts_at.strftime("%Y-%m-%d"),
        "time": slot.starts_at.strftime("%H:%M"),
        "provider": f"{prov.first_name} {prov.last_name}",
        "message": "თქვენი ჯავშანი მიღებულია! დაგიკავშირდებით დასადასტურებლად.",
    }

@router.get("/pricing")
def public_pricing(db: Session = Depends(get_db)):
    from sqlalchemy import text
    import json
    row = db.execute(text("SELECT value FROM platform_settings WHERE id = 'pricing'")).fetchone()
    if not row:
        return {"plans": []}
    return json.loads(row[0])

class ContactCreate(BaseModel):
    plan: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    company: str | None = None
    phone: str | None = None
    email: str | None = None
    message: str | None = None


@router.post("/contact")
def public_contact(body: ContactCreate, request: Request, db: Session = Depends(get_db)):
    from sqlalchemy import text

    ip = _client_ip(request)
    _check_rate(ip)

    if not body.phone and not body.email:
        raise HTTPException(400, "ტელეფონი ან email სავალდებულოა")

    db.execute(text(
        "INSERT INTO contact_requests (plan, first_name, last_name, company, phone, email, message) "
        "VALUES (:plan, :fn, :ln, :company, :phone, :email, :msg)"
    ), {
        "plan": (body.plan or "").strip(),
        "fn": (body.first_name or "").strip(),
        "ln": (body.last_name or "").strip(),
        "company": (body.company or "").strip(),
        "phone": (body.phone or "").strip(),
        "email": (body.email or "").strip(),
        "msg": (body.message or "").strip(),
    })
    db.commit()
    _record_rate(ip)

    return {"success": True, "message": "თქვენი მოთხოვნა მიღებულია! მალე დაგიკავშირდებით."}
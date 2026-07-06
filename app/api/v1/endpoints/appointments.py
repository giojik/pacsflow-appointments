from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
from app.db.session import get_db
from app.models.appointment import Appointment, AppointmentCode, AppointmentStatus
from app.models.slot import Slot, SlotStatus
from app.core.security import generate_appointment_code, code_expires_at
from app.core.auth import get_current_active_user
from app.schemas.appointment import AppointmentCreate, AppointmentUpdate, AppointmentOut

router = APIRouter()

def _enrich(a: Appointment) -> dict:
    d = {c.name: getattr(a, c.name) for c in a.__table__.columns}
    client   = a.client
    slot     = a.slot
    provider = slot.provider if slot else None
    d["client_name"]   = f"{client.first_name} {client.last_name}" if client else None
    d["provider_name"] = f"{provider.first_name} {provider.last_name}" if provider else None
    d["provider_id"]   = provider.id if provider else None
    d["service_name"]  = None
    d["starts_at"]     = slot.starts_at if slot else None
    if slot and slot.service_id:
        from app.models.service import Service
        from app.db.session import SessionLocal
        db = SessionLocal()
        try:
            svc = db.query(Service).filter(Service.id == slot.service_id).first()
            d["service_name"] = svc.name_ka if svc else None
        finally:
            db.close()
    active_code = next((c for c in a.codes if not c.used and c.expires_at > datetime.utcnow()), None)
    d["code"] = active_code.code if active_code else None
    return d

@router.get("/", response_model=list[AppointmentOut])
def list_appointments(
    tenant_id:   str = Query(...),
    provider_id: str | None = Query(None),
    client_id:   str | None = Query(None),
    status:      AppointmentStatus | None = None,
    date_from:   str | None = Query(None),
    date_to:     str | None = Query(None),
    search:      str | None = Query(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    from app.models.user import UserRole
    q = db.query(Appointment).filter(Appointment.tenant_id == tenant_id)

    needs_slot_join = bool(
        (current_user.role == UserRole.provider and current_user.provider_id) or
        provider_id or date_from or date_to
    )
    if needs_slot_join:
        q = q.join(Slot, Slot.id == Appointment.slot_id)

    if current_user.role == UserRole.provider and current_user.provider_id:
        q = q.filter(Slot.provider_id == current_user.provider_id)
    elif provider_id:
        q = q.filter(Slot.provider_id == provider_id)

    if client_id:
        q = q.filter(Appointment.client_id == client_id)
    if status:
        q = q.filter(Appointment.status == status)
    if date_from:
        q = q.filter(Slot.starts_at >= datetime.fromisoformat(date_from))
    if date_to:
        q = q.filter(Slot.starts_at <= datetime.fromisoformat(date_to + "T23:59:59"))
    if search:
        from app.models.client import Client
        from sqlalchemy import or_
        q = q.join(Client, Appointment.client_id == Client.id).filter(
            or_(
                Client.first_name.ilike(f"%{search}%"),
                Client.last_name.ilike(f"%{search}%"),
                Client.phone.ilike(f"%{search}%"),
                Client.personal_id.ilike(f"%{search}%"),
            )
        )
    return [_enrich(a) for a in q.order_by(Appointment.created_at.desc()).all()]

@router.get("/{appointment_id}", response_model=AppointmentOut)
def get_appointment(appointment_id: str, db: Session = Depends(get_db)):
    a = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not a:
        raise HTTPException(404, "ჩაწერა ვერ მოიძებნა")
    return _enrich(a)

@router.post("/", response_model=AppointmentOut, status_code=201)
def create_appointment(body: AppointmentCreate, db: Session = Depends(get_db)):
    slot = db.query(Slot).filter(Slot.id == body.slot_id).first()
    if not slot:
        raise HTTPException(404, "სლოტი ვერ მოიძებნა")
    if slot.status != SlotStatus.available:
        raise HTTPException(409, "სლოტი დაკავებულია")

    appt = Appointment(**body.model_dump())
    db.add(appt)
    db.flush()

    code = AppointmentCode(
        appointment_id=appt.id,
        code=generate_appointment_code(),
        expires_at=code_expires_at(),
    )
    db.add(code)
    slot.status = SlotStatus.booked
    db.commit()
    db.refresh(appt)
    return _enrich(appt)

 # SMS გაგზავნა
    try:
        from app.services.sms import send_sms, build_appointment_sms
        if settings.SMS_PROVIDER and settings.TWILIO_ACCOUNT_SID:
            msg = build_appointment_sms(
                client_name=f"{appt.client.first_name} {appt.client.last_name}",
                provider_name=f"{appt.slot.provider.first_name} {appt.slot.provider.last_name}",
                date=slot.starts_at.strftime("%d.%m.%Y"),
                time=slot.starts_at.strftime("%H:%M"),
                code=code.code
            )
            send_sms(appt.client.phone, msg)
    except Exception as e:
        print(f"[SMS] {e}")

    return _enrich(appt)

@router.patch("/{appointment_id}", response_model=AppointmentOut)
def update_appointment(
    appointment_id: str,
    body: AppointmentUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    a = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not a:
        raise HTTPException(404, "ჩაწერა ვერ მოიძებნა")

    if body.status == AppointmentStatus.cancelled and a.status != AppointmentStatus.cancelled:
        a.slot.status = SlotStatus.available
        from app.api.v1.endpoints.waitlist import notify_waitlist
        notify_waitlist(a.slot_id, db)

    for k, v in body.model_dump(exclude_none=True).items():
        setattr(a, k, v)
    db.commit()
    db.refresh(a)
    return _enrich(a)

@router.patch("/{appointment_id}/reschedule", response_model=AppointmentOut)
def reschedule_appointment(
    appointment_id: str,
    slot_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """ჩაწერის სლოტის შეცვლა — გადატანა"""
    a = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not a:
        raise HTTPException(404, "ჩაწერა ვერ მოიძებნა")
    if a.status in (AppointmentStatus.cancelled, AppointmentStatus.completed):
        raise HTTPException(400, "გაუქმებული ან დასრულებული ჩაწერის გადატანა შეუძლებელია")

    new_slot = db.query(Slot).filter(Slot.id == slot_id).first()
    if not new_slot:
        raise HTTPException(404, "სლოტი ვერ მოიძებნა")
    if new_slot.status != SlotStatus.available:
        raise HTTPException(409, "სლოტი დაკავებულია")

    # ძველი სლოტი გავათავისუფლოთ
    a.slot.status = SlotStatus.available
    # ახალი სლოტი დავაჯავშნოთ
    new_slot.status = SlotStatus.booked
    a.slot_id = slot_id

    db.commit()
    db.refresh(a)
    return _enrich(a)

@router.post("/{appointment_id}/resend-code", response_model=dict)
def resend_code(appointment_id: str, db: Session = Depends(get_db)):
    a = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not a:
        raise HTTPException(404, "ჩაწერა ვერ მოიძებნა")
    if a.status in (AppointmentStatus.cancelled, AppointmentStatus.completed):
        raise HTTPException(400, "გაუქმებული ან დასრულებული ჩაწერისთვის კოდი ვერ გაიცემა")

    for old_code in a.codes:
        old_code.used = True

    code = AppointmentCode(
        appointment_id=a.id,
        code=generate_appointment_code(),
        expires_at=code_expires_at(),
    )
    db.add(code)
    db.commit()
    return {"code": code.code, "expires_at": code.expires_at.isoformat()}
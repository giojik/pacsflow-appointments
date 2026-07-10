import time
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import datetime
from app.db.session import get_db
from app.models.appointment import AppointmentCode

router = APIRouter()

# ── IP-ზე დაფუძნებული rate limit (იგივე პატერნი რაც public_booking.py-ში) ──
_RATE: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT = 20     # მაქს. ცდა
RATE_WINDOW = 60    # წამში


def _client_ip(request: Request) -> str:
    return (request.headers.get("cf-connecting-ip", "")
            or request.headers.get("x-real-ip", "")
            or request.headers.get("x-forwarded-for", "").split(",")[0].strip()
            or (request.client.host if request.client else "unknown"))


def _check_rate(ip: str):
    now = time.time()
    _RATE[ip] = [t for t in _RATE[ip] if now - t < RATE_WINDOW]
    if len(_RATE[ip]) >= RATE_LIMIT:
        raise HTTPException(429, "ძალიან ბევრი მცდელობა. სცადეთ მოგვიანებით.")
    _RATE[ip].append(now)


@router.get("/{code}/verify")
def verify_code(code: str, request: Request, db: Session = Depends(get_db)):
    """QMS კიოსკი ამ endpoint-ს იძახებს კოდის შეყვანისას"""
    _check_rate(_client_ip(request))

    record = db.query(AppointmentCode).filter(
        AppointmentCode.code == code.upper(),
        AppointmentCode.used == False,
        AppointmentCode.expires_at > datetime.utcnow(),
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="კოდი არასწორია ან ვადა გასულია")

    appt = record.appointment
    slot = appt.slot
    provider = slot.provider
    client = appt.client
    service = slot.service if slot.service_id else None

    return {
        "valid": True,
        "appointment_id": appt.id,
        "client_name": f"{client.first_name} {client.last_name}",
        "client_phone": client.phone,
        "provider_name": f"{provider.first_name} {provider.last_name}",
        "service_name": service.name_ka if service else None,
        "starts_at": slot.starts_at.isoformat(),
    }

@router.post("/{code}/use")
def mark_code_used(code: str, request: Request, db: Session = Depends(get_db)):
    """QMS ბილეთის გაცემის შემდეგ კოდს მოხმარებულად ნიშნავს"""
    _check_rate(_client_ip(request))

    record = db.query(AppointmentCode).filter(
        AppointmentCode.code == code.upper()
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="კოდი ვერ მოიძებნა")
    if record.used:
        raise HTTPException(status_code=409, detail="კოდი უკვე გამოყენებულია")
    if record.expires_at <= datetime.utcnow():
        raise HTTPException(status_code=410, detail="კოდის ვადა გასულია")
    record.used = True
    db.commit()
    return {"status": "ok"}
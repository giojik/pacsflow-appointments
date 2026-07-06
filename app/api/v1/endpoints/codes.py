from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from app.db.session import get_db
from app.models.appointment import AppointmentCode

router = APIRouter()

@router.get("/{code}/verify")
def verify_code(code: str, db: Session = Depends(get_db)):
    """QMS კიოსკი ამ endpoint-ს იძახებს კოდის შეყვანისას"""
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
def mark_code_used(code: str, db: Session = Depends(get_db)):
    """QMS ბილეთის გაცემის შემდეგ კოდს მოხმარებულად ნიშნავს"""
    record = db.query(AppointmentCode).filter(
        AppointmentCode.code == code.upper()
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="კოდი ვერ მოიძებნა")
    record.used = True
    db.commit()
    return {"status": "ok"}

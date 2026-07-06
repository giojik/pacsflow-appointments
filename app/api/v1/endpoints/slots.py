from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import datetime, timedelta
from app.db.session import get_db
from app.models.slot import Slot, SlotStatus
from app.schemas.slot import SlotCreate, SlotBulkCreate, SlotUpdate, SlotOut
from app.core.auth import get_current_active_user

router = APIRouter()

@router.get("/", response_model=list[SlotOut])
def list_slots(
    provider_id: str = Query(...),
    date_from:   str | None = Query(None),
    date_to:     str | None = Query(None),
    status:      SlotStatus | None = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    from app.models.user import UserRole
    # provider role — მხოლოდ საკუთარი სლოტები
    if current_user.role == UserRole.provider and current_user.provider_id:
        provider_id = current_user.provider_id

    q = db.query(Slot).filter(Slot.provider_id == provider_id)
    if date_from:
        q = q.filter(Slot.starts_at >= datetime.fromisoformat(date_from))
    if date_to:
        q = q.filter(Slot.starts_at <= datetime.fromisoformat(date_to + "T23:59:59"))
    if status:
        q = q.filter(Slot.status == status)
    return q.order_by(Slot.starts_at).all()

@router.post("/", response_model=SlotOut, status_code=201)
def create_slot(body: SlotCreate, db: Session = Depends(get_db)):
    slot = Slot(**body.model_dump())
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return slot

@router.post("/bulk", status_code=201)
def bulk_create_slots(body: SlotBulkCreate, db: Session = Depends(get_db)):
    """კვირის განრიგიდან ავტომატური სლოტების გენერაცია"""
    from datetime import date
    d_from = date.fromisoformat(body.date_from)
    d_to   = date.fromisoformat(body.date_to)
    h_from = int(body.time_from.split(":")[0])
    m_from = int(body.time_from.split(":")[1])
    h_to   = int(body.time_to.split(":")[0])
    m_to   = int(body.time_to.split(":")[1])

    created  = 0
    skipped  = 0
    current  = d_from

    while current <= d_to:
        if current.weekday() in body.weekdays:
            slot_start = datetime(current.year, current.month, current.day, h_from, m_from)
            day_end    = datetime(current.year, current.month, current.day, h_to,   m_to)

            while slot_start + timedelta(minutes=body.slot_duration) <= day_end:
                slot_end = slot_start + timedelta(minutes=body.slot_duration)

                # overlap check — provider_id + დროის გადაფარვა + არა blocked
                overlap = db.query(Slot).filter(
                    Slot.provider_id == body.provider_id,
                    Slot.status != SlotStatus.blocked,
                    or_(
                        and_(Slot.starts_at >= slot_start, Slot.starts_at < slot_end),
                        and_(Slot.ends_at > slot_start,    Slot.ends_at <= slot_end),
                        and_(Slot.starts_at <= slot_start, Slot.ends_at >= slot_end),
                    )
                ).first()

                if not overlap:
                    db.add(Slot(
                        provider_id=body.provider_id,
                        service_id=body.service_id,
                        starts_at=slot_start,
                        ends_at=slot_end,
                    ))
                    created += 1
                else:
                    skipped += 1

                slot_start = slot_end

        current += timedelta(days=1)

    db.commit()
    return {"created": created, "skipped": skipped}

@router.patch("/{slot_id}", response_model=SlotOut)
def update_slot(slot_id: str, body: SlotUpdate, db: Session = Depends(get_db)):
    slot = db.query(Slot).filter(Slot.id == slot_id).first()
    if not slot:
        raise HTTPException(404, "სლოტი ვერ მოიძებნა")
    if body.status:
        slot.status = body.status
    db.commit()
    db.refresh(slot)
    return slot

@router.delete("/{slot_id}", status_code=204)
def delete_slot(slot_id: str, db: Session = Depends(get_db)):
    slot = db.query(Slot).filter(Slot.id == slot_id).first()
    if not slot:
        raise HTTPException(404, "სლოტი ვერ მოიძებნა")
    if slot.status == SlotStatus.booked:
        raise HTTPException(400, "დაჯავშნული სლოტის წაშლა შეუძლებელია")
    db.delete(slot)
    db.commit()
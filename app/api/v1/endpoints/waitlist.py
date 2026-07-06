from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
from app.db.session import get_db
from app.models.waitlist import Waitlist, WaitlistStatus
from app.core.auth import get_current_active_user
from app.models.user import User

router = APIRouter()

class WaitlistCreate(BaseModel):
    tenant_id:          str
    client_id:          str
    provider_id:        str
    service_id:         Optional[str] = None
    preferred_date_from: Optional[str] = None
    preferred_date_to:   Optional[str] = None
    preferred_time_from: Optional[str] = None
    preferred_time_to:   Optional[str] = None
    notes:              Optional[str] = None

class WaitlistOut(BaseModel):
    id:          str
    client_id:   str
    provider_id: str
    service_id:  Optional[str]
    status:      WaitlistStatus
    preferred_date_from: Optional[str]
    preferred_date_to:   Optional[str]
    preferred_time_from: Optional[str]
    preferred_time_to:   Optional[str]
    notes:       Optional[str]
    created_at:  datetime
    client_name:   Optional[str] = None
    provider_name: Optional[str] = None

    class Config:
        from_attributes = True

def _enrich(w: Waitlist) -> dict:
    d = {c.name: getattr(w, c.name) for c in w.__table__.columns}
    d["client_name"]   = f"{w.client.first_name} {w.client.last_name}" if w.client else None
    d["provider_name"] = f"{w.provider.first_name} {w.provider.last_name}" if w.provider else None
    d["preferred_date_from"] = str(w.preferred_date_from) if w.preferred_date_from else None
    d["preferred_date_to"]   = str(w.preferred_date_to)   if w.preferred_date_to   else None
    return d

@router.get("/", response_model=list[WaitlistOut])
def list_waitlist(
    tenant_id:   str = Query(...),
    provider_id: str | None = Query(None),
    status:      WaitlistStatus | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    q = db.query(Waitlist).filter(Waitlist.tenant_id == tenant_id)
    if provider_id:
        q = q.filter(Waitlist.provider_id == provider_id)
    if status:
        q = q.filter(Waitlist.status == status)
    return [_enrich(w) for w in q.order_by(Waitlist.created_at).all()]

@router.post("/", status_code=201)
def add_to_waitlist(body: WaitlistCreate, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_active_user)):
    w = Waitlist(**{k: v for k, v in body.model_dump().items()})
    db.add(w)
    db.commit()
    db.refresh(w)
    return _enrich(w)

@router.delete("/{waitlist_id}", status_code=204)
def remove_from_waitlist(waitlist_id: str, db: Session = Depends(get_db),
                          current_user: User = Depends(get_current_active_user)):
    w = db.query(Waitlist).filter(Waitlist.id == waitlist_id).first()
    if not w:
        raise HTTPException(404, "ვერ მოიძებნა")
    db.delete(w)
    db.commit()

def notify_waitlist(slot_id: str, db: Session) -> None:
    """სლოტი გათავისუფლდა — waitlist შემოვამოწმოთ"""
    from app.models.slot import Slot
    slot = db.query(Slot).filter(Slot.id == slot_id).first()
    if not slot:
        return

    waiting = db.query(Waitlist).filter(
        Waitlist.provider_id == slot.provider_id,
        Waitlist.status == WaitlistStatus.waiting,
    ).order_by(Waitlist.created_at).first()

    if not waiting:
        return

    waiting.status      = WaitlistStatus.notified
    waiting.notified_at = datetime.utcnow()
    waiting.slot_id     = slot_id
    db.commit()

    # SMS გაგზავნა
    try:
        from app.models.client import Client
        client = db.query(Client).filter(Client.id == waiting.client_id).first()
        if client and client.phone:
            from app.core.config import settings
            slot_time = slot.starts_at.strftime("%d.%m.%Y %H:%M")
            msg = f"PacsFlow: თქვენთვის სასურველი დრო გათავისუფლდა — {slot_time}. დასადასტურებლად დაუკავშირდით კლინიკას."
            print(f"[waitlist] SMS → {client.phone}: {msg}")
            # TODO: რეალური SMS გაგზავნა settings.SMS_PROVIDER-ით
    except Exception as e:
        print(f"[waitlist] SMS error: {e}")
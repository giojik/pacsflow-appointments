from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.db.session import get_db
from app.core.auth import get_current_active_user
from app.models.notification import Notification

router = APIRouter()

@router.get("/")
def list_notifications(
    limit: int = Query(20),
    unread_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    q = db.query(Notification).filter(
        Notification.tenant_id == current_user.tenant_id,
        or_(
            Notification.user_id == current_user.id,
            Notification.provider_id == current_user.provider_id
        ) if current_user.provider_id else
        Notification.tenant_id == current_user.tenant_id
    )
    if unread_only:
        q = q.filter(Notification.read == False)
    notifications = q.order_by(Notification.created_at.desc()).limit(limit).all()
    return [{
        "id": str(n.id),
        "title": n.title,
        "body": n.body,
        "type": n.type,
        "appointment_id": str(n.appointment_id) if n.appointment_id else None,
        "read": n.read,
        "created_at": n.created_at.isoformat() if n.created_at else None,
    } for n in notifications]

@router.get("/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    q = db.query(Notification).filter(
        Notification.tenant_id == current_user.tenant_id,
        Notification.read == False,
    )
    if current_user.provider_id:
        q = q.filter(or_(
            Notification.user_id == current_user.id,
            Notification.provider_id == current_user.provider_id
        ))
    return {"count": q.count()}

@router.patch("/{notification_id}/read")
def mark_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    n = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.tenant_id == current_user.tenant_id,
    ).first()
    if n:
        n.read = True
        db.commit()
    return {"status": "ok"}

@router.patch("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    q = db.query(Notification).filter(
        Notification.tenant_id == current_user.tenant_id,
        Notification.read == False,
    )
    if current_user.provider_id:
        q = q.filter(or_(
            Notification.user_id == current_user.id,
            Notification.provider_id == current_user.provider_id
        ))
    q.update({Notification.read: True})
    db.commit()
    return {"status": "ok"}
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.auth import get_current_active_user, require_tenant_access
from app.models.audit import AuditLog
from app.models.user import UserRole

router = APIRouter()

TZ_TBILISI = timezone(timedelta(hours=4))

METHOD_KA = {"POST": "შექმნა", "PATCH": "შეცვლა", "PUT": "შეცვლა", "DELETE": "წაშლა"}


def _to_tbilisi(dt: datetime | None) -> str:
    if not dt:
        return ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(TZ_TBILISI).strftime("%Y-%m-%d %H:%M:%S")


@router.get("/")
def list_audit(
    tenant_id:  str = Query(...),
    user_q:     str | None = Query(None, description="username ძებნა"),
    entity:     str | None = Query(None),
    method:     str | None = Query(None),
    date_from:  str | None = Query(None),
    date_to:    str | None = Query(None),
    limit:      int = Query(100, le=500),
    offset:     int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user),
):
    if current_user.role not in (UserRole.superadmin, UserRole.admin):
        raise HTTPException(403, "წვდომა აკრძალულია")
    require_tenant_access(tenant_id, current_user)   # <-- დამატება

    q = db.query(AuditLog).filter(AuditLog.tenant_id == tenant_id)

    if user_q:
        q = q.filter(AuditLog.username.ilike(f"%{user_q}%"))
    if entity:
        q = q.filter(AuditLog.entity == entity)
    if method:
        q = q.filter(AuditLog.method == method.upper())
    if date_from:
        try:
            dt_from = datetime.strptime(date_from, "%Y-%m-%d").replace(tzinfo=TZ_TBILISI)
            q = q.filter(AuditLog.created_at >= dt_from.astimezone(timezone.utc).replace(tzinfo=None))
        except ValueError:
            raise HTTPException(400, "date_from ფორმატი: YYYY-MM-DD")
    if date_to:
        try:
            dt_to = (datetime.strptime(date_to, "%Y-%m-%d") + timedelta(days=1)).replace(tzinfo=TZ_TBILISI)
            q = q.filter(AuditLog.created_at < dt_to.astimezone(timezone.utc).replace(tzinfo=None))
        except ValueError:
            raise HTTPException(400, "date_to ფორმატი: YYYY-MM-DD")

    total = q.count()
    rows = q.order_by(AuditLog.created_at.desc()).limit(limit).offset(offset).all()

    entities = [r[0] for r in db.query(AuditLog.entity)
                .filter(AuditLog.tenant_id == tenant_id).distinct().all() if r[0]]

    return {
        "total": total,
        "entities": sorted(entities),
        "rows": [{
            "id": r.id,
            "created_at": _to_tbilisi(r.created_at),
            "username": r.username or "(უცნობი)",
            "user_role": r.user_role or "",
            "method": r.method,
            "method_ka": METHOD_KA.get(r.method, r.method),
            "details": r.details or "",
            "entity": r.entity,
            "path": r.path,
            "status_code": r.status_code,
            "ip": r.ip,
            "body": r.body,
        } for r in rows],
    }

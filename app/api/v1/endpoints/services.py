from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.service import Service
from app.models.user import UserRole
from app.core.auth import get_current_active_user
from app.schemas.service import ServiceCreate, ServiceUpdate, ServiceOut

router = APIRouter()

def _resolve_tenant_id(current_user, requested_tenant_id: str | None) -> str:
    if current_user.role == UserRole.superadmin:
        if not requested_tenant_id:
            raise HTTPException(400, "tenant_id აუცილებელია")
        return requested_tenant_id
    if requested_tenant_id and requested_tenant_id != current_user.tenant_id:
        raise HTTPException(403, "წვდომა აკრძალულია")
    return current_user.tenant_id

@router.get("/", response_model=list[ServiceOut])
def list_services(
    tenant_id: str | None = Query(None),
    active: bool | None = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    tenant_id = _resolve_tenant_id(current_user, tenant_id)
    q = db.query(Service).filter(Service.tenant_id == tenant_id)
    if active is not None:
        q = q.filter(Service.active == active)
    return q.order_by(Service.name_ka).all()

@router.get("/{service_id}", response_model=ServiceOut)
def get_service(
    service_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    q = db.query(Service).filter(Service.id == service_id)
    if current_user.role != UserRole.superadmin:
        q = q.filter(Service.tenant_id == current_user.tenant_id)
    s = q.first()
    if not s:
        raise HTTPException(404, "სერვისი ვერ მოიძებნა")
    return s

@router.post("/", response_model=ServiceOut, status_code=201)
def create_service(
    body: ServiceCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    data = body.model_dump()
    data["tenant_id"] = _resolve_tenant_id(current_user, data.get("tenant_id"))
    s = Service(**data)
    db.add(s)
    db.commit()
    db.refresh(s)
    return s

@router.patch("/{service_id}", response_model=ServiceOut)
def update_service(
    service_id: str,
    body: ServiceUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    q = db.query(Service).filter(Service.id == service_id)
    if current_user.role != UserRole.superadmin:
        q = q.filter(Service.tenant_id == current_user.tenant_id)
    s = q.first()
    if not s:
        raise HTTPException(404, "სერვისი ვერ მოიძებნა")
    update_data = body.model_dump(exclude_none=True)
    update_data.pop("tenant_id", None)
    for k, v in update_data.items():
        setattr(s, k, v)
    db.commit()
    db.refresh(s)
    return s

@router.delete("/{service_id}", status_code=204)
def delete_service(
    service_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    q = db.query(Service).filter(Service.id == service_id)
    if current_user.role != UserRole.superadmin:
        q = q.filter(Service.tenant_id == current_user.tenant_id)
    s = q.first()
    if not s:
        raise HTTPException(404, "სერვისი ვერ მოიძებნა")
    db.delete(s)
    db.commit()

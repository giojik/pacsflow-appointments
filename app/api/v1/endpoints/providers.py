from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.provider import Provider, ProviderService
from app.models.service import Service
from app.models.user import UserRole
from app.core.auth import get_current_active_user
from app.schemas.provider import ProviderCreate, ProviderUpdate, ProviderOut

router = APIRouter()

def _resolve_tenant_id(current_user, requested_tenant_id: str | None) -> str:
    if current_user.role == UserRole.superadmin:
        if not requested_tenant_id:
            raise HTTPException(400, "tenant_id აუცილებელია")
        return requested_tenant_id
    if requested_tenant_id and requested_tenant_id != current_user.tenant_id:
        raise HTTPException(403, "წვდომა აკრძალულია")
    return current_user.tenant_id

def _enrich(p: Provider) -> dict:
    d = {c.name: getattr(p, c.name) for c in p.__table__.columns}
    d["service_ids"] = [ps.service_id for ps in p.provider_services]
    return d

@router.get("/", response_model=list[ProviderOut])
def list_providers(
    tenant_id: str | None = Query(None),
    active: bool | None = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    tenant_id = _resolve_tenant_id(current_user, tenant_id)
    q = db.query(Provider).filter(Provider.tenant_id == tenant_id)
    if active is not None:
        q = q.filter(Provider.active == active)
    return [_enrich(p) for p in q.all()]

@router.get("/{provider_id}", response_model=ProviderOut)
def get_provider(
    provider_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    q = db.query(Provider).filter(Provider.id == provider_id)
    if current_user.role != UserRole.superadmin:
        q = q.filter(Provider.tenant_id == current_user.tenant_id)
    p = q.first()
    if not p:
        raise HTTPException(404, "Provider ვერ მოიძებნა")
    return _enrich(p)

@router.post("/", response_model=ProviderOut, status_code=201)
def create_provider(
    body: ProviderCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    data = body.model_dump(exclude={"service_ids"})
    data["tenant_id"] = _resolve_tenant_id(current_user, data.get("tenant_id"))
    p = Provider(**data)
    db.add(p)
    db.flush()
    for sid in body.service_ids:
        db.add(ProviderService(provider_id=p.id, service_id=sid))
    db.commit()
    db.refresh(p)
    return _enrich(p)

@router.patch("/{provider_id}", response_model=ProviderOut)
def update_provider(
    provider_id: str,
    body: ProviderUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    q = db.query(Provider).filter(Provider.id == provider_id)
    if current_user.role != UserRole.superadmin:
        q = q.filter(Provider.tenant_id == current_user.tenant_id)
    p = q.first()
    if not p:
        raise HTTPException(404, "Provider ვერ მოიძებნა")
    update_data = body.model_dump(exclude_none=True, exclude={"service_ids"})
    update_data.pop("tenant_id", None)
    for k, v in update_data.items():
        setattr(p, k, v)
    if body.service_ids is not None:
        db.query(ProviderService).filter(ProviderService.provider_id == provider_id).delete()
        for sid in body.service_ids:
            db.add(ProviderService(provider_id=p.id, service_id=sid))
    db.commit()
    db.refresh(p)
    return _enrich(p)

@router.delete("/{provider_id}", status_code=204)
def delete_provider(
    provider_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    q = db.query(Provider).filter(Provider.id == provider_id)
    if current_user.role != UserRole.superadmin:
        q = q.filter(Provider.tenant_id == current_user.tenant_id)
    p = q.first()
    if not p:
        raise HTTPException(404, "Provider ვერ მოიძებნა")
    db.query(ProviderService).filter(ProviderService.provider_id == provider_id).delete()
    db.delete(p)
    db.commit()

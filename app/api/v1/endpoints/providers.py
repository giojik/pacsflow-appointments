from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.provider import Provider, ProviderService
from app.models.service import Service
from app.schemas.provider import ProviderCreate, ProviderUpdate, ProviderOut

router = APIRouter()

def _enrich(p: Provider) -> dict:
    d = {c.name: getattr(p, c.name) for c in p.__table__.columns}
    d["service_ids"] = [ps.service_id for ps in p.provider_services]
    return d

@router.get("/", response_model=list[ProviderOut])
def list_providers(
    tenant_id: str = Query(...),
    active: bool | None = None,
    db: Session = Depends(get_db)
):
    q = db.query(Provider).filter(Provider.tenant_id == tenant_id)
    if active is not None:
        q = q.filter(Provider.active == active)
    return [_enrich(p) for p in q.all()]

@router.get("/{provider_id}", response_model=ProviderOut)
def get_provider(provider_id: str, db: Session = Depends(get_db)):
    p = db.query(Provider).filter(Provider.id == provider_id).first()
    if not p:
        raise HTTPException(404, "Provider ვერ მოიძებნა")
    return _enrich(p)

@router.post("/", response_model=ProviderOut, status_code=201)
def create_provider(body: ProviderCreate, db: Session = Depends(get_db)):
    p = Provider(**body.model_dump(exclude={"service_ids"}))
    db.add(p)
    db.flush()
    for sid in body.service_ids:
        db.add(ProviderService(provider_id=p.id, service_id=sid))
    db.commit()
    db.refresh(p)
    return _enrich(p)

@router.patch("/{provider_id}", response_model=ProviderOut)
def update_provider(provider_id: str, body: ProviderUpdate, db: Session = Depends(get_db)):
    p = db.query(Provider).filter(Provider.id == provider_id).first()
    if not p:
        raise HTTPException(404, "Provider ვერ მოიძებნა")
    for k, v in body.model_dump(exclude_none=True, exclude={"service_ids"}).items():
        setattr(p, k, v)
    if body.service_ids is not None:
        db.query(ProviderService).filter(ProviderService.provider_id == provider_id).delete()
        for sid in body.service_ids:
            db.add(ProviderService(provider_id=p.id, service_id=sid))
    db.commit()
    db.refresh(p)
    return _enrich(p)

@router.delete("/{provider_id}", status_code=204)
def delete_provider(provider_id: str, db: Session = Depends(get_db)):
    p = db.query(Provider).filter(Provider.id == provider_id).first()
    if not p:
        raise HTTPException(404, "Provider ვერ მოიძებნა")
    p.active = False
    db.commit()

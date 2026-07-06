from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.service import Service
from app.schemas.service import ServiceCreate, ServiceUpdate, ServiceOut

router = APIRouter()

@router.get("/", response_model=list[ServiceOut])
def list_services(
    tenant_id: str = Query(...),
    active: bool | None = None,
    db: Session = Depends(get_db)
):
    q = db.query(Service).filter(Service.tenant_id == tenant_id)
    if active is not None:
        q = q.filter(Service.active == active)
    return q.order_by(Service.name_ka).all()

@router.get("/{service_id}", response_model=ServiceOut)
def get_service(service_id: str, db: Session = Depends(get_db)):
    s = db.query(Service).filter(Service.id == service_id).first()
    if not s:
        raise HTTPException(404, "სერვისი ვერ მოიძებნა")
    return s

@router.post("/", response_model=ServiceOut, status_code=201)
def create_service(body: ServiceCreate, db: Session = Depends(get_db)):
    s = Service(**body.model_dump())
    db.add(s)
    db.commit()
    db.refresh(s)
    return s

@router.patch("/{service_id}", response_model=ServiceOut)
def update_service(service_id: str, body: ServiceUpdate, db: Session = Depends(get_db)):
    s = db.query(Service).filter(Service.id == service_id).first()
    if not s:
        raise HTTPException(404, "სერვისი ვერ მოიძებნა")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(s, k, v)
    db.commit()
    db.refresh(s)
    return s

@router.delete("/{service_id}", status_code=204)
def delete_service(service_id: str, db: Session = Depends(get_db)):
    s = db.query(Service).filter(Service.id == service_id).first()
    if not s:
        raise HTTPException(404, "სერვისი ვერ მოიძებნა")
    s.active = False
    db.commit()

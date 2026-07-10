from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.client import Client
from app.models.user import UserRole
from app.core.auth import get_current_active_user
from app.schemas.client import ClientCreate, ClientUpdate, ClientOut

router = APIRouter()


def _resolve_tenant_id(current_user, requested_tenant_id: str | None) -> str:
    """superadmin-ს შეუძლია ნებისმიერი tenant_id, დანარჩენებს — მხოლოდ საკუთარი"""
    if current_user.role == UserRole.superadmin:
        if not requested_tenant_id:
            raise HTTPException(400, "tenant_id აუცილებელია")
        return requested_tenant_id
    if requested_tenant_id and requested_tenant_id != current_user.tenant_id:
        raise HTTPException(403, "წვდომა აკრძალულია")
    return current_user.tenant_id


@router.get("/", response_model=list[ClientOut])
def list_clients(
    tenant_id: str | None = Query(None),
    search: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    tenant_id = _resolve_tenant_id(current_user, tenant_id)
    q = db.query(Client).filter(Client.tenant_id == tenant_id)
    if search:
        like = f"%{search}%"
        q = q.filter(
            Client.first_name.ilike(like) |
            Client.last_name.ilike(like) |
            Client.phone.ilike(like) |
            Client.personal_id.ilike(like)
        )
    return q.order_by(Client.last_name).all()

@router.get("/{client_id}", response_model=ClientOut)
def get_client(
    client_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    q = db.query(Client).filter(Client.id == client_id)
    if current_user.role != UserRole.superadmin:
        q = q.filter(Client.tenant_id == current_user.tenant_id)
    c = q.first()
    if not c:
        raise HTTPException(404, "კლიენტი ვერ მოიძებნა")
    return c

@router.post("/", response_model=ClientOut, status_code=201)
def create_client(
    body: ClientCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    data = body.model_dump()
    data["tenant_id"] = _resolve_tenant_id(current_user, data.get("tenant_id"))
    c = Client(**data)
    db.add(c)
    db.commit()
    db.refresh(c)
    return c

@router.patch("/{client_id}", response_model=ClientOut)
def update_client(
    client_id: str,
    body: ClientUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    q = db.query(Client).filter(Client.id == client_id)
    if current_user.role != UserRole.superadmin:
        q = q.filter(Client.tenant_id == current_user.tenant_id)
    c = q.first()
    if not c:
        raise HTTPException(404, "კლიენტი ვერ მოიძებნა")
    update_data = body.model_dump(exclude_none=True)
    update_data.pop("tenant_id", None)
    for k, v in update_data.items():
        setattr(c, k, v)
    db.commit()
    db.refresh(c)
    return c

@router.delete("/{client_id}", status_code=204)
def delete_client(
    client_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    q = db.query(Client).filter(Client.id == client_id)
    if current_user.role != UserRole.superadmin:
        q = q.filter(Client.tenant_id == current_user.tenant_id)
    c = q.first()
    if not c:
        raise HTTPException(404, "კლიენტი ვერ მოიძებნა")
    db.delete(c)
    db.commit()

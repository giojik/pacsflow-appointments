from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.client import Client
from app.schemas.client import ClientCreate, ClientUpdate, ClientOut

router = APIRouter()

@router.get("/", response_model=list[ClientOut])
def list_clients(
    tenant_id: str = Query(...),
    search: str | None = Query(None),
    db: Session = Depends(get_db)
):
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
def get_client(client_id: str, db: Session = Depends(get_db)):
    c = db.query(Client).filter(Client.id == client_id).first()
    if not c:
        raise HTTPException(404, "კლიენტი ვერ მოიძებნა")
    return c

@router.post("/", response_model=ClientOut, status_code=201)
def create_client(body: ClientCreate, db: Session = Depends(get_db)):
    c = Client(**body.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return c

@router.patch("/{client_id}", response_model=ClientOut)
def update_client(client_id: str, body: ClientUpdate, db: Session = Depends(get_db)):
    c = db.query(Client).filter(Client.id == client_id).first()
    if not c:
        raise HTTPException(404, "კლიენტი ვერ მოიძებნა")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(c, k, v)
    db.commit()
    db.refresh(c)
    return c

@router.delete("/{client_id}", status_code=204)
def delete_client(client_id: str, db: Session = Depends(get_db)):
    c = db.query(Client).filter(Client.id == client_id).first()
    if not c:
        raise HTTPException(404, "კლიენტი ვერ მოიძებნა")
    db.delete(c)
    db.commit()

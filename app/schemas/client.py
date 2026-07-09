from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date

class ClientBase(BaseModel):
    first_name:  str
    last_name:   str
    phone:       Optional[str] = None
    email:       Optional[str] = None
    personal_id: Optional[str] = None
    dob:         Optional[date] = None

class ClientCreate(ClientBase):
    tenant_id: str

class ClientUpdate(BaseModel):
    first_name:  Optional[str] = None
    last_name:   Optional[str] = None
    phone:       Optional[str] = None
    email:       Optional[str] = None
    personal_id: Optional[str] = None
    dob:         Optional[date] = None

class ClientOut(ClientBase):
    id:         str
    tenant_id:  str
    created_at: datetime

    class Config:
        from_attributes = True

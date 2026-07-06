from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class ProviderBase(BaseModel):
    first_name: str
    last_name:  str
    specialty:  Optional[str] = None
    phone:      Optional[str] = None
    email:      Optional[str] = None
    photo_url:  Optional[str] = None
    active:     bool = True
    notes:      Optional[str] = None

class ProviderCreate(ProviderBase):
    tenant_id: str
    service_ids: list[str] = []

class ProviderUpdate(BaseModel):
    first_name:  Optional[str] = None
    last_name:   Optional[str] = None
    specialty:   Optional[str] = None
    phone:       Optional[str] = None
    email:       Optional[str] = None
    photo_url:   Optional[str] = None
    active:      Optional[bool] = None
    notes:       Optional[str] = None
    service_ids: Optional[list[str]] = None

class ProviderOut(ProviderBase):
    id:         str
    tenant_id:  str
    created_at: datetime
    service_ids: list[str] = []

    class Config:
        from_attributes = True

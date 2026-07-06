from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ServiceBase(BaseModel):
    code:         str
    name_ka:      str
    name_en:      Optional[str] = None
    duration_min: int = 30
    active:       bool = True
    color:        str = "#1D9E75"

class ServiceCreate(ServiceBase):
    tenant_id: str

class ServiceUpdate(BaseModel):
    code:         Optional[str] = None
    name_ka:      Optional[str] = None
    name_en:      Optional[str] = None
    duration_min: Optional[int] = None
    active:       Optional[bool] = None
    color:        Optional[str] = None

class ServiceOut(ServiceBase):
    id:         str
    tenant_id:  str
    created_at: datetime

    class Config:
        from_attributes = True

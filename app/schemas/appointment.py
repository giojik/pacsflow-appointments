from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.appointment import AppointmentStatus

class AppointmentCreate(BaseModel):
    tenant_id:  str
    client_id:  str
    slot_id:    str
    notes:      Optional[str] = None

class AppointmentUpdate(BaseModel):
    status: Optional[AppointmentStatus] = None
    notes:  Optional[str] = None

class AppointmentOut(BaseModel):
    id:         str
    tenant_id:  str
    client_id:  str
    slot_id:    str
    status:     AppointmentStatus
    notes:      Optional[str]
    created_at: datetime

    # nested
    client_name:   Optional[str] = None
    client_phone:  Optional[str] = None
    provider_name: Optional[str] = None
    service_name:  Optional[str] = None
    starts_at:     Optional[datetime] = None
    ends_at:       Optional[datetime] = None
    code:          Optional[str] = None   # PF-XXXXXX

    class Config:
        from_attributes = True

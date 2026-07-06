from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.slot import SlotStatus

class SlotBase(BaseModel):
    provider_id: str
    service_id:  str
    starts_at:   datetime
    ends_at:     datetime

class SlotCreate(SlotBase):
    pass

class SlotBulkCreate(BaseModel):
    """ერთიანად ბევრი სლოტის შექმნა — კვირის განრიგიდან"""
    provider_id:  str
    service_id:   str
    date_from:    str           # "2025-01-06"
    date_to:      str           # "2025-01-31"
    weekdays:     list[int]     # [0,1,2,3,4] = ორშ-პარ
    time_from:    str           # "09:00"
    time_to:      str           # "17:00"
    slot_duration: int = 30     # წუთი

class SlotUpdate(BaseModel):
    status: Optional[SlotStatus] = None

class SlotOut(SlotBase):
    id:     str
    status: SlotStatus

    class Config:
        from_attributes = True

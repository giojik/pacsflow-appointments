import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import Column, String, Text
from sqlalchemy.dialects.postgresql import UUID
from pydantic import BaseModel
from typing import Any
from app.db.session import get_db
from app.models.base import Base, TimestampMixin, gen_uuid
from app.core.auth import get_current_active_user, require_tenant_access
from app.models.user import User
from fastapi import Request

router = APIRouter()

class TenantSettings(Base, TimestampMixin):
    __tablename__ = "tenant_settings"
    id        = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    tenant_id = Column(UUID(as_uuid=False), nullable=False, unique=True)
    settings  = Column(Text, nullable=False, default="{}")

class SettingsUpdate(BaseModel):
    settings: dict[str, Any]

def get_or_create(tenant_id: str, db: Session) -> TenantSettings:
    obj = db.query(TenantSettings).filter(TenantSettings.tenant_id == tenant_id).first()
    if not obj:
        obj = TenantSettings(tenant_id=tenant_id, settings="{}")
        db.add(obj)
        db.commit()
        db.refresh(obj)
    return obj

@router.get("/{tenant_id}")
def get_settings(tenant_id: str, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_active_user)):
    require_tenant_access(tenant_id, current_user)
    obj = get_or_create(tenant_id, db)
    return json.loads(obj.settings)

@router.patch("/{tenant_id}")
def update_settings(tenant_id: str, body: SettingsUpdate,
                    db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_active_user)):
    require_tenant_access(tenant_id, current_user)
    obj = get_or_create(tenant_id, db)
    current = json.loads(obj.settings)
    current.update(body.settings)
    obj.settings = json.dumps(current)
    db.commit()
    return current

@router.get("/public/branding")
def get_public_branding(request: Request, db: Session = Depends(get_db)):
    """Public endpoint — authorization გარეშე, დომეინის მიხედვით"""
    from app.core.tenant import resolve_slug
    from app.models.tenant import Tenant
    from fastapi import Request
    # host-ს აღარ ვკითხულობთ პირდაპირ — resolve_slug რაც უფრო რთულ ლოგიკას აერთიანებს
    slug = resolve_slug(request, db)
    tenant = db.query(Tenant).filter(Tenant.slug == slug).first()
    if not tenant:
        return {}
    obj = get_or_create(str(tenant.id), db)
    data = json.loads(obj.settings)
    return {
        "app_name":       data.get("app_name",       "PacsFlow"),
        "app_subtitle":   data.get("app_subtitle",   "Appointments"),
        "login_title":    data.get("login_title",    "ჩაწერის მართვის სისტემა"),
        "login_subtitle": data.get("login_subtitle", "მართეთ ჩაწერები, განრიგები და კლიენტები."),
        "primary_color":  data.get("primary_color",  "#1D9E75"),
        "sidebar_color":  data.get("sidebar_color",  "#1a1a2e"),
        "login_bg_color": data.get("login_bg_color", "#1a1a2e"),
        "clinic_name":    data.get("clinic_name",    tenant.name),
        "login_bg_image": data.get("login_bg_image", ""),
        "logo_url":       data.get("logo_url",       ""),
        "session_timeout_minutes": data.get("session_timeout_minutes", 60),
        "favicon_url":     data.get("favicon_url",     ""),
        "footer_text":     data.get("footer_text",     ""),
        "login_phone":     data.get("login_phone",     ""),
        "login_address":   data.get("login_address",   ""),
        "show_powered_by": data.get("show_powered_by", True),
        "custom_css":      data.get("custom_css",      ""),
        "work_hours_from": data.get("work_hours_from", "09:00"),
        "work_hours_to":   data.get("work_hours_to",   "18:00"),
        "work_days":       data.get("work_days",        [0,1,2,3,4]),
        "date_format": data.get("date_format", "dd.mm.yyyy"),
    }
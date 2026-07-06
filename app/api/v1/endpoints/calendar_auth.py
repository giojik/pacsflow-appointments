"""
Calendar OAuth endpoints — provider-ი ამ URL-ებით აკავშირებს კალენდარს.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.provider import Provider, CalendarProvider
from app.services.calendar import get_calendar_adapter
from app.services.calendar.base import CalendarCredentials
import json, base64

router = APIRouter()

@router.get("/connect/{provider_type}")
def start_oauth(
    provider_type: str,
    provider_id: str = Query(...),
    db: Session = Depends(get_db)
):
    """Provider-ი ამ URL-ზე გადადის კალენდარის დასაკავშირებლად"""
    if provider_type not in ("google", "outlook"):
        raise HTTPException(400, f"OAuth მხოლოდ google და outlook-ისთვის. CalDAV-ისთვის გამოიყენეთ /connect/caldav")

    state = base64.b64encode(json.dumps({
        "provider_id":   provider_id,
        "provider_type": provider_type,
    }).encode()).decode()

    creds = CalendarCredentials(provider_type=provider_type)
    adapter = get_calendar_adapter(creds)
    return RedirectResponse(adapter.get_auth_url(state))

@router.get("/callback/{provider_type}")
def oauth_callback(
    provider_type: str,
    code: str = Query(...),
    state: str = Query(...),
    db: Session = Depends(get_db)
):
    """Google / Outlook-ი ამ URL-ზე გადამისამართებს auth-ის შემდეგ"""
    state_data = json.loads(base64.b64decode(state))
    provider_id = state_data["provider_id"]

    provider = db.query(Provider).filter(Provider.id == provider_id).first()
    if not provider:
        raise HTTPException(404, "Provider ვერ მოიძებნა")

    temp_creds = CalendarCredentials(provider_type=provider_type)
    adapter = get_calendar_adapter(temp_creds)
    creds = adapter.exchange_code(code)

    provider.calendar_provider      = CalendarProvider(provider_type)
    provider.calendar_id            = creds.calendar_id
    provider.calendar_refresh_token = creds.refresh_token
    provider.calendar_sync_enabled  = True
    db.commit()

    return {"status": "ok", "message": f"{provider_type} კალენდარი დაკავშირდა"}

@router.post("/connect/caldav")
def connect_caldav(
    provider_id: str,
    caldav_url: str,
    username: str,
    app_password: str,
    db: Session = Depends(get_db)
):
    """CalDAV — username + app-specific password (Apple, Nextcloud, Fastmail)"""
    provider = db.query(Provider).filter(Provider.id == provider_id).first()
    if not provider:
        raise HTTPException(404, "Provider ვერ მოიძებნა")

    provider.calendar_provider      = CalendarProvider.caldav
    provider.calendar_id            = caldav_url
    provider.calendar_refresh_token = app_password
    provider.calendar_sync_enabled  = True
    db.commit()
    return {"status": "ok", "message": "CalDAV კალენდარი დაკავშირდა"}

@router.delete("/disconnect/{provider_id}")
def disconnect_calendar(provider_id: str, db: Session = Depends(get_db)):
    provider = db.query(Provider).filter(Provider.id == provider_id).first()
    if not provider:
        raise HTTPException(404, "Provider ვერ მოიძებნა")
    provider.calendar_provider      = None
    provider.calendar_id            = None
    provider.calendar_refresh_token = None
    provider.calendar_sync_enabled  = False
    db.commit()
    return {"status": "ok", "message": "კალენდარი გათიშულია"}

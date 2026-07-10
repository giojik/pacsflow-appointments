"""
Calendar OAuth endpoints — platform-level
"""
import hashlib
import hmac
import time

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse, HTMLResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.provider import Provider, CalendarProvider
from app.models.tenant import Tenant
from app.core.config import settings
from app.core.auth import get_current_active_user
from app.models.user import UserRole
import json, base64, urllib.parse, httpx

router = APIRouter()

STATE_TTL_SECONDS = 600  # 10 წუთი — state ვადიანია, callback უნდა დასრულდეს ამ დროში


def _check_provider_tenant(provider: Provider, current_user):
    """superadmin-ს გარდა ყველასთვის — provider უნდა ეკუთვნოდეს current_user-ის tenant-ს"""
    if current_user.role != UserRole.superadmin and provider.tenant_id != current_user.tenant_id:
        raise HTTPException(403, "წვდომა აკრძალულია")


def _sign_state(payload: dict) -> str:
    """State-ს ვხატავთ HMAC ხელმოწერით, რომ callback-ზე ვერავინ ვერ გააყალბოს provider_id."""
    payload = {**payload, "ts": time.time()}
    raw = json.dumps(payload, sort_keys=True).encode()
    sig = hmac.new(settings.SECRET_KEY.encode(), raw, hashlib.sha256).hexdigest()
    state = {"data": base64.urlsafe_b64encode(raw).decode(), "sig": sig}
    return base64.urlsafe_b64encode(json.dumps(state).encode()).decode()


def _verify_state(state: str) -> dict:
    try:
        outer = json.loads(base64.urlsafe_b64decode(state + "=="))
        raw = base64.urlsafe_b64decode(outer["data"] + "==")
        expected_sig = hmac.new(settings.SECRET_KEY.encode(), raw, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected_sig, outer["sig"]):
            raise ValueError("bad signature")
        payload = json.loads(raw)
        if time.time() - payload.get("ts", 0) > STATE_TTL_SECONDS:
            raise ValueError("expired state")
        return payload
    except Exception:
        raise HTTPException(400, "არასწორი ან ვადაგასული state პარამეტრი")


def _google_auth_url(state: str) -> str:
    params = {
        "client_id":     settings.GOOGLE_CLIENT_ID,
        "redirect_uri":  settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope":         "https://www.googleapis.com/auth/calendar",
        "access_type":   "offline",
        "prompt":        "consent",
        "state":         state,
    }
    return f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"

def _exchange_code(code: str) -> dict:
    r = httpx.post("https://oauth2.googleapis.com/token", data={
        "code":          code,
        "client_id":     settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "redirect_uri":  settings.GOOGLE_REDIRECT_URI,
        "grant_type":    "authorization_code",
    }, timeout=30)
    r.raise_for_status()
    return r.json()

def _create_google_calendar(access_token: str, calendar_name: str) -> str:
    r = httpx.post(
        "https://www.googleapis.com/calendar/v3/calendars",
        json={"summary": calendar_name, "timeZone": "Asia/Tbilisi"},
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=30
    )
    r.raise_for_status()
    return r.json()["id"]

@router.get("/connect/{provider_type}")
def start_oauth(
    provider_type: str,
    provider_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user),
):
    if provider_type != "google":
        raise HTTPException(400, "ამჟამად მხოლოდ Google Calendar-ია მხარდაჭერილი")
    provider = db.query(Provider).filter(Provider.id == provider_id).first()
    if not provider:
        raise HTTPException(404, "Provider ვერ მოიძებნა")
    _check_provider_tenant(provider, current_user)
    state = _sign_state({
        "provider_id":   provider_id,
        "provider_type": provider_type,
    })
    return RedirectResponse(_google_auth_url(state))

@router.get("/callback")
def oauth_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: Session = Depends(get_db)
):
    # callback მოდის Google-დან ბრაუზერის რედირექტით — Bearer token ვერ გამოგვადგება,
    # ამიტომ ხელმოწერილი state-ის ვალიდურობა (რომელიც მხოლოდ /connect-ზე
    # ავტორიზებული მოთხოვნით შეიქმნა) გვცავს გაყალბებული provider_id-სგან.
    state_data = _verify_state(state)
    provider_id = state_data["provider_id"]
    provider = db.query(Provider).filter(Provider.id == provider_id).first()
    if not provider:
        raise HTTPException(404, "Provider ვერ მოიძებნა")
    try:
        token_data = _exchange_code(code)
    except Exception as e:
        raise HTTPException(400, f"Google token exchange შეცდომა: {e}")

    access_token = token_data["access_token"]

    tenant = db.query(Tenant).filter(Tenant.id == provider.tenant_id).first()
    tenant_name = tenant.name if tenant else "PacsFlow"
    provider_name = f"{provider.first_name} {provider.last_name}"
    calendar_name = f"{tenant_name} — {provider_name}"

    try:
        calendar_id = _create_google_calendar(access_token, calendar_name)
    except Exception as e:
        print(f"[calendar] failed to create calendar, using primary: {e}")
        calendar_id = "primary"

    provider.calendar_provider      = CalendarProvider.google
    provider.calendar_id            = calendar_id
    provider.calendar_refresh_token = token_data.get("refresh_token")
    provider.calendar_sync_enabled  = True
    db.commit()

    return HTMLResponse("""
    <html><body style="font-family:sans-serif;text-align:center;padding:60px">
        <h2 style="color:#1D9E75">✅ Google Calendar დაკავშირდა!</h2>
        <p>ეს ფანჯარა შეგიძლიათ დახუროთ.</p>
        <script>
            if (window.opener) {
                window.opener.postMessage({type:'calendar_connected'}, '*');
                setTimeout(() => window.close(), 2000);
            }
        </script>
    </body></html>
    """)

@router.delete("/disconnect/{provider_id}")
def disconnect_calendar(
    provider_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user),
):
    provider = db.query(Provider).filter(Provider.id == provider_id).first()
    if not provider:
        raise HTTPException(404, "Provider ვერ მოიძებნა")
    _check_provider_tenant(provider, current_user)
    provider.calendar_provider      = None
    provider.calendar_id            = None
    provider.calendar_refresh_token = None
    provider.calendar_sync_enabled  = False
    db.commit()
    return {"status": "ok", "message": "კალენდარი გათიშულია"}

@router.get("/status/{provider_id}")
def calendar_status(
    provider_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user),
):
    provider = db.query(Provider).filter(Provider.id == provider_id).first()
    if not provider:
        raise HTTPException(404, "Provider ვერ მოიძებნა")
    _check_provider_tenant(provider, current_user)
    return {
        "connected": bool(provider.calendar_sync_enabled),
        "provider_type": provider.calendar_provider.value if provider.calendar_provider else None,
        "calendar_id": provider.calendar_id,
    }
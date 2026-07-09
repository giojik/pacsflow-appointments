from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.router import api_router
import json
import re
import os

app = FastAPI(
    title="PacsFlow Appointments",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("/app/static/uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="/app/static"), name="static")

@app.middleware("http")
async def tenant_middleware(request: Request, call_next):
    from app.core.tenant import resolve_slug
    from app.db.session import SessionLocal
    host = request.headers.get("host", "")
    db = SessionLocal()
    try:
        request.state.tenant_slug = resolve_slug(request, db)
    except Exception:
        request.state.tenant_slug = "pacsflow"
    finally:
        db.close()
    response = await call_next(request)
    return response


# ── Audit log middleware ─────────────────────────────────────────────────
AUDIT_METHODS = {"POST", "PATCH", "PUT", "DELETE"}
AUDIT_SKIP_PATHS = ("/api/v1/auth/login", "/api/v1/auth/refresh")
SENSITIVE_KEYS = {"password", "old_password", "new_password", "token", "api_key", "secret"}

# Path patterns for entity resolution
RE_APPOINTMENT = re.compile(r"/api/v1/appointments/([0-9a-f-]{36})")
RE_CLIENT      = re.compile(r"/api/v1/clients/([0-9a-f-]{36})")
RE_PROVIDER    = re.compile(r"/api/v1/providers/([0-9a-f-]{36})")
RE_SERVICE     = re.compile(r"/api/v1/services/([0-9a-f-]{36})")
RE_SLOT        = re.compile(r"/api/v1/slots/([0-9a-f-]{36})")
RE_USER        = re.compile(r"/api/v1/users/([0-9a-f-]{36})")


def _mask_body(raw: bytes) -> str:
    if not raw:
        return ""
    try:
        data = json.loads(raw)
        if isinstance(data, dict):
            for k in list(data.keys()):
                if k.lower() in SENSITIVE_KEYS:
                    data[k] = "***"
        return json.dumps(data, ensure_ascii=False)[:4000]
    except Exception:
        return "<non-json body>"


def _build_details(db, method: str, path: str, body_bytes: bytes,
                   username: str, status_code: int) -> str:
    """ადამიანურად წაკითხვადი აღწერა — ვინ რა გააკეთა ვისთან"""
    from app.models.appointment import Appointment
    from app.models.client import Client
    from app.models.provider import Provider
    from app.models.service import Service
    from app.models.slot import Slot
    from app.models.user import User

    who = username or "(უცნობი)"
    body_data = {}
    try:
        if body_bytes:
            body_data = json.loads(body_bytes)
            if not isinstance(body_data, dict):
                body_data = {}
    except Exception:
        body_data = {}

    # --- APPOINTMENTS ---
    m = RE_APPOINTMENT.search(path)
    if m:
        appt_id = m.group(1)
        appt = db.query(Appointment).filter(Appointment.id == appt_id).first()
        if not appt:
            return f"{who} — ჩაწერა (ვერ მოიძებნა)"

        client = appt.client
        slot = appt.slot
        provider = slot.provider if slot else None
        client_name = f"{client.first_name} {client.last_name}" if client else "?"
        provider_name = f"{provider.first_name} {provider.last_name}" if provider else "?"
        slot_time = slot.starts_at.strftime("%d.%m.%Y %H:%M") if slot and slot.starts_at else "?"

        target = f"{client_name}, {slot_time}, პროვ. {provider_name}"

        if "reschedule" in path:
            new_slot_id = body_data.get("slot_id") or (path.split("slot_id=")[-1] if "slot_id=" in path else "")
            new_slot = db.query(Slot).filter(Slot.id == new_slot_id).first() if new_slot_id else None
            new_time = new_slot.starts_at.strftime("%d.%m.%Y %H:%M") if new_slot and new_slot.starts_at else "?"
            return f"{who} — გადაიტანა ჩაწერა: {target} → ახალი დრო: {new_time}"

        if "resend-code" in path:
            return f"{who} — კოდი ხელახლა გაიგზავნა: {target}"

        status = body_data.get("status", "")
        if status == "cancelled":
            return f"{who} — გააუქმა ჩაწერა: {target}"
        if status == "completed":
            return f"{who} — დაასრულა ჩაწერა: {target}"
        if status == "no_show":
            return f"{who} — არ გამოცხადდა: {target}"
        if status == "confirmed":
            return f"{who} — დაადასტურა ჩაწერა: {target}"

        if method == "PATCH":
            changed = ", ".join(f"{k}={v}" for k, v in body_data.items() if k != "status")
            return f"{who} — შეცვალა ჩაწერა: {target}" + (f" ({changed})" if changed else "")

    # POST appointments (new booking)
    if method == "POST" and "/api/v1/appointments" in path and not RE_APPOINTMENT.search(path):
        slot_id = body_data.get("slot_id")
        client_id = body_data.get("client_id")
        client = db.query(Client).filter(Client.id == client_id).first() if client_id else None
        slot = db.query(Slot).filter(Slot.id == slot_id).first() if slot_id else None
        provider = slot.provider if slot else None
        client_name = f"{client.first_name} {client.last_name}" if client else "?"
        provider_name = f"{provider.first_name} {provider.last_name}" if provider else ""
        slot_time = slot.starts_at.strftime("%d.%m.%Y %H:%M") if slot and slot.starts_at else ""
        return f"{who} — შექმნა ჩაწერა: {client_name}, {slot_time}, პროვ. {provider_name}"

    # --- CLIENTS ---
    m = RE_CLIENT.search(path)
    if m:
        cl = db.query(Client).filter(Client.id == m.group(1)).first()
        cl_name = f"{cl.first_name} {cl.last_name}" if cl else "?"
        if method == "DELETE":
            return f"{who} — წაშალა კლიენტი: {cl_name}"
        return f"{who} — შეცვალა კლიენტი: {cl_name}"

    if method == "POST" and "/api/v1/clients" in path:
        fn = body_data.get("first_name", "")
        ln = body_data.get("last_name", "")
        return f"{who} — შექმნა კლიენტი: {fn} {ln}".strip()

    # --- PROVIDERS ---
    m = RE_PROVIDER.search(path)
    if m:
        prov = db.query(Provider).filter(Provider.id == m.group(1)).first()
        prov_name = f"{prov.first_name} {prov.last_name}" if prov else "?"
        if method == "DELETE":
            return f"{who} — წაშალა პროვაიდერი: {prov_name}"
        return f"{who} — შეცვალა პროვაიდერი: {prov_name}"

    if method == "POST" and "/api/v1/providers" in path:
        fn = body_data.get("first_name", "")
        ln = body_data.get("last_name", "")
        return f"{who} — შექმნა პროვაიდერი: {fn} {ln}".strip()

    # --- SERVICES ---
    m = RE_SERVICE.search(path)
    if m:
        svc = db.query(Service).filter(Service.id == m.group(1)).first()
        svc_name = svc.name_ka if svc and svc.name_ka else (svc.name if svc else "?")
        if method == "DELETE":
            return f"{who} — წაშალა სერვისი: {svc_name}"
        return f"{who} — შეცვალა სერვისი: {svc_name}"

    if method == "POST" and "/api/v1/services" in path:
        name = body_data.get("name_ka") or body_data.get("name", "")
        return f"{who} — შექმნა სერვისი: {name}"

    # --- SLOTS ---
    m = RE_SLOT.search(path)
    if m:
        sl = db.query(Slot).filter(Slot.id == m.group(1)).first()
        if sl:
            prov = sl.provider
            prov_name = f"{prov.first_name} {prov.last_name}" if prov else ""
            t = sl.starts_at.strftime("%d.%m.%Y %H:%M") if sl.starts_at else ""
            if method == "DELETE":
                return f"{who} — წაშალა სლოტი: {t}, {prov_name}"
            return f"{who} — შეცვალა სლოტი: {t}, {prov_name}"

    if method == "POST" and "/api/v1/slots" in path:
        return f"{who} — შექმნა სლოტ(ებ)ი"

    # --- USERS ---
    m = RE_USER.search(path)
    if m:
        u = db.query(User).filter(User.id == m.group(1)).first()
        uname = u.username if u else "?"
        if method == "DELETE":
            return f"{who} — წაშალა მომხმარებელი: {uname}"
        return f"{who} — შეცვალა მომხმარებელი: {uname}"

    if method == "POST" and "/api/v1/users" in path:
        uname = body_data.get("username", "")
        return f"{who} — შექმნა მომხმარებელი: {uname}"

    # --- SETTINGS / BRANDING / TEMPLATES ---
    if "settings" in path:
        return f"{who} — შეცვალა პარამეტრები"
    if "branding" in path:
        return f"{who} — შეცვალა ბრენდინგი"
    if "templates" in path:
        return f"{who} — შეცვალა შაბლონი"

    # Fallback
    parts = path.strip("/").split("/")
    entity = parts[2] if len(parts) > 2 else path
    action = {"POST": "შექმნა", "PATCH": "შეცვლა", "PUT": "შეცვლა", "DELETE": "წაშლა"}.get(method, method)
    return f"{who} — {action}: {entity}"


@app.middleware("http")
async def audit_middleware(request: Request, call_next):
    if request.method not in AUDIT_METHODS or not request.url.path.startswith("/api/v1") \
       or request.url.path.startswith(AUDIT_SKIP_PATHS):
        return await call_next(request)

    body_bytes = await request.body()

    async def receive():
        return {"type": "http.request", "body": body_bytes}
    request._receive = receive

    response = await call_next(request)

    try:
        user_id = username = role = None
        auth = request.headers.get("authorization", "")
        if auth.lower().startswith("bearer "):
            try:
                from app.core.security import decode_token
                payload = decode_token(auth[7:])
                user_id = payload.get("sub")
                role = payload.get("role")
            except Exception:
                pass

        parts = request.url.path.strip("/").split("/")
        entity = parts[2] if len(parts) > 2 else ""

        ctype = request.headers.get("content-type", "")
        body_str = "" if "multipart" in ctype else _mask_body(body_bytes)

        ip = request.headers.get("cf-connecting-ip", "") \
             or request.headers.get("x-real-ip", "") \
             or request.headers.get("x-forwarded-for", "").split(",")[0].strip() \
             or (request.client.host if request.client else "")

        from app.db.session import SessionLocal
        from app.models.audit import AuditLog
        from app.models.user import User

        db = SessionLocal()
        try:
            tenant_id = None
            if user_id:
                u = db.query(User).filter(User.id == user_id).first()
                if u:
                    username = u.username
                    tenant_id = u.tenant_id

            # ადამიანურად წაკითხვადი აღწერა
            details = ""
            try:
                details = _build_details(
                    db, request.method, str(request.url.path),
                    body_bytes, username, response.status_code
                )
            except Exception as e:
                details = f"(details error: {e})"

            db.add(AuditLog(
                tenant_id=tenant_id,
                user_id=user_id,
                username=username,
                user_role=role,
                method=request.method,
                path=str(request.url.path)[:512],
                entity=entity,
                status_code=response.status_code,
                ip=ip,
                body=body_str,
                details=details,
            ))
            db.commit()
        finally:
            db.close()
    except Exception as e:
        print(f"[audit] error: {e}")

    return response


app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health")
def health(request: Request):
    return {
        "status": "ok",
        "tenant": getattr(request.state, "tenant_slug", settings.TENANT_SLUG)
    }

@app.on_event("startup")
def on_startup():
    from app.core.config import load_settings_from_db
    from app.db.session import SessionLocal
    from app.models.tenant import Tenant
    db = SessionLocal()
    try:
        tenant = db.query(Tenant).filter(Tenant.slug == settings.TENANT_SLUG).first()
        if tenant:
            load_settings_from_db(str(tenant.id))
            print(f"[startup] settings loaded for tenant: {tenant.slug}")
    finally:
        db.close()

    try:
        from app.services.reminder import start_scheduler
        start_scheduler(hour=10, minute=0)
    except Exception as e:
        print(f"[scheduler] start failed: {e}")

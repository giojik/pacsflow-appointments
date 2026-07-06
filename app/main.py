from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.router import api_router
import json
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
    from app.core.tenant import resolve_slug_by_host
    from app.db.session import SessionLocal
    host = request.headers.get("host", "")
    db = SessionLocal()
    try:
        request.state.tenant_slug = resolve_slug_by_host(host, db)
    except Exception:
        request.state.tenant_slug = "innova"
    finally:
        db.close()
    response = await call_next(request)
    return response


# ── Audit log middleware ─────────────────────────────────────────────────
AUDIT_METHODS = {"POST", "PATCH", "PUT", "DELETE"}
AUDIT_SKIP_PATHS = ("/api/v1/auth/login", "/api/v1/auth/refresh")
SENSITIVE_KEYS = {"password", "old_password", "new_password", "token", "api_key", "secret"}


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


@app.middleware("http")
async def audit_middleware(request: Request, call_next):
    if request.method not in AUDIT_METHODS or not request.url.path.startswith("/api/v1") \
       or request.url.path.startswith(AUDIT_SKIP_PATHS):
        return await call_next(request)

    # body წავიკითხოთ ისე, რომ endpoint-მაც მიიღოს
    body_bytes = await request.body()

    async def receive():
        return {"type": "http.request", "body": body_bytes}
    request._receive = receive

    response = await call_next(request)

    # ლოგირება response-ის შემდეგ — ცალკე try-ში, რომ ლოგის შეცდომამ API არ გატეხოს
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

        # entity = path-ის მე-4 სეგმენტი: /api/v1/<entity>/...
        parts = request.url.path.strip("/").split("/")
        entity = parts[2] if len(parts) > 2 else ""

        # multipart/upload-ის body არ ვინახავთ
        ctype = request.headers.get("content-type", "")
        body_str = "" if "multipart" in ctype else _mask_body(body_bytes)

        ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() \
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



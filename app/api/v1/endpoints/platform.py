"""Platform console — tenant-ების ცენტრალური მართვა (მხოლოდ global superadmin)"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.auth import get_current_active_user
from app.core.security import hash_password
from app.models.tenant import Tenant
from app.models.user import User, UserRole, AuthProvider

router = APIRouter()


def require_platform_admin(current_user: User = Depends(get_current_active_user)) -> User:
    """მხოლოდ global superadmin — tenant_id IS NULL"""
    if current_user.role != UserRole.superadmin or current_user.tenant_id is not None:
        raise HTTPException(403, "წვდომა მხოლოდ პლატფორმის ადმინისტრატორისთვის")
    return current_user


# ── Schemas ────────────────────────────────────────────────────────────────
class TenantCreate(BaseModel):
    name: str
    slug: str
    domains: str = ""
    timezone: str = "Asia/Tbilisi"
    admin_username: str | None = None
    admin_password: str | None = None
    admin_full_name: str | None = None


class TenantUpdate(BaseModel):
    name: str | None = None
    domains: str | None = None
    timezone: str | None = None
    active: bool | None = None


# ── Endpoints ──────────────────────────────────────────────────────────────
@router.get("/tenants")
def list_tenants(
    db: Session = Depends(get_db),
    _: User = Depends(require_platform_admin),
):
    from app.models.provider import Provider
    from app.models.service import Service
    from app.models.appointment import Appointment
    from app.models.client import Client

    result = []
    for t in db.query(Tenant).order_by(Tenant.created_at.asc()).all():
        result.append({
            "id": t.id,
            "name": t.name,
            "slug": t.slug,
            "domains": t.domains or "",
            "timezone": t.timezone,
            "active": bool(t.active),
            "created_at": t.created_at.strftime("%Y-%m-%d") if t.created_at else "",
            "stats": {
                "users":        db.query(User).filter(User.tenant_id == t.id).count(),
                "providers":    db.query(Provider).filter(Provider.tenant_id == t.id).count(),
                "services":     db.query(Service).filter(Service.tenant_id == t.id).count(),
                "clients":      db.query(Client).filter(Client.tenant_id == t.id).count(),
                "appointments": db.query(Appointment).filter(Appointment.tenant_id == t.id).count(),
            },
        })
    return result


@router.post("/tenants", status_code=201)
def create_tenant(
    body: TenantCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_platform_admin),
):
    slug = body.slug.strip().lower()
    if not slug:
        raise HTTPException(400, "slug სავალდებულოა")
    if db.query(Tenant).filter(Tenant.slug == slug).first():
        raise HTTPException(409, f"slug '{slug}' უკვე არსებობს")

    tenant = Tenant(
        name=body.name.strip(),
        slug=slug,
        domains=body.domains.strip(),
        timezone=body.timezone or "Asia/Tbilisi",
        active=True,
    )
    db.add(tenant)
    db.commit()
    db.refresh(tenant)

    # პირველი admin მომხმარებელი (თუ მითითებულია)
    admin_created = None
    if body.admin_username and body.admin_password:
        if len(body.admin_password) < 8:
            raise HTTPException(400, "admin პაროლი მინიმუმ 8 სიმბოლო")
        if db.query(User).filter(User.username == body.admin_username).first():
            raise HTTPException(409, f"მომხმარებელი '{body.admin_username}' უკვე არსებობს")
        u = User(
            username=body.admin_username.strip(),
            full_name=body.admin_full_name or body.admin_username,
            role=UserRole.admin,
            tenant_id=tenant.id,
            auth_provider=AuthProvider.local,
            hashed_password=hash_password(body.admin_password),
        )
        db.add(u)
        db.commit()
        admin_created = u.username

    return {
        "id": tenant.id, "name": tenant.name, "slug": tenant.slug,
        "domains": tenant.domains, "active": True, "admin_created": admin_created,
    }


@router.patch("/tenants/{tenant_id}")
def update_tenant(
    tenant_id: str,
    body: TenantUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_platform_admin),
):
    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t:
        raise HTTPException(404, "Tenant ვერ მოიძებნა")

    if body.name is not None:
        t.name = body.name.strip()
    if body.domains is not None:
        t.domains = body.domains.strip()
    if body.timezone is not None:
        t.timezone = body.timezone
    if body.active is not None:
        t.active = body.active

    db.commit()

@router.delete("/tenants/{tenant_id}")
def delete_tenant(
    tenant_id: str,
    confirm_slug: str = "",
    db: Session = Depends(get_db),
    _: User = Depends(require_platform_admin),
):
    from sqlalchemy import text

    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t:
        raise HTTPException(404, "Tenant ვერ მოიძებნა")

    # უსაფრთხოება — slug-ის დადასტურება
    if confirm_slug != t.slug:
        raise HTTPException(400, f"წაშლის დასადასტურებლად გადმოეცი slug: {t.slug}")
    saved_slug = t.slug
    saved_name = t.name
    # თანმიმდევრობა — ღრმა შვილებიდან tenant-ისკენ (FK-ების დაცვით)
    stmts = [
        # appointment_codes → appointments-ის მიხედვით
        "DELETE FROM appointment_codes WHERE appointment_id IN (SELECT id FROM appointments WHERE tenant_id = :tid)",
        "DELETE FROM appointments WHERE tenant_id = :tid",
        "DELETE FROM waitlist WHERE tenant_id = :tid",
        # slots → providers-ის მიხედვით (slots-ს tenant_id არ აქვს)
        "DELETE FROM slots WHERE provider_id IN (SELECT id FROM providers WHERE tenant_id = :tid)",
        # provider_services → providers-ის მიხედვით
        "DELETE FROM provider_services WHERE provider_id IN (SELECT id FROM providers WHERE tenant_id = :tid)",
        "DELETE FROM clients WHERE tenant_id = :tid",
        "DELETE FROM services WHERE tenant_id = :tid",
        "DELETE FROM providers WHERE tenant_id = :tid",
        "DELETE FROM users WHERE tenant_id = :tid",
        "DELETE FROM tenant_settings WHERE tenant_id = :tid",
        "DELETE FROM audit_logs WHERE tenant_id = :tid",
        "DELETE FROM tenants WHERE id = :tid",
    ]
    try:
        for sql in stmts:
            db.execute(text(sql), {"tid": tenant_id})
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"წაშლის შეცდომა: {e}")

    return {"deleted": True, "slug": saved_slug, "name": saved_name}

@router.post("/tenants/{tenant_id}/impersonate")
def impersonate_tenant(
    tenant_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_platform_admin),
):
    from datetime import timedelta
    from app.core.security import create_access_token
    from app.models.audit import AuditLog

    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t:
        raise HTTPException(404, "Tenant ვერ მოიძებნა")
    if not t.active:
        raise HTTPException(400, "გამორთული tenant-ში შესვლა შეუძლებელია")

    # tenant-ის admin მომხმარებელი — რომლის კონტექსტშიც შევდივართ
    target = (
        db.query(User)
        .filter(User.tenant_id == tenant_id, User.role == UserRole.admin, User.active == True)
        .first()
    )
    if not target:
        # admin არ არის — ვცდილობთ superadmin-ს ამ tenant-ზე
        target = (
            db.query(User)
            .filter(User.tenant_id == tenant_id, User.active == True)
            .first()
        )
    if not target:
        raise HTTPException(404, "ამ კომპანიაში აქტიური მომხმარებელი ვერ მოიძებნა")

    # დროებითი token — 30 წუთი, impersonation ნიშნით
    token = create_access_token(
        {
            "sub": target.id,
            "role": target.role,
            "tenant_id": target.tenant_id,
            "impersonated_by": current_user.username,
        },
        expires_delta=timedelta(minutes=30),
    )

    # audit — platform admin შევიდა tenant-ში
    ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() \
         or (request.client.host if request.client else "")
    db.add(AuditLog(
        tenant_id=tenant_id,
        user_id=current_user.id,
        username=current_user.username,
        user_role="platform_admin",
        method="IMPERSONATE",
        path=f"/platform/tenants/{tenant_id}/impersonate",
        entity="impersonation",
        status_code=200,
        ip=ip,
        body=f'{{"target_user": "{target.username}", "tenant": "{t.slug}"}}',
    ))
    db.commit()

    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": target.id,
        "username": target.username,
        "role": target.role,
        "tenant_id": target.tenant_id,
        "full_name": target.full_name,
        "impersonated_by": current_user.username,
        "tenant_name": t.name,
    }

@router.get("/stats")
def platform_stats(
    db: Session = Depends(get_db),
    _: User = Depends(require_platform_admin),
):
    from sqlalchemy import text
    from app.models.appointment import Appointment
    from app.models.user import User as UserModel

    total_tenants = db.query(Tenant).count()
    active_tenants = db.query(Tenant).filter(Tenant.active == True).count()
    total_users = db.query(UserModel).filter(UserModel.tenant_id.isnot(None)).count()
    total_appointments = db.query(Appointment).count()

    growth_rows = db.execute(text("""
        SELECT to_char(s.starts_at, 'YYYY-MM') AS ym, COUNT(*) AS cnt
        FROM appointments a
        JOIN slots s ON s.id = a.slot_id
        WHERE s.starts_at >= (CURRENT_DATE - INTERVAL '6 months')
        GROUP BY ym ORDER BY ym
    """)).fetchall()
    growth = [{"month": r[0], "count": r[1]} for r in growth_rows]

    by_tenant_rows = db.execute(text("""
        SELECT t.name, COUNT(a.id) AS cnt
        FROM tenants t
        LEFT JOIN appointments a ON a.tenant_id = t.id
        GROUP BY t.id, t.name ORDER BY cnt DESC
    """)).fetchall()
    by_tenant = [{"name": r[0], "count": r[1]} for r in by_tenant_rows]

    status_rows = db.execute(text("""
        SELECT status, COUNT(*) AS cnt FROM appointments GROUP BY status
    """)).fetchall()
    status_ka = {
        "pending": "მოლოდინში", "confirmed": "დადასტურებული",
        "cancelled": "გაუქმებული", "completed": "დასრულებული", "no_show": "არ გამოცხადდა",
    }
    by_status = [{"status": status_ka.get(str(r[0]), str(r[0])), "count": r[1]} for r in status_rows]

    return {
        "totals": {
            "tenants": total_tenants,
            "active_tenants": active_tenants,
            "users": total_users,
            "appointments": total_appointments,
        },
        "growth": growth,
        "by_tenant": by_tenant,
        "by_status": by_status,
    }
@router.get("/audit")
def platform_audit(
    tenant_id:  str | None = None,
    method:     str | None = None,
    entity:     str | None = None,
    date_from:  str | None = None,
    date_to:    str | None = None,
    limit:      int = 100,
    offset:     int = 0,
    db: Session = Depends(get_db),
    _: User = Depends(require_platform_admin),
):
    from datetime import datetime, timedelta
    from app.models.audit import AuditLog

    q = db.query(AuditLog)

    if tenant_id:
        q = q.filter(AuditLog.tenant_id == tenant_id)
    if method:
        q = q.filter(AuditLog.method == method.upper())
    if entity:
        q = q.filter(AuditLog.entity == entity)
    if date_from:
        try:
            q = q.filter(AuditLog.created_at >= datetime.strptime(date_from, "%Y-%m-%d"))
        except ValueError:
            raise HTTPException(400, "date_from ფორმატი: YYYY-MM-DD")
    if date_to:
        try:
            q = q.filter(AuditLog.created_at < datetime.strptime(date_to, "%Y-%m-%d") + timedelta(days=1))
        except ValueError:
            raise HTTPException(400, "date_to ფორმატი: YYYY-MM-DD")

    total = q.count()
    rows = q.order_by(AuditLog.created_at.desc()).limit(min(limit, 500)).offset(offset).all()

    # tenant-ების რუკა (id → name) — ცხრილში სახელით რომ ჩანდეს
    tenant_map = {t.id: t.name for t in db.query(Tenant).all()}

    # entity-ების და tenant-ების სია dropdown-ებისთვის
    entities = sorted([r[0] for r in db.query(AuditLog.entity).distinct().all() if r[0]])

    METHOD_KA = {
        "POST": "შექმნა", "PATCH": "შეცვლა", "PUT": "შეცვლა",
        "DELETE": "წაშლა", "IMPERSONATE": "შესვლა (impersonate)",
    }

    return {
        "total": total,
        "entities": entities,
        "tenants": [{"id": tid, "name": name} for tid, name in tenant_map.items()],
        "rows": [{
            "id": r.id,
            "created_at": r.created_at.strftime("%Y-%m-%d %H:%M:%S") if r.created_at else "",
            "tenant_name": tenant_map.get(r.tenant_id, "—"),
            "username": r.username or "(უცნობი)",
            "user_role": r.user_role or "",
            "method": r.method,
            "method_ka": METHOD_KA.get(r.method, r.method),
            "entity": r.entity,
            "path": r.path,
            "status_code": r.status_code,
            "ip": r.ip,
            "body": r.body,
        } for r in rows],
    }

class PlatformUserCreate(BaseModel):
    username: str
    password: str
    full_name: str | None = None
    email: str | None = None


class PlatformUserUpdate(BaseModel):
    full_name: str | None = None
    email: str | None = None
    password: str | None = None
    active: bool | None = None


@router.get("/users")
def list_platform_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_platform_admin),
):
    users = db.query(User).filter(
        User.tenant_id.is_(None),
        User.role == UserRole.superadmin,
    ).order_by(User.created_at.asc()).all()
    return [{
        "id": u.id,
        "username": u.username,
        "full_name": u.full_name or "",
        "email": u.email or "",
        "active": bool(u.active),
        "created_at": u.created_at.strftime("%Y-%m-%d") if u.created_at else "",
    } for u in users]


@router.post("/users", status_code=201)
def create_platform_user(
    body: PlatformUserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_platform_admin),
):
    if len(body.password) < 8:
        raise HTTPException(400, "პაროლი მინიმუმ 8 სიმბოლო")
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(409, f"მომხმარებელი '{body.username}' უკვე არსებობს")

    u = User(
        username=body.username.strip(),
        full_name=body.full_name or body.username,
        email=body.email,
        role=UserRole.superadmin,
        tenant_id=None,
        auth_provider=AuthProvider.local,
        hashed_password=hash_password(body.password),
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return {"id": u.id, "username": u.username, "created": True}


@router.patch("/users/{user_id}")
def update_platform_user(
    user_id: str,
    body: PlatformUserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_platform_admin),
):
    u = db.query(User).filter(
        User.id == user_id,
        User.tenant_id.is_(None),
        User.role == UserRole.superadmin,
    ).first()
    if not u:
        raise HTTPException(404, "Platform user ვერ მოიძებნა")

    # საკუთარი თავის დეაქტივაცია აკrძალulia
    if body.active is False and u.id == current_user.id:
        raise HTTPException(400, "საკუთარი ანგარიშის დეაქტივაცია შეუძლებელია")

    if body.full_name is not None:
        u.full_name = body.full_name
    if body.email is not None:
        u.email = body.email
    if body.password:
        if len(body.password) < 8:
            raise HTTPException(400, "პაროლი მინიმუმ 8 სიმბოლო")
        u.hashed_password = hash_password(body.password)
    if body.active is not None:
        u.active = body.active

    db.commit()
    return {"id": u.id, "updated": True}


@router.delete("/users/{user_id}")
def delete_platform_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_platform_admin),
):
    if user_id == current_user.id:
        raise HTTPException(400, "საკუთარი ანგარიშის წაშლა შეუძლებელია")

    u = db.query(User).filter(
        User.id == user_id,
        User.tenant_id.is_(None),
        User.role == UserRole.superadmin,
    ).first()
    if not u:
        raise HTTPException(404, "Platform user ვერ მოიძებნა")

    # ბოლო platform admin-ს ვერ წავშliT
    count = db.query(User).filter(
        User.tenant_id.is_(None),
        User.role == UserRole.superadmin,
        User.active == True,
    ).count()
    if count <= 1:
        raise HTTPException(400, "ბოლო platform admin-ის წაშლა შეუძლებელია")

    db.delete(u)
    db.commit()
    return {"deleted": True}

@router.get("/tenants/{tenant_id}/detail")
def tenant_detail(
    tenant_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_platform_admin),
):
    from app.models.provider import Provider
    from app.models.service import Service
    from app.models.appointment import Appointment, AppointmentStatus
    from app.models.slot import Slot
    from app.models.client import Client

    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t:
        raise HTTPException(404, "Tenant ვერ მოიძებნა")

    ROLE_KA = {
        "superadmin": "სუპერ-ადმინი", "admin": "ადმინი",
        "receptionist": "რეგისტრატორი", "provider": "პროვაიდერი", "viewer": "მაყურებელი",
    }
    STATUS_KA = {
        "pending": "მოლოდინში", "confirmed": "დადასტურებული", "cancelled": "გაუქმებული",
        "completed": "დასრულებული", "no_show": "არ გამოცხადდა",
    }

    users = db.query(User).filter(User.tenant_id == tenant_id).all()
    services = db.query(Service).filter(Service.tenant_id == tenant_id).all()
    providers = db.query(Provider).filter(Provider.tenant_id == tenant_id).all()

    # ბოლო 10 ჩაწერა
    recent = (
        db.query(Appointment, Slot, Client, Provider)
        .join(Slot, Slot.id == Appointment.slot_id)
        .join(Client, Client.id == Appointment.client_id)
        .join(Provider, Provider.id == Slot.provider_id)
        .filter(Appointment.tenant_id == tenant_id)
        .order_by(Slot.starts_at.desc())
        .limit(10).all()
    )

    return {
        "tenant": {
            "id": t.id, "name": t.name, "slug": t.slug,
            "domains": t.domains or "", "timezone": t.timezone,
            "active": bool(t.active),
            "created_at": t.created_at.strftime("%Y-%m-%d") if t.created_at else "",
        },
        "counts": {
            "users": len(users), "services": len(services),
            "providers": len(providers),
            "clients": db.query(Client).filter(Client.tenant_id == tenant_id).count(),
            "appointments": db.query(Appointment).filter(Appointment.tenant_id == tenant_id).count(),
        },
        "users": [{
            "username": u.username, "full_name": u.full_name or "",
            "role": ROLE_KA.get(str(u.role.value if hasattr(u.role, "value") else u.role), str(u.role)),
            "active": bool(u.active),
        } for u in users],
        "services": [{
            "name": s.name_ka, "code": s.code,
            "duration": s.duration_min, "active": bool(s.active),
        } for s in services],
        "providers": [{
            "name": f"{p.first_name} {p.last_name}",
            "specialty": p.specialty or "", "active": bool(p.active),
        } for p in providers],
        "recent_appointments": [{
            "date": slot.starts_at.strftime("%Y-%m-%d %H:%M") if slot.starts_at else "",
            "client": f"{client.first_name} {client.last_name}",
            "provider": f"{provider.first_name} {provider.last_name}",
            "status": STATUS_KA.get(appt.status.value if appt.status else "", ""),
        } for appt, slot, client, provider in recent],
    }

    # ── Platform Settings (pricing, etc.) ─────────────────────────────────────
@router.get("/settings/{key}")
def get_platform_setting(
    key: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_platform_admin),
):
    from sqlalchemy import text
    row = db.execute(text("SELECT value FROM platform_settings WHERE id = :k"), {"k": key}).fetchone()
    if not row:
        raise HTTPException(404, f"Setting '{key}' not found")
    import json
    return json.loads(row[0])


@router.patch("/settings/{key}")
def update_platform_setting(
    key: str,
    body: dict,
    db: Session = Depends(get_db),
    _: User = Depends(require_platform_admin),
):
    from sqlalchemy import text
    import json
    val = json.dumps(body, ensure_ascii=False)
    db.execute(text(
        "INSERT INTO platform_settings (id, value, updated_at) VALUES (:k, :v, now()) "
        "ON CONFLICT (id) DO UPDATE SET value = :v, updated_at = now()"
    ), {"k": key, "v": val})
    db.commit()
    return {"updated": True}
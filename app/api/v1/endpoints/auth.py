from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
import threading
from app.db.session import get_db
from app.models.user import User, UserRole, AuthProvider
from app.models.tenant import Tenant
from app.core.security import verify_password, hash_password, create_access_token
from app.core.auth import get_current_active_user, require_superadmin, require_tenant_access
from app.core.config import settings

router = APIRouter()

# ── Brute force protection ────────────────────────────────────────────────
_failed_attempts: dict = {}
_lock = threading.Lock()

def check_brute_force(username: str) -> None:
    with _lock:
        now = datetime.utcnow()
        attempts = _failed_attempts.get(username, {"count": 0, "blocked_until": None})
        if attempts["blocked_until"] and now < attempts["blocked_until"]:
            remaining = int((attempts["blocked_until"] - now).total_seconds() / 60) + 1
            raise HTTPException(429, f"მომხმარებელი დაბლოკილია. სცადეთ {remaining} წუთში.")

def record_failed(username: str) -> None:
    with _lock:
        now = datetime.utcnow()
        attempts = _failed_attempts.get(username, {"count": 0, "blocked_until": None})
        attempts["count"] += 1
        if attempts["count"] >= 5:
            attempts["blocked_until"] = now + timedelta(minutes=15)
            attempts["count"] = 0
        _failed_attempts[username] = attempts

def record_success(username: str) -> None:
    with _lock:
        _failed_attempts.pop(username, None)

# ── schemas ───────────────────────────────────────────────────────────────
class TokenOut(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    user_id:      str
    username:     str
    role:         str
    tenant_id:    Optional[str]
    full_name:    Optional[str]

    provider_id:  Optional[str] = None
class UserCreate(BaseModel):
    username:    str
    password:    Optional[str] = None
    email:       Optional[str] = None
    full_name:   Optional[str] = None
    role:        UserRole = UserRole.viewer
    tenant_id:   Optional[str] = None
    provider_id: Optional[str] = None

class UserOut(BaseModel):
    id:            str
    username:      str
    email:         Optional[str]
    full_name:     Optional[str]
    role:          UserRole
    auth_provider: AuthProvider
    active:        bool
    tenant_id:     Optional[str]
    provider_id:   Optional[str]

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    email:       Optional[str] = None
    full_name:   Optional[str] = None
    role:        Optional[UserRole] = None
    active:      Optional[bool] = None
    provider_id: Optional[str] = None
    password:    Optional[str] = None

# ── login ─────────────────────────────────────────────────────────────────
def _check_domain_tenant_match(request: Request, user: User, db: Session) -> None:
    """მომხმარებელს (superadmin გამონაკლისია) login მხოლოდ საკუთარი tenant-ის
    domain-იდან შეუძლია — თორემ booking.innovamedical.ge-ის იუზერი
    booking.innovainvitro.ge-ის login გვერდიდანაც შევა (domain-ს დამცავი
    ფუნქცია არ ექნება)."""
    if not user.tenant_id:
        return  # superadmin / global user
    from app.core.tenant import resolve_slug
    slug = resolve_slug(request, db)
    tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
    if not tenant or tenant.slug != slug:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "მომხმარებელი ან პაროლი არასწორია")


@router.post("/login", response_model=TokenOut)
def login(request: Request, form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    check_brute_force(form.username)

    user = db.query(User).filter(
        User.username == form.username,
        User.auth_provider == AuthProvider.local,
        User.active == True,
    ).first()

    if user and user.hashed_password and verify_password(form.password, user.hashed_password):
        _check_domain_tenant_match(request, user, db)
        record_success(form.username)

    elif settings.LDAP_ENABLED:
        from app.services.ldap_auth import ldap_authenticate, sync_ldap_user
        ldap_user = ldap_authenticate(form.username, form.password)
        if not ldap_user:
            record_failed(form.username)
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "მომხმარებელი ან პაროლი არასწორია")
        tenant = db.query(Tenant).filter(Tenant.slug == settings.TENANT_SLUG).first()
        user = sync_ldap_user(ldap_user, db, tenant.id if tenant else None)

    else:
        record_failed(form.username)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "მომხმარებელი ან პაროლი არასწორია")

    token = create_access_token({"sub": user.id, "role": user.role, "tenant_id": user.tenant_id})
    return TokenOut(
        access_token=token,
        user_id=user.id,
        username=user.username,
        role=user.role,
        tenant_id=user.tenant_id,
        full_name=user.full_name,
        provider_id=user.provider_id,
    )

# ── me ────────────────────────────────────────────────────────────────────
@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_active_user)):
    return current_user

# ── user management ───────────────────────────────────────────────────────
@router.get("/users", response_model=list[UserOut])
def list_users(
    tenant_id: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    # superadmin-ს რომელსაც tenant_id=None აქვს — შეუძლია tenant_id param-ით ფილტრი,
    # ან ყველას ნახვა. tenant-ზე მიბმული ხედავს მხოლოდ თავისს.
    if current_user.tenant_id:
        return db.query(User).filter(User.tenant_id == current_user.tenant_id).all()
    if tenant_id:
        return db.query(User).filter(User.tenant_id == tenant_id).all()
    return db.query(User).all()

@router.post("/users", response_model=UserOut, status_code=201)
def create_user(
    body: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if current_user.role not in (UserRole.admin, UserRole.superadmin):
        raise HTTPException(403, "მხოლოდ admin-ს შეუძლია მომხმარებლის შექმნა")
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(409, "მომხმარებელი უკვე არსებობს")

    # privilege escalation დაცვა — superadmin მხოლოდ არსებულ superadmin-ს შეუძლია შექმნას
    if body.role == UserRole.superadmin and current_user.role != UserRole.superadmin:
        raise HTTPException(403, "მხოლოდ superadmin-ს შეუძლია superadmin-ის შექმნა")

    # tenant scoping — tenant admin-ს არ შეუძლია სხვა tenant-ზე ან გლობალურ (tenant_id=None)
    # მომხმარებლის შექმნა; superadmin-მა შეიძლება ცალსახად მიუთითოს tenant_id ან None
    if current_user.role == UserRole.superadmin:
        tenant_id = body.tenant_id
    else:
        tenant_id = current_user.tenant_id

    # password policy
    if body.password and len(body.password) < 8:
        raise HTTPException(400, "პაროლი მინიმუმ 8 სიმბოლო უნდა იყოს")

    user = User(
        username=body.username,
        email=body.email,
        full_name=body.full_name,
        role=body.role,
        tenant_id=tenant_id,
        provider_id=body.provider_id,
        auth_provider=AuthProvider.local,
        hashed_password=hash_password(body.password) if body.password else None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.patch("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: str,
    body: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if current_user.role not in (UserRole.admin, UserRole.superadmin):
        raise HTTPException(403, "წვდომა აკრძალულია")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "მომხმარებელი ვერ მოიძებნა")

    # tenant admin-ს შეუძლია მხოლოდ საკუთარი tenant-ის მომხმარებლების რედაქტირება
    require_tenant_access(user.tenant_id, current_user)

    # privilege escalation დაცვა — superadmin role-ის მინიჭება მხოლოდ superadmin-ს შეუძლია
    if body.role == UserRole.superadmin and current_user.role != UserRole.superadmin:
        raise HTTPException(403, "მხოლოდ superadmin-ს შეუძლია superadmin role-ის მინიჭება")

    for k, v in body.model_dump(exclude_none=True, exclude={"password"}).items():
        setattr(user, k, v)

    if body.password:
        if len(body.password) < 8:
            raise HTTPException(400, "პაროლი მინიმუმ 8 სიმბოლო უნდა იყოს")
        user.hashed_password = hash_password(body.password)
        user.auth_provider = AuthProvider.local

    db.commit()
    db.refresh(user)
    return user

@router.post("/users/seed-superadmin", status_code=201)
def seed_superadmin(setup_secret: str = Query(...), db: Session = Depends(get_db)):
    """პირველი გაშვებისას superadmin-ის შექმნა — მოითხოვს SETUP_SECRET env ცვლადს.
    თუ SETUP_SECRET დაყენებული არაა, endpoint მთლიანად გამორთულია."""
    if not settings.SETUP_SECRET or setup_secret != settings.SETUP_SECRET:
        raise HTTPException(403, "წვდომა აკრძალულია")
    existing = db.query(User).filter(User.role == UserRole.superadmin).first()
    if existing:
        raise HTTPException(409, "Superadmin უკვე არსებობს")
    import secrets
    generated_password = secrets.token_urlsafe(16)
    user = User(
        username="superadmin",
        hashed_password=hash_password(generated_password),
        role=UserRole.superadmin,
        auth_provider=AuthProvider.local,
        full_name="Super Admin",
        active=True,
    )
    db.add(user)
    db.commit()
    return {"username": "superadmin", "password": generated_password, "message": "პაროლი შეინახე და დაუყოვნებლივ შეცვალე!"}

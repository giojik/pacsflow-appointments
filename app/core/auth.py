"""
FastAPI dependencies — current user + role checks
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError
from app.db.session import get_db
from app.models.user import User, UserRole
from app.core.security import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="ავტორიზაცია საჭიროა",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        user_id: str = payload.get("sub")
        if not user_id:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id, User.active == True).first()
    if not user:
        raise credentials_exception
    return user

def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.active:
        raise HTTPException(400, "მომხმარებელი დეაქტივირებულია")
    return current_user

# ── role-based dependencies ───────────────────────────────────────────────
def require_roles(*roles: UserRole):
    """Usage: Depends(require_roles(UserRole.admin, UserRole.superadmin))"""
    def checker(current_user: User = Depends(get_current_active_user)) -> User:
        if current_user.role not in roles and current_user.role != UserRole.superadmin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"წვდომა აკრძალულია. საჭირო role: {[r.value for r in roles]}"
            )
        return current_user
    return checker

# ── shortcuts ─────────────────────────────────────────────────────────────
require_admin        = require_roles(UserRole.admin, UserRole.superadmin)
require_receptionist = require_roles(UserRole.admin, UserRole.superadmin, UserRole.receptionist)
require_provider     = require_roles(UserRole.admin, UserRole.superadmin, UserRole.receptionist, UserRole.provider)
require_superadmin   = require_roles(UserRole.superadmin)

def require_tenant_access(tenant_id: str, current_user: User) -> None:
    """
    superadmin-ს (tenant_id=None) წვდომა აქვს ყველა tenant-ზე.
    ყველა დანარჩენს — მხოლოდ საკუთარ tenant_id-ზე.
    """
    if current_user.role == UserRole.superadmin:
        return
    if str(current_user.tenant_id) != str(tenant_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "წვდომა აკრძალულია — სხვა tenant")
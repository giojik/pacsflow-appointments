"""PacsFlow Chat-ისთვის მოკლევადიანი (5წთ) JWT ტოკენის გამცემი endpoint.
ჩატის სერვისი ამ ტოკენს ხედავს, თავად ვერასდროს გასცემს login-ს."""
import time
from fastapi import APIRouter, Depends
from jose import jwt
from app.core.config import settings
from app.core.auth import get_current_active_user

router = APIRouter()

@router.get("/chat-token")
def issue_chat_token(current_user = Depends(get_current_active_user)):
    role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    payload = {
        "sub": str(current_user.id),
        "tenant_id": str(current_user.tenant_id) if current_user.tenant_id else "",
        "role": role,
        "name": current_user.full_name or current_user.username,
        "product": "appointments",
        "exp": int(time.time()) + 300,
    }
    token = jwt.encode(payload, settings.CHAT_JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return {"token": token, "expires_in": 300}

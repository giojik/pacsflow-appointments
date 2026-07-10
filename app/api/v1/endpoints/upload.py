import os
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from app.core.auth import get_current_active_user
from app.models.user import User
from fastapi import Depends

router = APIRouter()

UPLOAD_DIR = "/app/static/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
MAX_SIZE = 5 * 1024 * 1024  # 5MB

@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user)
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, "მხოლოდ JPG, PNG, WEBP, GIF ფორმატი")

    contents = await file.read()
    if len(contents) > MAX_SIZE:
        raise HTTPException(400, "ფაილი არ უნდა აღემატებოდეს 5MB-ს")

    ext = file.filename.split(".")[-1].lower()
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(contents)

    return {"url": f"/static/uploads/{filename}", "filename": filename}

@router.get("/static/uploads/{filename}")
async def get_image(filename: str):
    # path traversal დაცვა — მხოლოდ სუფთა ფაილის სახელი (uuid.ext), დირექტორიის გადასვლის გარეშე
    safe_name = os.path.basename(filename)
    if safe_name != filename or safe_name in ("", ".", ".."):
        raise HTTPException(400, "არასწორი ფაილის სახელი")
    filepath = os.path.join(UPLOAD_DIR, safe_name)
    if not os.path.exists(filepath) or not os.path.isfile(filepath):
        raise HTTPException(404, "ფაილი ვერ მოიძებნა")
    real_path = os.path.realpath(filepath)
    if not real_path.startswith(os.path.realpath(UPLOAD_DIR) + os.sep):
        raise HTTPException(404, "ფაილი ვერ მოიძებნა")
    return FileResponse(real_path)
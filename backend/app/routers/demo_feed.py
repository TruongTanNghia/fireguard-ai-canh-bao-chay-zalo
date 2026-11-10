import os
import shutil
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from app.core.config import DEMO_DIR
from app.models import models
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/demo-feed", tags=["Demo Feed"])


@router.get("/videos", response_model=List[str])
def list_demo_videos(current_user: models.SystemUser = Depends(get_current_user)):
    """Danh sách các file video demo trong thư mục."""
    if not DEMO_DIR.exists():
        return []
    videos = [f.name for f in DEMO_DIR.glob("*.mp4")]
    return sorted(videos)


@router.post("/upload")
async def upload_demo_video(
    file: UploadFile = File(...),
    current_user: models.SystemUser = Depends(get_current_user),
):
    """Tải lên video MP4 mới để kiểm thử nhận diện."""
    if not file.filename.lower().endswith((".mp4", ".avi", ".mov", ".mkv")):
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ file video (.mp4, .avi, .mov, .mkv)")

    safe_filename = os.path.basename(file.filename)
    target_path = DEMO_DIR / safe_filename

    with open(target_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {
        "filename": safe_filename,
        "rtsp_url": f"demo:{safe_filename}",
        "message": "Tải video lên thành công",
    }

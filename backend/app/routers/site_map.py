import os
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.core.config import MAP_DIR
from app.db.database import get_db
from app.models import models
from app.schemas import schemas
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/site-map", tags=["Site Map"])


@router.get("", response_model=schemas.SiteMapResponse)
def get_default_site_map(
    db: Session = Depends(get_db),
    current_user: models.SystemUser = Depends(get_current_user),
):
    """Lấy sơ đồ mặt bằng mặc định cùng vị trí ghim các camera."""
    sitemap = db.query(models.SiteMap).filter(models.SiteMap.is_default == True).first()
    if not sitemap:
        sitemap = db.query(models.SiteMap).first()

    if not sitemap:
        raise HTTPException(status_code=404, detail="Chưa có sơ đồ mặt bằng nào")

    return sitemap


@router.get("/all", response_model=List[schemas.SiteMapResponse])
def get_all_site_maps(
    db: Session = Depends(get_db),
    current_user: models.SystemUser = Depends(get_current_user),
):
    return db.query(models.SiteMap).order_by(models.SiteMap.id.asc()).all()


@router.post("/upload")
async def upload_site_map(
    name: str = Form(...),
    description: Optional[str] = Form(None),
    is_default: bool = Form(False),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.SystemUser = Depends(get_current_user),
):
    """Tải lên file ảnh sơ đồ mặt bằng mới (PNG, JPG, SVG)."""
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in (".svg", ".png", ".jpg", ".jpeg"):
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ file ảnh .svg, .png, .jpg, .jpeg")

    safe_filename = f"map_{int(os.times().elapsed)}_{os.path.basename(file.filename)}"
    target_path = MAP_DIR / safe_filename

    with open(target_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    rel_path = f"/data/site_maps/{safe_filename}"

    if is_default:
        db.query(models.SiteMap).update({"is_default": False})

    sitemap = models.SiteMap(
        name=name,
        description=description,
        image_path=rel_path,
        is_default=is_default,
    )
    db.add(sitemap)
    db.commit()
    db.refresh(sitemap)

    return sitemap


@router.post("/pin")
def update_camera_pin(
    payload: schemas.CameraPinUpdate,
    db: Session = Depends(get_db),
    current_user: models.SystemUser = Depends(get_current_user),
):
    """Cập nhật tọa độ ghim (X, Y) của camera trên sơ đồ mặt bằng."""
    cam = db.query(models.FireCamera).filter(models.FireCamera.id == payload.camera_id).first()
    if not cam:
        raise HTTPException(status_code=404, detail="Không tìm thấy camera")

    cam.map_pin_x = payload.map_pin_x
    cam.map_pin_y = payload.map_pin_y
    if payload.sitemap_id:
        cam.sitemap_id = payload.sitemap_id

    db.commit()
    return {"message": "Cập nhật vị trí ghim thành công"}


@router.delete("/pin/{camera_id}")
def delete_camera_pin(
    camera_id: int,
    db: Session = Depends(get_db),
    current_user: models.SystemUser = Depends(get_current_user),
):
    """Gỡ vị trí ghim của camera khỏi sơ đồ mặt bằng."""
    cam = db.query(models.FireCamera).filter(models.FireCamera.id == camera_id).first()
    if not cam:
        raise HTTPException(status_code=404, detail="Không tìm thấy camera")
    cam.map_pin_x = None
    cam.map_pin_y = None
    db.commit()
    return {"message": "Đã gỡ ghim camera khỏi bản đồ"}

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import models
from app.schemas import schemas
from app.routers.auth import get_current_user
from app.services.fire.engine import fire_engine

router = APIRouter(prefix="/api/fire-cameras", tags=["Fire Cameras"])


@router.get("", response_model=List[schemas.FireCameraResponse])
def get_cameras(
    db: Session = Depends(get_db),
    current_user: models.SystemUser = Depends(get_current_user),
):
    """Lấy danh sách camera báo cháy kèm trạng thái chạy AI thực tế."""
    cameras = db.query(models.FireCamera).order_by(models.FireCamera.id.asc()).all()
    for cam in cameras:
        cam.is_running = fire_engine.is_camera_running(cam.id)
    return cameras


@router.post("", response_model=schemas.FireCameraResponse)
def create_camera(
    payload: schemas.FireCameraCreate,
    db: Session = Depends(get_db),
    current_user: models.SystemUser = Depends(get_current_user),
):
    """Thêm camera mới vào danh mục cấu hình. TUYỆT ĐỐI không tự ý chạy ngầm."""
    cam = models.FireCamera(
        name=payload.name,
        location=payload.location,
        rtsp_url=payload.rtsp_url,
        camera_type=payload.camera_type,
        is_active=payload.is_active,
        confidence_threshold=payload.confidence_threshold,
        sitemap_id=payload.sitemap_id,
        map_pin_x=payload.map_pin_x,
        map_pin_y=payload.map_pin_y,
    )
    db.add(cam)
    db.commit()
    db.refresh(cam)

    # Chỉ bật luồng camera NẾU hệ thống đang ở chế độ Live giám sát
    if cam.is_active and fire_engine.current_mode == "live":
        fire_engine.start_camera(cam.id, cam.name, cam.rtsp_url, cam.camera_type)

    # Audit log
    audit = models.AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="CREATE_CAMERA",
        target_type="FIRE_CAMERA",
        target_id=str(cam.id),
        details=f"Tạo camera mới: {cam.name} ({cam.rtsp_url})",
    )
    db.add(audit)
    db.commit()

    cam.is_running = fire_engine.is_camera_running(cam.id)
    return cam


@router.put("/{camera_id}", response_model=schemas.FireCameraResponse)
def update_camera(
    camera_id: int,
    payload: schemas.FireCameraUpdate,
    db: Session = Depends(get_db),
    current_user: models.SystemUser = Depends(get_current_user),
):
    """
    Cập nhật camera: Chỉ lưu CSDL.
    CHỈ khởi động lại worker NẾU camera đó ĐANG ĐƯỢC CHẠY trên màn hình giám sát.
    Nếu hệ thống đang Standby, KHÔNG BAO GIỜ tự tiện chạy ngầm.
    """
    cam = db.query(models.FireCamera).filter(models.FireCamera.id == camera_id).first()
    if not cam:
        raise HTTPException(status_code=404, detail="Không tìm thấy camera")

    was_running = fire_engine.is_camera_running(cam.id)

    update_data = payload.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(cam, k, v)

    db.commit()
    db.refresh(cam)

    # Đồng bộ luồng AI CHỈ KHI camera đó ĐANG ĐƯỢC CHẠY
    if was_running:
        if not cam.is_active or cam.camera_type == "demo":
            fire_engine.stop_camera(cam.id)
        else:
            fire_engine.restart_camera(cam.id, cam.name, cam.rtsp_url, cam.camera_type)

    # Audit log
    audit = models.AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="UPDATE_CAMERA",
        target_type="FIRE_CAMERA",
        target_id=str(cam.id),
        details=f"Cập nhật camera #{cam.id}: {cam.name}",
    )
    db.add(audit)
    db.commit()

    cam.is_running = fire_engine.is_camera_running(cam.id)
    return cam


@router.delete("/{camera_id}")
def delete_camera(
    camera_id: int,
    db: Session = Depends(get_db),
    current_user: models.SystemUser = Depends(get_current_user),
):
    cam = db.query(models.FireCamera).filter(models.FireCamera.id == camera_id).first()
    if not cam:
        raise HTTPException(status_code=404, detail="Không tìm thấy camera")

    if fire_engine.is_camera_running(cam.id):
        fire_engine.stop_camera(cam.id)

    db.delete(cam)

    # Audit log
    audit = models.AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="DELETE_CAMERA",
        target_type="FIRE_CAMERA",
        target_id=str(camera_id),
        details=f"Xóa camera #{camera_id}: {cam.name}",
    )
    db.add(audit)
    db.commit()

    return {"message": "Đã xóa camera thành công"}


@router.post("/{camera_id}/toggle")
def toggle_camera(
    camera_id: int,
    db: Session = Depends(get_db),
    current_user: models.SystemUser = Depends(get_current_user),
):
    """Bật / Tắt trạng thái kích hoạt trong danh mục camera."""
    cam = db.query(models.FireCamera).filter(models.FireCamera.id == camera_id).first()
    if not cam:
        raise HTTPException(status_code=404, detail="Không tìm thấy camera")

    was_running = fire_engine.is_camera_running(cam.id)
    cam.is_active = not cam.is_active
    db.commit()

    if was_running and not cam.is_active:
        fire_engine.stop_camera(cam.id)
    elif not was_running and cam.is_active and fire_engine.current_mode == "live":
        fire_engine.start_camera(cam.id, cam.name, cam.rtsp_url, cam.camera_type)

    return {
        "is_active": cam.is_active,
        "is_running": fire_engine.is_camera_running(cam.id),
    }

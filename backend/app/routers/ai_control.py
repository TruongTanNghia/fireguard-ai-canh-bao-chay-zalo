import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models import models
from app.routers.auth import get_current_user
from app.services.fire.engine import fire_engine

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ai", tags=["AI Control & Demo Toolkit"])


class AIActionRequest(BaseModel):
    camera_id: Optional[int] = None


class AISimulateRequest(BaseModel):
    camera_id: Optional[int] = None
    alert_type: str = "fire"  # 'fire' hoặc 'smoke'


class UpdateCameraSourceRequest(BaseModel):
    source: str
    camera_type: Optional[str] = "demo"


@router.get("/status")
def get_ai_status(current_user: models.SystemUser = Depends(get_current_user)):
    """Trả về trạng thái hoạt động thực tế của AI Engine và các Camera."""
    return fire_engine.get_status()


class DemoActionRequest(BaseModel):
    clip_name: Optional[str] = "fire1.mp4"


@router.post("/demo/start")
def start_demo_stream(
    payload: Optional[DemoActionRequest] = None,
    current_user: models.SystemUser = Depends(get_current_user),
):
    """Kích hoạt riêng luồng video Demo (tách rời 100% khỏi Camera thật)."""
    clip = payload.clip_name if (payload and payload.clip_name) else "fire1.mp4"
    fire_engine.start_demo(clip_name=clip)
    return {
        "status": "running",
        "mode": "demo",
        "clip_name": clip,
        "message": f"Đã kích hoạt video demo: {clip}",
        "engine": fire_engine.get_status(),
    }


@router.post("/demo/stop")
def stop_demo_stream(
    current_user: models.SystemUser = Depends(get_current_user),
):
    """Dừng riêng luồng video Demo."""
    fire_engine.stop_demo()
    return {
        "status": "standby",
        "mode": "standby",
        "message": "Đã dừng luồng video demo",
        "engine": fire_engine.get_status(),
    }


@router.post("/live/start")
def start_live_monitoring(
    current_user: models.SystemUser = Depends(get_current_user),
):
    """Kích hoạt giám sát các camera thực tế (RTSP / Webcam)."""
    fire_engine.start_all_live()
    return {
        "status": "running",
        "mode": "live",
        "message": "Đã kích hoạt toàn bộ camera trực tiếp",
        "engine": fire_engine.get_status(),
    }


@router.post("/live/stop")
def stop_live_monitoring(
    current_user: models.SystemUser = Depends(get_current_user),
):
    """Dừng toàn bộ camera giám sát trực tiếp."""
    fire_engine.stop_all_live()
    return {
        "status": "standby",
        "mode": "standby",
        "message": "Đã tạm dừng toàn bộ camera trực tiếp",
        "engine": fire_engine.get_status(),
    }


@router.post("/start")
def start_ai_monitoring(
    payload: Optional[AIActionRequest] = None,
    db: Session = Depends(get_db),
    current_user: models.SystemUser = Depends(get_current_user),
):
    """Kích hoạt giám sát AI (Toàn bộ hoặc từng camera)."""
    if payload and payload.camera_id:
        cam = db.query(models.FireCamera).filter(models.FireCamera.id == payload.camera_id).first()
        if not cam:
            raise HTTPException(status_code=404, detail="Không tìm thấy camera")
        fire_engine.start_camera(cam.id, cam.name, cam.rtsp_url, cam.camera_type)
        return {
            "status": "running",
            "message": f"Đã kích hoạt AI cho '{cam.name}'",
            "camera_id": cam.id,
            "engine": fire_engine.get_status(),
        }

    # Bật toàn bộ camera
    fire_engine.start_all_live()
    return {
        "status": "running",
        "message": "Đã kích hoạt toàn bộ luồng camera giám sát AI",
        "engine": fire_engine.get_status(),
    }


@router.post("/stop")
def stop_ai_monitoring(
    payload: Optional[AIActionRequest] = None,
    current_user: models.SystemUser = Depends(get_current_user),
):
    """Tạm dừng giám sát AI để giải phóng tài nguyên CPU."""
    if payload and payload.camera_id:
        fire_engine.stop_camera(payload.camera_id)
        return {
            "status": "stopped",
            "message": f"Đã tạm dừng camera #{payload.camera_id}",
            "engine": fire_engine.get_status(),
        }

    # Dừng toàn bộ
    fire_engine.stop_all()
    return {
        "status": "standby",
        "message": "Đã tạm dừng toàn bộ luồng giám sát AI",
        "engine": fire_engine.get_status(),
    }


@router.post("/simulate")
def simulate_fire_alert(
    payload: Optional[AISimulateRequest] = None,
    current_user: models.SystemUser = Depends(get_current_user),
):
    """Bắn sự kiện báo cháy giả lập để test còi hú, popup và Zalo."""
    cam_id = payload.camera_id if payload else None
    alert_type = payload.alert_type if payload else "fire"

    alert_data = fire_engine.simulate_fire_event(camera_id=cam_id, alert_type=alert_type)
    return {
        "message": "Đã kích hoạt báo cháy giả lập thành công!",
        "alert": alert_data,
    }


@router.post("/clear-demo")
def clear_demo_alerts(
    db: Session = Depends(get_db),
    current_user: models.SystemUser = Depends(get_current_user),
):
    """Xóa toàn bộ các bản ghi cảnh báo thử nghiệm rác trong CSDL và hàng đợi Outbox."""
    try:
        deleted_outbox = db.query(models.OutboxEvent).delete()
        deleted_alerts = db.query(models.FireAlert).delete()
        db.commit()
        return {
            "message": "Đã xóa sạch dữ liệu thử nghiệm demo!",
            "deleted_alerts": deleted_alerts,
            "deleted_outbox": deleted_outbox,
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi xóa dữ liệu: {e}")


@router.put("/cameras/{camera_id}/source")
def update_camera_source(
    camera_id: int,
    payload: UpdateCameraSourceRequest,
    db: Session = Depends(get_db),
    current_user: models.SystemUser = Depends(get_current_user),
):
    """Thay đổi nhanh nguồn video (Clip demo / RTSP) cho camera."""
    cam = db.query(models.FireCamera).filter(models.FireCamera.id == camera_id).first()
    if not cam:
        raise HTTPException(status_code=404, detail="Không tìm thấy camera")

    cam.rtsp_url = payload.source
    if payload.camera_type:
        cam.camera_type = payload.camera_type
    db.commit()
    db.refresh(cam)

    # Nếu camera đang chạy thì restart với nguồn mới
    if fire_engine.is_camera_running(cam.id):
        fire_engine.restart_camera(cam.id, cam.name, cam.rtsp_url, cam.camera_type)

    return {
        "message": f"Đã đổi nguồn video cho '{cam.name}'",
        "camera_id": cam.id,
        "rtsp_url": cam.rtsp_url,
        "camera_type": cam.camera_type,
    }

import io
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import desc
import pandas as pd

from app.db.database import get_db
from app.models import models
from app.schemas import schemas
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/fire-alerts", tags=["Fire Alerts"])


@router.get("", response_model=dict)
def get_fire_alerts(
    status: Optional[str] = None,
    alert_type: Optional[str] = None,
    camera_id: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    page: int = 1,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: models.SystemUser = Depends(get_current_user),
):
    query = db.query(models.FireAlert).order_by(desc(models.FireAlert.created_at))

    if status and status != "all":
        query = query.filter(models.FireAlert.status == status)

    if alert_type and alert_type != "all":
        query = query.filter(models.FireAlert.alert_type == alert_type)

    if camera_id:
        query = query.filter(models.FireAlert.camera_id == camera_id)

    if date_from:
        try:
            d_from = datetime.strptime(date_from, "%Y-%m-%d")
            query = query.filter(models.FireAlert.created_at >= d_from)
        except:
            pass

    if date_to:
        try:
            d_to = datetime.strptime(date_to, "%Y-%m-%d") + timedelta(days=1)
            query = query.filter(models.FireAlert.created_at < d_to)
        except:
            pass

    total = query.count()
    alerts = query.offset((page - 1) * limit).limit(limit).all()

    return {
        "data": [schemas.FireAlertResponse.model_validate(a) for a in alerts],
        "total": total,
        "page": page,
        "limit": limit,
    }


@router.get("/stats", response_model=schemas.FireAlertStatsResponse)
def get_fire_alert_stats(
    db: Session = Depends(get_db),
    current_user: models.SystemUser = Depends(get_current_user),
):
    # Sự cố được lưu theo giờ máy chủ (giờ Việt Nam), nên mốc ngày cũng phải tính theo giờ máy chủ
    now = datetime.now()
    start_today = datetime(now.year, now.month, now.day)
    start_week = start_today - timedelta(days=now.weekday())

    total = db.query(models.FireAlert).count()
    today = db.query(models.FireAlert).filter(models.FireAlert.created_at >= start_today).count()
    week = db.query(models.FireAlert).filter(models.FireAlert.created_at >= start_week).count()
    pending = db.query(models.FireAlert).filter(models.FireAlert.status == "pending").count()
    verified = db.query(models.FireAlert).filter(models.FireAlert.status == "verified").count()
    dismissed = db.query(models.FireAlert).filter(models.FireAlert.status == "dismissed").count()

    return {
        "total_alerts": total,
        "alerts_today": today,
        "alerts_week": week,
        "pending_alerts": pending,
        "verified_alerts": verified,
        "dismissed_alerts": dismissed,
    }


@router.get("/{alert_id}", response_model=schemas.FireAlertResponse)
def get_fire_alert_detail(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: models.SystemUser = Depends(get_current_user),
):
    alert = db.query(models.FireAlert).filter(models.FireAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi sự cố")
    return alert


@router.put("/{alert_id}", response_model=schemas.FireAlertResponse)
def update_fire_alert(
    alert_id: int,
    payload: schemas.FireAlertUpdate,
    db: Session = Depends(get_db),
    current_user: models.SystemUser = Depends(get_current_user),
):
    alert = db.query(models.FireAlert).filter(models.FireAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi sự cố")

    alert.status = payload.status
    if payload.admin_notes is not None:
        alert.admin_notes = payload.admin_notes

    alert.resolved_at = datetime.now()
    alert.resolved_by = current_user.full_name or current_user.username

    # Audit log
    audit = models.AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="UPDATE_ALERT",
        target_type="FIRE_ALERT",
        target_id=str(alert_id),
        details=f"Xác nhận sự cố #{alert_id} thành '{payload.status}'. Ghi chú: {payload.admin_notes}",
    )
    db.add(audit)
    db.commit()
    db.refresh(alert)
    return alert


@router.delete("/{alert_id}")
def delete_fire_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: models.SystemUser = Depends(get_current_user),
):
    alert = db.query(models.FireAlert).filter(models.FireAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi sự cố")

    db.delete(alert)
    # Audit log
    audit = models.AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="DELETE_ALERT",
        target_type="FIRE_ALERT",
        target_id=str(alert_id),
        details=f"Xóa bản ghi sự cố #{alert_id}",
    )
    db.add(audit)
    db.commit()
    return {"message": "Đã xóa sự cố thành công"}


@router.get("/export/excel")
def export_fire_alerts_excel(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.SystemUser = Depends(get_current_user),
):
    query = db.query(models.FireAlert).order_by(desc(models.FireAlert.created_at))
    if date_from:
        try:
            d_from = datetime.strptime(date_from, "%Y-%m-%d")
            query = query.filter(models.FireAlert.created_at >= d_from)
        except: pass
    if date_to:
        try:
            d_to = datetime.strptime(date_to, "%Y-%m-%d") + timedelta(days=1)
            query = query.filter(models.FireAlert.created_at < d_to)
        except: pass

    alerts = query.all()
    rows = []
    for a in alerts:
        status_label = "Chờ xử lý"
        if a.status == "verified": status_label = "Đã xác nhận sự cố"
        elif a.status == "dismissed": status_label = "Báo động giả / Đã hủy"

        type_label = "Ngọn lửa" if a.alert_type == "fire" else ("Khói" if a.alert_type == "smoke" else "Cháy & Khói")

        rows.append({
            "Mã sự cố": a.id,
            "Thời gian": a.created_at.strftime("%H:%M:%S %d/%m/%Y"),
            "Camera / Vị trí": a.camera_name or f"Camera #{a.camera_id}",
            "Loại cảnh báo": type_label,
            "Độ tin cậy (%)": f"{a.confidence * 100:.1f}%",
            "Trạng thái": status_label,
            "Số tin Zalo đã gửi": a.zalo_sent_count,
            "Người xử lý": a.resolved_by or "–",
            "Ghi chú trực ban": a.admin_notes or "–",
        })

    df = pd.DataFrame(rows)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Lich_Su_Bao_Chay")

    output.seek(0)
    filename = f"Bao_Cao_Bao_Chay_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    headers = {
        "Content-Disposition": f"attachment; filename={filename}",
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }
    return Response(content=output.getvalue(), headers=headers)

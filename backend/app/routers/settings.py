from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import models
from app.schemas import schemas
from app.routers.auth import get_current_user, require_admin

router = APIRouter(prefix="/api/settings", tags=["Settings"])


@router.get("", response_model=schemas.SystemConfigResponse)
def get_system_settings(
    db: Session = Depends(get_db),
    current_user: models.SystemUser = Depends(get_current_user),
):
    cfg = db.query(models.SystemConfig).first()
    if not cfg:
        cfg = models.SystemConfig()
        db.add(cfg)
        db.commit()
        db.refresh(cfg)

    resp = schemas.SystemConfigResponse.model_validate(cfg)
    resp.imgbb_api_key_configured = bool(cfg.imgbb_api_key)
    return resp


@router.put("", response_model=schemas.SystemConfigResponse)
def update_system_settings(
    payload: schemas.SystemConfigUpdate,
    db: Session = Depends(get_db),
    current_user: models.SystemUser = Depends(require_admin),
):
    cfg = db.query(models.SystemConfig).first()
    if not cfg:
        cfg = models.SystemConfig()
        db.add(cfg)

    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        if k == "imgbb_api_key" and (v is None or v == ""):
            continue
        setattr(cfg, k, v)

    db.commit()
    db.refresh(cfg)

    # Audit log
    audit = models.AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="UPDATE_CONFIG",
        target_type="SYSTEM_CONFIG",
        target_id=str(cfg.id),
        details="Cập nhật cấu hình hệ thống (AI / Zalo / Còi báo động)",
    )
    db.add(audit)
    db.commit()

    resp = schemas.SystemConfigResponse.model_validate(cfg)
    resp.imgbb_api_key_configured = bool(cfg.imgbb_api_key)
    return resp

from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.db.database import get_db
from app.models import models
from app.schemas import schemas
from app.routers.auth import require_admin

router = APIRouter(prefix="/api/audit-logs", tags=["Audit Logs"])


@router.get("", response_model=dict)
def list_audit_logs(
    page: int = 1,
    limit: int = 20,
    action: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.SystemUser = Depends(require_admin),
):
    query = db.query(models.AuditLog).order_by(desc(models.AuditLog.created_at))
    if action:
        query = query.filter(models.AuditLog.action.ilike(f"%{action}%"))

    total = query.count()
    logs = query.offset((page - 1) * limit).limit(limit).all()

    return {
        "data": [schemas.AuditLogResponse.model_validate(l) for l in logs],
        "total": total,
        "page": page,
        "limit": limit,
    }

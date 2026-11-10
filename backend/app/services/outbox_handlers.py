import logging
from sqlalchemy.orm import Session
from app.models import models

logger = logging.getLogger(__name__)


def enqueue_fire_alert(
    db: Session,
    alert_id: int,
    camera_name: str,
    alert_type: str,
    confidence: float,
    snapshot_path: str,
) -> models.OutboxEvent:
    """Tạo sự kiện Outbox để gửi loạt tin nhắn Zalo cảnh báo."""
    payload = {
        "alert_id": alert_id,
        "camera_name": camera_name,
        "alert_type": alert_type,
        "confidence": round(confidence, 3),
        "snapshot_path": snapshot_path,
    }

    event = models.OutboxEvent(
        event_type="fire_zalo_alert",
        payload=payload,
        status="pending",
        retry_count=0,
    )
    db.add(event)
    logger.info(f"[OutboxHandler] Đã tạo Outbox event cho Cảnh báo cháy #{alert_id}")
    return event

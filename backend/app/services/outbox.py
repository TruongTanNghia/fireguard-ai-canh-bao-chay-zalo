import time
import logging
import threading
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models import models
from app.utils import zalo_utils

logger = logging.getLogger(__name__)

_worker_instance = None
_worker_lock = threading.Lock()


class OutboxWorker(threading.Thread):
    def __init__(self):
        super().__init__(daemon=True, name="OutboxWorkerThread")
        self._stop_event = threading.Event()
        self._wake_event = threading.Event()

    def stop(self):
        self._stop_event.set()
        self._wake_event.set()

    def trigger(self):
        self._wake_event.set()

    def run(self):
        logger.info("[OutboxWorker] Đã khởi động luồng gửi tin Zalo chạy nền.")
        while not self._stop_event.is_set():
            try:
                processed = self._process_pending_events()
                if not processed:
                    # Chờ 3 giây hoặc khi có tín hiệu trigger
                    self._wake_event.wait(timeout=3.0)
                    self._wake_event.clear()
            except Exception as e:
                logger.error(f"[OutboxWorker] Lỗi xử lý Outbox: {e}", exc_info=True)
                time.sleep(3.0)

    def _process_pending_events(self) -> bool:
        db: Session = SessionLocal()
        try:
            now = datetime.now()
            event = (
                db.query(models.OutboxEvent)
                .filter(
                    models.OutboxEvent.status == "pending",
                    models.OutboxEvent.next_retry_at <= now,
                )
                .order_by(models.OutboxEvent.id.asc())
                .first()
            )

            if not event:
                return False

            event.status = "processing"
            db.commit()

            if event.event_type == "fire_zalo_alert":
                self._handle_fire_zalo_event(db, event)
            else:
                event.status = "delivered"
                db.commit()

            return True
        finally:
            db.close()

    def _handle_fire_zalo_event(self, db: Session, event: models.OutboxEvent):
        payload = event.payload or {}
        alert_id = payload.get("alert_id")
        camera_name = payload.get("camera_name", "Camera giám sát")
        alert_type = payload.get("alert_type", "fire")
        confidence = payload.get("confidence", 0.0)
        snapshot_path = payload.get("snapshot_path", "")

        active_bots = zalo_utils.get_active_bots()
        if not active_bots:
            logger.info("[OutboxWorker] Không có Bot Zalo nào đang kích hoạt -> Đóng event.")
            event.status = "delivered"
            db.commit()
            return

        # 1. Đọc cấu hình hệ thống
        cfg = db.query(models.SystemConfig).first()
        burst_count = cfg.zalo_burst_count if cfg else 3
        burst_interval = cfg.zalo_burst_interval if cfg else 5

        # 2. Upload ảnh ImgBB 1 lần duy nhất dùng chung cho các bot và các đợt
        image_url = None
        if snapshot_path:
            image_url = zalo_utils.upload_image_to_imgbb(snapshot_path, cfg.imgbb_api_key if cfg else None)

        # 3. Tạo nội dung tin nhắn
        alert_label = "🔥 PHÁT HIỆN NGỌN LỬA" if alert_type == "fire" else "🌫️ PHÁT HIỆN KHÓI"
        if alert_type == "fire_smoke":
            alert_label = "🔥🌫️ PHÁT HIỆN CHÁY & KHÓI"

        now_str = datetime.now().strftime("%H:%M:%S %d/%m/%Y")
        msg = (
            f"🚨 CẢNH BÁO BÁO CHÁY TỰ ĐỘNG (AI)\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"📌 Sự cố: {alert_label}\n"
            f"📹 Vị trí: {camera_name}\n"
            f"🎯 Độ tin cậy: {confidence * 100:.1f}%\n"
            f"⏰ Thời gian: {now_str}\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"⚠️ Đề nghị trực ban và đội PCCC kiểm tra hiện trường ngay lập tức!"
        )

        total_deliveries = 0

        # 4. Gửi Burst 3 rounds (mỗi round cách nhau 5s)
        for round_idx in range(1, burst_count + 1):
            if self._stop_event.is_set():
                break

            round_msg = f"{msg}\n(Đợt báo động: {round_idx}/{burst_count})"
            for bot in active_bots:
                success, response_str = zalo_utils.send_zalo_message(
                    access_token=bot.access_token,
                    recipient_id=bot.recipient_id,
                    message=round_msg,
                    image_url=image_url,
                )

                delivery = models.OutboxDelivery(
                    outbox_event_id=event.id,
                    bot_id=bot.id,
                    recipient_id=bot.recipient_id,
                    sequence=round_idx,
                    is_success=success,
                    response_data=response_str,
                    delivered_at=datetime.now(),
                )
                db.add(delivery)
                if success:
                    total_deliveries += 1

            db.commit()

            if round_idx < burst_count:
                time.sleep(burst_interval)

        # 5. Cập nhật số lượng tin đã gửi vào FireAlert
        if alert_id:
            alert = db.query(models.FireAlert).filter_by(id=alert_id).first()
            if alert:
                alert.zalo_sent_count = total_deliveries
                db.commit()

        event.status = "delivered"
        db.commit()
        logger.info(f"[OutboxWorker] Hoàn tất gửi tin Zalo cho Sự cố #{alert_id}. Tổng tin thành công: {total_deliveries}")


def start_outbox_worker():
    global _worker_instance
    with _worker_lock:
        if _worker_instance is None or not _worker_instance.is_alive():
            _worker_instance = OutboxWorker()
            _worker_instance.start()


def stop_outbox_worker():
    global _worker_instance
    with _worker_lock:
        if _worker_instance and _worker_instance.is_alive():
            _worker_instance.stop()
            _worker_instance.join(timeout=3.0)
            _worker_instance = None


def signal_outbox_worker():
    global _worker_instance
    if _worker_instance and _worker_instance.is_alive():
        _worker_instance.trigger()

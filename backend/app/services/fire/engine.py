import os

# Camera IP qua RTSP ổn định hơn khi dùng TCP (tránh vỡ hình / mất khung khi mạng LAN chập chờn).
# Phải đặt trước khi OpenCV mở luồng. Không ghi đè nếu người dùng đã tự cấu hình biến môi trường này.
os.environ.setdefault("OPENCV_FFMPEG_CAPTURE_OPTIONS", "rtsp_transport;tcp")

import cv2
import time
import logging
import threading
import numpy as np
from datetime import datetime
from collections import deque
from typing import Dict, Optional, List, Tuple, Any
from ultralytics import YOLO

from app.core.config import settings, SNAPSHOT_DIR, DEMO_DIR
from app.core.compute_device import resolve_torch_device
from app.db.database import SessionLocal
from app.models import models
from app.services.outbox_handlers import enqueue_fire_alert
from app.services.outbox import signal_outbox_worker
from app.services.ws_manager import ws_manager

logger = logging.getLogger(__name__)

# Số chỉ số webcam tối đa sẽ dò khi webcam được chọn không mở được (0, 1, 2, 3)
WEBCAM_SCAN_MAX_INDEX = 4
VIDEO_FILE_EXTS = (".mp4", ".avi", ".mov", ".mkv")


def _webcam_backends() -> List[Tuple[str, int]]:
    """
    Thứ tự backend mở webcam.
    Trên Windows, backend mặc định của OpenCV 4.x (MSMF) hay lỗi hoặc mở rất chậm với webcam laptop,
    nên ưu tiên DirectShow (DSHOW) trước, sau đó mới thử MSMF và chế độ tự động.
    """
    if os.name == "nt":
        return [("DSHOW", cv2.CAP_DSHOW), ("MSMF", cv2.CAP_MSMF), ("AUTO", cv2.CAP_ANY)]
    return [("V4L2", cv2.CAP_V4L2), ("AUTO", cv2.CAP_ANY)]


def _try_open_webcam(index: int) -> Tuple[Optional[cv2.VideoCapture], Optional[str]]:
    """Thử mở webcam theo chỉ số với lần lượt từng backend. Chỉ coi là thành công khi đọc được khung hình thật."""
    for backend_name, backend_id in _webcam_backends():
        cap = None
        try:
            cap = cv2.VideoCapture(index, backend_id)
            if cap.isOpened():
                for _ in range(10):
                    ok, frame = cap.read()
                    if ok and frame is not None and frame.size > 0:
                        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                        return cap, backend_name
                    time.sleep(0.1)
        except Exception as e:
            logger.debug(f"[Webcam] Lỗi mở webcam #{index} bằng {backend_name}: {e}")
        if cap is not None:
            cap.release()
    return None, None


def _build_placeholder_frame(title: str, subtitle: str = "") -> np.ndarray:
    """Tạo khung hình nền tối có chữ, dùng khi giả lập sự cố mà chưa có camera nào đang chạy."""
    img = np.zeros((360, 640, 3), dtype=np.uint8)
    img[:] = (27, 21, 16)
    cv2.rectangle(img, (12, 12), (628, 348), (22, 115, 249), 2)
    cv2.putText(img, title, (40, 170), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 2)
    if subtitle:
        cv2.putText(img, subtitle, (40, 215), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (220, 220, 220), 1)
    cv2.putText(img, datetime.now().strftime("%Y-%m-%d %H:%M:%S"), (40, 320), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (160, 160, 160), 1)
    return img


class CameraStreamWorker(threading.Thread):
    """
    Luồng thu nhận frame và xử lý AI cho từng Camera riêng biệt.
    Áp dụng kiến trúc 2 luồng độc lập chuẩn GiamSatRaVao:
      - Luồng Stream (run): Đọc camera ở 25-30 FPS, pacing video tự nhiên, vẽ overlay và nén JPEG vào RAM.
      - Luồng AI (_ai_loop): Chạy nền độc lập ở ~5 FPS trên frame 640px, phát hiện khói lửa không làm giật video.
    """

    def __init__(self, camera_id: int, camera_name: str, source: str, camera_type: str, engine: "FireDetectionEngine"):
        super().__init__(daemon=True, name=f"CameraWorker_{camera_id}")
        self.camera_id = camera_id
        self.camera_name = camera_name
        self.source = source
        self.camera_type = camera_type
        self.engine = engine

        self._stop_event = threading.Event()
        self.frame_lock = threading.Lock()
        self.latest_raw_frame: Optional[np.ndarray] = None
        self.latest_annotated_frame: Optional[np.ndarray] = None
        self.latest_detections: List[Dict[str, Any]] = []
        self.latest_jpeg: Optional[bytes] = None

        self.fps = 0.0
        self.is_connected = False
        self.last_seen_time = 0.0

        # Bộ đệm xác nhận sự cố chống báo giả
        self.detection_history = deque(maxlen=20)
        self.last_alert_time = 0.0

        # AI Background Thread
        self.ai_thread: Optional[threading.Thread] = None

    def stop(self):
        self._stop_event.set()

    def get_jpeg_frame(self) -> Optional[bytes]:
        """Lấy frame JPEG nén sẵn trong RAM cực nhanh cho StreamingResponse."""
        with self.frame_lock:
            return self.latest_jpeg

    def get_latest_frame(self) -> Optional[np.ndarray]:
        with self.frame_lock:
            if self.latest_annotated_frame is not None:
                return self.latest_annotated_frame.copy()
            if self.latest_raw_frame is not None:
                return self.latest_raw_frame.copy()
            return None

    def _resolve_capture_source(self):
        src = (self.source or "").strip()
        low = src.lower()

        # Webcam: chấp nhận "webcam", "webcam:0", "webcam:1" hoặc chỉ nhập số "0", "1"
        if low.startswith("webcam"):
            part = low.split(":", 1)[1].strip() if ":" in low else "0"
            return int(part) if part.isdigit() else 0
        if src.isdigit():
            return int(src)
        if self.camera_type == "webcam" and not src:
            return 0

        if low.startswith("demo:"):
            filename = src.split(":", 1)[1]
            demo_path = DEMO_DIR / filename
            if demo_path.exists():
                return str(demo_path)
            # Tìm file bất kỳ trong demo_videos
            files = list(DEMO_DIR.glob("*.mp4"))
            if files:
                return str(files[0])
            return str(demo_path)
        return src

    def _open_capture(self, resolved_src, is_file: bool) -> Optional[cv2.VideoCapture]:
        """Mở nguồn video. Webcam được thử nhiều backend và tự dò chỉ số khác nếu chỉ số đã chọn không dùng được."""
        if isinstance(resolved_src, int):
            cap, backend = _try_open_webcam(resolved_src)
            if cap is not None:
                logger.info(f"[CameraWorker #{self.camera_id}] Đã mở webcam #{resolved_src} (backend {backend})")
                return cap

            for idx in range(WEBCAM_SCAN_MAX_INDEX):
                if idx == resolved_src:
                    continue
                cap, backend = _try_open_webcam(idx)
                if cap is not None:
                    logger.warning(
                        f"[CameraWorker #{self.camera_id}] Webcam #{resolved_src} không dùng được, "
                        f"đã tự chuyển sang webcam #{idx} (backend {backend})"
                    )
                    return cap

            logger.warning(
                f"[CameraWorker #{self.camera_id}] Không mở được webcam nào. Kiểm tra: (1) webcam đang bị ứng dụng khác "
                f"chiếm (Zoom, Teams, Camera, phần mềm nhận diện khuôn mặt...); (2) Windows Settings > Privacy & security > "
                f"Camera đã cho phép ứng dụng desktop dùng camera; (3) webcam USB đã cắm chắc."
            )
            return None

        cap = cv2.VideoCapture(resolved_src)
        if not cap.isOpened():
            cap.release()
            return None
        if not is_file:
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        return cap

    def _ai_loop(self):
        """Luồng AI chạy nền độc lập ở ~5 FPS (chuẩn GiamSatRaVao AI_TARGET_FPS)."""
        logger.info(f"[CameraWorker #{self.camera_id}] AI Background Thread đã khởi động")
        target_interval = 0.20  # 5 FPS

        while not self._stop_event.is_set():
            start_time = time.time()
            frame = None
            with self.frame_lock:
                if self.latest_raw_frame is not None:
                    frame = self.latest_raw_frame.copy()

            if frame is not None and frame.size > 0:
                try:
                    detections = self.engine.detect_objects(frame)
                    with self.frame_lock:
                        self.latest_detections = detections
                    self._evaluate_detections(frame, detections)
                except Exception as e:
                    logger.debug(f"[CameraWorker #{self.camera_id}] Lỗi trong AI background thread: {e}")

            elapsed = time.time() - start_time
            sleep_time = max(0.02, target_interval - elapsed)
            time.sleep(sleep_time)

        logger.info(f"[CameraWorker #{self.camera_id}] AI Background Thread đã dừng")

    def run(self):
        logger.info(f"[CameraWorker #{self.camera_id}] Bắt đầu chạy luồng camera '{self.camera_name}' (Nguồn: {self.source})")
        resolved_src = self._resolve_capture_source()
        is_file = isinstance(resolved_src, str) and (
            self.camera_type == "demo" or resolved_src.lower().endswith(VIDEO_FILE_EXTS)
        )

        # Khởi động AI background thread
        self.ai_thread = threading.Thread(
            target=self._ai_loop,
            daemon=True,
            name=f"ai-{self.camera_id}"
        )
        self.ai_thread.start()

        while not self._stop_event.is_set():
            cap = self._open_capture(resolved_src, is_file)
            if cap is None:
                logger.warning(f"[CameraWorker #{self.camera_id}] Không thể mở nguồn: {resolved_src}. Thử lại sau 3s...")
                self.is_connected = False
                # Chờ theo từng nhịp ngắn để nút TẮT GIÁM SÁT có hiệu lực ngay
                self._stop_event.wait(3.0)
                continue

            self.is_connected = True
            raw_fps = cap.get(cv2.CAP_PROP_FPS)
            video_fps = raw_fps if (raw_fps and 1.0 < raw_fps < 120.0) else 25.0
            frame_delay = (1.0 / video_fps) if is_file else 0.0

            fps_count = 0
            fps_start = time.time()

            while not self._stop_event.is_set():
                loop_start = time.time()
                ret, frame = cap.read()
                if not ret or frame is None or frame.size == 0:
                    if is_file:
                        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                        continue
                    else:
                        logger.warning(f"[CameraWorker #{self.camera_id}] Mất luồng video. Kết nối lại...")
                        break

                self.last_seen_time = time.time()
                fps_count += 1
                now = time.time()
                if now - fps_start >= 1.0:
                    self.fps = round(fps_count / (now - fps_start), 1)
                    fps_count = 0
                    fps_start = now

                # Resize frame hiển thị nếu quá lớn để tối ưu hiệu năng (max 960px)
                h, w = frame.shape[:2]
                if w > 960:
                    target_w = 960
                    target_h = int(h * (target_w / w))
                    display_frame = cv2.resize(frame, (target_w, target_h))
                else:
                    display_frame = frame.copy()

                # Cập nhật latest_raw_frame cho AI Thread và lấy detection mới nhất
                with self.frame_lock:
                    self.latest_raw_frame = frame
                    current_detections = list(self.latest_detections)

                # Vẽ bounding box mượt mà
                dh, dw = display_frame.shape[:2]
                scale_x = dw / w
                scale_y = dh / h

                for det in current_detections:
                    box = det["box"]
                    x1 = int(box[0] * scale_x)
                    y1 = int(box[1] * scale_y)
                    x2 = int(box[2] * scale_x)
                    y2 = int(box[3] * scale_y)
                    cls_name = det["class_name"]
                    conf = det["confidence"]

                    color = (0, 0, 255) if cls_name == "fire" else (0, 165, 255)
                    cv2.rectangle(display_frame, (x1, y1), (x2, y2), color, 2)
                    label = f"{cls_name.upper()} {conf*100:.0f}%"
                    cv2.putText(display_frame, label, (x1, max(y1 - 6, 15)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

                # Nén sẵn JPEG chất lượng 75
                ok, jpeg = cv2.imencode(".jpg", display_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 75])
                if ok:
                    with self.frame_lock:
                        self.latest_jpeg = jpeg.tobytes()
                        self.latest_annotated_frame = display_frame

                # Điều tiết tốc độ phát cho video file chuẩn 25-30 FPS mượt mà
                if is_file and frame_delay > 0:
                    elapsed = time.time() - loop_start
                    if elapsed < frame_delay:
                        time.sleep(frame_delay - elapsed)

            cap.release()
            self.is_connected = False
            time.sleep(1.0)

        logger.info(f"[CameraWorker #{self.camera_id}] Đã dừng luồng camera '{self.camera_name}'")

    def _evaluate_detections(self, frame: np.ndarray, detections: List[Dict[str, Any]]):
        now = time.time()
        if not detections:
            return

        # Tìm detection có độ tin cậy cao nhất
        max_fire_conf = max([d["confidence"] for d in detections if d["class_name"] == "fire"], default=0.0)
        max_smoke_conf = max([d["confidence"] for d in detections if d["class_name"] == "smoke"], default=0.0)

        db = SessionLocal()
        try:
            cfg = db.query(models.SystemConfig).first()
            fire_thresh = cfg.fire_alert_confidence_threshold if cfg else settings.FIRE_ALERT_CONFIDENCE_THRESHOLD
            smoke_thresh = cfg.fire_smoke_confidence_threshold if cfg else settings.FIRE_SMOKE_CONFIDENCE_THRESHOLD
            cooldown = cfg.fire_alert_cooldown if cfg else settings.FIRE_ALERT_COOLDOWN
            required_frames = cfg.fire_confirmation_frames if cfg else settings.FIRE_CONFIRMATION_FRAMES
            window_sec = settings.FIRE_CONFIRMATION_WINDOW_SECONDS
        finally:
            db.close()

        is_fire = max_fire_conf >= fire_thresh
        is_smoke = max_smoke_conf >= smoke_thresh

        if not (is_fire or is_smoke):
            return

        alert_type = "fire_smoke" if (is_fire and is_smoke) else ("fire" if is_fire else "smoke")
        max_conf = max(max_fire_conf, max_smoke_conf)

        self.detection_history.append((now, max_conf, alert_type))

        # Kiểm tra điều kiện xác nhận qua nhiều khung hình
        valid_hits = [item for item in self.detection_history if (now - item[0]) <= window_sec]
        if len(valid_hits) < required_frames:
            return

        # Kiểm tra cooldown
        if (now - self.last_alert_time) < cooldown:
            return

        self.last_alert_time = now
        self._trigger_alert(frame, alert_type, max_conf, detections)

    def _trigger_alert(self, frame: np.ndarray, alert_type: str, confidence: float, detections: List[Dict[str, Any]]):
        self.engine.record_alert(
            camera_id=self.camera_id,
            camera_name=self.camera_name,
            frame=frame,
            alert_type=alert_type,
            confidence=confidence,
            detections=detections,
        )


class FireDetectionEngine:
    """Singleton Engine phát hiện khói & lửa bằng YOLOv8s."""

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self.device = resolve_torch_device()
        self.model_path = settings.YOLO_MODEL_PATH
        self.model: Optional[YOLO] = None
        self.workers: Dict[int, CameraStreamWorker] = {}
        self.workers_lock = threading.Lock()
        self.current_mode: str = "standby"
        self.demo_clip_name: str = "fire1.mp4"

        self._load_model()
        self._initialized = True

    def _load_model(self):
        try:
            if os.path.exists(self.model_path):
                logger.info(f"[FireEngine] Đang tải mô hình YOLOv8s từ: {self.model_path} ({self.device})")
                self.model = YOLO(self.model_path)
                logger.info("[FireEngine] Mô hình YOLOv8s đã sẵn sàng hoạt động!")
            else:
                logger.error(f"[FireEngine] Không tìm thấy file mô hình tại {self.model_path}")
        except Exception as e:
            logger.error(f"[FireEngine] Lỗi tải mô hình YOLO: {e}", exc_info=True)

    def detect_objects(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        """
        Thực hiện suy luận YOLOv8s trên frame được resize về 640px (chuẩn GiamSatRaVao).
        Tối ưu CPU cực mạnh, không làm chậm luồng stream.
        """
        detections: List[Dict[str, Any]] = []
        if self.model is None or frame is None or frame.size == 0:
            return detections

        try:
            h, w = frame.shape[:2]
            if w > 640:
                ai_w = 640
                ai_h = int(h * (ai_w / w))
                ai_frame = cv2.resize(frame, (ai_w, ai_h))
                scale_x = w / ai_w
                scale_y = h / ai_h
            else:
                ai_frame = frame
                scale_x = 1.0
                scale_y = 1.0

            results = self.model.predict(
                source=ai_frame,
                imgsz=640,
                conf=settings.FIRE_CONFIDENCE_THRESHOLD,
                device=self.device,
                verbose=False,
            )

            if results and len(results) > 0:
                result = results[0]
                boxes = result.boxes
                names = result.names

                for box in boxes:
                    cls_id = int(box.cls[0].item())
                    cls_name = names.get(cls_id, str(cls_id)).lower()
                    conf = float(box.conf[0].item())
                    xyxy = box.xyxy[0].cpu().numpy()

                    detections.append({
                        "class_id": cls_id,
                        "class_name": cls_name,
                        "confidence": round(conf, 3),
                        "box": [
                            float(xyxy[0] * scale_x),
                            float(xyxy[1] * scale_y),
                            float(xyxy[2] * scale_x),
                            float(xyxy[3] * scale_y),
                        ],
                    })
        except Exception as e:
            logger.debug(f"[FireEngine] Lỗi detect_objects: {e}")

        return detections

    def record_alert(
        self,
        camera_id: Optional[int],
        camera_name: str,
        frame: np.ndarray,
        alert_type: str,
        confidence: float,
        detections: List[Dict[str, Any]],
    ) -> Optional[Dict[str, Any]]:
        """
        Ghi nhận một sự cố: lưu ảnh hiện trường, lưu CSDL, đẩy hàng đợi gửi Zalo
        và phát sự kiện WebSocket để trình duyệt bật popup + còi hú + nhấp nháy bản đồ.
        """
        logger.warning(f"🚨 [FIRE ALERT] Phát hiện {alert_type.upper()} tại {camera_name} (Conf: {confidence*100:.1f}%)")

        # 1. Vẽ bounding box và lưu snapshot
        annotated_snapshot = frame.copy()
        for det in detections:
            box = det["box"]
            cls_name = det["class_name"]
            conf = det["confidence"]
            color = (0, 0, 255) if cls_name == "fire" else (0, 165, 255)
            x1, y1, x2, y2 = map(int, box)
            cv2.rectangle(annotated_snapshot, (x1, y1), (x2, y2), color, 2)
            label = f"{cls_name.upper()} {conf*100:.1f}%"
            cv2.putText(annotated_snapshot, label, (x1, max(20, y1 - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]
        cam_tag = camera_id if camera_id is not None else "x"
        filename = f"fire_{cam_tag}_{timestamp_str}.jpg"
        filepath = os.path.join(str(SNAPSHOT_DIR), filename)
        cv2.imwrite(filepath, annotated_snapshot)

        rel_snapshot_path = f"/data/fire_snapshots/{filename}"

        # 2. Lưu vào CSDL
        alert_data: Optional[Dict[str, Any]] = None
        db = SessionLocal()
        try:
            alert = models.FireAlert(
                camera_id=camera_id,
                camera_name=camera_name,
                alert_type=alert_type,
                confidence=confidence,
                snapshot_path=rel_snapshot_path,
                status="pending",
                zalo_sent_count=0,
                created_at=datetime.now(),
            )
            db.add(alert)
            db.commit()
            db.refresh(alert)

            # 3. Đẩy vào Outbox để gửi tin Zalo
            enqueue_fire_alert(
                db=db,
                alert_id=alert.id,
                camera_name=camera_name,
                alert_type=alert_type,
                confidence=confidence,
                snapshot_path=filepath,
            )
            db.commit()
            signal_outbox_worker()

            alert_data = {
                "id": alert.id,
                "camera_id": camera_id,
                "camera_name": camera_name,
                "alert_type": alert_type,
                "confidence": confidence,
                "snapshot_path": rel_snapshot_path,
                "status": alert.status,
                "zalo_sent_count": 0,
                "created_at": alert.created_at.isoformat(),
            }
        except Exception as e:
            db.rollback()
            logger.error(f"[FireEngine] Lỗi lưu FireAlert vào DB: {e}", exc_info=True)
        finally:
            db.close()

        # 4. Bắn sự kiện WebSocket tới Frontend (luồng camera không có event loop riêng -> gửi qua loop chính)
        if alert_data is not None:
            ws_manager.broadcast_from_thread("FIRE_ALERT", alert_data)

        return alert_data

    def simulate_fire_event(self, camera_id: Optional[int] = None, alert_type: str = "fire") -> Optional[Dict[str, Any]]:
        """
        Tạo một sự cố GIẢ LẬP để kiểm thử còi hú, popup, nhấp nháy bản đồ và gửi Zalo.
        Lấy khung hình hiện tại của camera đang chạy (nếu có), nếu không thì dùng khung hình mẫu.
        """
        if alert_type not in ("fire", "smoke", "fire_smoke"):
            alert_type = "fire"

        worker: Optional[CameraStreamWorker] = None
        with self.workers_lock:
            if camera_id is not None:
                worker = self.workers.get(camera_id)
            if worker is None and self.workers:
                worker = next(iter(self.workers.values()))

        frame: Optional[np.ndarray] = None
        cam_id: Optional[int] = None
        cam_name = "Camera giám sát"

        if worker is not None:
            cam_id, cam_name = worker.camera_id, worker.camera_name
            frame = worker.get_latest_frame()
        else:
            db = SessionLocal()
            try:
                query = db.query(models.FireCamera)
                cam = query.filter(models.FireCamera.id == camera_id).first() if camera_id else None
                if cam is None:
                    cam = query.order_by(models.FireCamera.id.asc()).first()
                if cam is not None:
                    cam_id, cam_name = cam.id, cam.name
            finally:
                db.close()

        if frame is None:
            frame = _build_placeholder_frame("SU CO GIA LAP - KIEM THU HE THONG", "FireGuard AI - Hoc vien PCCC & CNCH")

        return self.record_alert(
            camera_id=cam_id,
            camera_name=f"[GIẢ LẬP] {cam_name}",
            frame=frame,
            alert_type=alert_type,
            confidence=0.95,
            detections=[],
        )

    def infer_frame(self, frame: np.ndarray) -> Tuple[np.ndarray, List[Dict[str, Any]]]:
        """Thực hiện suy luận YOLO trên một khung hình tĩnh và vẽ bounding box."""
        annotated_frame = frame.copy()
        detections = self.detect_objects(frame)

        for det in detections:
            box = det["box"]
            cls_name = det["class_name"]
            conf = det["confidence"]
            x1, y1, x2, y2 = map(int, box)
            color = (0, 0, 255) if cls_name == "fire" else (0, 165, 255)
            cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
            label = f"{cls_name.upper()} {conf*100:.1f}%"
            cv2.putText(annotated_frame, label, (x1, max(20, y1 - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 2)

        return annotated_frame, detections

    def is_camera_running(self, camera_id: int) -> bool:
        """Kiểm tra camera có đang chạy xử lý AI không."""
        with self.workers_lock:
            worker = self.workers.get(camera_id)
            return worker is not None and worker.is_alive()

    def start_camera(self, camera_id: int, camera_name: str, source: str, camera_type: str = "rtsp"):
        """Bật luồng xử lý cho một camera."""
        with self.workers_lock:
            if camera_id in self.workers and self.workers[camera_id].is_alive():
                logger.info(f"[FireEngine] Camera #{camera_id} đã đang chạy.")
                return

            worker = CameraStreamWorker(camera_id, camera_name, source, camera_type, self)
            self.workers[camera_id] = worker
            worker.start()

    def stop_camera(self, camera_id: int):
        """Dừng luồng của một camera."""
        with self.workers_lock:
            if camera_id in self.workers:
                worker = self.workers.pop(camera_id)
                worker.stop()

    def restart_camera(self, camera_id: int, camera_name: str, source: str, camera_type: str = "rtsp"):
        """Khởi động lại luồng camera khi thay đổi cấu hình."""
        self.stop_camera(camera_id)
        time.sleep(0.5)
        self.start_camera(camera_id, camera_name, source, camera_type)

    def start_demo(self, clip_name: str = "fire1.mp4"):
        """Bật luồng video thử nghiệm Demo (hoàn toàn riêng biệt, camera_id=0)."""
        self.stop_all()
        self.current_mode = "demo"
        self.demo_clip_name = clip_name
        self.start_camera(
            camera_id=0,
            camera_name=f"Video Demo ({clip_name})",
            source=f"demo:{clip_name}",
            camera_type="demo",
        )
        logger.info(f"[FireEngine] Đã kích hoạt chế độ DEMO với video: {clip_name}")

    def stop_demo(self):
        """Dừng luồng video demo."""
        self.stop_camera(0)
        self.current_mode = "standby"
        logger.info("[FireEngine] Đã dừng chế độ DEMO.")

    def start_all_live(self):
        """Bật toàn bộ camera giám sát trực tiếp (loại trừ demo)."""
        self.stop_demo()
        self.current_mode = "live"
        db = SessionLocal()
        try:
            cameras = db.query(models.FireCamera).filter(
                models.FireCamera.is_active.is_(True),
                models.FireCamera.camera_type != "demo",
            ).all()
            if not cameras:
                first_cam = db.query(models.FireCamera).first()
                if first_cam:
                    self.start_camera(first_cam.id, first_cam.name, "webcam:0", "webcam")
            else:
                for cam in cameras:
                    self.start_camera(
                        camera_id=cam.id,
                        camera_name=cam.name,
                        source=cam.rtsp_url,
                        camera_type=cam.camera_type,
                    )
            logger.info("[FireEngine] Đã kích hoạt giám sát toàn bộ camera trực tiếp (Live).")
        except Exception as e:
            logger.error(f"[FireEngine] Lỗi bật camera live: {e}")
        finally:
            db.close()

    def stop_all_live(self):
        """Dừng toàn bộ camera giám sát trực tiếp."""
        self.stop_all()
        self.current_mode = "standby"
        logger.info("[FireEngine] Đã tạm dừng toàn bộ camera trực tiếp (Live).")

    def start_all_active(self):
        """Bật toàn bộ camera active (mặc định live)."""
        self.start_all_live()

    def stop_all(self):
        """Dừng toàn bộ luồng camera đang chạy và giải phóng CPU."""
        with self.workers_lock:
            cam_ids = list(self.workers.keys())
            for cid in cam_ids:
                worker = self.workers.pop(cid)
                worker.stop()
        self.current_mode = "standby"
        logger.info("[FireEngine] Đã tạm dừng toàn bộ luồng camera AI.")

    def get_camera_jpeg(self, camera_id: int) -> Optional[bytes]:
        """Lấy frame JPEG nén sẵn trong RAM cực nhanh, không tốn CPU re-encode."""
        with self.workers_lock:
            worker = self.workers.get(camera_id)
            if worker and worker.is_alive():
                return worker.get_jpeg_frame()
            return None

    def get_camera_frame(self, camera_id: int) -> Optional[np.ndarray]:
        """Lấy frame mới nhất có vẽ bounding box của camera."""
        with self.workers_lock:
            worker = self.workers.get(camera_id)
            if worker:
                return worker.get_latest_frame()
            return None

    def get_status(self) -> Dict[str, Any]:
        """Trả về trạng thái tổng thể của Fire Detection Engine."""
        with self.workers_lock:
            active_cams = []
            for cid, w in self.workers.items():
                active_cams.append({
                    "id": cid,
                    "name": w.camera_name,
                    "is_connected": w.is_connected,
                    "fps": w.fps,
                    "camera_type": w.camera_type,
                })

            return {
                "status": "running" if len(active_cams) > 0 else "standby",
                "is_running": len(active_cams) > 0,
                "current_mode": self.current_mode,
                "demo_clip": self.demo_clip_name,
                "device": self.device,
                "active_cameras_count": len(active_cams),
                "cameras": active_cams,
                "model_path": self.model_path,
            }


# Singleton instance
fire_engine = FireDetectionEngine()

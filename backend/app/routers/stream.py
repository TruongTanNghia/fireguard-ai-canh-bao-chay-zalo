import cv2
import time
import numpy as np
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.services.fire.engine import fire_engine

router = APIRouter(prefix="/api/stream", tags=["Live Stream"])


def create_placeholder_frame(camera_id: int, is_running: bool) -> bytes:
    """Tạo frame ảnh trạng thái chuẩn công nghệ cao."""
    img = np.zeros((480, 640, 3), dtype=np.uint8)
    # Nền #10151b (BGR: 27, 21, 16)
    img[:] = (27, 21, 16)

    # Khung viền kỹ thuật #2c3742 (BGR: 66, 55, 44)
    cv2.rectangle(img, (20, 20), (620, 460), (66, 55, 44), 1)

    # 4 góc kỹ thuật
    corner_len = 24
    # Top-left
    cv2.line(img, (20, 20), (20 + corner_len, 20), (22, 115, 249), 2)
    cv2.line(img, (20, 20), (20, 20 + corner_len), (22, 115, 249), 2)
    # Top-right
    cv2.line(img, (620, 20), (620 - corner_len, 20), (22, 115, 249), 2)
    cv2.line(img, (620, 20), (620, 20 + corner_len), (22, 115, 249), 2)
    # Bottom-left
    cv2.line(img, (20, 460), (20 + corner_len, 460), (22, 115, 249), 2)
    cv2.line(img, (20, 460), (20, 460 - corner_len), (22, 115, 249), 2)
    # Bottom-right
    cv2.line(img, (620, 460), (620 - corner_len, 460), (22, 115, 249), 2)
    cv2.line(img, (620, 460), (620, 460 - corner_len), (22, 115, 249), 2)

    # Logo / Tên hệ thống
    cv2.putText(img, "FIREGUARD AI PRO 2.0", (40, 55), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (22, 115, 249), 1)

    if camera_id == 0:
        title = "VIDEO DEMO - STANDBY" if not is_running else "VIDEO DEMO - DANG KHOI TAO..."
        sub = "[Nhan BAT DEMO de chay video thu nghiem]" if not is_running else "[Dang nap khung hinh AI...]"
        cv2.putText(img, title, (140, 220), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (255, 165, 0) if is_running else (244, 247, 249), 2)
        cv2.putText(img, sub, (120, 265), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (181, 168, 154), 1)
    elif not is_running:
        # Trạng thái Standby
        cv2.putText(img, f"CAMERA #{camera_id} - STANDBY", (140, 220), cv2.FONT_HERSHEY_SIMPLEX, 0.85, (244, 247, 249), 2)
        cv2.putText(img, "[He thong dang tam dung - Nhan BAT de quet AI]", (100, 265), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (181, 168, 154), 1)
    else:
        # Trạng thái Đang kết nối
        cv2.putText(img, f"CAMERA #{camera_id} - DANG KET NOI...", (130, 220), cv2.FONT_HERSHEY_SIMPLEX, 0.85, (0, 165, 255), 2)
        cv2.putText(img, "[Dang khoi tao luong stream video]", (170, 265), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (181, 168, 154), 1)

    # Timestamp góc dưới
    time_str = time.strftime("%Y-%m-%d %H:%M:%S")
    cv2.putText(img, time_str, (40, 440), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (100, 100, 100), 1)

    _, encoded = cv2.imencode(".jpg", img, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
    return encoded.tobytes()


def generate_mjpeg_stream(camera_id: int):
    """
    Generator sinh luồng MJPEG liên tục cho trình duyệt chuẩn GiamSatRaVao:
    Lấy frame JPEG đã được nén sẵn trong RAM từ worker, đạt 25-30 FPS cực kỳ mượt mà,
    hoàn toàn không tốn CPU để encode lại trên HTTP thread.
    """
    while True:
        frame_bytes = fire_engine.get_camera_jpeg(camera_id)
        if frame_bytes is None:
            is_running = fire_engine.is_camera_running(camera_id)
            frame_bytes = create_placeholder_frame(camera_id, is_running)
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
            )
            time.sleep(0.15)
        else:
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
            )
            time.sleep(0.033)  # ~30 FPS cực mượt mà


@router.get("/demo")
def stream_demo():
    """Endpoint phát trực tiếp luồng MJPEG của video demo đang chạy."""
    return StreamingResponse(
        generate_mjpeg_stream(0),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


@router.get("/{camera_id}")
def stream_camera(camera_id: int):
    """Endpoint phát trực tiếp luồng MJPEG của camera."""
    return StreamingResponse(
        generate_mjpeg_stream(camera_id),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )

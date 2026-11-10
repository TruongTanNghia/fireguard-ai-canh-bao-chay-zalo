import os
import time
import logging
import cv2
import requests
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from app.db.database import SessionLocal
from app.models import models

logger = logging.getLogger(__name__)

UPLOAD_TIMEOUT = 30
ZALO_TIMEOUT = 25
IMGBB_UPLOAD_URL = "https://api.imgbb.com/1/upload"
ZALO_API_BASE = "https://bot-api.zapps.me/bot"
IMAGE_EXPIRATION_SEC = 1209600  # 14 ngày
MAX_IMAGE_WIDTH = 1024
JPEG_COMPRESSION_QUALITY = 80
PHOTO_SEND_RETRIES = 5
PHOTO_RETRY_DELAY_SEC = 2.5
IMAGE_READY_TIMEOUT_SEC = 12
IMAGE_READY_INTERVAL_SEC = 1.0


@dataclass(frozen=True)
class ZaloBotTarget:
    id: int
    name: str
    access_token: str
    recipient_id: str


def get_active_bots() -> List[ZaloBotTarget]:
    """Lấy danh sách các Bot Zalo đang kích hoạt."""
    db = SessionLocal()
    try:
        bots = (
            db.query(models.ZaloBotConfig)
            .filter(models.ZaloBotConfig.is_active.is_(True))
            .order_by(models.ZaloBotConfig.id.asc())
            .all()
        )
        return [
            ZaloBotTarget(
                id=bot.id,
                name=bot.name,
                access_token=bot.zalo_access_token.strip(),
                recipient_id=bot.zalo_recipient_id.strip(),
            )
            for bot in bots
            if bot.zalo_access_token and bot.zalo_access_token.strip()
            and bot.zalo_recipient_id and bot.zalo_recipient_id.strip()
        ]
    except Exception as e:
        logger.error(f"[ZaloUtils] Lỗi đọc danh sách Bot: {e}", exc_info=True)
        return []
    finally:
        db.close()


def compress_image(image_path: str) -> Tuple[Optional[bytes], int]:
    """Nén ảnh JPEG để tối ưu dung lượng khi upload."""
    try:
        if not os.path.exists(image_path):
            return None, 0

        img = cv2.imread(image_path)
        if img is None:
            return None, 0

        height, width = img.shape[:2]
        if width > MAX_IMAGE_WIDTH:
            scale = MAX_IMAGE_WIDTH / width
            new_height = int(height * scale)
            img = cv2.resize(img, (MAX_IMAGE_WIDTH, new_height))

        success, encoded_img = cv2.imencode(
            ".jpg", img, [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_COMPRESSION_QUALITY]
        )
        if not success:
            return None, 0

        binary_data = encoded_img.tobytes()
        return binary_data, len(binary_data)
    except Exception as e:
        logger.error(f"[ZaloUtils] Lỗi nén ảnh {image_path}: {e}")
        return None, 0


def upload_image_to_imgbb(image_path: str, api_key: Optional[str] = None) -> Optional[str]:
    """Upload ảnh lên ImgBB để lấy URL trực tiếp."""
    if not api_key:
        db = SessionLocal()
        try:
            cfg = db.query(models.SystemConfig).first()
            if cfg and cfg.imgbb_api_key:
                api_key = cfg.imgbb_api_key.strip()
        finally:
            db.close()

    if not api_key:
        logger.debug("[ZaloUtils] Chưa cấu hình ImgBB API Key -> Bỏ qua upload ImgBB")
        return None

    binary_data, size = compress_image(image_path)
    if not binary_data:
        return None

    try:
        response = requests.post(
            IMGBB_UPLOAD_URL,
            params={"key": api_key, "expiration": IMAGE_EXPIRATION_SEC},
            files={"image": ("fire_snapshot.jpg", binary_data, "image/jpeg")},
            timeout=UPLOAD_TIMEOUT,
        )
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                image_url = data["data"]["url"]
                logger.info(f"[ZaloUtils] Upload ImgBB thành công: {image_url}")
                return image_url
        logger.warning(f"[ZaloUtils] Upload ImgBB thất bại: {response.text}")
        return None
    except Exception as e:
        logger.error(f"[ZaloUtils] Lỗi khi upload ImgBB: {e}")
        return None


def _read_zalo_response(response: requests.Response) -> Tuple[bool, Optional[dict]]:
    if response.status_code != 200:
        logger.warning(f"[Zalo] HTTP {response.status_code}: {response.text[:300]}")
        return False, None

    try:
        data = response.json()
    except Exception:
        logger.warning(f"[Zalo] Dữ liệu trả về không phải JSON: {response.text[:300]}")
        return False, None

    if not data.get("ok"):
        logger.warning(f"[Zalo] Phản hồi lỗi: {data}")
        return False, data

    return True, data


def _send_zalo_text(chat_id: str, token: str, text: str) -> bool:
    """Gửi tin nhắn văn bản tới Bot Zapps qua /sendMessage."""
    url = f"{ZALO_API_BASE}{token}/sendMessage"
    payload = {"chat_id": chat_id, "text": text}
    try:
        response = requests.post(url, json=payload, timeout=ZALO_TIMEOUT)
        ok, _ = _read_zalo_response(response)
        if ok:
            logger.info(f"[Zalo] Đã gửi tin nhắn văn bản thành công tới {chat_id}")
        return ok
    except Exception as e:
        logger.error(f"[Zalo] Lỗi gửi sendMessage: {e}")
        return False


def _is_photo_url_error(data: Optional[dict]) -> bool:
    if not data:
        return False
    description = str(data.get("description", "")).lower()
    return (
        data.get("error_code") == 424
        or "photo url is invalid" in description
        or "image link" in description
    )


def _wait_for_public_image(public_url: str) -> bool:
    """Đợi ảnh sẵn sàng trên mạng CDN trước khi gọi Zalo sendPhoto (tránh lỗi 424)."""
    deadline = time.time() + IMAGE_READY_TIMEOUT_SEC
    while time.time() < deadline:
        try:
            with requests.get(public_url, stream=True, timeout=10) as response:
                content_type = response.headers.get("Content-Type", "").lower()
                if response.status_code == 200 and ("image" in content_type or not content_type):
                    return True
        except Exception:
            pass
        time.sleep(IMAGE_READY_INTERVAL_SEC)
    return False


def _send_to_zalo(chat_id: str, token: str, caption: str, public_url: Optional[str] = None) -> bool:
    """Gửi ảnh trực tiếp kèm chú thích tới Zalo qua Bot API sendPhoto."""
    if not public_url:
        return _send_zalo_text(chat_id, token, caption)

    url = f"{ZALO_API_BASE}{token}/sendPhoto"
    payload = {"chat_id": chat_id, "photo": public_url, "caption": caption}

    # Đợi ảnh sẵn sàng trên CDN trước khi gửi cho Zalo
    _wait_for_public_image(public_url)
    time.sleep(1.0)

    for attempt in range(1, PHOTO_SEND_RETRIES + 1):
        try:
            response = requests.post(url, json=payload, timeout=ZALO_TIMEOUT)
            ok, data = _read_zalo_response(response)
            if ok:
                logger.info(f"[Zalo] Đã gửi ẢNH THẬT trực tiếp (CHAT_PHOTO) thành công tới {chat_id}")
                return True

            if _is_photo_url_error(data) and attempt < PHOTO_SEND_RETRIES:
                logger.warning(
                    f"[Zalo] Zalo đang nạp ảnh từ CDN (lần {attempt}/{PHOTO_SEND_RETRIES}), đợi {PHOTO_RETRY_DELAY_SEC}s để gửi lại..."
                )
                time.sleep(PHOTO_RETRY_DELAY_SEC)
                _wait_for_public_image(public_url)
                continue

            break
        except requests.exceptions.Timeout:
            logger.warning(f"[Zalo] Timeout gửi ảnh lần {attempt}/{PHOTO_SEND_RETRIES}")
            if attempt < PHOTO_SEND_RETRIES:
                time.sleep(PHOTO_RETRY_DELAY_SEC)
                continue
            break
        except Exception as e:
            logger.warning(f"[Zalo] Ngoại lệ gửi ảnh lần {attempt}: {e}")
            if attempt < PHOTO_SEND_RETRIES:
                time.sleep(PHOTO_RETRY_DELAY_SEC)
                continue
            break

    # Chỉ khi thử đủ 5 lần (khoảng 15s) mà Zalo vẫn không tải được ảnh thì mới fallback sang text
    logger.warning("[Zalo] Không thể gửi ảnh trực tiếp sau các lần thử, tự động chuyển sang gửi tin nhắn văn bản kèm link ảnh.")
    text_with_link = f"{caption}\n\n📷 Link ảnh hiện trường: {public_url}"
    return _send_zalo_text(chat_id, token, text_with_link)


def send_zalo_message(
    access_token: str,
    recipient_id: str,
    message: str,
    image_url: Optional[str] = None,
) -> Tuple[bool, str]:
    """Hàm chuẩn gọi từ OutboxWorker và Test Send để gửi tin qua Zalo Bot."""
    if not access_token or not recipient_id:
        return False, "Thiếu Bot Access Token hoặc Chat ID người nhận"

    clean_token = access_token.strip()
    clean_recipient = recipient_id.strip()

    try:
        ok = _send_to_zalo(clean_recipient, clean_token, message, image_url)
        return (True, "Gửi tin nhắn Zalo thành công") if ok else (False, "Gửi tin nhắn Zalo thất bại")
    except Exception as e:
        logger.error(f"[ZaloUtils] Lỗi khi gọi send_zalo_message: {e}")
        return False, str(e)

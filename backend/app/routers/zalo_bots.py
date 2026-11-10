from typing import List
import requests
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import models
from app.schemas import schemas
from app.routers.auth import get_current_user, require_admin
from app.utils import zalo_utils

router = APIRouter(prefix="/api/zalo-bots", tags=["Zalo Bots"])


def mask_bot_response(bot: models.ZaloBotConfig) -> schemas.ZaloBotResponse:
    return schemas.ZaloBotResponse(
        id=bot.id,
        name=bot.name,
        is_active=bot.is_active,
        zalo_app_id=bot.zalo_app_id,
        zalo_recipient_id=bot.zalo_recipient_id,
        has_token=bool(bot.zalo_access_token and bot.zalo_access_token.strip()),
        created_at=bot.created_at,
    )


@router.get("", response_model=List[schemas.ZaloBotResponse])
def list_zalo_bots(
    db: Session = Depends(get_db),
    current_user: models.SystemUser = Depends(get_current_user),
):
    bots = db.query(models.ZaloBotConfig).order_by(models.ZaloBotConfig.id.asc()).all()
    return [mask_bot_response(b) for b in bots]


@router.post("", response_model=schemas.ZaloBotResponse)
def create_zalo_bot(
    payload: schemas.ZaloBotCreate,
    db: Session = Depends(get_db),
    current_user: models.SystemUser = Depends(require_admin),
):
    count = db.query(models.ZaloBotConfig).count()
    if count >= 10:
        raise HTTPException(status_code=400, detail="Hệ thống chỉ hỗ trợ tối đa 10 Bot Zalo độc lập")

    bot = models.ZaloBotConfig(
        name=payload.name,
        is_active=payload.is_active,
        zalo_app_id=payload.zalo_app_id,
        zalo_secret_key=payload.zalo_secret_key,
        zalo_access_token=payload.zalo_access_token,
        zalo_refresh_token=payload.zalo_refresh_token,
        zalo_recipient_id=payload.zalo_recipient_id,
    )
    db.add(bot)
    db.commit()
    db.refresh(bot)
    return mask_bot_response(bot)


@router.put("/{bot_id}", response_model=schemas.ZaloBotResponse)
def update_zalo_bot(
    bot_id: int,
    payload: schemas.ZaloBotUpdate,
    db: Session = Depends(get_db),
    current_user: models.SystemUser = Depends(require_admin),
):
    bot = db.query(models.ZaloBotConfig).filter(models.ZaloBotConfig.id == bot_id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Không tìm thấy cấu hình Bot Zalo")

    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        if k in ("zalo_access_token", "zalo_refresh_token", "zalo_secret_key") and (v is None or v == ""):
            continue
        setattr(bot, k, v)

    db.commit()
    db.refresh(bot)
    return mask_bot_response(bot)


@router.delete("/{bot_id}")
def delete_zalo_bot(
    bot_id: int,
    db: Session = Depends(get_db),
    current_user: models.SystemUser = Depends(require_admin),
):
    bot = db.query(models.ZaloBotConfig).filter(models.ZaloBotConfig.id == bot_id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Không tìm thấy cấu hình Bot Zalo")

    db.delete(bot)
    db.commit()
    return {"message": "Đã xóa Bot Zalo thành công"}


@router.post("/test-send")
def test_send_zalo(
    payload: schemas.ZaloTestSend,
    db: Session = Depends(get_db),
    current_user: models.SystemUser = Depends(require_admin),
):
    """Gửi một tin nhắn kiểm thử trực tiếp tới người nhận Zalo."""
    bot = db.query(models.ZaloBotConfig).filter(models.ZaloBotConfig.id == payload.bot_id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Không tìm thấy Bot Zalo")

    if not bot.zalo_access_token or not bot.zalo_recipient_id:
        raise HTTPException(status_code=400, detail="Bot Zalo chưa được cấu hình Access Token hoặc Recipient ID")

    msg = payload.message or "🔔 [TEST] Đây là tin nhắn kiểm tra kết nối từ Hệ thống Giám sát Báo cháy AI."
    success, res_msg = zalo_utils.send_zalo_message(
        access_token=bot.zalo_access_token.strip(),
        recipient_id=bot.zalo_recipient_id.strip(),
        message=msg,
    )

    if not success:
        raise HTTPException(status_code=500, detail=f"Gửi tin Zalo thất bại: {res_msg}")

    return {"message": "Gửi tin nhắn thử nghiệm thành công!"}


@router.post("/check-bot-id")
def check_bot_id(
    payload: schemas.BotCheckRequest,
    current_user: models.SystemUser = Depends(require_admin),
):
    """Tự động kiểm tra và lấy Chat ID / User ID của người nhắn tin tới Bot Zapps/Zalo."""
    clean_token = payload.token.strip()
    if not clean_token:
        raise HTTPException(status_code=400, detail="Token Bot không được để trống")

    url = f"https://bot-api.zapps.me/bot{clean_token}/getUpdates"

    try:
        response = requests.get(url, timeout=35)
        if response.status_code != 200:
            error_detail = ""
            try:
                err_json = response.json()
                error_detail = err_json.get("description", "") or str(err_json)
            except Exception:
                error_detail = response.text[:200] if response.text else ""

            status = response.status_code
            if status == 401:
                raise HTTPException(status_code=400, detail="Token không hợp lệ hoặc đã hết hạn. Hãy kiểm tra lại Token từ Zapps.")
            elif status == 409:
                raise HTTPException(status_code=400, detail="Bot đang bị xung đột phiên (409 Conflict). Thử lại sau vài giây.")
            elif status == 429:
                raise HTTPException(status_code=400, detail="Gửi quá nhiều yêu cầu (429). Vui lòng đợi 1 phút rồi thử lại.")
            elif status >= 500:
                raise HTTPException(status_code=400, detail=f"Máy chủ Zapps phản hồi lỗi (HTTP {status}). Vui lòng thử lại sau.")
            else:
                raise HTTPException(status_code=400, detail=f"Zapps trả lỗi HTTP {status}: {error_detail}" if error_detail else f"Lỗi HTTP {status}. Kiểm tra lại Token.")

        res_json = response.json()
        if not res_json.get("ok"):
            error_desc = res_json.get("description", "Lỗi không xác định từ Bot")
            raise HTTPException(status_code=400, detail=f"Lỗi từ Bot Zapps: {error_desc}")

        result = res_json.get("result")
        if not result:
            raise HTTPException(
                status_code=404,
                detail="Bot chưa nhận được tin nhắn nào. Hãy mở Zalo, gửi 1 tin nhắn bất kỳ (ví dụ 'Hello') cho Bot này rồi bấm 'Lấy ID' lại ngay!"
            )

        latest = None
        if isinstance(result, list):
            if len(result) == 0:
                raise HTTPException(
                    status_code=404,
                    detail="Bot chưa có tin nhắn nào. Hãy gửi tin nhắn cho Bot trên Zalo rồi thử lại!"
                )
            latest = result[-1]
        elif isinstance(result, dict):
            latest = result
        else:
            raise HTTPException(status_code=400, detail="Cấu trúc phản hồi từ Zapps không hỗ trợ.")

        chat_info = None
        if "message" in latest:
            chat_info = latest["message"].get("chat")
        elif "my_chat_member" in latest:
            chat_info = latest["my_chat_member"].get("chat")
        elif "channel_post" in latest:
            chat_info = latest["channel_post"].get("chat")
        elif "edited_message" in latest:
            chat_info = latest["edited_message"].get("chat")

        if chat_info and "id" in chat_info:
            chat_id = chat_info["id"]
            name = chat_info.get("first_name") or chat_info.get("title") or chat_info.get("display_name") or "Người dùng Zalo"
            return {"chat_id": str(chat_id), "name": name}

        raise HTTPException(status_code=404, detail="Không tìm thấy ID người nhận trong dữ liệu tin nhắn trả về.")

    except requests.exceptions.Timeout:
        raise HTTPException(status_code=400, detail="Hết thời gian chờ phản hồi từ Zapps (timeout). Vui lòng thử lại sau.")
    except requests.exceptions.ConnectionError:
        raise HTTPException(status_code=400, detail="Không kết nối được tới máy chủ Zapps. Kiểm tra kết nối mạng của máy chủ.")
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=400, detail=f"Lỗi xử lý kiểm tra Bot: {str(e)}")

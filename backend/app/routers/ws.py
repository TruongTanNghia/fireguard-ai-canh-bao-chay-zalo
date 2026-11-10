import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.ws_manager import ws_manager

logger = logging.getLogger(__name__)
router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws/events")
async def websocket_events_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Nhận heartbeat ping từ client
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"[WebSocket] Lỗi kết nối: {e}")
        ws_manager.disconnect(websocket)

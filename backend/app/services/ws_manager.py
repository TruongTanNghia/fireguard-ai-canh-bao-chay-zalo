import asyncio
import logging
from typing import List, Dict, Any, Optional
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class WebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        # Event loop chính của FastAPI, được gán lúc khởi động server.
        # Các luồng camera (thread thường) không có event loop riêng nên phải gửi qua loop này.
        self.loop: Optional[asyncio.AbstractEventLoop] = None

    def bind_loop(self, loop: asyncio.AbstractEventLoop):
        self.loop = loop

    def broadcast_from_thread(self, event_type: str, data: Dict[str, Any]) -> bool:
        """Gửi sự kiện từ luồng nền (camera worker) sang event loop chính một cách an toàn."""
        loop = self.loop
        if loop is None or loop.is_closed():
            logger.warning("[WebSocket] Chưa có event loop chính, không thể phát sự kiện %s", event_type)
            return False
        try:
            asyncio.run_coroutine_threadsafe(self.broadcast(event_type, data), loop)
            return True
        except Exception as e:
            logger.warning(f"[WebSocket] Lỗi phát sự kiện {event_type} từ luồng nền: {e}")
            return False

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"[WebSocket] Client đã kết nối. Tổng số kết nối: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"[WebSocket] Client đã ngắt. Còn lại: {len(self.active_connections)}")

    async def broadcast(self, event_type: str, data: Dict[str, Any]):
        """Bắn sự kiện JSON thời gian thực tới tất cả Web clients."""
        if not self.active_connections:
            return

        payload = {
            "type": event_type,
            "data": data,
        }

        dead_connections = []
        for connection in list(self.active_connections):
            try:
                await connection.send_json(payload)
            except Exception:
                dead_connections.append(connection)

        for dead in dead_connections:
            self.disconnect(dead)


ws_manager = WebSocketManager()

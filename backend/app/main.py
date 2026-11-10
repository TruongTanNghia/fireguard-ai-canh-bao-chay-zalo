import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings, SNAPSHOT_DIR, MAP_DIR, DEMO_DIR
from app.db.seed import init_db
from app.services.outbox import start_outbox_worker, stop_outbox_worker
from app.services.fire.engine import fire_engine
from app.services.ws_manager import ws_manager
from app.routers import (
    auth,
    fire_alerts,
    fire_cameras,
    stream,
    demo_feed,
    site_map,
    settings as settings_router,
    zalo_bots,
    users,
    audit,
    ws,
    ai_control,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
)
logger = logging.getLogger("CanhBaoChayZalo")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 0. Ghi nhớ event loop chính để các luồng camera phát cảnh báo WebSocket (popup + còi hú)
    ws_manager.bind_loop(asyncio.get_running_loop())

    # 1. Khởi tạo CSDL và nạp dữ liệu mẫu
    logger.info("🚀 [Startup] Khởi tạo Cơ sở dữ liệu và dữ liệu ban đầu...")
    init_db()

    # 2. Khởi động Outbox Worker gửi tin Zalo
    logger.info("🚀 [Startup] Khởi động Outbox Worker gửi tin Zalo...")
    start_outbox_worker()

    # 3. Khởi động ở chế độ Chờ (Standby) - Không tự chạy camera gây tải CPU
    logger.info("ℹ️ [Startup] Hệ thống sẵn sàng ở chế độ Chờ (Standby). Chờ kích hoạt giám sát từ người dùng.")

    yield

    # 4. Tắt các luồng an toàn khi dừng server
    logger.info("🛑 [Shutdown] Đang dừng Outbox Worker và giải phóng tài nguyên...")
    fire_engine.stop_all()
    stop_outbox_worker()


app = FastAPI(
    title="Hệ thống Giám sát Báo cháy & Cảnh báo Zalo AI (Canh_Bao_Chay_Zalo)",
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# Cấu hình CORS linh hoạt cho mọi IP nội bộ (LAN / WiFi / Hotspot)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

# Mount thư mục tĩnh
app.mount("/data/fire_snapshots", StaticFiles(directory=str(SNAPSHOT_DIR)), name="fire_snapshots")
app.mount("/data/site_maps", StaticFiles(directory=str(MAP_DIR)), name="site_maps")
app.mount("/data/demo_videos", StaticFiles(directory=str(DEMO_DIR)), name="demo_videos")

# Đăng ký các Routers
app.include_router(auth.router)
app.include_router(fire_alerts.router)
app.include_router(fire_cameras.router)
app.include_router(stream.router)
app.include_router(demo_feed.router)
app.include_router(site_map.router)
app.include_router(settings_router.router)
app.include_router(zalo_bots.router)
app.include_router(users.router)
app.include_router(audit.router)
app.include_router(ws.router)
app.include_router(ai_control.router)


@app.get("/api/system/health")
def health_check():
    engine_status = fire_engine.get_status()
    return {
        "status": "online",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "ai_engine": engine_status,
    }


@app.get("/")
def root():
    return {
        "message": "🔥 Hệ thống Giám sát Báo cháy & Cảnh báo Zalo AI đang hoạt động!",
        "version": settings.APP_VERSION,
        "docs_url": "/docs",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)


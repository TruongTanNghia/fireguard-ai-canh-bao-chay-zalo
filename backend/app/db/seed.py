import logging
from sqlalchemy.orm import Session
from app.db.database import SessionLocal, engine, Base
from app.models import models
from app.core.security import get_password_hash

logger = logging.getLogger(__name__)


def init_db():
    """Tạo toàn bộ bảng CSDL và nạp dữ liệu mẫu ban đầu."""
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        # 1. Khởi tạo tài khoản Admin
        admin = db.query(models.SystemUser).filter_by(username="admin").first()
        if not admin:
            admin = models.SystemUser(
                username="admin",
                password_hash=get_password_hash("admin123"),
                full_name="Quản trị viên Hệ thống",
                email="admin@fireguard.local",
                role="admin",
                is_active=True,
            )
            db.add(admin)
            logger.info("[Seed] Đã tạo tài khoản quản trị: admin / admin123")

        # 2. Khởi tạo cấu hình hệ thống
        config = db.query(models.SystemConfig).first()
        if not config:
            config = models.SystemConfig(
                fire_confidence_threshold=0.15,
                fire_alert_confidence_threshold=0.40,
                fire_smoke_confidence_threshold=0.35,
                fire_confirmation_frames=2,
                fire_alert_cooldown=25,
                enable_fire_zalo=True,
                zalo_burst_count=3,
                zalo_burst_interval=5,
                imgbb_api_key="",
                sound_alarm_enabled=True,
                sound_alarm_volume=100,
            )
            db.add(config)
            logger.info("[Seed] Đã tạo cấu hình hệ thống mặc định")

        # 3. Khởi tạo Bot Zalo mẫu
        bot = db.query(models.ZaloBotConfig).first()
        if not bot:
            bot = models.ZaloBotConfig(
                name="Bot 1: Đội PCCC & Trực ban",
                is_active=False,
                zalo_app_id="",
                zalo_secret_key="",
                zalo_access_token="",
                zalo_refresh_token="",
                zalo_recipient_id="",
            )
            db.add(bot)
            logger.info("[Seed] Đã tạo cấu hình Bot Zalo mẫu")

        # 4. Khởi tạo Sơ đồ mặt bằng mẫu
        sitemap = db.query(models.SiteMap).first()
        if not sitemap:
            sitemap = models.SiteMap(
                name="Sơ đồ Khuôn viên Học viện PCCC & CNCH",
                description="Ảnh vệ tinh khuôn viên Học viện - vị trí lắp đặt camera giám sát cháy",
                image_path="/data/site_maps/site_map.png",
                is_default=True,
            )
            db.add(sitemap)
            db.flush()

            # 5. Khởi tạo 5 Camera ghim đúng các điểm lắp đặt dự kiến trên ảnh vệ tinh khuôn viên.
            #    Camera 1 dùng webcam của máy chủ. Camera 2-5 trỏ sẵn vào bộ phát RTSP giả lập
            #    (tools/rtsp_gia_lap/chay_rtsp_gia_lap.bat), chưa kích hoạt. Khi lắp camera thật:
            #    vào Cài đặt > Camera, thay bằng địa chỉ RTSP của camera rồi bật kích hoạt.
            demo_cameras = [
                # (tên, vị trí, nguồn, loại, kích hoạt, X%, Y%)
                ("Camera 1 - Nhà mái xanh", "Dãy nhà mái xanh gần Cổng phụ (điểm 1) - Webcam máy chủ",
                 "webcam:0", "webcam", True, 33.9, 39.1),
                ("Camera 2 - Nhà mái xanh", "Dãy nhà mái xanh gần Cổng phụ (điểm 2)",
                 "rtsp://127.0.0.1:8554/cam2", "rtsp", False, 36.0, 40.4),
                ("Camera 3 - Nhà mái xanh", "Dãy nhà mái xanh gần Cổng phụ (điểm 3)",
                 "rtsp://127.0.0.1:8554/cam3", "rtsp", False, 34.9, 44.0),
                ("Camera 4 - Tòa Học viện", "Tòa nhà Học viện PCCC & CNCH (điểm 1)",
                 "rtsp://127.0.0.1:8554/cam4", "rtsp", False, 62.5, 85.1),
                ("Camera 5 - Tòa Học viện", "Tòa nhà Học viện PCCC & CNCH (điểm 2)",
                 "rtsp://127.0.0.1:8554/cam5", "rtsp", False, 63.7, 88.7),
            ]
            db.add_all([
                models.FireCamera(
                    name=name,
                    location=location,
                    rtsp_url=source,
                    camera_type=cam_type,
                    is_active=active,
                    map_pin_x=pin_x,
                    map_pin_y=pin_y,
                    sitemap_id=sitemap.id,
                    confidence_threshold=0.40,
                )
                for name, location, source, cam_type, active, pin_x, pin_y in demo_cameras
            ])
            logger.info("[Seed] Đã tạo 5 camera mẫu theo sơ đồ khuôn viên")

        db.commit()
        logger.info("[Seed] Hoàn tất khởi tạo dữ liệu ban đầu.")
    except Exception as e:
        db.rollback()
        logger.error(f"[Seed] Lỗi khởi tạo dữ liệu: {e}", exc_info=True)
    finally:
        db.close()


if __name__ == "__main__":
    init_db()

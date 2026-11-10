import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
SNAPSHOT_DIR = DATA_DIR / "fire_snapshots"
MAP_DIR = DATA_DIR / "site_maps"
DEMO_DIR = DATA_DIR / "demo_videos"
MODELS_DIR = BASE_DIR / "models"

# Tạo sẵn các thư mục dữ liệu nếu chưa có
SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
MAP_DIR.mkdir(parents=True, exist_ok=True)
DEMO_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)


class Settings(BaseSettings):
    APP_NAME: str = "Canh_Bao_Chay_Zalo"
    APP_VERSION: str = "2.0.0"
    APP_ENV: str = "production"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    SECRET_KEY: str = "fire_zalo_secret_key_change_me_in_production_2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 ngày

    # Database
    DATABASE_URL: str = f"sqlite:///{DATA_DIR / 'fire_system.db'}"

    # AI Model Path
    YOLO_MODEL_PATH: str = str(MODELS_DIR / "yolov8s_best.pt")

    # AI Detection Thresholds
    FIRE_CONFIDENCE_THRESHOLD: float = 0.15
    FIRE_ALERT_CONFIDENCE_THRESHOLD: float = 0.40
    FIRE_SMOKE_CONFIDENCE_THRESHOLD: float = 0.35
    FIRE_CONFIRMATION_FRAMES: int = 2
    FIRE_CONFIRMATION_WINDOW_SECONDS: float = 2.5
    FIRE_CONFIRMATION_MIN_SECONDS: float = 0.4
    FIRE_ALERT_COOLDOWN: int = 25

    # Zalo & ImgBB
    ENABLE_FIRE_ZALO: bool = True
    ZALO_BURST_COUNT: int = 3
    ZALO_BURST_INTERVAL: int = 5
    IMGBB_API_KEY: str = ""

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    class Config:
        env_file = str(BASE_DIR / ".env")
        env_file_encoding = "utf-8"
        extra = "allow"


settings = Settings()

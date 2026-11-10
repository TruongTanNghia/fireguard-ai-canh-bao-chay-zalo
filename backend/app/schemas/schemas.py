from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


# ==========================================
# 1. USER SCHEMAS
# ==========================================
class UserLogin(BaseModel):
    username: str
    password: str


class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str
    email: Optional[str] = None
    role: str = "operator"


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


class PasswordChange(BaseModel):
    old_password: str
    new_password: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    full_name: str
    email: Optional[str] = None
    role: str
    is_active: bool
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ==========================================
# 2. FIRE CAMERA SCHEMAS
# ==========================================
class FireCameraCreate(BaseModel):
    name: str
    location: Optional[str] = None
    rtsp_url: str
    camera_type: str = "rtsp"  # rtsp, webcam, demo
    is_active: bool = True
    confidence_threshold: float = 0.40
    sitemap_id: Optional[int] = None
    map_pin_x: Optional[float] = None
    map_pin_y: Optional[float] = None


class FireCameraUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    rtsp_url: Optional[str] = None
    camera_type: Optional[str] = None
    is_active: Optional[bool] = None
    confidence_threshold: Optional[float] = None
    sitemap_id: Optional[int] = None
    map_pin_x: Optional[float] = None
    map_pin_y: Optional[float] = None


class CameraPinUpdate(BaseModel):
    camera_id: int
    map_pin_x: Optional[float]
    map_pin_y: Optional[float]
    sitemap_id: Optional[int] = None


class FireCameraResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    location: Optional[str] = None
    rtsp_url: str
    camera_type: str
    is_active: bool
    confidence_threshold: float
    map_pin_x: Optional[float] = None
    map_pin_y: Optional[float] = None
    sitemap_id: Optional[int] = None
    is_running: bool = False
    created_at: datetime


# ==========================================
# 3. FIRE ALERT SCHEMAS
# ==========================================
class FireAlertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    camera_id: Optional[int] = None
    camera_name: Optional[str] = None
    alert_type: str
    confidence: float
    snapshot_path: Optional[str] = None
    video_path: Optional[str] = None
    zalo_sent_count: int
    status: str
    admin_notes: Optional[str] = None
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    created_at: datetime


class FireAlertUpdate(BaseModel):
    status: str  # verified, dismissed
    admin_notes: Optional[str] = None


class FireAlertStatsResponse(BaseModel):
    total_alerts: int
    alerts_today: int
    alerts_week: int
    pending_alerts: int
    verified_alerts: int
    dismissed_alerts: int


# ==========================================
# 4. SITE MAP SCHEMAS
# ==========================================
class SiteMapCreate(BaseModel):
    name: str
    description: Optional[str] = None
    is_default: bool = False


class SiteMapResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: Optional[str] = None
    image_path: str
    is_default: bool
    cameras: List[FireCameraResponse] = []
    created_at: datetime


# ==========================================
# 5. ZALO BOT SCHEMAS
# ==========================================
class ZaloBotCreate(BaseModel):
    name: str
    is_active: bool = True
    zalo_app_id: Optional[str] = None
    zalo_secret_key: Optional[str] = None
    zalo_access_token: Optional[str] = None
    zalo_refresh_token: Optional[str] = None
    zalo_recipient_id: Optional[str] = None


class ZaloBotUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    zalo_app_id: Optional[str] = None
    zalo_secret_key: Optional[str] = None
    zalo_access_token: Optional[str] = None
    zalo_refresh_token: Optional[str] = None
    zalo_recipient_id: Optional[str] = None


class ZaloBotResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    is_active: bool
    zalo_app_id: Optional[str] = None
    zalo_recipient_id: Optional[str] = None
    has_token: bool = False
    created_at: datetime


class ZaloTestSend(BaseModel):
    bot_id: int
    message: Optional[str] = None


class BotCheckRequest(BaseModel):
    token: str


# ==========================================
# 6. SYSTEM CONFIG SCHEMAS
# ==========================================
class SystemConfigUpdate(BaseModel):
    fire_confidence_threshold: Optional[float] = None
    fire_alert_confidence_threshold: Optional[float] = None
    fire_smoke_confidence_threshold: Optional[float] = None
    fire_confirmation_frames: Optional[int] = None
    fire_alert_cooldown: Optional[int] = None
    enable_fire_zalo: Optional[bool] = None
    zalo_burst_count: Optional[int] = None
    zalo_burst_interval: Optional[int] = None
    imgbb_api_key: Optional[str] = None
    sound_alarm_enabled: Optional[bool] = None
    sound_alarm_volume: Optional[int] = None


class SystemConfigResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    fire_confidence_threshold: float
    fire_alert_confidence_threshold: float
    fire_smoke_confidence_threshold: float
    fire_confirmation_frames: int
    fire_alert_cooldown: int
    enable_fire_zalo: bool
    zalo_burst_count: int
    zalo_burst_interval: int
    imgbb_api_key_configured: bool = False
    sound_alarm_enabled: bool
    sound_alarm_volume: int


# ==========================================
# 7. AUDIT LOG SCHEMAS
# ==========================================
class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: Optional[int] = None
    username: Optional[str] = None
    action: str
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime

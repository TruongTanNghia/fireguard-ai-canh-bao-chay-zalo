from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    Text,
    ForeignKey,
    JSON,
)
from sqlalchemy.orm import relationship
from app.db.database import Base


class SystemUser(Base):
    __tablename__ = "system_users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    email = Column(String(100), nullable=True)
    role = Column(String(20), default="operator", nullable=False)  # admin, operator, viewer
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)


class SiteMap(Base):
    __tablename__ = "site_maps"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    image_path = Column(String(255), nullable=False)
    is_default = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)

    cameras = relationship("FireCamera", back_populates="sitemap", cascade="all, delete-orphan")


class FireCamera(Base):
    __tablename__ = "fire_cameras"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    location = Column(String(150), nullable=True)
    rtsp_url = Column(String(500), nullable=False)
    camera_type = Column(String(20), default="rtsp", nullable=False)  # rtsp, webcam, demo
    is_active = Column(Boolean, default=True, nullable=False)
    map_pin_x = Column(Float, nullable=True)  # Tọa độ X trên sơ đồ (0.0 -> 100.0%)
    map_pin_y = Column(Float, nullable=True)  # Tọa độ Y trên sơ đồ (0.0 -> 100.0%)
    sitemap_id = Column(Integer, ForeignKey("site_maps.id", ondelete="SET NULL"), nullable=True)
    confidence_threshold = Column(Float, default=0.40, nullable=False)
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)

    sitemap = relationship("SiteMap", back_populates="cameras")


class FireAlert(Base):
    __tablename__ = "fire_alerts"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, nullable=True, index=True)
    camera_name = Column(String(100), nullable=True)
    alert_type = Column(String(20), default="fire", nullable=False)  # fire, smoke, fire_smoke
    confidence = Column(Float, nullable=False)
    snapshot_path = Column(String(500), nullable=True)
    video_path = Column(String(500), nullable=True)
    zalo_sent_count = Column(Integer, default=0, nullable=False)
    status = Column(String(20), default="pending", nullable=False)  # pending, verified, dismissed
    admin_notes = Column(Text, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.now, index=True, nullable=False)


class ZaloBotConfig(Base):
    __tablename__ = "zalo_bot_configs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    zalo_app_id = Column(String(100), nullable=True)
    zalo_secret_key = Column(String(255), nullable=True)
    zalo_access_token = Column(Text, nullable=True)
    zalo_refresh_token = Column(Text, nullable=True)
    zalo_recipient_id = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)


class SystemConfig(Base):
    __tablename__ = "system_configs"

    id = Column(Integer, primary_key=True, index=True)
    fire_confidence_threshold = Column(Float, default=0.15, nullable=False)
    fire_alert_confidence_threshold = Column(Float, default=0.40, nullable=False)
    fire_smoke_confidence_threshold = Column(Float, default=0.35, nullable=False)
    fire_confirmation_frames = Column(Integer, default=2, nullable=False)
    fire_alert_cooldown = Column(Integer, default=25, nullable=False)
    enable_fire_zalo = Column(Boolean, default=True, nullable=False)
    zalo_burst_count = Column(Integer, default=3, nullable=False)
    zalo_burst_interval = Column(Integer, default=5, nullable=False)
    imgbb_api_key = Column(String(255), nullable=True)
    sound_alarm_enabled = Column(Boolean, default=True, nullable=False)
    sound_alarm_volume = Column(Integer, default=100, nullable=False)
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)


class OutboxEvent(Base):
    __tablename__ = "outbox_events"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(50), nullable=False)  # fire_zalo_alert, test_zalo
    payload = Column(JSON, nullable=False)
    status = Column(String(20), default="pending", nullable=False)  # pending, processing, delivered, failed
    retry_count = Column(Integer, default=0, nullable=False)
    max_retries = Column(Integer, default=3, nullable=False)
    next_retry_at = Column(DateTime, default=datetime.now, nullable=False)
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)

    deliveries = relationship("OutboxDelivery", back_populates="event", cascade="all, delete-orphan")


class OutboxDelivery(Base):
    __tablename__ = "outbox_deliveries"

    id = Column(Integer, primary_key=True, index=True)
    outbox_event_id = Column(Integer, ForeignKey("outbox_events.id", ondelete="CASCADE"), nullable=False)
    bot_id = Column(Integer, nullable=True)
    recipient_id = Column(String(100), nullable=True)
    sequence = Column(Integer, default=1, nullable=False)
    is_success = Column(Boolean, default=False, nullable=False)
    response_data = Column(Text, nullable=True)
    delivered_at = Column(DateTime, default=datetime.now, nullable=False)

    event = relationship("OutboxEvent", back_populates="deliveries")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    username = Column(String(50), nullable=True)
    action = Column(String(100), nullable=False)
    target_type = Column(String(50), nullable=True)
    target_id = Column(String(50), nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.now, index=True, nullable=False)

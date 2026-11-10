export interface User {
  id: number;
  username: string;
  full_name: string;
  email?: string;
  role: "admin" | "operator" | "viewer";
  is_active: boolean;
  created_at: string;
}

export interface FireAlert {
  id: number;
  camera_id?: number;
  camera_name?: string;
  alert_type: "fire" | "smoke" | "fire_smoke";
  confidence: number;
  snapshot_path?: string;
  video_path?: string;
  zalo_sent_count: number;
  status: "pending" | "verified" | "dismissed";
  admin_notes?: string;
  resolved_at?: string;
  resolved_by?: string;
  created_at: string;
}

export interface FireAlertStats {
  total_alerts: number;
  alerts_today: number;
  alerts_week: number;
  pending_alerts: number;
  verified_alerts: number;
  dismissed_alerts: number;
}

export interface FireCamera {
  id: number;
  name: string;
  location?: string;
  rtsp_url: string;
  camera_type: "rtsp" | "webcam" | "demo";
  is_active: boolean;
  confidence_threshold: number;
  map_pin_x?: number;
  map_pin_y?: number;
  sitemap_id?: number;
  is_running?: boolean;
  created_at: string;
}

export interface SiteMap {
  id: number;
  name: string;
  description?: string;
  image_path: string;
  is_default: boolean;
  cameras: FireCamera[];
  created_at: string;
}

export interface ZaloBot {
  id: number;
  name: string;
  is_active: boolean;
  zalo_app_id?: string;
  zalo_recipient_id?: string;
  has_token: boolean;
  created_at: string;
}

export interface SystemConfig {
  id: number;
  fire_confidence_threshold: number;
  fire_alert_confidence_threshold: number;
  fire_smoke_confidence_threshold: number;
  fire_confirmation_frames: number;
  fire_alert_cooldown: number;
  enable_fire_zalo: boolean;
  zalo_burst_count: number;
  zalo_burst_interval: number;
  imgbb_api_key_configured: boolean;
  sound_alarm_enabled: boolean;
  sound_alarm_volume: number;
}

export interface AuditLog {
  id: number;
  user_id?: number;
  username?: string;
  action: string;
  target_type?: string;
  target_id?: string;
  details?: string;
  ip_address?: string;
  created_at: string;
}

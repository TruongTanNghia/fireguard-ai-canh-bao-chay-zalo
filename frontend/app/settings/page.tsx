"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Settings as SettingsIcon,
  Video,
  MessageSquare,
  Activity,
  Map as MapIcon,
  Users,
  ShieldAlert,
  Plus,
  Trash2,
  Edit2,
  Save,
  Send,
  Volume2,
  Upload,
  Check,
  AlertCircle,
  RefreshCw,
  Eye,
  Key,
  Search,
} from "lucide-react";
import { FireCamera, ZaloBot, SystemConfig, User, AuditLog, SiteMap } from "@/src/types";
import { apiFetch } from "@/src/services/api";
import { getRuntimeApiBaseUrl } from "@/src/utils/constants";
import { playFireSiren, stopFireSiren } from "@/src/features/audio/fireAlarmAudio";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<
    "cameras" | "zalo" | "ai" | "map" | "users" | "audit"
  >("cameras");

  // State data
  const [cameras, setCameras] = useState<FireCamera[]>([]);
  const [bots, setBots] = useState<ZaloBot[]>([]);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [sitemap, setSitemap] = useState<SiteMap | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [demoVideos, setDemoVideos] = useState<string[]>([]);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [mapVersion, setMapVersion] = useState(0); // 0 khi render máy chủ để tránh lệch hydration

  // Status banners
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 4000);
  };
  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(""), 5000);
  };

  // ==========================================
  // LOAD DATA FUNCTIONS
  // ==========================================
  const loadAllData = useCallback(async () => {
    try {
      const [camsRes, botsRes, cfgRes, mapRes, usersRes, healthRes, videosRes] =
        await Promise.all([
          apiFetch("/api/fire-cameras"),
          apiFetch("/api/zalo-bots"),
          apiFetch("/api/settings"),
          apiFetch("/api/site-map"),
          apiFetch("/api/users"),
          apiFetch("/api/system/health"),
          apiFetch("/api/demo-feed/videos"),
        ]);

      if (camsRes.ok) setCameras(await camsRes.json());
      if (botsRes.ok) setBots(await botsRes.json());
      if (cfgRes.ok) setConfig(await cfgRes.json());
      if (mapRes.ok) setSitemap(await mapRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (healthRes.ok) setSystemHealth(await healthRes.json());
      if (videosRes.ok) setDemoVideos(await videosRes.json());
      setMapVersion(Date.now());
    } catch (e) {
      console.error("Lỗi tải cài đặt:", e);
    }
  }, []);

  const loadAuditLogs = async () => {
    try {
      const res = await apiFetch("/api/audit-logs?limit=30");
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.data || []);
      }
    } catch {}
  };

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    if (activeTab === "audit") {
      loadAuditLogs();
    }
  }, [activeTab]);

  // ==========================================
  // TAB 1: CAMERA MANAGEMENT
  // ==========================================
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [editingCamera, setEditingCamera] = useState<FireCamera | null>(null);
  const [cameraForm, setCameraForm] = useState({
    name: "",
    location: "",
    rtsp_url: "",
    camera_type: "rtsp",
    is_active: true,
    confidence_threshold: 0.4,
  });

  const handleOpenAddCamera = () => {
    setEditingCamera(null);
    setCameraForm({
      name: "",
      location: "",
      rtsp_url: "",
      camera_type: "rtsp",
      is_active: true,
      confidence_threshold: 0.4,
    });
    setShowCameraModal(true);
  };

  const handleOpenEditCamera = (cam: FireCamera) => {
    setEditingCamera(cam);
    setCameraForm({
      name: cam.name,
      location: cam.location || "",
      rtsp_url: cam.rtsp_url,
      camera_type: cam.camera_type,
      is_active: cam.is_active,
      confidence_threshold: cam.confidence_threshold,
    });
    setShowCameraModal(true);
  };

  const handleSaveCamera = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCamera) {
        const res = await apiFetch(`/api/fire-cameras/${editingCamera.id}`, {
          method: "PUT",
          body: JSON.stringify(cameraForm),
        });
        if (res.ok) {
          const updated = await res.json();
          if (updated.is_running) {
            showSuccess(`✅ Đã lưu và đồng bộ lại camera "${updated.name}" đang chạy giám sát.`);
          } else {
            showSuccess(`✅ Đã lưu cấu hình camera "${updated.name}" (Camera ở chế độ chờ, không chạy ngầm).`);
          }
        }
      } else {
        const res = await apiFetch("/api/fire-cameras", {
          method: "POST",
          body: JSON.stringify(cameraForm),
        });
        if (res.ok) {
          showSuccess("✅ Đã thêm camera mới vào danh mục cấu hình.");
        }
      }
      setShowCameraModal(false);
      loadAllData();
    } catch (e) {
      showError("Lỗi lưu cấu hình camera");
    }
  };

  const handleDeleteCamera = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa camera này?")) return;
    try {
      const res = await apiFetch(`/api/fire-cameras/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showSuccess("Đã xóa camera");
        loadAllData();
      }
    } catch {
      showError("Lỗi xóa camera");
    }
  };

  const handleToggleCamera = async (id: number) => {
    try {
      await apiFetch(`/api/fire-cameras/${id}/toggle`, { method: "POST" });
      loadAllData();
    } catch {}
  };

  // ==========================================
  // TAB 2: ZALO BOTS & NOTIFICATIONS
  // ==========================================
  const [showBotModal, setShowBotModal] = useState(false);
  const [editingBot, setEditingBot] = useState<ZaloBot | null>(null);
  const [botForm, setBotForm] = useState({
    name: "",
    is_active: true,
    zalo_app_id: "",
    zalo_secret_key: "",
    zalo_access_token: "",
    zalo_recipient_id: "",
  });
  const [testSendingId, setTestSendingId] = useState<number | null>(null);
  const [imgbbKey, setImgbbKey] = useState("");
  const [isCheckingId, setIsCheckingId] = useState(false);

  const handleAutoGetId = async (token: string) => {
    if (!token || !token.trim()) {
      showError("Vui lòng nhập Token Bot Zapps trước khi lấy ID.");
      return;
    }

    setIsCheckingId(true);
    try {
      const res = await apiFetch("/api/zalo-bots/check-bot-id", {
        method: "POST",
        body: JSON.stringify({ token: token.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setBotForm((prev) => ({
          ...prev,
          zalo_recipient_id: data.chat_id,
        }));
        showSuccess(`✅ Đã tự động nhận diện ID: ${data.chat_id} (${data.name})`);
      } else {
        const err = await res.json();
        showError(err.detail || "Không tìm thấy ID người nhận.");
      }
    } catch {
      showError("Lỗi kết nối khi lấy ID từ Bot Zalo");
    } finally {
      setIsCheckingId(false);
    }
  };

  const handleOpenAddBot = () => {
    setEditingBot(null);
    setBotForm({
      name: "",
      is_active: true,
      zalo_app_id: "",
      zalo_secret_key: "",
      zalo_access_token: "",
      zalo_recipient_id: "",
    });
    setShowBotModal(true);
  };

  const handleOpenEditBot = (bot: ZaloBot) => {
    setEditingBot(bot);
    setBotForm({
      name: bot.name,
      is_active: bot.is_active,
      zalo_app_id: bot.zalo_app_id || "",
      zalo_secret_key: "",
      zalo_access_token: "",
      zalo_recipient_id: bot.zalo_recipient_id || "",
    });
    setShowBotModal(true);
  };

  const handleSaveBot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBot) {
        const res = await apiFetch(`/api/zalo-bots/${editingBot.id}`, {
          method: "PUT",
          body: JSON.stringify(botForm),
        });
        if (res.ok) showSuccess("Cập nhật Bot Zalo thành công");
      } else {
        const res = await apiFetch("/api/zalo-bots", {
          method: "POST",
          body: JSON.stringify(botForm),
        });
        if (res.ok) showSuccess("Thêm Bot Zalo mới thành công");
      }
      setShowBotModal(false);
      loadAllData();
    } catch {
      showError("Lỗi lưu cấu hình Bot Zalo");
    }
  };

  const handleDeleteBot = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa Bot Zalo này?")) return;
    try {
      const res = await apiFetch(`/api/zalo-bots/${id}`, { method: "DELETE" });
      if (res.ok) {
        showSuccess("Đã xóa Bot Zalo");
        loadAllData();
      }
    } catch {
      showError("Lỗi xóa Bot Zalo");
    }
  };

  const handleTestSendZalo = async (botId: number) => {
    setTestSendingId(botId);
    try {
      const res = await apiFetch("/api/zalo-bots/test-send", {
        method: "POST",
        body: JSON.stringify({ bot_id: botId }),
      });
      if (res.ok) {
        showSuccess("Đã gửi tin nhắn Zalo thử nghiệm thành công!");
      } else {
        const err = await res.json();
        showError(err.detail || "Gửi tin nhắn thử nghiệm thất bại");
      }
    } catch {
      showError("Lỗi kết nối khi gửi tin thử nghiệm");
    } finally {
      setTestSendingId(null);
    }
  };

  const handleSaveZaloGeneralConfig = async () => {
    if (!config) return;
    try {
      const payload: any = {
        enable_fire_zalo: config.enable_fire_zalo,
        zalo_burst_count: config.zalo_burst_count,
        zalo_burst_interval: config.zalo_burst_interval,
      };
      if (imgbbKey) payload.imgbb_api_key = imgbbKey;

      const res = await apiFetch("/api/settings", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        showSuccess("Lưu cấu hình thông báo Zalo & ImgBB thành công");
        setImgbbKey("");
        loadAllData();
      }
    } catch {
      showError("Lỗi lưu cấu hình");
    }
  };

  // ==========================================
  // TAB 3: AI & SIREN CONFIG
  // ==========================================
  const handleSaveAIConfig = async () => {
    if (!config) return;
    try {
      const res = await apiFetch("/api/settings", {
        method: "PUT",
        body: JSON.stringify({
          fire_confidence_threshold: config.fire_confidence_threshold,
          fire_alert_confidence_threshold:
            config.fire_alert_confidence_threshold,
          fire_smoke_confidence_threshold:
            config.fire_smoke_confidence_threshold,
          fire_confirmation_frames: config.fire_confirmation_frames,
          fire_alert_cooldown: config.fire_alert_cooldown,
          sound_alarm_enabled: config.sound_alarm_enabled,
          sound_alarm_volume: config.sound_alarm_volume,
        }),
      });
      if (res.ok) {
        showSuccess("Đã lưu cấu hình AI & Còi báo động thành công");
        loadAllData();
      }
    } catch {
      showError("Lỗi lưu cấu hình AI");
    }
  };

  const handleTestSiren = () => {
    playFireSiren(config?.sound_alarm_volume || 100);
    setTimeout(() => {
      stopFireSiren();
    }, 4000);
  };

  // ==========================================
  // TAB 4: SITE MAP & PIN PLACEMENT
  // ==========================================
  const [selectedPinCamId, setSelectedPinCamId] = useState<number | null>(null);
  const [isUploadingMap, setIsUploadingMap] = useState(false);

  const handleMapClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedPinCamId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    try {
      const res = await apiFetch("/api/site-map/pin", {
        method: "POST",
        body: JSON.stringify({
          camera_id: selectedPinCamId,
          map_pin_x: Math.round(x * 10) / 10,
          map_pin_y: Math.round(y * 10) / 10,
        }),
      });
      if (res.ok) {
        showSuccess("Đã ghim vị trí camera trên sơ đồ");
        setSelectedPinCamId(null);
        loadAllData();
      }
    } catch {
      showError("Lỗi ghim vị trí camera");
    }
  };

  const handleDeletePin = async (camId: number) => {
    try {
      const res = await apiFetch(`/api/site-map/pin/${camId}`, { method: "DELETE" });
      if (res.ok) {
        showSuccess("Đã gỡ ghim camera khỏi bản đồ");
        loadAllData();
      } else {
        showError("Gỡ ghim thất bại");
      }
    } catch {
      showError("Lỗi kết nối khi gỡ ghim camera");
    }
  };

  const handleUploadMap = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingMap(true);
    const formData = new FormData();
    formData.append("name", "Sơ đồ Mặt bằng");
    formData.append("is_default", "true");
    formData.append("file", file);

    try {
      const res = await apiFetch("/api/site-map/upload", {
        method: "POST",
        headers: {}, // Let browser set multipart/form-data boundary
        body: formData,
      });
      if (res.ok) {
        showSuccess("Tải sơ đồ mặt bằng mới thành công");
        loadAllData();
      } else {
        showError("Tải file sơ đồ thất bại");
      }
    } catch {
      showError("Lỗi kết nối khi tải sơ đồ");
    } finally {
      setIsUploadingMap(false);
    }
  };

  // ==========================================
  // TAB 5: USERS & ROLES
  // ==========================================
  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState({
    username: "",
    password: "",
    full_name: "",
    email: "",
    role: "operator",
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch("/api/users", {
        method: "POST",
        body: JSON.stringify(userForm),
      });
      if (res.ok) {
        showSuccess("Tạo người dùng mới thành công");
        setShowUserModal(false);
        loadAllData();
      } else {
        const err = await res.json();
        showError(err.detail || "Tạo người dùng thất bại");
      }
    } catch {
      showError("Lỗi tạo người dùng");
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm("Bạn có chắc muốn xóa người dùng này?")) return;
    try {
      const res = await apiFetch(`/api/users/${id}`, { method: "DELETE" });
      if (res.ok) {
        showSuccess("Đã xóa người dùng");
        loadAllData();
      }
    } catch {
      showError("Lỗi xóa người dùng");
    }
  };

  const apiBase = getRuntimeApiBaseUrl();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2.5">
            <SettingsIcon className="text-orange-500" /> Cài Đặt &amp; Quản Trị
            Hệ Thống
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Quản lý Camera, Bot Zalo, Cấu hình AI, Sơ đồ mặt bằng và Phân quyền
          </p>
        </div>
      </div>

      {/* Status Messages */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <Check size={16} /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <AlertCircle size={16} /> {errorMsg}
        </div>
      )}

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {[
          { id: "cameras", label: "Camera Báo Cháy", icon: Video },
          { id: "zalo", label: "Bot Zalo & ImgBB", icon: MessageSquare },
          { id: "ai", label: "Cấu Hình AI & Còi Hú", icon: Activity },
          { id: "map", label: "Sơ Đồ Mặt Bằng", icon: MapIcon },
          { id: "users", label: "Người Dùng & Quyền", icon: Users },
          { id: "audit", label: "Nhật Ký & Trạng Thái", icon: ShieldAlert },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/20"
                  : "glass-panel text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* TAB 1: CAMERA BÁO CHÁY */}
      {/* ======================================================== */}
      {activeTab === "cameras" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Danh sách Camera Giám Sát
            </h2>
            <button
              onClick={handleOpenAddCamera}
              className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-orange-600/20"
            >
              <Plus size={14} /> Thêm Camera Mới
            </button>
          </div>

          {/* Hộp Thông Báo Nguyên Tắc Vận Hành */}
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-center gap-3">
            <span className="text-base">ℹ️</span>
            <div>
              <p className="font-bold">Nguyên tắc quản lý luồng camera:</p>
              <p className="text-[11px] text-blue-300/80">
                Lưu cấu hình tại đây chỉ lưu vào CSDL và <b>hoàn toàn không tự ý chạy ngầm camera</b>. Luồng AI chỉ bắt đầu chạy khi bạn chủ động bấm <b>&quot;BẬT GIÁM SÁT&quot;</b> tại trang Giám Sát Trung Tâm.
              </p>
            </div>
          </div>

          <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900/80 border-b border-white/10 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Tên Camera</th>
                  <th className="py-3 px-4">Vị Trí / Khu Vực</th>
                  <th className="py-3 px-4">Loại Nguồn</th>
                  <th className="py-3 px-4">Nguồn Stream (RTSP / Webcam)</th>
                  <th className="py-3 px-4">Luồng AI (Thực tế)</th>
                  <th className="py-3 px-4">Cấu Hình</th>
                  <th className="py-3 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {cameras.map((cam) => (
                  <tr key={cam.id} className="hover:bg-white/5 transition">
                    <td className="py-3 px-4 font-bold text-white">
                      {cam.name}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {cam.location || "Chưa đặt"}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 uppercase font-mono text-[10px] font-semibold text-slate-300">
                        {cam.camera_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 truncate max-w-xs">
                      {cam.rtsp_url}
                    </td>
                    <td className="py-3 px-4">
                      {cam.is_running ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 w-fit animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Đang chạy AI
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-white/5 flex items-center gap-1.5 w-fit">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                          Chế độ chờ (0% CPU)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleCamera(cam.id)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${
                          cam.is_active
                            ? "bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30"
                            : "bg-slate-800 text-slate-500 border-white/5 hover:bg-slate-700"
                        }`}
                        title={cam.is_active ? "Bấm để tắt khỏi danh mục" : "Bấm để kích hoạt vào danh mục"}
                      >
                        {cam.is_active ? "✓ Kích hoạt" : "✕ Đã tắt"}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        onClick={() => handleOpenEditCamera(cam)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteCamera(cam.id)}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: BOT ZALO & IMGBB */}
      {/* ======================================================== */}
      {activeTab === "zalo" && (
        <div className="space-y-6">
          {/* General Zalo Notification Settings */}
          <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="text-blue-400" size={18} /> Cấu Hình
              Gửi Tin Cảnh Báo Zalo &amp; ImgBB
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Gửi tin Zalo khi có cháy
                </label>
                <select
                  value={config?.enable_fire_zalo ? "true" : "false"}
                  onChange={(e) =>
                    setConfig({
                      ...config!,
                      enable_fire_zalo: e.target.value === "true",
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs font-medium text-slate-200"
                >
                  <option value="true">🟢 BẬT (Gửi tin khẩn cấp)</option>
                  <option value="false">⚪ TẮT (Tạm dừng gửi tin)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Số đợt gửi liên tục (Burst count)
                </label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={config?.zalo_burst_count || 3}
                  onChange={(e) =>
                    setConfig({
                      ...config!,
                      zalo_burst_count: parseInt(e.target.value) || 3,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs font-medium text-slate-200"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  ImgBB API Key (Upload ảnh bằng chứng)
                </label>
                <input
                  type="password"
                  value={imgbbKey}
                  onChange={(e) => setImgbbKey(e.target.value)}
                  placeholder={
                    config?.imgbb_api_key_configured
                      ? "•••••••• (Đã cấu hình)"
                      : "Nhập ImgBB API Key"
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs font-medium text-slate-200"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveZaloGeneralConfig}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-1.5"
              >
                <Save size={14} /> Lưu Cấu Hình Chung
              </button>
            </div>
          </div>

          {/* Zalo Bots Multi-target Cards (Chuẩn GiamSatRaVao) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Danh Sách Bot Zalo Nhận Tin (Hỗ trợ tới 10 Bot)
                </h3>
                <p className="text-xs text-slate-400">
                  Mỗi khi phát hiện có cháy, hệ thống sẽ gửi tin nhắn đồng loạt tới tất
                  cả các Bot Zalo đang kích hoạt
                </p>
              </div>
              <button
                onClick={handleOpenAddBot}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-blue-600/20"
              >
                <Plus size={14} /> Thêm Bot Zalo
              </button>
            </div>

            {bots.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-xs text-slate-400">
                Chưa có Bot Zalo nào. Nhấn "+ Thêm Bot Zalo" để cài đặt bot và số điện thoại nhận tin cảnh báo.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bots.map((bot, index) => (
                  <div
                    key={bot.id}
                    className={`rounded-2xl border p-4 transition-all ${
                      bot.is_active
                        ? "bg-slate-900/60 border-white/10 shadow-sm"
                        : "bg-slate-950/40 border-white/5 opacity-60"
                    }`}
                  >
                    {/* Header Card */}
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/5">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 font-mono text-xs font-bold border border-blue-500/20">
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-white truncate max-w-[180px]">
                            {bot.name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {bot.is_active ? "🟢 Đang kích hoạt" : "⚪ Đang tạm dừng"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleTestSendZalo(bot.id)}
                          disabled={testSendingId === bot.id}
                          className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          title="Gửi tin nhắn thử nghiệm đến số này"
                        >
                          <Send size={11} />
                          <span>{testSendingId === bot.id ? "Đang gửi..." : "Test"}</span>
                        </button>
                        <button
                          onClick={() => handleOpenEditBot(bot)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition cursor-pointer"
                          title="Sửa cấu hình Bot"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteBot(bot.id)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition cursor-pointer"
                          title="Xóa Bot"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Card Content Details */}
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center py-1 border-b border-white/5">
                        <span className="text-slate-400 text-[11px]">Chat ID người nhận:</span>
                        <span className="font-mono font-bold text-blue-300">
                          {bot.zalo_recipient_id || "Chưa thiết lập"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-400 text-[11px]">Trạng thái Token:</span>
                        {bot.has_token ? (
                          <span className="text-emerald-400 font-bold text-[11px]">
                            ✓ Đã cấu hình Token
                          </span>
                        ) : (
                          <span className="text-amber-400 text-[11px]">
                            ⚠ Chưa nạp Token
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: AI & CÒI HÚ BÁO ĐỘNG */}
      {/* ======================================================== */}
      {activeTab === "ai" && config && (
        <div className="glass-panel p-6 rounded-3xl border border-white/5 space-y-6 max-w-4xl">
          <div className="border-b border-white/10 pb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="text-orange-500" /> Cấu Hình Độ Nhạy AI &amp;
              Còi Báo Động
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Điều chỉnh các ngưỡng thuật toán nhận diện YOLOv8s để loại bỏ báo
              động giả và tối ưu hóa thời gian phản ứng
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Fire Confidence Threshold */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-slate-300">
                  Ngưỡng phát hiện Ngọn Lửa (Fire Confidence)
                </span>
                <span className="font-mono text-orange-400 font-bold">
                  {(config.fire_alert_confidence_threshold * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0.20"
                max="0.80"
                step="0.05"
                value={config.fire_alert_confidence_threshold}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    fire_alert_confidence_threshold: parseFloat(e.target.value),
                  })
                }
                className="w-full accent-orange-500"
              />
              <p className="text-[11px] text-slate-500">
                Mặc định 40%. Độ tin cậy tối thiểu để AI đánh giá là ngọn lửa.
              </p>
            </div>

            {/* Smoke Confidence Threshold */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-slate-300">
                  Ngưỡng phát hiện Khói (Smoke Confidence)
                </span>
                <span className="font-mono text-amber-400 font-bold">
                  {(config.fire_smoke_confidence_threshold * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0.20"
                max="0.80"
                step="0.05"
                value={config.fire_smoke_confidence_threshold}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    fire_smoke_confidence_threshold: parseFloat(e.target.value),
                  })
                }
                className="w-full accent-amber-500"
              />
              <p className="text-[11px] text-slate-500">
                Mặc định 35%. Độ tin cậy tối thiểu để nhận diện làn khói bốc lên.
              </p>
            </div>

            {/* Confirmation Frames */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-slate-300">
                  Số khung hình xác nhận liên tiếp (Khử nhiễu)
                </span>
                <span className="font-mono text-white font-bold">
                  {config.fire_confirmation_frames} frames
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={config.fire_confirmation_frames}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    fire_confirmation_frames: parseInt(e.target.value),
                  })
                }
                className="w-full accent-orange-500"
              />
              <p className="text-[11px] text-slate-500">
                Yêu cầu phát hiện liên tục 2-3 frame trong 2.5s để chống ánh đèn
                phản xạ.
              </p>
            </div>

            {/* Alert Cooldown */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-slate-300">
                  Thời gian giãn cách cảnh báo (Cooldown)
                </span>
                <span className="font-mono text-white font-bold">
                  {config.fire_alert_cooldown} giây
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="120"
                step="5"
                value={config.fire_alert_cooldown}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    fire_alert_cooldown: parseInt(e.target.value),
                  })
                }
                className="w-full accent-orange-500"
              />
              <p className="text-[11px] text-slate-500">
                Khoảng nghỉ giữa 2 lần phát cảnh báo liên tiếp trên cùng một
                camera.
              </p>
            </div>

            {/* Audio Siren Alarm */}
            <div className="space-y-2 md:col-span-2 pt-4 border-t border-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <Volume2 className="text-orange-400" size={16} /> Còi Hú Báo
                    Động Web Audio Siren
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Tự động phát âm thanh còi hú tần số cao khi phát hiện đám
                    cháy
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleTestSiren}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold transition"
                  >
                    🔊 Thử Còi (4s)
                  </button>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.sound_alarm_enabled}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          sound_alarm_enabled: e.target.checked,
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-white/10">
            <button
              onClick={handleSaveAIConfig}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold text-xs transition shadow-lg shadow-orange-500/25 flex items-center gap-2"
            >
              <Save size={16} /> Lưu Toàn Bộ Cấu Hình AI
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: SƠ ĐỒ MẶT BẰNG & GHIM VỊ TRÍ */}
      {/* ======================================================== */}
      {activeTab === "map" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Trình Biên Tập Sơ Đồ Mặt Bằng &amp; Ghim Camera
              </h2>
              <p className="text-xs text-slate-400">
                1. Chọn camera ở danh sách bên dưới ➔ 2. Click vào vị trí trên
                bản đồ để ghim
              </p>
            </div>

            <label className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-orange-600/20">
              <Upload size={14} />
              <span>{isUploadingMap ? "Đang tải..." : "Tải Lên Sơ Đồ Mới"}</span>
              <input
                type="file"
                accept=".svg,.png,.jpg,.jpeg"
                onChange={handleUploadMap}
                className="hidden"
              />
            </label>
          </div>

          {/* Camera Selector & Pin Management */}
          <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Danh Sách Camera Giám Sát:
              </span>
              {selectedPinCamId && (
                <span className="text-xs text-orange-400 font-bold animate-pulse">
                  👉 Nhấp vào vị trí bất kỳ trên sơ đồ bên dưới để đặt vị trí Camera!
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {cameras.map((c) => {
                const isPinned = c.map_pin_x !== null && c.map_pin_y !== null;
                const isSelected = selectedPinCamId === c.id;

                return (
                  <div
                    key={c.id}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                      isSelected
                        ? "bg-orange-500/20 border-orange-500 shadow-md shadow-orange-500/20"
                        : "bg-slate-900/80 border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{c.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {isPinned ? (
                          <span className="text-emerald-400 font-mono font-bold">
                            📍 Đã ghim ({c.map_pin_x}%, {c.map_pin_y}%)
                          </span>
                        ) : (
                          <span className="text-amber-400/80">⚠ Chưa ghim vị trí</span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setSelectedPinCamId(isSelected ? null : c.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                          isSelected
                            ? "bg-orange-600 text-white"
                            : "bg-white/10 hover:bg-white/20 text-slate-300"
                        }`}
                        title={isSelected ? "Bấm để hủy chọn" : "Bấm để đặt vị trí trên bản đồ"}
                      >
                        {isSelected ? "Đang chọn" : "Ghim"}
                      </button>

                      {isPinned && (
                        <button
                          onClick={() => handleDeletePin(c.id)}
                          className="p-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition cursor-pointer"
                          title="Gỡ ghim camera khỏi bản đồ"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Map Canvas */}
          <div className="glass-panel p-4 rounded-3xl border border-white/10 shadow-2xl bg-[var(--ui-surface)]">
            <div
              onClick={handleMapClick}
              className={`relative w-full rounded-2xl overflow-hidden bg-[#090d12] border border-white/10 flex items-center justify-center select-none ${
                selectedPinCamId ? "cursor-crosshair ring-2 ring-orange-500/50" : ""
              }`}
            >
              <div className="relative w-full h-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    sitemap && sitemap.image_path
                      ? `${apiBase}${sitemap.image_path}?v=${mapVersion}`
                      : `/site_map.png?v=${mapVersion}`
                  }
                  alt="Sơ đồ mặt bằng"
                  className="w-full h-auto block select-none pointer-events-none"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `/site_map.png?v=${mapVersion}`;
                  }}
                />

                {/* Existing Pins Layer */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  {cameras.map((cam) => {
                    if (
                      cam.map_pin_x === null ||
                      cam.map_pin_x === undefined ||
                      cam.map_pin_y === null ||
                      cam.map_pin_y === undefined
                    ) {
                      return null;
                    }

                    const isSelected = selectedPinCamId === cam.id;

                    return (
                      <div
                        key={cam.id}
                        style={{
                          left: `${cam.map_pin_x}%`,
                          top: `${cam.map_pin_y}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                        className="absolute select-none pointer-events-auto z-20 group"
                      >
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPinCamId(cam.id);
                          }}
                          className={`w-9 h-9 rounded-full flex items-center justify-center shadow-xl border-2 transition-transform duration-200 group-hover:scale-110 cursor-pointer ${
                            isSelected
                              ? "bg-orange-600 text-white border-white scale-125 shadow-orange-500/50 shadow-lg"
                              : "bg-emerald-600 text-white border-white/90"
                          }`}
                          title={`Nhấp để đổi vị trí cho ${cam.name}`}
                        >
                          <Video size={16} />
                        </div>

                        {/* Label name */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 rounded bg-slate-950/90 border border-slate-800 text-[10px] font-bold text-emerald-400 whitespace-nowrap shadow-md select-none">
                          {cam.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: NGƯỜI DÙNG & PHÂN QUYỀN */}
      {/* ======================================================== */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Danh Sách Tài Khoản Người Dùng
            </h2>
            <button
              onClick={() => setShowUserModal(true)}
              className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-orange-600/20"
            >
              <Plus size={14} /> Thêm Người Dùng
            </button>
          </div>

          <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900/80 border-b border-white/10 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Tên Đăng Nhập</th>
                  <th className="py-3 px-4">Họ Và Tên</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Vai Trò</th>
                  <th className="py-3 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-white/5 transition">
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      {u.username}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-200">
                      {u.full_name}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {u.email || "–"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          u.role === "admin"
                            ? "bg-red-500/20 text-red-400 border border-red-500/30"
                            : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        }`}
                      >
                        {u.role === "admin" ? "Quản trị viên" : "Trực ban"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 6: NHẬT KÝ & TRẠNG THÁI HỆ THỐNG */}
      {/* ======================================================== */}
      {activeTab === "audit" && (
        <div className="space-y-6">
          {/* Health Box */}
          <div className="glass-panel p-5 rounded-2xl border border-white/5 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">
                Trạng Thái Máy Chủ
              </p>
              <p className="text-base font-extrabold text-emerald-400 flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                ONLINE (Sẵn sàng)
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">
                Thiết Bị Tính Toán AI
              </p>
              <p className="text-base font-mono font-extrabold text-orange-400 mt-0.5">
                {systemHealth?.ai_engine?.device?.toUpperCase() || "CPU"}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">
                Mô Hình Nhận Diện
              </p>
              <p className="text-sm font-extrabold text-white mt-0.5">
                YOLOv8s (Fire &amp; Smoke)
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">
                Phiên Bản Phần Mềm
              </p>
              <p className="text-sm font-mono font-extrabold text-slate-300 mt-0.5">
                v{systemHealth?.version || "2.0.0"}
              </p>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Nhật Ký Thao Tác Quản Trị (Audit Logs)
            </h3>
            <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900/80 border-b border-white/10 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Thời Gian</th>
                    <th className="py-3 px-4">Người Thực Hiện</th>
                    <th className="py-3 px-4">Hành Động</th>
                    <th className="py-3 px-4">Đối Tượng</th>
                    <th className="py-3 px-4">Chi Tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/5 transition">
                      <td className="py-2.5 px-4 font-mono text-slate-400">
                        {new Date(log.created_at).toLocaleString("vi-VN", {
                          hour12: false,
                        })}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-white">
                        {log.username || "System"}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-white/5 font-mono text-[10px] font-bold text-orange-300">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-400 font-mono">
                        {log.target_type} #{log.target_id || ""}
                      </td>
                      <td className="py-2.5 px-4 text-slate-300">
                        {log.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: THÊM / SỬA CAMERA */}
      {/* ======================================================== */}
      {showCameraModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="max-w-md w-full glass-panel rounded-3xl p-6 border border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingCamera ? "Cập Nhật Camera" : "Thêm Camera Mới"}
              </h3>
              <button
                onClick={() => setShowCameraModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCamera} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">
                  Tên Camera
                </label>
                <input
                  type="text"
                  required
                  value={cameraForm.name}
                  onChange={(e) =>
                    setCameraForm({ ...cameraForm, name: e.target.value })
                  }
                  placeholder="Ví dụ: Camera 1 - Xưởng Cơ Khí"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">
                  Vị trí / Khu vực
                </label>
                <input
                  type="text"
                  value={cameraForm.location}
                  onChange={(e) =>
                    setCameraForm({ ...cameraForm, location: e.target.value })
                  }
                  placeholder="Ví dụ: Tầng 1 - Gian máy ép"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">
                  Loại nguồn video
                </label>
                <select
                  value={cameraForm.camera_type}
                  onChange={(e) => {
                    const newType = e.target.value;
                    let defaultSrc = cameraForm.rtsp_url;
                    if (newType === "demo" && demoVideos.length > 0)
                      defaultSrc = `demo:${demoVideos[0]}`;
                    if (newType === "webcam") defaultSrc = "webcam:0";
                    setCameraForm({
                      ...cameraForm,
                      camera_type: newType,
                      rtsp_url: defaultSrc,
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-200"
                >
                  <option value="rtsp">Luồng Camera RTSP</option>
                  <option value="webcam">Webcam USB cục bộ</option>
                  <option value="demo">File Video Demo (MP4)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">
                  Đường dẫn nguồn (RTSP URL / Tên file demo)
                </label>
                {cameraForm.camera_type === "demo" ? (
                  <select
                    value={cameraForm.rtsp_url}
                    onChange={(e) =>
                      setCameraForm({ ...cameraForm, rtsp_url: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-200"
                  >
                    {demoVideos.map((v) => (
                      <option key={v} value={`demo:${v}`}>
                        {v}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    value={cameraForm.rtsp_url}
                    onChange={(e) =>
                      setCameraForm({ ...cameraForm, rtsp_url: e.target.value })
                    }
                    placeholder="rtsp://admin:pass@192.168.1.100:554/stream1"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-orange-500"
                  />
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCameraModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 text-xs font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-lg shadow-orange-600/20"
                >
                  Lưu Camera
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: THÊM / SỬA BOT ZALO */}
      {/* ======================================================== */}
      {showBotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="max-w-md w-full glass-panel rounded-3xl p-6 border border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingBot ? "Cập Nhật Bot Zalo" : "Thêm Bot Zalo Mới"}
              </h3>
              <button
                onClick={() => setShowBotModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBot} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">
                  Tên Bot / Bộ Phận Nhận Tin
                </label>
                <input
                  type="text"
                  required
                  value={botForm.name}
                  onChange={(e) =>
                    setBotForm({ ...botForm, name: e.target.value })
                  }
                  placeholder="Ví dụ: Bot 1: Trực ban PCCC"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* 2. Bot Access Token */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Bot Access Token (Từ Zapps Bot)
                </label>
                <textarea
                  rows={2}
                  value={botForm.zalo_access_token}
                  onChange={(e) =>
                    setBotForm({
                      ...botForm,
                      zalo_access_token: e.target.value,
                    })
                  }
                  placeholder={
                    editingBot?.has_token
                      ? "•••••••• (Giữ nguyên hoặc nhập token mới)"
                      : "Dán Token Bot Zapps vào đây..."
                  }
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                />
                <p className="text-[11px] text-amber-400/90 leading-relaxed bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg">
                  💡 <b>Cách lấy ID tự động:</b> Mở Zalo, gửi 1 tin nhắn bất kỳ (như <i>&quot;Hello&quot;</i>) cho Bot này, rồi bấm nút <b>&quot;Lấy ID Tự Động&quot;</b> bên dưới.
                </p>
              </div>

              {/* 3. Chat ID Người Nhận Tin kèm Nút Lấy ID */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Chat ID Người Nhận Tin</span>
                  <span className="text-[10px] text-blue-400 font-normal">Tự nhận diện từ tin nhắn</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={botForm.zalo_recipient_id}
                    onChange={(e) =>
                      setBotForm({
                        ...botForm,
                        zalo_recipient_id: e.target.value,
                      })
                    }
                    placeholder="Bấm Lấy ID hoặc nhập Chat ID..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500 min-w-0 flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => handleAutoGetId(botForm.zalo_access_token)}
                    disabled={isCheckingId}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-600/20"
                    title="Đọc tin nhắn mới nhất bạn gửi cho Bot trên Zalo và tự động điền ID"
                  >
                    {isCheckingId ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Đang tìm...</span>
                      </>
                    ) : (
                      <>
                        <Search size={13} />
                        <span>Lấy ID Tự Động</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="botActive"
                  checked={botForm.is_active}
                  onChange={(e) =>
                    setBotForm({ ...botForm, is_active: e.target.checked })
                  }
                  className="accent-blue-600 w-4 h-4 rounded"
                />
                <label
                  htmlFor="botActive"
                  className="text-xs font-bold text-slate-300 cursor-pointer"
                >
                  Kích hoạt nhận tin ngay
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowBotModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 text-xs font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/20"
                >
                  Lưu Bot Zalo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: THÊM NGƯỜI DÙNG */}
      {/* ======================================================== */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="max-w-md w-full glass-panel rounded-3xl p-6 border border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">
                Thêm Người Dùng Mới
              </h3>
              <button
                onClick={() => setShowUserModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">
                  Tên đăng nhập
                </label>
                <input
                  type="text"
                  required
                  value={userForm.username}
                  onChange={(e) =>
                    setUserForm({ ...userForm, username: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">
                  Mật khẩu khởi tạo
                </label>
                <input
                  type="password"
                  required
                  value={userForm.password}
                  onChange={(e) =>
                    setUserForm({ ...userForm, password: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">
                  Họ và tên
                </label>
                <input
                  type="text"
                  required
                  value={userForm.full_name}
                  onChange={(e) =>
                    setUserForm({ ...userForm, full_name: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">
                  Vai trò (Quyền hạn)
                </label>
                <select
                  value={userForm.role}
                  onChange={(e) =>
                    setUserForm({ ...userForm, role: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-200"
                >
                  <option value="operator">Trực ban vận hành</option>
                  <option value="admin">Quản trị viên (Admin)</option>
                  <option value="viewer">Người xem giám sát</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 text-xs font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-lg shadow-orange-600/20"
                >
                  Tạo Tài Khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

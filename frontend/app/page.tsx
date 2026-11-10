"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Flame,
  Video,
  Play,
  Square,
  RefreshCw,
  Trash2,
  MapPin,
  Maximize2,
  X,
  ExternalLink,
  Radio,
  Film,
  CheckCircle2,
  Zap,
  UploadCloud,
  FileVideo,
} from "lucide-react";
import { FireCamera, FireAlert, FireAlertStats } from "@/src/types";
import { apiFetch } from "@/src/services/api";
import { getRuntimeApiBaseUrl } from "@/src/utils/constants";
import { useFireAlert } from "@/src/contexts/FireAlertContext";

export default function FireDashboardPage() {
  const [cameras, setCameras] = useState<FireCamera[]>([]);
  const [stats, setStats] = useState<FireAlertStats | null>(null);
  const [aiStatus, setAiStatus] = useState<any>(null);
  const [demoVideos, setDemoVideos] = useState<string[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<FireAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Upload video state for Demo mode
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Selected snapshot to preview modal
  const [previewSnapshot, setPreviewSnapshot] = useState<string | null>(null);

  // Mode: "live" | "demo"
  const [mode, setMode] = useState<"live" | "demo">("live");

  // Layout: 1, 2, or 4
  const [layout, setLayout] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("fire_grid_layout");
      return saved ? parseInt(saved, 10) : 1;
    }
    return 1;
  });

  // Selected camera for 1-frame layout
  const [selectedCameraId, setSelectedCameraId] = useState<number | null>(null);

  // Selected demo video clip
  const [selectedDemoClip, setSelectedDemoClip] = useState<string>("fire1.mp4");

  const { activeAlert } = useFireAlert();
  const apiBase = getRuntimeApiBaseUrl();

  const showNotification = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  const loadData = useCallback(async () => {
    try {
      const [camsRes, statsRes, aiRes, videosRes, alertsRes] = await Promise.all([
        apiFetch("/api/fire-cameras"),
        apiFetch("/api/fire-alerts/stats"),
        apiFetch("/api/ai/status"),
        apiFetch("/api/demo-feed/videos"),
        apiFetch("/api/fire-alerts?limit=8"),
      ]);

      if (camsRes.ok) {
        const camsData = await camsRes.json();
        setCameras(camsData);
        if (camsData.length > 0 && selectedCameraId === null) {
          setSelectedCameraId(camsData[0].id);
        }
      }
      if (statsRes.ok) setStats(await statsRes.json());
      if (aiRes.ok) setAiStatus(await aiRes.json());
      if (videosRes.ok) {
        const vList = await videosRes.json();
        setDemoVideos(vList);
        if (vList.length > 0 && !selectedDemoClip) {
          setSelectedDemoClip(vList[0]);
        }
      }
      if (alertsRes.ok) {
        const aData = await alertsRes.json();
        setRecentAlerts(aData.data || []);
      }
    } catch (e) {
      console.error("Lỗi nạp dữ liệu dashboard:", e);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCameraId, selectedDemoClip]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleLayoutChange = (newLayout: number) => {
    setLayout(newLayout);
    localStorage.setItem("fire_grid_layout", String(newLayout));
  };

  const isLiveRunning = Boolean(
    aiStatus?.is_running &&
    (aiStatus?.current_mode === "live" || !aiStatus?.current_mode)
  );
  const isDemoRunning = Boolean(
    aiStatus?.is_running && aiStatus?.current_mode === "demo"
  );
  const isAiRunning = Boolean(aiStatus?.is_running);
  // Toggle Live AI Running
  const handleToggleLive = async () => {
    const shouldRun = !isLiveRunning;
    setIsActing(true);
    try {
      const endpoint = shouldRun ? "/api/ai/live/start" : "/api/ai/live/stop";
      const res = await apiFetch(endpoint, { method: "POST" });
      if (res.ok) {
        showNotification(
          shouldRun
            ? "✅ ĐÃ BẬT GIÁM SÁT TRỰC TIẾP (LIVE)"
            : "⏸ ĐÃ DỪNG GIÁM SÁT TRỰC TIẾP"
        );
        await loadData();
      }
    } catch {
      showNotification("❌ Lỗi khi điều khiển camera trực tiếp");
    } finally {
      setIsActing(false);
    }
  };

  // Toggle Demo Running
  const handleToggleDemo = async () => {
    const shouldRun = !isDemoRunning;
    setIsActing(true);
    try {
      if (shouldRun) {
        const res = await apiFetch("/api/ai/demo/start", {
          method: "POST",
          body: JSON.stringify({ clip_name: selectedDemoClip || "fire1.mp4" }),
        });
        if (res.ok) {
          showNotification(`🎬 ĐÃ BẬT VIDEO DEMO: ${selectedDemoClip || "fire1.mp4"}`);
          await loadData();
        }
      } else {
        const res = await apiFetch("/api/ai/demo/stop", { method: "POST" });
        if (res.ok) {
          showNotification("⏸ ĐÃ DỪNG PHÁT VIDEO DEMO");
          await loadData();
        }
      }
    } catch {
      showNotification("❌ Lỗi khi điều khiển video demo");
    } finally {
      setIsActing(false);
    }
  };

  // Switch demo clip
  const handleSelectDemoClip = async (clipName: string) => {
    setSelectedDemoClip(clipName);
    if (isDemoRunning) {
      setIsActing(true);
      try {
        await apiFetch("/api/ai/demo/start", {
          method: "POST",
          body: JSON.stringify({ clip_name: clipName }),
        });
        showNotification(`🎬 Đã chuyển sang clip demo: ${clipName}`);
        await loadData();
      } finally {
        setIsActing(false);
      }
    }
  };

  // Handle Video File Upload for Demo
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["mp4", "avi", "mov", "mkv"].includes(ext || "")) {
      alert("Chỉ hỗ trợ file định dạng .mp4, .avi, .mov, .mkv");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await apiFetch("/api/demo-feed/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setUploadedFileName(data.filename);
        setSelectedDemoClip(data.filename);
        showNotification(`✅ Đã tải lên video demo: ${data.filename}`);
        await loadData();

        // Tự động chuyển sang và kích hoạt phát video vừa upload
        if (mode === "demo") {
          await apiFetch("/api/ai/demo/start", {
            method: "POST",
            body: JSON.stringify({ clip_name: data.filename }),
          });
          await loadData();
        }
      } else {
        const err = await res.json();
        alert(err.detail || "Tải video lên thất bại");
      }
    } catch {
      alert("Lỗi kết nối khi tải video lên");
    } finally {
      setIsUploading(false);
    }
  };

  // Switch Mode Live / Demo
  const handleModeSwitch = (newMode: "live" | "demo") => {
    setMode(newMode);
  };

  // Simulate fire alert
  const handleSimulateAlert = async () => {
    setIsActing(true);
    try {
      const res = await apiFetch("/api/ai/simulate", {
        method: "POST",
        body: JSON.stringify({ alert_type: "fire" }),
      });
      if (res.ok) {
        showNotification("🚨 ĐÃ KÍCH HOẠT SỰ CỐ GIẢ LẬP!");
        await loadData();
      }
    } catch {
      showNotification("❌ Lỗi khi bắn sự kiện giả lập");
    } finally {
      setIsActing(false);
    }
  };

  // Clear demo data
  const handleClearDemoData = async () => {
    if (!confirm("Bạn có chắc muốn dọn sạch toàn bộ cảnh báo thử nghiệm rác?")) return;
    setIsActing(true);
    try {
      const res = await apiFetch("/api/ai/clear-demo", { method: "POST" });
      if (res.ok) {
        showNotification("🧹 ĐÃ DỌN SẠCH DỮ LIỆU CẢNH BÁO THỬ NGHIỆM!");
        await loadData();
      }
    } catch {
      showNotification("❌ Lỗi khi dọn dữ liệu");
    } finally {
      setIsActing(false);
    }
  };

  const runningCamIds = new Set<number>(
    (aiStatus?.cameras || []).map((c: any) => c.id)
  );

  // Determine which cameras to display
  let displayedCameras: FireCamera[] = [];
  if (layout === 1) {
    const target = cameras.find((c) => c.id === selectedCameraId) || cameras[0];
    displayedCameras = target ? [target] : [];
  } else {
    displayedCameras = cameras.slice(0, layout);
  }

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {notice && (
        <div className="fixed bottom-6 right-6 z-50 bg-[var(--ui-surface-raised)] border border-orange-500/50 text-[var(--ui-text)] px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in">
          <span className="w-2 h-2 rounded-full bg-orange-400 animate-ping" />
          <span>{notice}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. TOP HEADER (TINH GỌN, KHÔNG TRÙNG LẶP LOA/CHUÔNG)      */}
      {/* ======================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--ui-border)]">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-md">
            <Flame className="h-6 w-6 animate-flame" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-[var(--ui-text)] uppercase tracking-tight">
              TRUNG TÂM <span className="text-orange-500">BÁO CHÁY</span>
            </h1>
            <p className="text-[11px] font-mono text-[var(--ui-text-muted)] flex items-center gap-1.5 mt-0.5">
              <span>FIRE DETECTION ENGINE</span>
              <span>&bull;</span>
              <span>YOLOv8s CPU</span>
              <span>&bull;</span>
              {isAiRunning ? (
                <span className="text-emerald-400 font-bold">ĐANG HOẠT ĐỘNG</span>
              ) : (
                <span className="text-amber-400 font-bold">CHẾ ĐỘ CHỜ (STANDBY)</span>
              )}
            </p>
          </div>
        </div>

        {/* Quick Top Actions (Không có loa hay chuông trùng lặp) */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <Link
            href="/map"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--ui-surface-subtle)] hover:bg-[var(--ui-surface-raised)] border border-[var(--ui-border)] text-[var(--ui-text)] text-xs font-bold transition cursor-pointer"
          >
            <MapPin size={13} className="text-orange-400" />
            <span>Sơ Đồ Mặt Bằng 2D</span>
          </Link>

          <button
            onClick={loadData}
            className="p-2 rounded-xl bg-[var(--ui-surface-subtle)] border border-[var(--ui-border)] text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-surface-raised)] transition cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. MAIN 2-COLUMN LAYOUT (GIAMSATRAVAO DESIGN)             */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* ====================================================== */}
        {/* CỘT TRÁI (2/3): PANEL CAMERA & BỘ ĐIỀU KHIỂN           */}
        {/* ====================================================== */}
        <div className="xl:col-span-2 flex flex-col gap-3.5">
          {/* Thanh Điều Khiển Tích Hợp (Control Bar) */}
          <div className="ui-panel p-2.5 rounded-xl border border-[var(--ui-border)] flex flex-wrap items-center justify-between gap-2.5 bg-[var(--ui-surface)] shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              {/* Chế độ: TRỰC TIẾP vs DEMO */}
              <div className="flex bg-[var(--ui-canvas)] p-0.5 rounded-lg border border-[var(--ui-border)]">
                <button
                  onClick={() => handleModeSwitch("live")}
                  className={`px-2.5 py-1 text-[11px] rounded-md font-bold transition flex items-center gap-1 cursor-pointer ${
                    mode === "live"
                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-sm"
                      : "text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]"
                  }`}
                >
                  <Radio size={12} />
                  <span>TRỰC TIẾP</span>
                </button>
                <button
                  onClick={() => handleModeSwitch("demo")}
                  className={`px-2.5 py-1 text-[11px] rounded-md font-bold transition flex items-center gap-1 cursor-pointer ${
                    mode === "demo"
                      ? "bg-orange-500/20 text-orange-400 border border-orange-500/30 shadow-sm"
                      : "text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]"
                  }`}
                >
                  <Film size={12} />
                  <span>DEMO</span>
                </button>
              </div>

              {/* BỘ ĐIỀU KHIỂN CHẾ ĐỘ TRỰC TIẾP (LIVE) */}
              {mode === "live" && (
                <>
                  {/* Bộ chọn Layout: 1, 2, 4 Khung */}
                  <select
                    value={layout}
                    onChange={(e) => handleLayoutChange(parseInt(e.target.value, 10))}
                    className="bg-[var(--ui-canvas)] border border-[var(--ui-border)] text-[var(--ui-text)] text-[11px] font-bold rounded-lg px-2.5 py-1 outline-none hover:border-[var(--ui-border-strong)] transition cursor-pointer"
                  >
                    <option value={1}>1 Khung hình</option>
                    <option value={2}>2 Khung hình</option>
                    <option value={4}>4 Khung hình</option>
                  </select>

                  {/* Nếu Layout 1: Dropdown chọn camera */}
                  {layout === 1 && cameras.length > 0 && (
                    <select
                      value={selectedCameraId || ""}
                      onChange={(e) => setSelectedCameraId(parseInt(e.target.value, 10))}
                      className="bg-[var(--ui-canvas)] border border-[var(--ui-border)] text-[var(--ui-text)] text-[11px] font-bold rounded-lg px-2.5 py-1 outline-none hover:border-[var(--ui-border-strong)] transition cursor-pointer max-w-[170px] truncate"
                    >
                      {cameras.map((cam) => (
                        <option key={cam.id} value={cam.id}>
                          🎥 {cam.name}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Nút BẬT / TẮT GIÁM SÁT TRỰC TIẾP */}
                  <button
                    onClick={handleToggleLive}
                    disabled={isActing}
                    className={`px-3.5 py-1 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                      isLiveRunning
                        ? "bg-red-500/20 text-red-300 border border-red-500/35 hover:bg-red-500/30"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 hover:bg-emerald-500/30"
                    }`}
                  >
                    {isLiveRunning ? (
                      <>
                        <Square size={12} fill="currentColor" />
                        <span>TẮT GIÁM SÁT</span>
                      </>
                    ) : (
                      <>
                        <Play size={12} fill="currentColor" />
                        <span>BẬT GIÁM SÁT</span>
                      </>
                    )}
                  </button>
                </>
              )}

              {/* BỘ ĐIỀU KHIỂN CHẾ ĐỘ DEMO */}
              {mode === "demo" && (
                <>
                  {/* Dropdown chọn Clip */}
                  {demoVideos.length > 0 && (
                    <select
                      value={selectedDemoClip}
                      onChange={(e) => handleSelectDemoClip(e.target.value)}
                      className="bg-[var(--ui-canvas)] border border-[var(--ui-border)] text-orange-400 text-[11px] font-bold rounded-lg px-2.5 py-1 outline-none hover:border-orange-500/50 transition cursor-pointer max-w-[190px] truncate"
                    >
                      {demoVideos.map((clip) => (
                        <option key={clip} value={clip}>
                          📽️ {clip}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Nút Tải Video Demo lên */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || isActing}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[var(--ui-canvas)] border border-[var(--ui-border)] text-[var(--ui-text)] hover:text-orange-400 hover:border-orange-500/40 transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    title="Tải lên video MP4 để test nhận diện"
                  >
                    <UploadCloud size={12} />
                    <span>Tải Video</span>
                  </button>

                  {/* Nút BẬT / DỪNG DEMO */}
                  <button
                    onClick={handleToggleDemo}
                    disabled={isActing}
                    className={`px-3.5 py-1 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                      isDemoRunning
                        ? "bg-red-500/20 text-red-300 border border-red-500/35 hover:bg-red-500/30"
                        : "bg-orange-500/20 text-orange-300 border border-orange-500/35 hover:bg-orange-500/30"
                    }`}
                  >
                    {isDemoRunning ? (
                      <>
                        <Square size={12} fill="currentColor" />
                        <span>DỪNG DEMO</span>
                      </>
                    ) : (
                      <>
                        <Play size={12} fill="currentColor" />
                        <span>BẬT DEMO</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>

            {/* Trạng thái FPS & Trạng thái chạy */}
            <div className="flex items-center gap-1.5 text-[11px] font-mono pr-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  (mode === "live" ? isLiveRunning : isDemoRunning)
                    ? "bg-emerald-400 animate-pulse"
                    : "bg-slate-500"
                }`}
              />
              <span className={(mode === "live" ? isLiveRunning : isDemoRunning) ? "text-emerald-400 font-bold" : "text-[var(--ui-text-muted)]"}>
                {(mode === "live" ? isLiveRunning : isDemoRunning) ? "ONLINE • ~25 FPS" : "STANDBY"}
              </span>
            </div>
          </div>

          {/* Khung Màn Hình Video Viewport */}
          <div
            className={`ui-panel rounded-2xl overflow-hidden border transition-all duration-300 ${
              activeAlert
                ? "border-red-500 fire-alert-glow shadow-[0_0_30px_rgba(239,68,68,0.4)]"
                : "border-[var(--ui-border)]"
            }`}
          >
            {/* 1. CHẾ ĐỘ TRỰC TIẾP (LIVE) */}
            {mode === "live" ? (
              isLiveRunning && displayedCameras.length > 0 ? (
                <div
                  className={`grid gap-2 bg-[#090d12] p-2 ${
                    layout === 1
                      ? "grid-cols-1"
                      : layout === 2
                      ? "grid-cols-1 md:grid-cols-2"
                      : "grid-cols-2"
                  }`}
                >
                  {displayedCameras.map((cam) => {
                    const isCamAlerting = activeAlert && activeAlert.camera_id === cam.id;
                    return (
                      <div
                        key={cam.id}
                        className={`relative aspect-video rounded-xl overflow-hidden bg-black border flex items-center justify-center transition-all ${
                          isCamAlerting
                            ? "border-red-500 fire-alert-glow shadow-inner"
                            : "border-[var(--ui-border)]"
                        }`}
                      >
                        {/* Live Stream MJPEG của từng camera */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`${apiBase}/api/stream/${cam.id}`}
                          alt={cam.name}
                          className="w-full h-full object-contain pointer-events-none"
                        />

                        {/* Header overlay */}
                        <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-md bg-[#10151b]/85 backdrop-blur-sm border border-[var(--ui-border)] text-xs font-bold text-[var(--ui-text)] flex items-center gap-1.5 shadow-sm">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="truncate max-w-[180px]">{cam.name}</span>
                        </div>

                        {/* Fire Alert badge overlay */}
                        {isCamAlerting && (
                          <div className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-md bg-red-600 text-white text-[11px] font-black flex items-center gap-1 shadow-lg animate-pulse">
                            <Flame size={13} /> CẢNH BÁO HỎA HOẠN
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Màn Hình Chờ Chế Độ Trực Tiếp */
                <div className="aspect-video w-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-[#10151b] to-[#0c1015] relative select-none">
                  <div className="w-16 h-16 rounded-2xl bg-[var(--ui-surface)] border border-[var(--ui-border)] flex items-center justify-center text-[var(--ui-text-muted)] shadow-inner mb-3">
                    <Video size={30} className="text-blue-400" />
                  </div>
                  <h3 className="text-sm font-extrabold text-[var(--ui-text)] uppercase tracking-wider">
                    CHẾ ĐỘ TRỰC TIẾP (STANDBY)
                  </h3>
                  <p className="text-xs text-[var(--ui-text-muted)] max-w-md mt-1 mb-4 leading-relaxed">
                    Hệ thống camera trực tiếp đang ở chế độ chờ. Bấm nút <b>▶ BẬT GIÁM SÁT</b> để kích hoạt AI nhận diện khói lửa trên các camera thực tế.
                  </p>
                  <button
                    onClick={handleToggleLive}
                    disabled={isActing}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-blue-600/30 cursor-pointer disabled:opacity-50"
                  >
                    <Play size={14} fill="currentColor" /> Bật Giám Sát Trực Tiếp
                  </button>
                </div>
              )
            ) : (
              /* 2. CHẾ ĐỘ DEMO */
              isDemoRunning ? (
                <div className="relative aspect-video w-full bg-[#090d12] flex items-center justify-center overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${apiBase}/api/stream/demo`}
                    alt="Demo Stream"
                    className="w-full h-full object-contain pointer-events-none"
                  />
                  <div className="absolute top-2.5 left-2.5 px-3 py-1 rounded-md bg-[#10151b]/90 backdrop-blur-sm border border-orange-500/40 text-xs font-bold text-orange-400 flex items-center gap-2 shadow-md">
                    <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                    <span>🎬 [DEMO] VIDEO THỬ NGHIỆM: {selectedDemoClip}</span>
                  </div>
                  {activeAlert && (
                    <div className="absolute top-2.5 right-2.5 px-3 py-1 rounded-md bg-red-600 text-white text-xs font-black flex items-center gap-1.5 shadow-lg animate-pulse">
                      <Flame size={14} /> CẢNH BÁO HỎA HOẠN (DEMO)
                    </div>
                  )}
                </div>
              ) : (
                /* Giao diện tải video lên & chọn video thử nghiệm */
                <div className="aspect-video w-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[#10151b] to-[#0c1015] relative select-none">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleVideoUpload}
                    accept="video/mp4,video/avi,video/mov,video/mkv"
                    className="hidden"
                    id="demo-video-file"
                  />

                  <div className="max-w-md w-full space-y-4">
                    {/* Upload Box */}
                    <label
                      htmlFor="demo-video-file"
                      className="block p-6 rounded-2xl border-2 border-dashed border-orange-500/30 hover:border-orange-500/60 bg-[var(--ui-surface)] hover:bg-[var(--ui-surface-subtle)] transition cursor-pointer group"
                    >
                      {isUploading ? (
                        <div className="py-2 space-y-2">
                          <RefreshCw size={28} className="text-orange-400 animate-spin mx-auto" />
                          <p className="text-xs font-bold text-orange-400">Đang tải video lên máy chủ...</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                            <UploadCloud size={24} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[var(--ui-text)]">
                              Kéo thả hoặc <span className="text-orange-400 underline">chọn video tải lên</span>
                            </p>
                            <p className="text-[10px] text-[var(--ui-text-muted)] mt-0.5">
                              Hỗ trợ định dạng MP4, AVI, MOV, MKV (Tối đa 100MB)
                            </p>
                          </div>
                        </div>
                      )}
                    </label>

                    {/* Hiện trạng file đã chọn */}
                    <div className="p-3 rounded-xl bg-[var(--ui-surface-subtle)] border border-[var(--ui-border)] flex items-center justify-between gap-3 text-left">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileVideo size={20} className="text-orange-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[var(--ui-text)] truncate">
                            {selectedDemoClip || "Chưa có video được chọn"}
                          </p>
                          <p className="text-[10px] text-[var(--ui-text-muted)]">
                            {uploadedFileName === selectedDemoClip ? "Video vừa tải lên" : "Video mẫu có sẵn"}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={handleToggleDemo}
                        disabled={isActing || isUploading}
                        className="px-4 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-md shadow-orange-600/20 cursor-pointer disabled:opacity-50"
                      >
                        <Play size={12} fill="currentColor" /> Bật Demo
                      </button>
                    </div>

                    {/* Hàng chọn nhanh video mẫu */}
                    {demoVideos.length > 0 && (
                      <div className="pt-1">
                        <p className="text-[10px] text-[var(--ui-text-muted)] font-mono uppercase tracking-wider mb-2">
                          Hoặc chọn nhanh video mẫu:
                        </p>
                        <div className="flex flex-wrap justify-center gap-1.5">
                          {demoVideos.map((clip) => (
                            <button
                              key={clip}
                              onClick={() => handleSelectDemoClip(clip)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                                selectedDemoClip === clip
                                  ? "bg-orange-500/25 text-orange-400 border border-orange-500/40"
                                  : "bg-[var(--ui-surface)] text-[var(--ui-text-muted)] border border-[var(--ui-border)] hover:text-[var(--ui-text)]"
                              }`}
                            >
                              📽️ {clip}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            )}
          </div>

          {/* 2 Thẻ Chỉ Số Gọn Gàng Ngay Dưới Video (Chuẩn GiamSatRaVao) */}
          <div className="grid grid-cols-2 gap-3.5">
            {/* Thẻ 1: Trạng thái hệ thống */}
            <div className="ui-panel p-3.5 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] flex flex-col justify-between">
              <p className="text-[10px] text-[var(--ui-text-muted)] font-mono uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                Trạng thái hệ thống
              </p>
              <div className="mt-1.5 text-base sm:text-lg font-black truncate">
                {activeAlert ? (
                  <span className="text-red-400 animate-pulse flex items-center gap-1.5">
                    <Flame size={18} /> PHÁT HIỆN HỎA HOẠN!
                  </span>
                ) : isAiRunning ? (
                  <span className="text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 size={18} /> An toàn (Đang quét)
                  </span>
                ) : (
                  <span className="text-[var(--ui-text-muted)] flex items-center gap-1.5">
                    ⏸ Chế độ chờ (0% CPU)
                  </span>
                )}
              </div>
            </div>

            {/* Thẻ 2: Số lần cảnh báo */}
            <div className="ui-panel p-3.5 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] flex flex-col justify-between">
              <p className="text-[10px] text-[var(--ui-text-muted)] font-mono uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                Số sự cố hôm nay
              </p>
              <div className="mt-1.5 text-base sm:text-lg font-black text-[var(--ui-text)] flex items-baseline gap-1.5">
                <span className="text-orange-400">{stats?.alerts_today || 0}</span>
                <span className="text-xs font-normal text-[var(--ui-text-muted)]">
                  biến cố ({runningCamIds.size} cam online)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ====================================================== */}
        {/* CỘT PHẢI (1/3): LỊCH SỬ & BẰNG CHỨNG THỜI GIAN THỰC     */}
        {/* ====================================================== */}
        <div className="xl:col-span-1 flex flex-col gap-3.5">
          <div className="ui-panel rounded-2xl border border-[var(--ui-border)] p-4 bg-[var(--ui-surface)] flex-1 flex flex-col min-h-[500px] shadow-sm">
            {/* Header Lịch Sử: Thùng rác nằm cạnh lịch sử */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--ui-border)]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                <h2 className="text-xs font-black text-[var(--ui-text)] uppercase tracking-wider">
                  Lịch Sử Sự Cố Gần Đây
                </h2>
              </div>

              {/* Các thao tác cạnh lịch sử: Thùng rác dọn test & Xem tất cả */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearDemoData}
                  disabled={isActing}
                  className="p-1.5 rounded-lg bg-[var(--ui-surface-subtle)] border border-[var(--ui-border)] hover:border-red-500/40 text-[var(--ui-text-muted)] hover:text-red-400 transition cursor-pointer disabled:opacity-50"
                  title="Dọn sạch toàn bộ cảnh báo thử nghiệm rác trong CSDL"
                >
                  <Trash2 size={13} />
                </button>

                <Link
                  href="/alerts"
                  className="text-[11px] text-[var(--ui-text-muted)] hover:text-orange-400 font-semibold transition flex items-center gap-1"
                  title="Đi đến trang quản lý lịch sử sự cố & bằng chứng"
                >
                  <span>Xem tất cả</span>
                  <ExternalLink size={11} />
                </Link>
              </div>
            </div>

            {/* Danh Sách Sự Cố */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {recentAlerts.length > 0 ? (
                recentAlerts.map((alert) => {
                  const time = new Date(alert.created_at).toLocaleTimeString("vi-VN");
                  const isFire = alert.alert_type.includes("fire");
                  const snapshotUrl = alert.snapshot_path
                    ? alert.snapshot_path.startsWith("http")
                      ? alert.snapshot_path
                      : `${apiBase}${alert.snapshot_path}`
                    : null;

                  return (
                    <div
                      key={alert.id}
                      className="p-2.5 rounded-xl bg-[var(--ui-surface-subtle)] border border-[var(--ui-border)] hover:border-[var(--ui-border-strong)] transition flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isFire
                              ? "bg-red-500/15 text-red-400 border border-red-500/25"
                              : "bg-amber-500/15 text-amber-400 border border-amber-500/25"
                          }`}
                        >
                          <Flame size={16} />
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[var(--ui-text)] truncate">
                            {alert.camera_name || `Camera #${alert.camera_id}`}
                          </p>
                          <p className="text-[10px] text-[var(--ui-text-muted)] font-mono flex items-center gap-1.5 mt-0.5">
                            <span>{time}</span>
                            <span>&bull;</span>
                            <span className="text-orange-400 font-bold">
                              {Math.round(alert.confidence * 100)}%
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Snapshot preview button */}
                      {snapshotUrl ? (
                        <button
                          onClick={() => setPreviewSnapshot(snapshotUrl)}
                          className="relative w-12 h-9 rounded-lg overflow-hidden border border-[var(--ui-border)] shrink-0 hover:scale-105 transition cursor-pointer group"
                          title="Bấm để xem ảnh bằng chứng"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={snapshotUrl}
                            alt="Snapshot"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Ảnh chụp đã bị xóa khỏi ổ đĩa: ẩn ảnh vỡ thay vì hiện chữ thay thế
                              e.currentTarget.style.visibility = "hidden";
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                            <Maximize2 size={11} />
                          </div>
                        </button>
                      ) : (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--ui-canvas)] text-[var(--ui-text-muted)] font-mono">
                          NO IMG
                        </span>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-16 opacity-60">
                  <span className="text-3xl mb-2">📋</span>
                  <p className="text-xs font-bold text-[var(--ui-text)]">
                    Chưa có sự cố nào phát sinh
                  </p>
                  <p className="text-[11px] text-[var(--ui-text-muted)] mt-0.5">
                    Hệ thống sẽ tự động lưu lại hình ảnh khi có biến cố.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Snapshot Preview Modal */}
      {previewSnapshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
          <div className="max-w-2xl w-full ui-panel rounded-2xl p-4 border border-[var(--ui-border)] shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--ui-border)] pb-2.5">
              <div className="flex items-center gap-2">
                <Flame size={18} className="text-red-500" />
                <h3 className="text-sm font-bold text-[var(--ui-text)]">
                  Ảnh Chụp Bằng Chứng Sự Cố
                </h3>
              </div>
              <button
                onClick={() => setPreviewSnapshot(null)}
                className="p-1 rounded-lg bg-[var(--ui-surface-subtle)] border border-[var(--ui-border)] text-[var(--ui-text-muted)] hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-[var(--ui-border)] flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewSnapshot}
                alt="Bằng chứng hỏa hoạn"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

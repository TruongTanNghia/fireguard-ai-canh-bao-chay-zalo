"use client";

import React, { useState } from "react";
import {
  Maximize2,
  RefreshCw,
  Video,
  VideoOff,
  MapPin,
  Play,
  Square,
  Flame,
} from "lucide-react";
import { FireCamera } from "@/src/types";
import { getRuntimeApiBaseUrl } from "@/src/utils/constants";
import { apiFetch } from "@/src/services/api";

interface CameraCardProps {
  camera: FireCamera;
  isRunning?: boolean;
  isAlerting?: boolean;
  demoVideos?: string[];
  onToggleRunning?: (cameraId: number, shouldRun: boolean) => void;
  onSourceChanged?: () => void;
}

export default function CameraCard({
  camera,
  isRunning = false,
  isAlerting = false,
  demoVideos = [],
  onToggleRunning,
  onSourceChanged,
}: CameraCardProps) {
  const [streamKey, setStreamKey] = useState(0); // 0 khi render máy chủ để tránh lệch hydration
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isChangingSource, setIsChangingSource] = useState(false);

  const apiBase = getRuntimeApiBaseUrl();
  const streamUrl = `${apiBase}/api/stream/${camera.id}?t=${streamKey}`;

  const reloadStream = () => {
    setHasError(false);
    setStreamKey(Date.now());
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleSelectClip = async (videoFilename: string) => {
    setIsChangingSource(true);
    try {
      const source = videoFilename.startsWith("webcam:")
        ? videoFilename
        : `demo:${videoFilename}`;
      const camera_type = videoFilename.startsWith("webcam:") ? "webcam" : "demo";

      const res = await apiFetch(`/api/ai/cameras/${camera.id}/source`, {
        method: "PUT",
        body: JSON.stringify({ source, camera_type }),
      });

      if (res.ok) {
        reloadStream();
        if (onSourceChanged) onSourceChanged();
      }
    } catch (e) {
      console.error("Lỗi đổi nguồn video:", e);
    } finally {
      setIsChangingSource(false);
    }
  };

  const currentClipName = camera.rtsp_url.startsWith("demo:")
    ? camera.rtsp_url.replace("demo:", "")
    : camera.rtsp_url;

  return (
    <>
      <div
        className={`ui-panel rounded-2xl overflow-hidden flex flex-col transition-all duration-300 ${
          isAlerting
            ? "border-red-500 fire-alert-glow shadow-[0_0_25px_rgba(239,68,68,0.4)]"
            : "hover:border-[var(--ui-border-strong)]"
        }`}
      >
        {/* Card Header */}
        <div className="p-3 bg-[var(--ui-surface-subtle)] border-b border-[var(--ui-border)] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                isRunning
                  ? "bg-emerald-400 animate-pulse"
                  : "bg-[var(--ui-text-muted)] opacity-60"
              }`}
            />
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-[var(--ui-text)] truncate">
                {camera.name}
              </h3>
              {camera.location && (
                <p className="text-[11px] text-[var(--ui-text-muted)] flex items-center gap-1 truncate">
                  <MapPin size={10} className="flex-shrink-0" /> {camera.location}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Quick Demo Clip Selector */}
            {demoVideos.length > 0 && (
              <div className="relative">
                <select
                  value={currentClipName}
                  onChange={(e) => handleSelectClip(e.target.value)}
                  disabled={isChangingSource}
                  className="text-[10px] bg-[var(--ui-canvas)] border border-[var(--ui-border)] text-[var(--ui-text)] font-semibold rounded-md px-2 py-1 outline-none hover:border-[var(--ui-accent)] transition cursor-pointer max-w-[130px] truncate"
                  title="Chọn video clip kiểm thử"
                >
                  <optgroup label="Video Clip Cháy Demo">
                    {demoVideos.map((video) => (
                      <option key={video} value={video}>
                        📽️ {video}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Nguồn Trực Tiếp">
                    <option value="webcam:0">📷 Webcam máy tính</option>
                  </optgroup>
                </select>
              </div>
            )}

            {/* Toggle Single Camera Run */}
            {onToggleRunning && (
              <button
                onClick={() => onToggleRunning(camera.id, !isRunning)}
                className={`p-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  isRunning
                    ? "bg-red-500/15 border-red-500/30 text-red-300 hover:bg-red-500/30"
                    : "bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30"
                }`}
                title={isRunning ? "Dừng camera này" : "Bật camera này"}
              >
                {isRunning ? <Square size={13} /> : <Play size={13} />}
              </button>
            )}

            <button
              onClick={reloadStream}
              className="p-1.5 rounded-lg text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-surface-raised)] transition cursor-pointer"
              title="Làm mới luồng video"
            >
              <RefreshCw size={13} />
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-surface-raised)] transition cursor-pointer"
              title="Xem toàn màn hình"
            >
              <Maximize2 size={13} />
            </button>
          </div>
        </div>

        {/* Video Viewport */}
        <div className="relative aspect-video bg-[#0b0e14] flex items-center justify-center overflow-hidden select-none">
          {isRunning && !hasError ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={streamKey}
              src={streamUrl}
              alt={camera.name}
              className="w-full h-full object-contain"
              onError={() => setHasError(true)}
            />
          ) : (
            /* Standby State View */
            <div className="flex flex-col items-center justify-center gap-3 text-center p-6 w-full h-full bg-gradient-to-b from-[#10151b] to-[#0c1015]">
              <div className="w-14 h-14 rounded-2xl bg-[var(--ui-surface)] border border-[var(--ui-border)] flex items-center justify-center text-[var(--ui-text-muted)] shadow-inner">
                {isRunning ? (
                  <VideoOff size={26} className="text-amber-400 animate-pulse" />
                ) : (
                  <Video size={26} className="text-slate-400" />
                )}
              </div>

              <div>
                <p className="text-xs font-bold text-[var(--ui-text)] uppercase tracking-wider">
                  {isRunning ? "Mất kết nối luồng video" : "CHẾ ĐỘ CHỜ (STANDBY)"}
                </p>
                <p className="text-[11px] text-[var(--ui-text-muted)] mt-0.5 max-w-xs">
                  {isRunning
                    ? "Đang thử kết nối lại luồng video camera..."
                    : "AI đang tạm dừng để tiết kiệm CPU. Nhấn nút bên dưới để quét."}
                </p>
              </div>

              {/* Start Single Camera Button */}
              {onToggleRunning && !isRunning && (
                <button
                  onClick={() => onToggleRunning(camera.id, true)}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-orange-600/25 cursor-pointer"
                >
                  <Play size={13} fill="currentColor" /> Bật Camera Này
                </button>
              )}

              {isRunning && hasError && (
                <button
                  onClick={reloadStream}
                  className="px-3 py-1 rounded-lg bg-[var(--ui-surface-raised)] border border-[var(--ui-border)] text-xs text-[var(--ui-text)] hover:bg-[var(--ui-border)] transition"
                >
                  Thử lại
                </button>
              )}
            </div>
          )}

          {/* AI Badge Overlay */}
          <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-[#10151b]/80 backdrop-blur-sm border border-[var(--ui-border)] text-[10px] font-bold text-orange-400 flex items-center gap-1 shadow-sm">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isRunning ? "bg-orange-500 animate-ping" : "bg-slate-500"
              }`}
            />
            {isRunning ? "AI YOLOv8s: ĐANG QUÉT" : "AI: TẠM DỪNG"}
          </div>

          {/* Alerting Banner Overlay */}
          {isAlerting && (
            <div className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-extrabold flex items-center gap-1 shadow-lg animate-pulse">
              <Flame size={12} /> PHÁT HIỆN SỰ CỐ
            </div>
          )}
        </div>

        {/* Card Footer Info */}
        <div className="px-3 py-2 bg-[var(--ui-surface)] border-t border-[var(--ui-border)] flex items-center justify-between text-[11px] text-[var(--ui-text-muted)] font-mono">
          <div className="flex items-center gap-2 truncate">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--ui-surface-subtle)] border border-[var(--ui-border)] uppercase font-semibold text-[var(--ui-text)]">
              {camera.camera_type}
            </span>
            <span className="truncate max-w-[150px]">{currentClipName}</span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={
                isRunning ? "text-emerald-400 font-semibold" : "text-slate-500"
              }
            >
              {isRunning ? "ONLINE • ~25 FPS" : "STANDBY"}
            </span>
          </div>
        </div>
      </div>

      {/* Fullscreen Modal View */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col p-4 sm:p-6 animate-in fade-in">
          <div className="flex items-center justify-between pb-4 border-b border-[var(--ui-border)]">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[var(--ui-text)]">
                {camera.name}
              </h2>
              <p className="text-xs text-[var(--ui-text-muted)]">
                {camera.location || "Luồng giám sát trực tiếp thời gian thực"}
              </p>
            </div>
            <button
              onClick={toggleFullscreen}
              className="px-4 py-2 rounded-xl bg-[var(--ui-surface-raised)] border border-[var(--ui-border)] hover:bg-[var(--ui-border)] text-white font-bold text-xs transition cursor-pointer"
            >
              Đóng (ESC)
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={streamUrl}
              alt={camera.name}
              className="max-h-[85vh] w-auto max-w-full rounded-xl object-contain border border-[var(--ui-border)] shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  );
}

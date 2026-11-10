"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Map as MapIcon,
  Flame,
  Video,
  Cctv,
  RefreshCw,
  Eye,
  X,
  ArrowLeft,
  Settings,
  Wifi,
  WifiOff,
} from "lucide-react";
import { SiteMap, FireCamera } from "@/src/types";
import { apiFetch } from "@/src/services/api";
import { getRuntimeApiBaseUrl } from "@/src/utils/constants";
import { useFireAlert } from "@/src/contexts/FireAlertContext";

export default function SiteMapPage() {
  const [sitemap, setSitemap] = useState<SiteMap | null>(null);
  const [cameras, setCameras] = useState<FireCamera[]>([]);
  const [aiStatus, setAiStatus] = useState<any>(null);
  const [selectedCamera, setSelectedCamera] = useState<FireCamera | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { activeAlert, isWsConnected } = useFireAlert();

  const loadMapData = useCallback(async () => {
    try {
      const [mapRes, camsRes, aiRes] = await Promise.all([
        apiFetch("/api/site-map"),
        apiFetch("/api/fire-cameras"),
        apiFetch("/api/ai/status"),
      ]);

      if (mapRes.ok) setSitemap(await mapRes.json());
      if (camsRes.ok) setCameras(await camsRes.json());
      if (aiRes.ok) setAiStatus(await aiRes.json());
    } catch (e) {
      console.error("Lỗi tải sơ đồ mặt bằng:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMapData();
    const interval = setInterval(loadMapData, 4000);
    return () => clearInterval(interval);
  }, [loadMapData]);

  const apiBase = getRuntimeApiBaseUrl();
  // Phiên bản ảnh cố định theo sơ đồ: không tải lại ảnh mỗi lần làm mới dữ liệu (4 giây/lần).
  // Tải sơ đồ mới sẽ sinh image_path mới nên trình duyệt tự lấy ảnh mới.
  const mapVersion = sitemap?.id ?? 0;
  const mapImageUrl = sitemap?.image_path
    ? `${apiBase}${sitemap.image_path}?v=${mapVersion}`
    : `/site_map.png?v=${mapVersion}`;

  const isAiRunning = aiStatus?.is_running ?? false;

  // ===== Bố cục ghim camera kiểu "callout": chấm định vị đúng vị trí + biểu tượng camera lớn đặt lệch ra ngoài =====
  const mapBoxRef = useRef<HTMLDivElement>(null);
  const [mapBox, setMapBox] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = mapBoxRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setMapBox({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pinLayouts = useMemo(() => {
    const W = mapBox.w || 1000;
    const H = mapBox.h || 545;
    const calloutLen = W < 700 ? 46 : 62; // khoảng cách từ chấm định vị tới biểu tượng camera (px)
    const clusterRadius = calloutLen * 1.5; // các camera gần nhau hơn ngưỡng này sẽ xòe ra các hướng khác nhau
    const edge = 34; // giữ biểu tượng không bị cắt ở mép bản đồ

    const pinned = cameras
      .map((cam, idx) => ({ cam, idx }))
      .filter(
        ({ cam }) =>
          cam.map_pin_x !== null &&
          cam.map_pin_x !== undefined &&
          cam.map_pin_y !== null &&
          cam.map_pin_y !== undefined
      )
      .map((p) => ({
        ...p,
        px: ((p.cam.map_pin_x as number) / 100) * W,
        py: ((p.cam.map_pin_y as number) / 100) * H,
      }));

    return pinned.map((p) => {
      const near = pinned.filter(
        (o) => o.cam.id !== p.cam.id && Math.hypot(o.px - p.px, o.py - p.py) < clusterRadius
      );
      let dx = 0;
      let dy = -1; // camera đứng riêng: biểu tượng đặt phía trên
      if (near.length > 0) {
        const cx = (near.reduce((t, o) => t + o.px, 0) + p.px) / (near.length + 1);
        const cy = (near.reduce((t, o) => t + o.py, 0) + p.py) / (near.length + 1);
        const len = Math.hypot(p.px - cx, p.py - cy);
        if (len > 0.5) {
          dx = (p.px - cx) / len;
          dy = (p.py - cy) / len;
        }
      }
      if (p.px + dx * calloutLen > W - edge || p.px + dx * calloutLen < edge) dx = -dx;
      if (p.py + dy * calloutLen > H - edge || p.py + dy * calloutLen < edge) dy = -dy;
      return { cam: p.cam, idx: p.idx, ox: dx * calloutLen, oy: dy * calloutLen };
    });
  }, [cameras, mapBox]);

  return (
    <div className="space-y-4">
      {/* CSS Animations chuẩn GiamSatRaVao */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes normal-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.45); }
          50% { transform: scale(1.1); box-shadow: 0 0 12px 5px rgba(16, 185, 129, 0.3); }
        }
        @keyframes pulse-legend {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.25); opacity: 0.7; }
        }
        @keyframes radar-glow {
          0% { transform: scale(0.5); opacity: 0.9; }
          50% { opacity: 0.4; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes fire-strobe {
          0%, 100% { 
            background-color: #dc2626; 
            border-color: #f87171;
            box-shadow: 0 0 15px 5px rgba(220, 38, 38, 0.6), inset 0 0 8px rgba(255, 255, 255, 0.4);
            transform: scale(1);
          }
          50% { 
            background-color: #ef4444; 
            border-color: #ffffff;
            box-shadow: 0 0 35px 20px rgba(239, 68, 68, 0.9), inset 0 0 12px rgba(255, 255, 255, 0.6);
            transform: scale(1.25);
          }
        }
        @keyframes flame-shake {
          0%, 100% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(-12deg) scale(1.15); }
          75% { transform: rotate(12deg) scale(1.15); }
        }
        .fire-map-normal {
          animation: normal-pulse 2.2s ease-in-out infinite;
        }
        .fire-map-radar {
          position: absolute;
          inset: -12px;
          border-radius: 9999px;
          border: 2px solid rgba(239, 68, 68, 0.8);
          animation: radar-glow 1.5s cubic-bezier(0, 0.2, 0.8, 1) infinite;
        }
        .fire-map-strobe {
          animation: fire-strobe 1s ease-in-out infinite;
        }
        .fire-map-flame {
          animation: flame-shake 0.8s ease-in-out infinite;
        }
        .cam-badge {
          box-shadow: 0 0 0 3px rgba(2, 6, 23, 0.75), 0 8px 18px rgba(0, 0, 0, 0.55);
        }
        .cam-badge-idle {
          background: radial-gradient(circle at 30% 25%, #1e3a5f 0%, #0f172a 70%);
        }
        .cam-badge-live {
          background: radial-gradient(circle at 30% 25%, #34d399 0%, #047857 75%);
          box-shadow: 0 0 0 3px rgba(2, 6, 23, 0.75), 0 0 18px 4px rgba(16, 185, 129, 0.55);
        }
        @keyframes cam-link-flow {
          to { stroke-dashoffset: -18; }
        }
        .cam-link-flow {
          animation: cam-link-flow 0.9s linear infinite;
        }
      `}} />

      {/* Header chuẩn GiamSatRaVao */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--ui-border)]">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-md">
            <MapIcon className="h-6 w-6 text-orange-400" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-[var(--ui-text)] uppercase tracking-tight">
              BẢN ĐỒ <span className="text-orange-500">BÁO CHÁY 2D</span>
            </h1>
            <p className="text-[11px] font-mono text-[var(--ui-text-muted)] mt-0.5">
              SƠ ĐỒ VỊ TRÍ KHU VỰC, TRẠNG THÁI CẢM BIẾN VÀ ĐIỂM BÁO CHÁY TRỰC QUAN
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--ui-surface-subtle)] hover:bg-[var(--ui-surface-raised)] border border-[var(--ui-border)] text-[var(--ui-text)] text-xs font-bold transition cursor-pointer"
          >
            <ArrowLeft size={13} />
            <span>Giám Sát Camera</span>
          </Link>

          <Link
            href="/settings"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--ui-surface-subtle)] hover:bg-[var(--ui-surface-raised)] border border-[var(--ui-border)] text-[var(--ui-text)] text-xs font-bold transition cursor-pointer"
          >
            <Settings size={13} className="text-orange-400" />
            <span>Chỉnh Sửa Ghim</span>
          </Link>

          <button
            onClick={loadMapData}
            className="p-2 rounded-xl bg-[var(--ui-surface-subtle)] border border-[var(--ui-border)] text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-surface-raised)] transition cursor-pointer"
            title="Tải lại sơ đồ"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Main Map Box */}
      <div className="ui-panel p-4 sm:p-5 rounded-2xl border border-[var(--ui-border)] shadow-xl bg-[var(--ui-surface)]">
        <div className="relative overflow-hidden rounded-2xl border border-[var(--ui-border)] w-full bg-[#090d12] flex items-center justify-center">
          <div ref={mapBoxRef} className="relative w-full h-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mapImageUrl}
              alt="Sơ đồ mặt bằng khuôn viên"
              className="w-full h-auto block select-none pointer-events-none"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `/site_map.png?v=${mapVersion}`;
              }}
            />

            {/* Pins Layer: chấm định vị + đường dẫn + biểu tượng camera */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {pinLayouts.map(({ cam, idx, ox, oy }) => {
                const isFire = Boolean(activeAlert && activeAlert.camera_id === cam.id);
                const isRunning = isAiRunning && cam.is_active;
                const pinNumber = idx + 1;
                const state = isFire ? "fire" : isRunning ? "live" : "idle";
                const lineColor = state === "fire" ? "#f87171" : state === "live" ? "#34d399" : "#7dd3fc";

                return (
                  <div
                    key={cam.id}
                    className={`absolute w-0 h-0 group hover:z-40 ${isFire ? "z-30" : "z-20"}`}
                    style={{ left: `${cam.map_pin_x}%`, top: `${cam.map_pin_y}%` }}
                  >
                    {/* Đường dẫn từ vị trí lắp đặt tới biểu tượng camera */}
                    <svg className="absolute left-0 top-0 overflow-visible" width="1" height="1" aria-hidden="true">
                      <line x1={0} y1={0} x2={ox} y2={oy} stroke="rgba(2,6,23,0.85)" strokeWidth={5} strokeLinecap="round" />
                      <line
                        x1={0}
                        y1={0}
                        x2={ox}
                        y2={oy}
                        stroke={lineColor}
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeDasharray="5 4"
                        className={state === "idle" ? "" : "cam-link-flow"}
                      />
                    </svg>

                    {/* Chấm định vị đúng vị trí lắp camera */}
                    <span className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                      {state !== "idle" && (
                        <span
                          className={`absolute w-5 h-5 rounded-full animate-ping ${
                            state === "fire" ? "bg-red-500/70" : "bg-emerald-400/60"
                          }`}
                        />
                      )}
                      <span
                        className="relative w-3 h-3 rounded-full border-2 border-white shadow-[0_0_0_2px_rgba(2,6,23,0.8)]"
                        style={{ backgroundColor: lineColor }}
                      />
                    </span>

                    {/* Biểu tượng camera */}
                    <button
                      type="button"
                      onClick={() => setSelectedCamera(cam)}
                      className="absolute pointer-events-auto cursor-pointer select-none"
                      style={{ left: ox, top: oy, transform: "translate(-50%, -50%)" }}
                      aria-label={cam.name}
                    >
                      {isFire && <span className="fire-map-radar" />}
                      <span
                        className={`cam-badge relative flex items-center justify-center w-11 h-11 rounded-full border-2 transition-transform duration-200 group-hover:scale-110 ${
                          state === "fire"
                            ? "fire-map-strobe text-white border-white fire-alert-glow"
                            : state === "live"
                            ? "cam-badge-live text-white border-white"
                            : "cam-badge-idle text-sky-100 border-sky-300/80"
                        }`}
                      >
                        {isFire ? (
                          <Flame size={22} className="fire-map-flame text-yellow-200" />
                        ) : (
                          <Cctv size={22} strokeWidth={2.25} />
                        )}

                        {/* Số thứ tự camera */}
                        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-white text-[11px] font-black leading-4 text-center border-2 border-slate-950 shadow-md">
                          {pinNumber}
                        </span>
                      </span>

                      {/* Nhãn ngắn dưới biểu tượng */}
                      <span
                        className={`absolute left-1/2 top-full -translate-x-1/2 mt-1 px-1.5 py-[1px] rounded-md text-[9px] font-black tracking-wider whitespace-nowrap border shadow-md ${
                          state === "fire"
                            ? "bg-red-600 text-white border-red-300 animate-pulse"
                            : state === "live"
                            ? "bg-slate-950/90 text-emerald-300 border-emerald-500/40"
                            : "bg-slate-950/90 text-sky-200 border-sky-400/30"
                        }`}
                      >
                        {isFire ? "🔥 BÁO CHÁY" : `CAM ${String(pinNumber).padStart(2, "0")}`}
                      </span>

                      {/* Tooltip chi tiết khi rê chuột */}
                      <span className="absolute hidden group-hover:block z-50 w-max max-w-xs bottom-full left-1/2 -translate-x-1/2 mb-2 text-left bg-slate-900/95 text-white text-xs p-2.5 rounded-xl shadow-2xl border border-white/10 pointer-events-none">
                        <span className="block font-bold">{cam.name}</span>
                        <span className="block text-[10px] text-slate-400">{cam.location || "Điểm giám sát"}</span>
                        {isFire ? (
                          <span className="block text-red-400 font-bold text-[10px] mt-0.5">🚨 ĐANG BÁO ĐỘNG CHÁY!</span>
                        ) : isRunning ? (
                          <span className="block text-emerald-400 text-[10px] mt-0.5">● Đang quét AI trực tiếp</span>
                        ) : (
                          <span className="block text-slate-500 text-[10px] mt-0.5">Chưa bật luồng · bấm để xem</span>
                        )}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Danh sách camera theo số ghim trên bản đồ */}
        {cameras.length > 0 && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
            {cameras.map((cam, camIndex) => {
              const isFire = activeAlert && activeAlert.camera_id === cam.id;
              const isRunning = isAiRunning && cam.is_active;
              const hasPin = cam.map_pin_x !== null && cam.map_pin_x !== undefined;
              return (
                <button
                  key={cam.id}
                  onClick={() => setSelectedCamera(cam)}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    isFire
                      ? "bg-red-600/15 border-red-500/50"
                      : "bg-[var(--ui-surface-subtle)] border-[var(--ui-border)] hover:bg-[var(--ui-surface-raised)]"
                  }`}
                >
                  <span
                    className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-[11px] font-black border-2 ${
                      isFire
                        ? "bg-red-600 text-white border-white"
                        : isRunning
                        ? "bg-emerald-600 text-white border-white/90"
                        : "bg-slate-800 text-slate-400 border-white/20"
                    }`}
                  >
                    {camIndex + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-bold text-[var(--ui-text)] truncate">{cam.name}</span>
                    <span className="block text-[11px] text-[var(--ui-text-muted)] truncate">
                      {cam.location || "Điểm giám sát"}
                      {!hasPin && " (chưa ghim trên bản đồ)"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Legend Chú Thích Màu Sắc Ở Dưới (Chuẩn GiamSatRaVao) */}
        <div className="mt-4 flex flex-wrap items-center gap-5 text-xs text-[var(--ui-text-muted)] font-medium pt-2 border-t border-[var(--ui-border)]">
          <span className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-slate-800 border border-slate-700 shrink-0" />
            <span>Chưa kích hoạt luồng</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 fire-map-normal shrink-0" />
            <span>Bình thường (Đang chạy giám sát)</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-red-600 animate-pulse border border-red-400 shrink-0" />
            <span className="text-red-400 font-bold">Phát hiện cháy (Radar cảnh báo)</span>
          </span>
        </div>
      </div>

      {/* Modal Xem Trực Tiếp Luồng Khi Click Vào Pin */}
      {selectedCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
          <div className="max-w-2xl w-full ui-panel rounded-2xl p-5 border border-[var(--ui-border)] shadow-2xl space-y-3 bg-[var(--ui-surface)]">
            <div className="flex items-center justify-between border-b border-[var(--ui-border)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center">
                  <Video size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--ui-text)]">{selectedCamera.name}</h3>
                  <p className="text-[11px] text-[var(--ui-text-muted)]">
                    {selectedCamera.location || "Vị trí tại điểm ghim trên bản đồ"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCamera(null)}
                className="p-1 rounded-lg bg-[var(--ui-surface-subtle)] border border-[var(--ui-border)] text-[var(--ui-text-muted)] hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-[var(--ui-border)] flex items-center justify-center">
              {/* Live stream */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${apiBase}/api/stream/${selectedCamera.id}`}
                alt={selectedCamera.name}
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

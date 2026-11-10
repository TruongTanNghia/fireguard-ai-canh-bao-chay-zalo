"use client";

import React from "react";
import Link from "next/link";
import { Flame, AlertTriangle, X, ArrowRight, Volume2 } from "lucide-react";
import { useFireAlert } from "@/src/contexts/FireAlertContext";
import { getRuntimeApiBaseUrl } from "@/src/utils/constants";

export default function EmergencyBanner() {
  const { activeAlert, dismissActiveAlert } = useFireAlert();

  if (!activeAlert) return null;

  const isFire = activeAlert.alert_type === "fire" || activeAlert.alert_type === "fire_smoke";
  const apiBase = getRuntimeApiBaseUrl();
  const snapshotUrl = activeAlert.snapshot_path ? `${apiBase}${activeAlert.snapshot_path}` : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="max-w-xl w-full rounded-2xl border-2 border-red-500 bg-slate-950 p-5 shadow-2xl fire-alert-glow space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-red-500/30 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center animate-bounce">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-red-400 tracking-wide">
                {isFire ? "🚨 CẢNH BÁO PHÁT HIỆN NGỌN LỬA!" : "🌫️ CẢNH BÁO PHÁT HIỆN KHÓI!"}
              </h2>
              <p className="text-xs text-slate-300 font-medium">
                Vị trí: <strong className="text-white">{activeAlert.camera_name || "Camera giám sát"}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={dismissActiveAlert}
            className="p-1.5 rounded-lg bg-white/10 text-slate-400 hover:text-white hover:bg-white/20 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Snapshot Image */}
        {snapshotUrl ? (
          <div className="relative aspect-video rounded-xl overflow-hidden border border-red-500/40 bg-black flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={snapshotUrl}
              alt="Bằng chứng đám cháy"
              className="w-full h-full object-contain"
            />
            <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-red-600/90 text-white text-[11px] font-bold">
              Độ tin cậy: {(activeAlert.confidence * 100).toFixed(1)}%
            </div>
          </div>
        ) : (
          <div className="h-40 rounded-xl bg-red-950/40 border border-red-500/20 flex flex-col items-center justify-center text-red-300 gap-2">
            <AlertTriangle size={36} />
            <p className="text-sm font-semibold">Đang xử lý hình ảnh hiện trường...</p>
          </div>
        )}

        {/* Info & Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <p className="text-xs text-slate-400">
            Hệ thống đã tự động gửi thông báo khẩn cấp qua <strong className="text-blue-400">Zalo OA Bot</strong>.
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={dismissActiveAlert}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
            >
              Đã kiểm tra / Tắt còi
            </button>
            <Link
              href="/alerts"
              onClick={dismissActiveAlert}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/30"
            >
              Xem nhật ký <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

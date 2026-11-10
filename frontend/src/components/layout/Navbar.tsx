"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Flame,
  Volume2,
  VolumeX,
  Bell,
  WifiOff,
  LogOut,
  X,
  Check,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/src/contexts/AuthContext";
import { useFireAlert } from "@/src/contexts/FireAlertContext";
import { apiFetch } from "@/src/services/api";
import { FireAlert } from "@/src/types";
import { PROJECT_LOGO, PROJECT_ORG } from "@/src/utils/projectInfo";

export default function Navbar() {
  const { user, logout, isLoggedIn } = useAuth();
  const {
    unreadCount,
    isWsConnected,
    soundEnabled,
    setSoundEnabled,
    clearUnreadCount,
  } = useFireAlert();

  const [timeStr, setTimeStr] = useState("");
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [latestAlerts, setLatestAlerts] = useState<FireAlert[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) +
          " " +
          now.toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch recent alerts when opening dropdown
  useEffect(() => {
    if (!showNotifDropdown) return;
    const fetchRecent = async () => {
      try {
        const res = await apiFetch("/api/fire-alerts?limit=5");
        if (res.ok) {
          const data = await res.json();
          setLatestAlerts(data.data || []);
        }
      } catch {}
    };
    fetchRecent();
  }, [showNotifDropdown]);

  // Click outside to close notification dropdown
  useEffect(() => {
    if (!showNotifDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNotifDropdown]);

  if (!isLoggedIn) return null;

  return (
    <header className="h-16 border-b border-[var(--ui-border)] bg-[var(--ui-surface)] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 shadow-sm">
      {/* Brand Logo */}
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-3 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={PROJECT_LOGO}
            alt={PROJECT_ORG.name}
            title={PROJECT_ORG.name}
            className="w-11 h-11 rounded-full shadow-md shadow-black/40 group-hover:scale-105 transition-transform select-none"
            draggable={false}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-[var(--ui-text)]">
                FIREGUARD <span className="text-orange-500">AI</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-orange-500/10 text-orange-400 font-bold border border-orange-500/20">
                PRO 2.0
              </span>
            </div>
            <p className="text-[11px] text-[var(--ui-text-muted)] font-medium">
              <span className="hidden sm:inline">{PROJECT_ORG.shortName} &bull; </span>
              Báo Cháy &amp; Cảnh Báo Zalo
            </p>
          </div>
        </Link>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        {/* Realtime Clock */}
        <div className="hidden md:flex items-center px-3 py-1.5 rounded-lg bg-[var(--ui-canvas)] border border-[var(--ui-border)] text-xs font-mono text-[var(--ui-text)]">
          {timeStr}
        </div>

        {/* WebSocket Status */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border ${
            isWsConnected
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              : "bg-red-500/10 text-red-400 border-red-500/30"
          }`}
          title={isWsConnected ? "Đang kết nối Realtime" : "Mất kết nối máy chủ"}
        >
          {isWsConnected ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="hidden sm:inline font-semibold">Trực tuyến</span>
            </>
          ) : (
            <>
              <WifiOff size={14} />
              <span className="hidden sm:inline font-semibold">Mất kết nối</span>
            </>
          )}
        </div>

        {/* Sound Alarm Toggle (Duy nhất tại Header) */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`p-2 rounded-lg border transition cursor-pointer ${
            soundEnabled
              ? "bg-orange-500/15 text-orange-400 border-orange-500/30 hover:bg-orange-500/25"
              : "bg-[var(--ui-surface-subtle)] text-[var(--ui-text-muted)] border-[var(--ui-border)] hover:bg-[var(--ui-surface-raised)]"
          }`}
          title={soundEnabled ? "Còi hú cảnh báo: ĐANG BẬT" : "Còi hú: ĐANG TẮT"}
        >
          {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>

        {/* Alerts Notification Bell (Chuông thông báo sự kiện) */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className={`relative p-2 rounded-lg border transition cursor-pointer ${
              showNotifDropdown || unreadCount > 0
                ? "bg-red-500/15 text-red-400 border-red-500/30"
                : "bg-[var(--ui-surface-subtle)] text-[var(--ui-text-muted)] border-[var(--ui-border)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-surface-raised)]"
            }`}
            title="Chuông thông báo sự cố hỏa hoạn"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse shadow-md">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {/* Popover Dropdown Thông Báo Sự Kiện */}
          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 ui-panel rounded-2xl p-4 shadow-2xl border border-[var(--ui-border-strong)] bg-[var(--ui-surface)] z-50 animate-in fade-in space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--ui-border)] pb-2.5">
                <div className="flex items-center gap-2">
                  <Flame size={16} className="text-orange-500" />
                  <span className="text-xs font-bold text-[var(--ui-text)] uppercase tracking-wider">
                    Thông Báo Sự Cố
                  </span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 font-mono font-bold">
                      {unreadCount} mới
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={clearUnreadCount}
                    className="text-[11px] text-orange-400 hover:text-orange-300 font-semibold transition cursor-pointer flex items-center gap-1"
                  >
                    <Check size={12} /> Đã đọc
                  </button>
                )}
              </div>

              {/* Alert list */}
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {latestAlerts.length > 0 ? (
                  latestAlerts.map((alert) => (
                    <Link
                      key={alert.id}
                      href="/alerts"
                      onClick={() => setShowNotifDropdown(false)}
                      className="block p-2.5 rounded-xl bg-[var(--ui-surface-subtle)] border border-[var(--ui-border)] hover:border-orange-500/40 transition"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[var(--ui-text)] truncate max-w-[180px]">
                          {alert.camera_name || `Camera #${alert.camera_id}`}
                        </span>
                        <span className="text-[10px] font-mono text-[var(--ui-text-muted)]">
                          {new Date(alert.created_at).toLocaleTimeString("vi-VN")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px]">
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            alert.alert_type === "fire"
                              ? "bg-red-500/20 text-red-400"
                              : "bg-amber-500/20 text-amber-400"
                          }`}
                        >
                          {alert.alert_type === "fire" ? "Phát hiện Lửa" : "Phát hiện Khói"}
                        </span>
                        <span className="text-[var(--ui-text-muted)] font-mono">
                          {Math.round(alert.confidence * 100)}% tin cậy
                        </span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="p-6 text-center text-[var(--ui-text-muted)] text-xs">
                    Chưa có thông báo sự cố mới
                  </div>
                )}
              </div>

              {/* View all footer */}
              <div className="border-t border-[var(--ui-border)] pt-2 text-center">
                <Link
                  href="/alerts"
                  onClick={() => setShowNotifDropdown(false)}
                  className="text-xs font-bold text-orange-400 hover:text-orange-300 transition inline-flex items-center gap-1.5"
                >
                  <span>Xem toàn bộ lịch sử &amp; bằng chứng</span>
                  <ExternalLink size={12} />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User profile & Logout */}
        <div className="flex items-center gap-2.5 pl-2.5 border-l border-[var(--ui-border)]">
          <div className="hidden lg:block text-right">
            <p className="text-xs font-bold text-[var(--ui-text)]">
              {user?.full_name || user?.username}
            </p>
            <p className="text-[10px] text-[var(--ui-text-muted)] uppercase tracking-wider font-semibold">
              {user?.role === "admin" ? "Quản trị viên" : "Trực ban"}
            </p>
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition cursor-pointer"
            title="Đăng xuất"
          >
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </header>
  );
}

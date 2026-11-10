"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Map,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/src/contexts/AuthContext";
import { useFireAlert } from "@/src/contexts/FireAlertContext";
import {
  PROJECT_LOGO,
  PROJECT_ORG,
  PROJECT_SUPERVISOR,
  PROJECT_STUDENTS,
} from "@/src/utils/projectInfo";

export default function Sidebar() {
  const pathname = usePathname();
  const { isLoggedIn } = useAuth();
  const { unreadCount } = useFireAlert();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar_collapsed");
    if (saved === "true") setIsCollapsed(true);
  }, []);

  const toggleCollapsed = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem("sidebar_collapsed", String(next));
  };

  if (!isLoggedIn) return null;

  const navItems = [
    {
      label: "Giám sát Trung tâm",
      href: "/",
      icon: LayoutDashboard,
    },
    {
      label: "Sơ đồ Mặt bằng 2D",
      href: "/map",
      icon: Map,
    },
    {
      label: "Lịch sử & Bằng chứng",
      href: "/alerts",
      icon: History,
      badge: unreadCount > 0 ? String(unreadCount) : undefined,
    },
    {
      label: "Cài đặt Hệ thống",
      href: "/settings",
      icon: Settings,
    },
  ];

  return (
    <aside
      className={`border-r border-[var(--ui-border)] bg-[var(--ui-surface)] flex flex-col justify-between shrink-0 overflow-y-auto transition-all duration-200 ${
        isCollapsed ? "w-[72px]" : "w-64"
      }`}
    >
      <div className="p-3 space-y-1.5">
        {/* Toggle Collapse Button */}
        <div className="flex items-center justify-between px-2 pb-2 mb-1 border-b border-[var(--ui-border)]">
          {!isCollapsed && (
            <span className="text-[11px] font-bold text-[var(--ui-text-muted)] uppercase tracking-wider">
              Danh mục quản lý
            </span>
          )}
          <button
            onClick={toggleCollapsed}
            className="p-1.5 rounded-lg text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-surface-subtle)] transition cursor-pointer ml-auto"
            title={isCollapsed ? "Mở rộng menu" : "Thu gọn menu"}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center rounded-xl border py-3 px-3.5 transition-colors duration-150 ${
                isCollapsed ? "justify-center gap-0 px-0" : "gap-3.5"
              } ${
                isActive
                  ? "border-[var(--ui-border-strong)] bg-[var(--ui-surface-raised)] text-[var(--ui-text)] font-semibold shadow-sm"
                  : "border-transparent text-[var(--ui-text-muted)] hover:bg-[var(--ui-surface-subtle)] hover:text-[var(--ui-text)] font-medium"
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon
                size={20}
                className={`flex-shrink-0 ${
                  isActive ? "text-orange-400" : "text-[var(--ui-text-muted)]"
                }`}
              />
              {!isCollapsed && (
                <span className="text-sm font-semibold tracking-normal whitespace-nowrap flex-1">
                  {item.label}
                </span>
              )}
              {!isCollapsed && item.badge && (
                <span className="text-[11px] px-2 py-0.5 rounded-md font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Project Info + System Status Footer */}
      {!isCollapsed ? (
        <div className="p-3 border-t border-[var(--ui-border)] space-y-2.5">
          <div className="p-3 rounded-xl bg-[var(--ui-surface-subtle)] border border-[var(--ui-border)] space-y-2.5">
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={PROJECT_LOGO}
                alt={PROJECT_ORG.name}
                className="w-10 h-10 rounded-full shrink-0 select-none"
                draggable={false}
              />
              <p className="text-[11px] font-bold leading-snug text-[var(--ui-text)]">
                {PROJECT_ORG.name}
              </p>
            </div>

            <div className="space-y-0.5 pt-2 border-t border-[var(--ui-border)]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-orange-400">
                {PROJECT_SUPERVISOR.label}
              </p>
              <p className="text-xs font-semibold text-[var(--ui-text)] leading-snug">
                {PROJECT_SUPERVISOR.name}
              </p>
              <p className="text-[11px] text-[var(--ui-text-muted)] leading-snug">
                {PROJECT_SUPERVISOR.title}
              </p>
            </div>

            <div className="space-y-0.5 pt-2 border-t border-[var(--ui-border)]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-orange-400">
                {PROJECT_STUDENTS.label}
              </p>
              {PROJECT_STUDENTS.members.map((m) => (
                <p
                  key={m.name}
                  className="text-xs text-[var(--ui-text)] leading-snug flex items-baseline justify-between gap-2"
                >
                  <span className="font-semibold">{m.name}</span>
                  <span className="text-[10px] font-mono text-[var(--ui-text-muted)]">{m.className}</span>
                </p>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[var(--ui-surface-subtle)] border border-[var(--ui-border)] space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-[var(--ui-text)]">
                  YOLOv8s
                </span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono font-bold border border-emerald-500/20">
                SẴN SÀNG
              </span>
            </div>
            <p className="text-[11px] text-[var(--ui-text-muted)] leading-tight">
              Phát hiện ngọn lửa &amp; khói
            </p>
          </div>
        </div>
      ) : (
        <div className="p-3 flex flex-col items-center gap-3 border-t border-[var(--ui-border)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={PROJECT_LOGO}
            alt={PROJECT_ORG.name}
            title={`${PROJECT_ORG.name}\n${PROJECT_SUPERVISOR.label}: ${PROJECT_SUPERVISOR.name}`}
            className="w-10 h-10 rounded-full select-none"
            draggable={false}
          />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" title="YOLOv8s Sẵn sàng" />
        </div>
      )}
    </aside>
  );
}

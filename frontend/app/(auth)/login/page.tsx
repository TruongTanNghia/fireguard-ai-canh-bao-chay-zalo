"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, User, AlertCircle, ArrowRight } from "lucide-react";
import { useAuth } from "@/src/contexts/AuthContext";
import {
  PROJECT_LOGO,
  PROJECT_ORG,
  PROJECT_SUPERVISOR,
  PROJECT_STUDENTS,
} from "@/src/utils/projectInfo";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const res = await login(username, password);
    setIsLoading(false);

    if (res.success) {
      router.push("/");
    } else {
      setError(res.error || "Đăng nhập thất bại");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-black overflow-y-auto">
      <div className="max-w-lg w-full glass-panel rounded-3xl p-8 border border-white/10 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Background Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-orange-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="text-center space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={PROJECT_LOGO}
            alt={PROJECT_ORG.name}
            className="w-28 h-28 mx-auto rounded-full shadow-2xl shadow-black/60 mb-2 select-none"
            draggable={false}
          />
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300/90">
            {PROJECT_ORG.name}
          </p>
          <h1 className="text-2xl font-black tracking-wide bg-gradient-to-r from-orange-400 via-red-500 to-amber-300 bg-clip-text text-transparent">
            FIREGUARD AI
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Hệ thống Giám sát Báo cháy &amp; Cảnh báo Zalo Thông minh
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2.5 text-xs text-red-400 animate-in fade-in">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Tên đăng nhập</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-slate-200 text-sm focus:outline-none focus:border-orange-500 transition"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Mật khẩu</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-slate-200 text-sm focus:outline-none focus:border-orange-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold text-sm transition-all shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <span>Đang xác thực...</span>
            ) : (
              <>
                <span>Đăng nhập hệ thống</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Thông tin đề tài: Giảng viên hướng dẫn & Nhóm sinh viên thực hiện */}
        <div className="pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-0.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-400">
              {PROJECT_SUPERVISOR.label}
            </p>
            <p className="text-xs font-semibold text-slate-200">{PROJECT_SUPERVISOR.name}</p>
            <p className="text-[11px] text-slate-400">{PROJECT_SUPERVISOR.title}</p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-0.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-400">
              {PROJECT_STUDENTS.label}
            </p>
            {PROJECT_STUDENTS.members.map((m) => (
              <p key={m.name} className="text-xs text-slate-200">
                <span className="font-semibold">{m.name}</span>
                <span className="text-slate-400"> &ndash; {m.className}</span>
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

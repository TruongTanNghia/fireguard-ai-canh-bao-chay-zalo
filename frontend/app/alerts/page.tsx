"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Flame, Filter, Download, CheckCircle, XCircle, Trash2, Eye, Calendar, RefreshCw, AlertTriangle } from "lucide-react";
import { FireAlert } from "@/src/types";
import { apiFetch } from "@/src/services/api";
import { getRuntimeApiBaseUrl } from "@/src/utils/constants";
import Pagination from "@/src/components/common/Pagination";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<FireAlert[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Modals
  const [selectedAlert, setSelectedAlert] = useState<FireAlert | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<"verified" | "dismissed">("verified");
  const [adminNotes, setAdminNotes] = useState("");

  const loadAlerts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", limit.toString());
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("alert_type", typeFilter);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);

      const res = await apiFetch(`/api/fire-alerts?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.data || []);
        setTotal(data.total || 0);
      }
    } catch (e) {
      console.error("Lỗi tải danh sách sự cố:", e);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, statusFilter, typeFilter, dateFrom, dateTo]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const handleUpdateStatus = async () => {
    if (!selectedAlert) return;
    try {
      const res = await apiFetch(`/api/fire-alerts/${selectedAlert.id}`, {
        method: "PUT",
        body: JSON.stringify({
          status: verifyStatus,
          admin_notes: adminNotes,
        }),
      });
      if (res.ok) {
        setIsVerifying(false);
        setSelectedAlert(null);
        setAdminNotes("");
        loadAlerts();
      }
    } catch (e) {
      alert("Lỗi khi cập nhật trạng thái sự cố");
    }
  };

  const handleDelete = async (alertId: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bản ghi sự cố này?")) return;
    try {
      const res = await apiFetch(`/api/fire-alerts/${alertId}`, { method: "DELETE" });
      if (res.ok) {
        loadAlerts();
      }
    } catch (e) {
      alert("Lỗi khi xóa sự cố");
    }
  };

  const handleExportExcel = async () => {
    const params = new URLSearchParams();
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    try {
      // Gọi qua apiFetch để gửi kèm token đăng nhập (mở link trực tiếp sẽ bị lỗi 401)
      const res = await apiFetch(`/api/fire-alerts/export/excel?${params.toString()}`);
      if (!res.ok) {
        alert("Xuất báo cáo Excel thất bại");
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename=([^;]+)/);
      const filename = match ? match[1].replace(/"/g, "").trim() : "Bao_Cao_Bao_Chay.xlsx";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert("Lỗi kết nối khi xuất báo cáo Excel");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const apiBase = getRuntimeApiBaseUrl();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2.5">
            <Flame className="text-orange-500" /> Nhật Ký &amp; Lịch Sử Sự Cố Báo Cháy
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Tra cứu, kiểm tra hình ảnh bằng chứng và xác minh sự cố phát hiện đám cháy / khói
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadAlerts}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition flex items-center gap-1.5 border border-white/10"
          >
            <RefreshCw size={14} /> Làm mới
          </button>
          <button
            onClick={handleExportExcel}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
          >
            <Download size={14} /> Xuất Báo Cáo Excel
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-white/5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Status Filter */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Trạng thái</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs font-medium text-slate-200 focus:outline-none focus:border-orange-500"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Chờ xử lý (Pending)</option>
            <option value="verified">Đã xác nhận sự cố</option>
            <option value="dismissed">Báo động giả / Đã hủy</option>
          </select>
        </div>

        {/* Type Filter */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Loại cảnh báo</label>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs font-medium text-slate-200 focus:outline-none focus:border-orange-500"
          >
            <option value="all">Tất cả loại</option>
            <option value="fire">Ngọn lửa (Fire)</option>
            <option value="smoke">Khói (Smoke)</option>
            <option value="fire_smoke">Cả Cháy &amp; Khói</option>
          </select>
        </div>

        {/* Date From */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Từ ngày</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs font-medium text-slate-200 focus:outline-none focus:border-orange-500"
          />
        </div>

        {/* Date To */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Đến ngày</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs font-medium text-slate-200 focus:outline-none focus:border-orange-500"
          />
        </div>
      </div>

      {/* Incident History Table */}
      <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-white/10 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Ảnh Bằng Chứng</th>
                <th className="py-3.5 px-4">Vị trí / Camera</th>
                <th className="py-3.5 px-4">Loại Cảnh Báo</th>
                <th className="py-3.5 px-4">Độ Tin Cậy</th>
                <th className="py-3.5 px-4">Thời Gian</th>
                <th className="py-3.5 px-4">Trạng Thái</th>
                <th className="py-3.5 px-4">Tin Zalo</th>
                <th className="py-3.5 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {alerts.length > 0 ? (
                alerts.map((alert) => {
                  const snapshotUrl = alert.snapshot_path ? `${apiBase}${alert.snapshot_path}` : null;
                  return (
                    <tr key={alert.id} className="hover:bg-white/5 transition">
                      {/* Snapshot */}
                      <td className="py-2.5 px-4">
                        {snapshotUrl ? (
                          <div
                            onClick={() => setSelectedAlert(alert)}
                            className="w-14 h-10 rounded-lg overflow-hidden border border-white/10 bg-black cursor-pointer hover:scale-105 transition"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={snapshotUrl}
                              alt="Snapshot"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.visibility = "hidden";
                              }}
                            />
                          </div>
                        ) : (
                          <span className="text-slate-600">Không có</span>
                        )}
                      </td>

                      {/* Camera */}
                      <td className="py-2.5 px-4 font-bold text-white">
                        {alert.camera_name || `Camera #${alert.camera_id}`}
                      </td>

                      {/* Alert Type */}
                      <td className="py-2.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${
                            alert.alert_type === "fire"
                              ? "bg-red-500/20 text-red-400 border-red-500/30"
                              : alert.alert_type === "smoke"
                              ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                              : "bg-orange-500/20 text-orange-400 border-orange-500/30"
                          }`}
                        >
                          {alert.alert_type === "fire" ? "🔥 Ngọn Lửa" : alert.alert_type === "smoke" ? "🌫️ Khói" : "🔥🌫️ Cháy & Khói"}
                        </span>
                      </td>

                      {/* Confidence */}
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-300">
                        {(alert.confidence * 100).toFixed(1)}%
                      </td>

                      {/* Created At */}
                      <td className="py-2.5 px-4 text-slate-400 font-mono">
                        {new Date(alert.created_at).toLocaleString("vi-VN", { hour12: false })}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-4">
                        {alert.status === "verified" ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle size={14} /> Đã xác nhận
                          </span>
                        ) : alert.status === "dismissed" ? (
                          <span className="text-slate-500 font-medium flex items-center gap-1">
                            <XCircle size={14} /> Báo động giả
                          </span>
                        ) : (
                          <span className="text-yellow-400 font-bold flex items-center gap-1 animate-pulse">
                            <AlertTriangle size={14} /> Chờ xử lý
                          </span>
                        )}
                      </td>

                      {/* Zalo Sent */}
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold font-mono">
                          {alert.zalo_sent_count} tin
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-4 text-right space-x-1.5">
                        <button
                          onClick={() => {
                            setSelectedAlert(alert);
                            setIsVerifying(true);
                            setVerifyStatus("verified");
                            setAdminNotes(alert.admin_notes || "");
                          }}
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold transition"
                          title="Xác minh / Ghi chú"
                        >
                          Xác minh
                        </button>
                        <button
                          onClick={() => handleDelete(alert.id)}
                          className="p-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
                          title="Xóa bản ghi"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    Không có bản ghi sự cố nào phù hợp với bộ lọc
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {/* Snapshot Preview & Verification Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="max-w-2xl w-full glass-panel rounded-3xl p-6 border border-white/10 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  Chi tiết Sự cố #{selectedAlert.id} – {selectedAlert.camera_name}
                </h3>
                <p className="text-xs text-slate-400">
                  Thời gian: {new Date(selectedAlert.created_at).toLocaleString("vi-VN", { hour12: false })}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedAlert(null);
                  setIsVerifying(false);
                }}
                className="p-1 rounded-lg bg-white/10 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Snapshot Image */}
            {selectedAlert.snapshot_path && (
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${apiBase}${selectedAlert.snapshot_path}`}
                  alt="Snapshot bằng chứng"
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            {/* Verification Form */}
            {isVerifying ? (
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Đánh giá sự cố</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setVerifyStatus("verified")}
                      className={`py-2 rounded-xl text-xs font-bold transition border ${
                        verifyStatus === "verified"
                          ? "bg-emerald-600/30 text-emerald-300 border-emerald-500"
                          : "bg-slate-900 text-slate-400 border-white/10"
                      }`}
                    >
                      ✓ Xác nhận Sự Cố Thật
                    </button>
                    <button
                      type="button"
                      onClick={() => setVerifyStatus("dismissed")}
                      className={`py-2 rounded-xl text-xs font-bold transition border ${
                        verifyStatus === "dismissed"
                          ? "bg-slate-700 text-slate-200 border-slate-500"
                          : "bg-slate-900 text-slate-400 border-white/10"
                      }`}
                    >
                      ✗ Báo Động Giả / Hủy
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Ghi chú của trực ban</label>
                  <textarea
                    rows={3}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Nhập chi tiết xử lý hiện trường..."
                    className="w-full p-3 rounded-xl bg-slate-900 border border-white/10 text-slate-200 text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setIsVerifying(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleUpdateStatus}
                    className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition shadow-lg shadow-orange-600/20"
                  >
                    Lưu Xác Minh
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-xs text-slate-300 pt-2 border-t border-white/5">
                <p>
                  <strong>Người xử lý:</strong> {selectedAlert.resolved_by || "Chưa có"}
                </p>
                <p>
                  <strong>Ghi chú trực ban:</strong> {selectedAlert.admin_notes || "Không có"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

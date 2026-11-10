"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-slate-900/40 border-t border-white/5 rounded-b-2xl">
      <div className="text-xs text-slate-400">
        Trang <span className="font-bold text-white">{page}</span> / {totalPages}
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="p-1.5 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 disabled:opacity-40 disabled:hover:bg-transparent transition"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="p-1.5 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 disabled:opacity-40 disabled:hover:bg-transparent transition"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

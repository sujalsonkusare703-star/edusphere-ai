"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "@/components/icons";

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);

  return (
    <nav className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2" aria-label="Pagination">
      <p className="text-xs text-slate-500">
        Showing {first.toLocaleString("en-IN")}–{last.toLocaleString("en-IN")} of {total.toLocaleString("en-IN")}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#EAEAEA] bg-white text-xs font-medium text-slate-700 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Previous
        </button>
        <span className="text-xs text-slate-600">
          Page {page} of {pages}
        </span>
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#EAEAEA] bg-white text-xs font-medium text-slate-700 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
        >
          Next <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </nav>
  );
}

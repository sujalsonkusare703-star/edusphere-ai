"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Bookmark, BookmarkCheck } from "@/components/icons";
import type { SavedKind } from "@/lib/pune/saved";

/**
 * Save / unsave a college or programme (pune_saved_colleges / pune_saved_programmes).
 * Signed-out users get a prompt to log in instead of a silent redirect.
 */
export function SaveButton({ kind, itemId, compact = false }: { kind: SavedKind; itemId: number; compact?: boolean }) {
  const { user, loading, savedCollegeIds, savedProgrammeIds, toggleSaved } = useAuth();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<"login" | "error" | null>(null);

  const saved = (kind === "college" ? savedCollegeIds : savedProgrammeIds).has(itemId);
  const label = saved ? "Saved" : "Save";

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy || loading) return;
    if (!user) {
      setMessage("login");
      return;
    }
    setBusy(true);
    setMessage(null);
    const result = await toggleSaved(kind, itemId);
    if (result === "login" || result === "error") setMessage(result);
    setBusy(false);
  };

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        aria-pressed={saved}
        aria-label={`${label} ${kind}`}
        className={`inline-flex items-center gap-1.5 rounded-full border text-xs font-semibold transition disabled:opacity-60 cursor-pointer ${
          compact ? "px-2.5 py-1" : "px-3.5 py-1.5"
        } ${
          saved
            ? "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
            : "border-[#EAEAEA] bg-white text-slate-700 hover:bg-slate-50"
        }`}
      >
        {saved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
        {label}
      </button>
      {message === "login" && (
        <span role="alert" className="text-[11px] text-slate-600">
          Please{" "}
          <Link href={`/login?redirect=${encodeURIComponent(pathname || "/colleges")}`} className="font-semibold text-indigo-600 underline">
            log in
          </Link>{" "}
          to save.
        </span>
      )}
      {message === "error" && (
        <span role="alert" className="text-[11px] text-red-600">
          Could not update. Please try again.
        </span>
      )}
    </span>
  );
}

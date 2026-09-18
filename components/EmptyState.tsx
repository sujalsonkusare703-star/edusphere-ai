import React from "react";
import Link from "next/link";
import { Search } from "@/components/icons";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionText,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-[#EAEAEA] rounded-2xl shadow-sm my-6 text-slate-900">
      <div className="w-14 h-14 rounded-2xl bg-[#FAFAFA] border border-[#EAEAEA] flex items-center justify-center text-slate-600 mb-4">
        {icon || <Search className="w-7 h-7" />}
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-2 tracking-tight">{title}</h3>
      <p className="text-slate-500 text-xs sm:text-sm max-w-md mb-6 leading-relaxed">{description}</p>
      {actionText && actionHref && (
        <Link
          href={actionHref}
          className="inline-flex items-center justify-center px-6 py-2.5 rounded-full font-medium text-xs text-white bg-slate-900 hover:bg-black transition shadow-sm"
        >
          {actionText}
        </Link>
      )}
      {actionText && onAction && !actionHref && (
        <button
          onClick={onAction}
          className="inline-flex items-center justify-center px-6 py-2.5 rounded-full font-medium text-xs text-white bg-slate-900 hover:bg-black transition shadow-sm cursor-pointer"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}


import React from "react";
import Link from "next/link";
import { ChevronRight } from "@/components/icons";

interface DashboardCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  trend?: string;
  href?: string;
  color?: "indigo" | "emerald" | "amber" | "violet" | "rose";
}

export function DashboardCard({
  title,
  value,
  description,
  icon,
  trend,
  href,
  color = "indigo",
}: DashboardCardProps) {
  const colorStyles = {
    indigo: {
      bg: "bg-indigo-50 border border-indigo-100",
      text: "text-indigo-600",
      hoverBorder: "hover:border-indigo-300",
      pill: "bg-indigo-50 text-indigo-700 border border-indigo-200",
    },
    emerald: {
      bg: "bg-emerald-50 border border-emerald-100",
      text: "text-emerald-600",
      hoverBorder: "hover:border-emerald-300",
      pill: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    },
    amber: {
      bg: "bg-amber-50 border border-amber-100",
      text: "text-amber-600",
      hoverBorder: "hover:border-amber-300",
      pill: "bg-amber-50 text-amber-700 border border-amber-200",
    },
    violet: {
      bg: "bg-violet-50 border border-violet-100",
      text: "text-violet-600",
      hoverBorder: "hover:border-violet-300",
      pill: "bg-violet-50 text-violet-700 border border-violet-200",
    },
    rose: {
      bg: "bg-rose-50 border border-rose-100",
      text: "text-rose-600",
      hoverBorder: "hover:border-rose-300",
      pill: "bg-rose-50 text-rose-700 border border-rose-200",
    },
  };

  const style = colorStyles[color];

  const content = (
    <div
      className={`bg-white border border-[#EAEAEA] rounded-2xl p-5 transition-all duration-200 shadow-sm ${
        href ? `cursor-pointer hover:shadow-md hover:border-slate-300` : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {title}
          </p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {value}
            </span>
            {trend && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {trend}
              </span>
            )}
          </div>
          {description && (
            <p className="text-xs text-slate-500 mt-1">
              {description}
            </p>
          )}
        </div>
        <div className={`w-11 h-11 rounded-xl ${style.bg} ${style.text} flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
      </div>

      {href && (
        <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors">
          <span>View catalog</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}


"use client";

import React from "react";
import { ActionPlanItem } from "@/types";
import { Target } from "@/components/icons";
import Link from "next/link";

interface ActionPlanSectionProps {
  actions: ActionPlanItem[];
}

export function ActionPlanSection({ actions }: ActionPlanSectionProps) {
  return (
    <div className="bg-white border border-[#EAEAEA] rounded-2xl p-6 sm:p-8 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F1F5F9]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-2 border border-indigo-100">
            <Target className="w-3.5 h-3.5 text-indigo-600" />
            <span>High Impact Milestones</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Your Next Steps & Action Plan
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tailored recommendations prioritized to address your immediate academic and technical profile gaps
          </p>
        </div>

        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full self-start sm:self-center">
          {actions.length} Action Items
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {actions.map((action, idx) => {
          const isHigh = action.priority === "High";
          const isMedium = action.priority === "Medium";

          return (
            <div
              key={action.id || idx}
              className="p-5 rounded-2xl bg-[#FAFAFA] border border-[#EAEAEA] hover:border-slate-300 transition-all flex flex-col justify-between space-y-4 shadow-xs"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      isHigh
                        ? "bg-rose-50 text-rose-700 border border-rose-100"
                        : isMedium
                        ? "bg-amber-50 text-amber-700 border border-amber-100"
                        : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                    }`}
                  >
                    {action.priority} Priority
                  </span>

                  <span className="text-[10px] font-semibold text-slate-400 capitalize">
                    {action.category}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 leading-snug">
                  {action.title}
                </h3>

                <p className="text-xs text-slate-500 leading-relaxed">
                  {action.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200/60">
                <Link
                  href={action.action_link.href}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition group"
                >
                  <span>{action.action_link.label}</span>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

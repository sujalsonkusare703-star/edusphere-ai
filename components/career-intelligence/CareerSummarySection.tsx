"use client";

import React from "react";
import { CareerIntelligenceReport } from "@/types";
import { Sparkles, CheckCircle, Target } from "@/components/icons";
import Link from "next/link";

interface CareerSummarySectionProps {
  report: CareerIntelligenceReport;
}

export function CareerSummarySection({ report }: CareerSummarySectionProps) {
  const { narrative_summary, priority_actions } = report;

  return (
    <div className="bg-white border border-[#EAEAEA] rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
      {/* Header with Transparency Note */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F1F5F9]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-700 text-xs font-semibold mb-2 border border-indigo-200/60">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Career Intelligence Layer</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Personalized Career Advisory & Priorities
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Derived directly from your verified profile criteria and active opportunity requirements
          </p>
        </div>

        <div className="text-[11px] text-slate-400 bg-[#FAFAFA] border border-[#EAEAEA] px-3 py-1.5 rounded-xl self-start sm:self-center">
          Deterministic Academic Benchmarking
        </div>
      </div>

      {/* 2-Column Grid: Narrative Summary on Left, Next 3 Actions on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Personalized Narrative Advisory */}
        <div className="p-5 rounded-2xl bg-[#FAFAFA] border border-[#EAEAEA] space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <span>Career Intelligence Narrative</span>
          </h3>

          <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
            {/* Strengths */}
            <div className="p-3 rounded-xl bg-white border border-[#EAEAEA] space-y-1">
              <span className="font-bold text-slate-900 block flex items-center gap-1 text-[11px]">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                Verified Strengths
              </span>
              <ul className="space-y-1 pl-4 list-disc text-slate-600 text-[11px]">
                {narrative_summary.strengths.map((str, idx) => (
                  <li key={idx}>{str}</li>
                ))}
              </ul>
            </div>

            {/* Gaps & Readiness */}
            <div className="p-3 rounded-xl bg-white border border-[#EAEAEA] space-y-1">
              <span className="font-bold text-slate-900 block text-[11px]">
                Market Alignment & Opportunity Scope
              </span>
              <p className="text-slate-600 text-[11px]">
                {narrative_summary.opportunity_readiness_text}
              </p>
            </div>

            {/* Suggested Next Direction */}
            <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 text-indigo-900 space-y-1">
              <span className="font-bold block text-[11px] text-indigo-950">
                Recommended Milestone
              </span>
              <p className="text-indigo-800 text-[11px]">
                {narrative_summary.suggested_direction}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Next 3 Action Priorities */}
        <div className="p-5 rounded-2xl bg-[#FAFAFA] border border-[#EAEAEA] space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-indigo-600" />
                <span>Your Next 3 Action Priorities</span>
              </h3>
              <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                Immediate Impact
              </span>
            </div>

            <div className="space-y-2.5">
              {priority_actions.slice(0, 3).map((action, idx) => {
                const isHigh = action.priority === "High";

                return (
                  <div
                    key={action.id || idx}
                    className="p-3.5 rounded-xl bg-white border border-[#EAEAEA] shadow-2xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          isHigh
                            ? "bg-rose-50 text-rose-700 border border-rose-100"
                            : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                        }`}
                      >
                        {action.priority} Priority
                      </span>
                      <Link
                        href={action.action_link.href}
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition"
                      >
                        {action.action_link.label}
                      </Link>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 leading-snug">
                      {action.title}
                    </h4>

                    <p className="text-[11px] text-slate-500 leading-normal">
                      {action.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2 text-[10px] text-slate-400 border-t border-slate-200/60">
            Advisory updates reactively whenever you update your CGPA, stream, or skills.
          </div>
        </div>
      </div>
    </div>
  );
}

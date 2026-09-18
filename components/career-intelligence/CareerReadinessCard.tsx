"use client";

import React from "react";
import { CareerReadinessScore } from "@/types";
import { Sparkles } from "@/components/icons";

interface CareerReadinessCardProps {
  readiness: CareerReadinessScore;
}

export function CareerReadinessCard({ readiness }: CareerReadinessCardProps) {
  const { score, label, breakdown, summary } = readiness;

  return (
    <div className="bg-white border border-[#EAEAEA] rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-5">
      <div>
        <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-[#F1F5F9]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Career Readiness Index
              </h3>
              <p className="text-[11px] text-slate-400">Deterministic 4-factor scoring</p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
            {label}
          </span>
        </div>

        {/* Big Score Display */}
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
            {score}%
          </span>
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
            Preparedness
          </span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed mb-5">
          {summary}
        </p>

        {/* 4 Contributing Factors Breakdown */}
        <div className="space-y-3 pt-1">
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600 font-medium">Academic Profile (25%)</span>
              <span className="font-bold text-slate-900">{breakdown.academic_profile}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${breakdown.academic_profile}%` }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600 font-medium">Technical Skills (25%)</span>
              <span className="font-bold text-slate-900">{breakdown.skills}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${breakdown.skills}%` }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600 font-medium">Profile Completeness (20%)</span>
              <span className="font-bold text-slate-900">{breakdown.profile_completeness}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-500 rounded-full transition-all duration-500"
                style={{ width: `${breakdown.profile_completeness}%` }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600 font-medium">Opportunity Compatibility (30%)</span>
              <span className="font-bold text-slate-900">{breakdown.opportunity_readiness}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${breakdown.opportunity_readiness}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

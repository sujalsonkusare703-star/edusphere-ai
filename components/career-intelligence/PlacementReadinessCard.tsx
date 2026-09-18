"use client";

import React from "react";
import { PlacementReadinessMetrics } from "@/types";
import { Award, CheckCircle, AlertCircle, ArrowRight } from "@/components/icons";
import Link from "next/link";

interface PlacementReadinessCardProps {
  metrics: PlacementReadinessMetrics;
  studentCgpa?: number | null;
}

export function PlacementReadinessCard({ metrics, studentCgpa }: PlacementReadinessCardProps) {
  const {
    total_placements,
    eligible_placements,
    skill_compatible_placements,
    blocked_by_cgpa,
    eligibility_percentage,
    top_eligible_companies,
    cgpa_gap_companies,
  } = metrics;

  return (
    <div className="bg-white border border-[#EAEAEA] rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-5">
      <div>
        <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-[#F1F5F9]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Placement Drive Readiness
              </h3>
              <p className="text-[11px] text-slate-400">Benchmarked against campus cutoffs</p>
            </div>
          </div>
          <span
            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
              eligible_placements > 0
                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                : "bg-amber-50 text-amber-700 border border-amber-100"
            }`}
          >
            {eligible_placements} / {total_placements} Eligible
          </span>
        </div>

        {/* Big Metric Display */}
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
            {eligibility_percentage}%
          </span>
          <span className="text-xs font-semibold text-violet-600 uppercase tracking-wide">
            Recruitment Cutoff Met
          </span>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed mb-4">
          {studentCgpa !== null && studentCgpa !== undefined && studentCgpa > 0
            ? `Your CGPA of ${studentCgpa} qualifies you for ${eligible_placements} out of ${total_placements} recruitment drives.`
            : "Record your semester CGPA in your profile to verify instant placement eligibility."}
        </p>

        {/* 3 Metric Pills */}
        <div className="grid grid-cols-3 gap-2 text-center mb-4">
          <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
            <span className="text-base font-extrabold text-emerald-700 block">
              {eligible_placements}
            </span>
            <span className="text-[10px] font-medium text-emerald-800">
              Eligible Drives
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100">
            <span className="text-base font-extrabold text-blue-700 block">
              {skill_compatible_placements}
            </span>
            <span className="text-[10px] font-medium text-blue-800">
              Skill Aligned
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-100">
            <span className="text-base font-extrabold text-amber-700 block">
              {blocked_by_cgpa}
            </span>
            <span className="text-[10px] font-medium text-amber-800">
              CGPA Gap
            </span>
          </div>
        </div>

        {/* Company context pills */}
        {top_eligible_companies.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Qualifying Companies:
            </span>
            <div className="flex flex-wrap gap-1">
              {top_eligible_companies.slice(0, 3).map((comp, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700"
                >
                  <CheckCircle className="w-2.5 h-2.5 text-emerald-600" />
                  {comp}
                </span>
              ))}
              {top_eligible_companies.length > 3 && (
                <span className="text-[10px] text-slate-400">+{top_eligible_companies.length - 3}</span>
              )}
            </div>
          </div>
        )}

        {blocked_by_cgpa > 0 && cgpa_gap_companies.length > 0 && (
          <div className="space-y-1 mt-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Target for Higher CGPA:
            </span>
            <div className="flex flex-wrap gap-1">
              {cgpa_gap_companies.slice(0, 2).map((comp, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-100"
                >
                  <AlertCircle className="w-2.5 h-2.5 text-amber-600" />
                  {comp}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-xs">
        <span className="text-slate-400">Verified criteria</span>
        <Link
          href="/placements"
          className="font-semibold text-slate-900 hover:text-indigo-600 transition flex items-center gap-1"
        >
          <span>View Drives</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

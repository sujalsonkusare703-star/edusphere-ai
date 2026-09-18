"use client";

import React from "react";
import { SkillGapItem } from "@/types";
import { Zap, CheckCircle, ArrowRight } from "@/components/icons";
import Link from "next/link";

interface SkillProgressCardProps {
  currentSkills: string[];
  recommendedSkills: SkillGapItem[];
  coveragePercentage: number;
  totalMarketSkills: number;
}

export function SkillProgressCard({
  currentSkills,
  recommendedSkills,
  coveragePercentage,
  totalMarketSkills,
}: SkillProgressCardProps) {
  return (
    <div className="bg-white border border-[#EAEAEA] rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-5">
      <div>
        <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-[#F1F5F9]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Skill Progress & Demand
              </h3>
              <p className="text-[11px] text-slate-400">Industry opportunity coverage</p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
            {coveragePercentage}% Covered
          </span>
        </div>

        {/* Coverage Progress Bar */}
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
            {coveragePercentage}%
          </span>
          <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">
            Industry Tech Coverage
          </span>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed mb-4">
          You currently hold {currentSkills.length} of {totalMarketSkills} core competencies requested across active openings.
        </p>

        {/* Current Verified Skills */}
        <div className="space-y-1.5 mb-4">
          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <span>Verified in Profile ({currentSkills.length})</span>
          </div>
          {currentSkills.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {currentSkills.slice(0, 5).map((skill, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200"
                >
                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                  {skill}
                </span>
              ))}
              {currentSkills.length > 5 && (
                <span className="text-[10px] text-slate-400 self-center">
                  +{currentSkills.length - 5} more
                </span>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No skills recorded yet.</p>
          )}
        </div>

        {/* Recommended Skills to Learn */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <span>High-Demand Gaps ({recommendedSkills.length})</span>
          </div>
          {recommendedSkills.length > 0 ? (
            <div className="space-y-1.5">
              {recommendedSkills.slice(0, 2).map((rec, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-[#FAFAFA] border border-[#EAEAEA] text-xs"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-slate-400 font-bold">○</span>
                    <span className="font-bold text-slate-900 truncate">{rec.skill}</span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 whitespace-nowrap">
                    {rec.frequency} listings
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-emerald-600 font-medium">All market skills acquired!</p>
          )}
        </div>
      </div>

      <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-xs">
        <span className="text-slate-400">Expand skillset</span>
        <Link
          href="/profile"
          className="font-semibold text-slate-900 hover:text-indigo-600 transition flex items-center gap-1"
        >
          <span>Update Skills</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

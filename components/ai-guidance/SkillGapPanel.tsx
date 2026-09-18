"use client";

import React from "react";
import { SkillGapAnalysis } from "@/types";
import { Sparkles, CheckCircle, ArrowRight, Zap } from "@/components/icons";
import Link from "next/link";

interface SkillGapPanelProps {
  analysis: SkillGapAnalysis;
}

export function SkillGapPanel({ analysis }: SkillGapPanelProps) {
  return (
    <div className="bg-white border border-[#EAEAEA] rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
      {/* Header & Coverage Progress */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#F1F5F9]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-2 border border-emerald-100">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Market Demand Alignment</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Skill Gap & Competency Analysis
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Benchmarked against technical requirements from active internship openings and campus placement drives
          </p>
        </div>

        {/* Coverage Percentage Card */}
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-slate-900">
                {analysis.skill_coverage_percentage}%
              </span>
              <span className="text-[11px] font-bold text-emerald-600 uppercase">Coverage</span>
            </div>
            <span className="text-[10px] text-slate-500 block">
              {analysis.current_skills.length} of {analysis.total_market_skills} industry skills
            </span>
          </div>
          <div className="w-12 h-12 rounded-full bg-emerald-100/60 flex items-center justify-center text-emerald-600">
            <Zap className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Current Verified Skills */}
        <div className="p-5 rounded-2xl bg-[#FAFAFA] border border-[#EAEAEA] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Current Skills in Profile ({analysis.current_skills.length})
              </h3>
            </div>
            <Link
              href="/profile"
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition"
            >
              Manage Skills &rarr;
            </Link>
          </div>

          {analysis.current_skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {analysis.current_skills.map((skill, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-emerald-200 text-emerald-800 text-xs font-semibold shadow-xs"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>{skill}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-white border border-dashed border-slate-200 text-center text-xs text-slate-500">
              No technical skills recorded yet. Add skills in your profile to run full skill gap matching.
            </div>
          )}

          <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
            ✓ Your recorded skills are currently unlocking matches across developer internships and technical placements.
          </p>
        </div>

        {/* Right Column: Recommended Skills to Acquire */}
        <div className="p-5 rounded-2xl bg-[#FAFAFA] border border-[#EAEAEA] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Recommended Skills to Develop ({analysis.recommended_skills.length})
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">High-demand opportunities</span>
          </div>

          {analysis.recommended_skills.length > 0 ? (
            <div className="space-y-2.5">
              {analysis.recommended_skills.slice(0, 4).map((rec, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-white border border-[#EAEAEA] flex items-start justify-between gap-3 shadow-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {rec.skill}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          rec.demand_level === "High"
                            ? "bg-rose-50 text-rose-700 border border-rose-100"
                            : rec.demand_level === "Medium"
                            ? "bg-amber-50 text-amber-700 border border-amber-100"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {rec.demand_level} Demand
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-normal">
                      {rec.reason}
                    </p>
                  </div>

                  <Link
                    href="/profile"
                    title="Add this skill to your profile"
                    className="flex-shrink-0 text-slate-400 hover:text-indigo-600 transition p-1"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-white border border-emerald-200 text-center text-xs text-emerald-700 font-medium">
              Outstanding! You have acquired all core technical skills demanded by the current opportunity listings.
            </div>
          )}

          <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
            ○ Acquiring 1 or 2 of these recommended skills will substantially elevate your placement and internship eligibility scores.
          </p>
        </div>
      </div>
    </div>
  );
}

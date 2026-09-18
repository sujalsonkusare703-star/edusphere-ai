"use client";

import React from "react";
import { AIGuidanceOverviewData } from "@/types";
import { Sparkles, ArrowRight, CheckCircle, Award, Compass, BookOpen } from "@/components/icons";
import Link from "next/link";

interface GuidanceOverviewProps {
  overview: AIGuidanceOverviewData;
  onRefineProfile?: () => void;
}

export function GuidanceOverview({ overview }: GuidanceOverviewProps) {
  return (
    <div className="space-y-4">
      {/* Transparency Header Pill */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50/80 text-indigo-700 font-semibold border border-indigo-200/60">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>AI-Powered Guidance Engine</span>
          <span className="text-indigo-400">•</span>
          <span className="text-[11px] font-normal text-indigo-600">Deterministic Profile Matching</span>
        </div>
        <span className="text-[11px] text-slate-500">
          Personalized from your profile criteria and curated opportunity catalog
        </span>
      </div>

      {/* Main Overview Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-[#EAEAEA] p-6 sm:p-8 shadow-sm">
        {/* Subtle ambient accent glow */}
        <div className="absolute right-0 top-0 -mt-8 -mr-8 w-80 h-80 bg-gradient-to-bl from-indigo-500/10 via-violet-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left Column: Greeting, summary text, and career direction */}
          <div className="max-w-2xl space-y-3">
            <div>
              <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                Personalized Academic & Career Advisory
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                {overview.greeting}
              </h1>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {overview.summary_text}
            </p>

            {/* Profile Criteria Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-xs font-medium text-slate-700">
                <Compass className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-slate-400">Direction:</span>
                <span className="font-semibold text-slate-900">{overview.career_direction}</span>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-xs font-medium text-slate-700">
                <BookOpen className="w-3.5 h-3.5 text-violet-600" />
                <span className="text-slate-400">Branch:</span>
                <span className="font-semibold text-slate-900">{overview.target_branch}</span>
              </div>

              {overview.factors_analyzed.entrance_score !== null && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-xs font-medium text-slate-700">
                  <Award className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-slate-400">Entrance:</span>
                  <span className="font-semibold text-slate-900">{overview.factors_analyzed.entrance_score}%ile</span>
                </div>
              )}

              {overview.factors_analyzed.cgpa !== null && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-xs font-medium text-slate-700">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-slate-400">CGPA:</span>
                  <span className="font-semibold text-slate-900">{overview.factors_analyzed.cgpa} / 10</span>
                </div>
              )}

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-xs font-medium text-slate-700">
                <span className="text-slate-400">Skills:</span>
                <span className="font-semibold text-slate-900">{overview.factors_analyzed.skills_count} Recorded</span>
              </div>
            </div>
          </div>

          {/* Right Column: Readiness Index Gauge & Action */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-center lg:items-end gap-4 min-w-[200px] border-t lg:border-t-0 pt-4 lg:pt-0 border-[#F1F5F9]">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-center w-full sm:w-auto lg:w-full">
              <div className="flex items-baseline justify-center gap-1.5">
                <span className="text-3xl font-extrabold text-slate-900">
                  {overview.readiness_score}%
                </span>
                <span className="text-xs font-bold text-indigo-600 uppercase">Readiness</span>
              </div>
              <p className="text-[11px] font-semibold text-slate-600 mt-1">
                {overview.readiness_label}
              </p>
              <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-500 rounded-full transition-all duration-500"
                  style={{ width: `${overview.readiness_score}%` }}
                />
              </div>
            </div>

            <Link
              href="/profile"
              className="w-full sm:w-auto lg:w-full px-5 py-2.5 rounded-full bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-medium text-xs flex items-center justify-center gap-1.5 transition shadow-xs whitespace-nowrap"
            >
              <span>Refine Criteria</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

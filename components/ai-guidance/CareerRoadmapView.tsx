"use client";

import React from "react";
import { CareerRoadmapStage } from "@/types";
import { CheckCircle, ArrowRight, Compass, Sparkles } from "@/components/icons";
import Link from "next/link";

interface CareerRoadmapViewProps {
  stages: CareerRoadmapStage[];
  careerGoal?: string | null;
  targetBranch?: string | null;
}

export function CareerRoadmapView({ stages, careerGoal, targetBranch }: CareerRoadmapViewProps) {
  const hasCareerGoal = !!careerGoal?.trim();

  return (
    <div className="bg-white border border-[#EAEAEA] rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#F1F5F9]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-700 text-xs font-semibold mb-2 border border-violet-100">
            <Compass className="w-3.5 h-3.5 text-violet-600" />
            <span>Strategic Milestone Tracker</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Personalized Academic & Career Roadmap
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            A sequential 6-stage blueprint connecting your baseline academic criteria to full-time career targets
          </p>
        </div>

        {/* Goal Indicator Pill */}
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
          <span className="text-slate-400 font-medium">Target:</span>
          {hasCareerGoal ? (
            <span className="font-bold text-indigo-700">{careerGoal}</span>
          ) : targetBranch ? (
            <span className="font-semibold text-slate-700">{targetBranch}</span>
          ) : (
            <span className="font-medium text-amber-600">Pending Goal Definition</span>
          )}
        </div>
      </div>

      {/* Neutral prompt banner if student hasn't entered a career goal */}
      {!hasCareerGoal && (
        <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="font-bold block">No specific career goal specified yet</span>
            <span className="text-amber-700 text-[11px]">
              Complete your career preference in Profile Settings to unlock targeted industry milestones and custom interview prep pathways.
            </span>
          </div>
          <Link
            href="/profile"
            className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs whitespace-nowrap self-start sm:self-center transition shadow-xs"
          >
            Set Career Goal &rarr;
          </Link>
        </div>
      )}

      {/* 6-Stage Roadmap Visual Timeline */}
      <div className="relative">
        {/* Continuous vertical connector line */}
        <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-slate-200 pointer-events-none hidden sm:block" />

        <div className="space-y-6">
          {stages.map((stage) => {
            const isCompleted = stage.status === "completed";
            const isInProgress = stage.status === "in_progress";

            return (
              <div
                key={stage.id}
                className={`relative sm:pl-16 p-5 sm:p-6 rounded-2xl border transition-all ${
                  isInProgress
                    ? "bg-indigo-50/30 border-indigo-200 shadow-xs"
                    : isCompleted
                    ? "bg-[#FAFAFA] border-[#EAEAEA]"
                    : "bg-white border-[#EAEAEA] opacity-80"
                }`}
              >
                {/* Status indicator node on timeline */}
                <div
                  className={`hidden sm:flex absolute left-3.5 top-6 w-5 h-5 rounded-full items-center justify-center -translate-x-1/2 text-[10px] font-bold ${
                    isCompleted
                      ? "bg-emerald-600 text-white"
                      : isInProgress
                      ? "bg-indigo-600 text-white ring-4 ring-indigo-100"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-3.5 h-3.5" />
                  ) : (
                    stage.stage_number
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Stage {stage.stage_number}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isCompleted
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : isInProgress
                          ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {isCompleted ? "Completed" : isInProgress ? "Active Stage" : "Upcoming"}
                    </span>
                  </div>

                  {stage.action_cta && (
                    <Link
                      href={stage.action_cta.href}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition flex items-center gap-1 self-start sm:self-auto"
                    >
                      <span>{stage.action_cta.label}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900">
                  {stage.title}
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {stage.description}
                </p>

                {/* Stage Milestones List */}
                <div className="mt-4 pt-3 border-t border-slate-200/60 grid grid-cols-1 md:grid-cols-3 gap-2">
                  {stage.milestones.map((m, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 p-2.5 rounded-xl bg-white border border-[#EAEAEA] text-xs text-slate-700 shadow-2xs"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0 mt-0.5" />
                      <span className="leading-snug">{m}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

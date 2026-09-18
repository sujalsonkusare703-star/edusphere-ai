"use client";

import React, { useState } from "react";
import { Placement } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { Modal } from "@/components/Modal";
import {
  Award,
  MapPin,
  Bookmark,
  BookmarkCheck,
  CheckCircle,
  Building2,
} from "@/components/icons";

export function PlacementCard({ placement }: { placement: Placement }) {
  const { isItemSaved, toggleSaveItem, skills: studentSkills, studentProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const saved = isItemSaved(placement.id);

  const studentCgpa = studentProfile?.cgpa;
  const hasCgpa = studentCgpa !== null && studentCgpa !== undefined;
  const hasMinCgpa = placement.min_cgpa !== null && placement.min_cgpa !== undefined;
  const isEligible = hasMinCgpa && hasCgpa ? (studentCgpa as number) >= (placement.min_cgpa as number) : true;

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (saving) return;
    setSaving(true);
    await toggleSaveItem("placement", placement.id);
    setSaving(false);
  };

  return (
    <>
      <div className="bg-white border border-[#EAEAEA] rounded-2xl p-6 hover:border-slate-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between group shadow-sm">
        <div>
          {/* Header badges and bookmark */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex flex-wrap gap-1.5">
              {placement.industry && (
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                  {placement.industry}
                </span>
              )}
              {hasMinCgpa && (
                hasCgpa ? (
                  isEligible ? (
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                      Eligible ({studentCgpa} ≥ {placement.min_cgpa})
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                      Min CGPA: {placement.min_cgpa} (Yours: {studentCgpa})
                    </span>
                  )
                ) : (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    Min CGPA: {placement.min_cgpa}
                  </span>
                )
              )}
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              title={saved ? "Remove from saved" : "Save placement"}
              aria-label={saved ? "Remove placement from saved" : "Save placement"}
              className={`p-2 rounded-xl transition-all ${
                saved
                  ? "bg-amber-50 text-amber-600 border border-amber-200"
                  : "text-slate-400 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              {saved ? (
                <BookmarkCheck className="w-4 h-4 fill-amber-500 text-amber-500" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Company & Role */}
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 text-violet-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 leading-tight truncate">
                {placement.role}
              </h3>
              <p className="text-sm font-semibold text-slate-600 mt-0.5 truncate">
                {placement.company}
              </p>
              <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{placement.location || "Pan-India / Multiple Locations"}</span>
              </div>
            </div>
          </div>

          {/* Criteria info box */}
          <div className="p-3 rounded-xl bg-[#FAFAFA] border border-[#F1F5F9] text-xs mb-4 flex items-center justify-between">
            <span className="text-slate-500 font-medium">Hiring Criteria</span>
            <span
              className={`font-semibold ${
                hasMinCgpa && hasCgpa
                  ? isEligible
                    ? "text-emerald-600"
                    : "text-rose-600"
                  : "text-slate-900"
              }`}
            >
              {hasMinCgpa
                ? hasCgpa
                  ? isEligible
                    ? `Eligible (Your CGPA: ${studentCgpa} ≥ ${placement.min_cgpa})`
                    : `Min CGPA: ${placement.min_cgpa} (Your CGPA: ${studentCgpa})`
                  : `CGPA ≥ ${placement.min_cgpa}`
                : "Open to all candidates"}
            </span>
          </div>

          {/* Required skills */}
          {placement.skills && placement.skills.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                Target Skills
              </span>
              <div className="flex flex-wrap gap-1.5">
                {placement.skills.map((skill, idx) => {
                  const isMatched = studentSkills.some(
                    (s) => s.toLowerCase() === skill.toLowerCase()
                  );
                  return (
                    <span
                      key={idx}
                      className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md ${
                        isMatched
                          ? "bg-violet-50 text-violet-700 border border-violet-200"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {isMatched && <CheckCircle className="w-2.5 h-2.5 text-violet-600" />}
                      {skill}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-5 pt-3 border-t border-[#F1F5F9] text-xs text-slate-500 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-violet-600" />
            Campus Drive
          </span>
          <button
            type="button"
            onClick={() => setIsDetailsOpen(true)}
            className="text-xs font-semibold text-slate-900 hover:text-violet-600 px-2 py-1 rounded-md transition"
          >
            View Details &rarr;
          </button>
        </div>
      </div>

      {/* Placement Details Modal */}
      <Modal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title={placement.role}
        subtitle={`${placement.company} • ${placement.location || "Multiple Locations"}`}
      >
        <div className="space-y-6 text-sm text-slate-700">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {placement.industry && (
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                Industry: {placement.industry}
              </span>
            )}
            <span className="text-xs font-medium px-3 py-1 rounded-full bg-[#FAFAFA] text-slate-600 border border-[#EAEAEA]">
              Full-Time Placement Drive
            </span>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={`p-4 rounded-xl border ${
              hasMinCgpa && hasCgpa
                ? isEligible
                  ? "bg-emerald-50/60 border-emerald-200"
                  : "bg-rose-50/60 border-rose-200"
                : "bg-amber-50/60 border-amber-100"
            }`}>
              <span className="text-xs text-slate-600 block mb-1">
                Academic Cutoff / Eligibility
              </span>
              <span className={`text-sm font-bold ${
                hasMinCgpa && hasCgpa
                  ? isEligible
                    ? "text-emerald-700"
                    : "text-rose-700"
                  : "text-amber-700"
              }`}>
                {hasMinCgpa
                  ? hasCgpa
                    ? isEligible
                      ? `✓ Eligible: Your CGPA (${studentCgpa}) meets cutoff (≥ ${placement.min_cgpa})`
                      : `✗ Ineligible: Minimum CGPA is ${placement.min_cgpa} (Your CGPA: ${studentCgpa})`
                    : `Minimum CGPA required: ${placement.min_cgpa}`
                  : "Open to all passing students"}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#EAEAEA]">
              <span className="text-xs text-slate-600 block mb-1">
                Drive Location
              </span>
              <span className="text-base font-semibold text-slate-900 flex items-center gap-1">
                <MapPin className="w-4 h-4 text-slate-400" />
                {placement.location || "Pan-India / Corporate Offices"}
              </span>
            </div>
          </div>

          {/* Target Skills */}
          {placement.skills && placement.skills.length > 0 && (
            <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#EAEAEA] space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Targeted Technical Skills
              </span>
              <div className="flex flex-wrap gap-2">
                {placement.skills.map((skill, idx) => {
                  const isMatched = studentSkills.some(
                    (s) => s.toLowerCase() === skill.toLowerCase()
                  );
                  return (
                    <span
                      key={idx}
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-lg ${
                        isMatched
                          ? "bg-violet-50 text-violet-700 border border-violet-200 font-semibold"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {isMatched && <CheckCircle className="w-3.5 h-3.5 text-violet-600" />}
                      {skill} {isMatched ? "(Matched in your profile)" : ""}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Save Action */}
          <div className="pt-2 flex items-center justify-between">
            <button
              onClick={handleSave}
              disabled={saving}
              className={`px-5 py-2.5 rounded-full font-medium text-xs flex items-center gap-2 transition ${
                saved
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "bg-slate-900 hover:bg-black text-white shadow-sm"
              }`}
            >
              {saved ? (
                <>
                  <BookmarkCheck className="w-4 h-4 text-amber-500" />
                  Saved in My Items
                </>
              ) : (
                <>
                  <Bookmark className="w-4 h-4" />
                  Save Placement Drive
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}


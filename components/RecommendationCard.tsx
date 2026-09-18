"use client";

import React, { useState } from "react";
import { RecommendationItem } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { Modal } from "@/components/Modal";
import Link from "next/link";
import {
  Sparkles,
  Building2,
  Briefcase,
  Award,
  Bookmark,
  BookmarkCheck,
  CheckCircle,
  MapPin,
  ArrowRight,
} from "@/components/icons";

export function RecommendationCard({ item }: { item: RecommendationItem }) {
  const { isItemSaved, toggleSaveItem, skills: studentSkills, studentProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const saved = isItemSaved(item.id);

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (saving) return;
    setSaving(true);
    await toggleSaveItem(item.item_type, item.id);
    setSaving(false);
  };

  const getCategoryConfig = () => {
    switch (item.item_type) {
      case "college":
        return {
          icon: Building2,
          color: "indigo",
          badgeBg: "bg-indigo-50 text-indigo-700 border border-indigo-200",
          border: "hover:border-indigo-300",
          label: "College Match",
          exploreHref: "/colleges",
          exploreLabel: "Explore All Colleges",
        };
      case "internship":
        return {
          icon: Briefcase,
          color: "emerald",
          badgeBg: "bg-emerald-50 text-emerald-700 border border-emerald-200",
          border: "hover:border-emerald-300",
          label: "Internship Match",
          exploreHref: "/internships",
          exploreLabel: "Explore All Internships",
        };
      case "placement":
        return {
          icon: Award,
          color: "violet",
          badgeBg: "bg-violet-50 text-violet-700 border border-violet-200",
          border: "hover:border-violet-300",
          label: "Placement Match",
          exploreHref: "/placements",
          exploreLabel: "Explore All Placements",
        };
    }
  };

  const config = getCategoryConfig();
  const Icon = config.icon;

  return (
    <>
      <div
        className="bg-white border border-[#EAEAEA] hover:border-slate-300 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col justify-between group relative overflow-hidden text-slate-900"
      >
        {/* Top ambient gradient hairline */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-500" />

        {/* Top match score accent banner */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${config.badgeBg}`}>
              {config.label}
            </span>
            {item.is_ai_recommended && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-700 border border-indigo-200/60">
                <Sparkles className="w-3 h-3 text-indigo-600" />
                AI Verified
              </span>
            )}
          </div>

          {/* Match Percentage Pill & Bookmark */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-white shadow-xs">
              <span className="text-xs font-bold">
                {item.match_score}%
              </span>
              <span className="text-[10px] font-medium text-slate-300 uppercase">Match</span>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              title={saved ? "Remove from saved" : "Save recommendation"}
              aria-label={saved ? "Remove recommendation from saved" : "Save recommendation"}
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
        </div>

        {/* Main Content */}
        <div className="mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FAFAFA] border border-[#EAEAEA] flex items-center justify-center text-slate-700 flex-shrink-0 group-hover:scale-105 transition-transform">
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-slate-900 leading-snug truncate">
                {item.title}
              </h3>
              <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5 truncate">
                {item.subtitle}
              </p>
            </div>
          </div>

          {/* Quick Opportunity Meta Pill Row */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
            {item.item_type === "college" && item.relevant_cutoff && (
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100">
                {item.relevant_cutoff}
              </span>
            )}
            {item.item_type === "college" && item.college?.fees && (
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                ₹{item.college.fees.toLocaleString("en-IN")} / yr
              </span>
            )}
            {item.item_type === "placement" && item.eligibility_text && (
              <span
                className={`px-2 py-0.5 rounded-md font-semibold ${
                  item.is_eligible
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                {item.is_eligible ? "✓ " : "⚠ "}
                {item.eligibility_text}
              </span>
            )}
            {item.item_type === "internship" && item.internship?.remote && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100">
                Remote
              </span>
            )}
          </div>

          {/* Skill Matching & Gaps for Internships / Placements */}
          {(item.item_type === "internship" || item.item_type === "placement") && (
            <div className="mt-3 space-y-1.5">
              {item.matching_skills && item.matching_skills.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Skills Matched:</span>
                  {item.matching_skills.slice(0, 3).map((s, idx) => (
                    <span key={idx} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ✓ {s}
                    </span>
                  ))}
                  {item.matching_skills.length > 3 && (
                    <span className="text-[10px] text-slate-400">+{item.matching_skills.length - 3}</span>
                  )}
                </div>
              )}
              {item.missing_skills && item.missing_skills.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">To Develop:</span>
                  {item.missing_skills.slice(0, 2).map((s, idx) => (
                    <span key={idx} className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      ○ {s}
                    </span>
                  ))}
                  {item.missing_skills.length > 2 && (
                    <span className="text-[10px] text-slate-400">+{item.missing_skills.length - 2}</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Explainable Factor Breakdown Mini Bars */}
          {item.factor_breakdown && (
            <div className="mt-3.5 pt-3 border-t border-[#F1F5F9] space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Factor Breakdown
              </span>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-slate-600 font-medium">
                {item.factor_breakdown.academic_match !== undefined && (
                  <div>
                    <div className="flex justify-between mb-0.5">
                      <span>Academic</span>
                      <span className="font-bold">{item.factor_breakdown.academic_match}%</span>
                    </div>
                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${item.factor_breakdown.academic_match}%` }} />
                    </div>
                  </div>
                )}
                {item.factor_breakdown.branch_match !== undefined && (
                  <div>
                    <div className="flex justify-between mb-0.5">
                      <span>Branch</span>
                      <span className="font-bold">{item.factor_breakdown.branch_match}%</span>
                    </div>
                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500 rounded-full" style={{ width: `${item.factor_breakdown.branch_match}%` }} />
                    </div>
                  </div>
                )}
                {item.factor_breakdown.skill_match !== undefined && (
                  <div>
                    <div className="flex justify-between mb-0.5">
                      <span>Skill Match</span>
                      <span className="font-bold">{item.factor_breakdown.skill_match}%</span>
                    </div>
                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${item.factor_breakdown.skill_match}%` }} />
                    </div>
                  </div>
                )}
                {item.factor_breakdown.location_match !== undefined && (
                  <div>
                    <div className="flex justify-between mb-0.5">
                      <span>Location</span>
                      <span className="font-bold">{item.factor_breakdown.location_match}%</span>
                    </div>
                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${item.factor_breakdown.location_match}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Match Explanations / Reasons */}
          {item.match_reasons && item.match_reasons.length > 0 && (
            <div className="mt-3.5 p-3 rounded-xl bg-[#FAFAFA] border border-[#F1F5F9] space-y-1.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Why Recommended
              </p>
              <ul className="space-y-1.5">
                {item.match_reasons.map((reason, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-xs text-slate-600 leading-tight"
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-xs text-slate-500">
          <span>Based on your profile & skills</span>
          <button
            type="button"
            onClick={() => setIsDetailsOpen(true)}
            className="font-semibold text-slate-900 hover:text-indigo-600 transition flex items-center gap-1 group-hover:underline cursor-pointer"
          >
            <span>View Opportunity</span>
            <span>&rarr;</span>
          </button>
        </div>
      </div>

      {/* Opportunity Details Modal */}
      <Modal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title={item.title}
        subtitle={`${item.subtitle} • ${config.label}`}
      >
        <div className="space-y-6 text-sm text-slate-700">
          {/* Header pill badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${config.badgeBg}`}>
              {config.label}
            </span>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-900 text-white">
              {item.match_score}% AI Match Score
            </span>
            {item.is_ai_recommended && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Verified Recommendation
              </span>
            )}
          </div>

          {/* AI Match Reasons Section */}
          {item.match_reasons && item.match_reasons.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Algorithmic Match Factors
              </span>
              <ul className="space-y-2">
                {item.match_reasons.map((reason, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 leading-normal">
                    <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Factor Breakdown Section in Modal */}
          {item.factor_breakdown && (
            <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#EAEAEA] space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Factor Breakdown & Match Explainability
              </span>
              <div className="space-y-2.5">
                {item.factor_breakdown.academic_match !== undefined && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 font-medium">Academic Match & Cutoff Alignment</span>
                      <span className="font-bold text-indigo-600">{item.factor_breakdown.academic_match}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${item.factor_breakdown.academic_match}%` }} />
                    </div>
                  </div>
                )}
                {item.factor_breakdown.branch_match !== undefined && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 font-medium">Branch / Domain Alignment</span>
                      <span className="font-bold text-violet-600">{item.factor_breakdown.branch_match}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-600 rounded-full" style={{ width: `${item.factor_breakdown.branch_match}%` }} />
                    </div>
                  </div>
                )}
                {item.factor_breakdown.skill_match !== undefined && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 font-medium">Skill Match & Overlap</span>
                      <span className="font-bold text-emerald-600">{item.factor_breakdown.skill_match}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${item.factor_breakdown.skill_match}%` }} />
                    </div>
                  </div>
                )}
                {item.factor_breakdown.location_match !== undefined && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 font-medium">Location & Work Mode Preference</span>
                      <span className="font-bold text-blue-600">{item.factor_breakdown.location_match}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${item.factor_breakdown.location_match}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* College details preview */}
          {item.item_type === "college" && item.college && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#EAEAEA]">
                <span className="text-xs text-slate-500 block mb-1">College Type & Exam</span>
                <span className="text-base font-bold text-slate-900">
                  {item.college.college_type || "Premier Institute"} • {item.college.entrance_exam || "Merit"}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#EAEAEA]">
                <span className="text-xs text-slate-500 block mb-1">Campus Placement Rate</span>
                <span className="text-base font-bold text-slate-900">
                  {item.college.placement_rate ? `${item.college.placement_rate}% Track Record` : "85% Avg"}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#EAEAEA] sm:col-span-2">
                <span className="text-xs text-slate-500 block mb-1">Campus Location</span>
                <span className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  {item.college.location ? `${item.college.location}, ` : ""}{item.college.state || "India"}
                </span>
              </div>
            </div>
          )}

          {/* Internship details preview */}
          {item.item_type === "internship" && item.internship && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100">
                  <span className="text-xs text-slate-600 block mb-1">Monthly Stipend</span>
                  <span className="text-base font-bold text-emerald-700">
                    {item.internship.stipend || "Stipend Provided"}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#EAEAEA]">
                  <span className="text-xs text-slate-600 block mb-1">Duration & Mode</span>
                  <span className="text-base font-bold text-slate-900">
                    {item.internship.duration || "3 Months"} {item.internship.remote ? "• Remote" : "• On-Site"}
                  </span>
                </div>
              </div>

              {item.internship.skills && item.internship.skills.length > 0 && (
                <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#EAEAEA] space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Required Technical Skills
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {item.internship.skills.map((skill, idx) => {
                      const isMatched = studentSkills.some(
                        (s) => s.toLowerCase() === skill.toLowerCase()
                      );
                      return (
                        <span
                          key={idx}
                          className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md ${
                            isMatched
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {isMatched && <CheckCircle className="w-3 h-3 text-emerald-600" />}
                          {skill}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Placement details preview */}
          {item.item_type === "placement" && item.placement && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-violet-50/60 border border-violet-100">
                  <span className="text-xs text-slate-600 block mb-1">Industry Sector</span>
                  <span className="text-base font-bold text-violet-700">
                    {item.placement.industry || "Technology"}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#EAEAEA]">
                  <span className="text-xs text-slate-600 block mb-1">Eligibility Benchmark</span>
                  <span className="text-base font-bold text-slate-900">
                    {item.placement.min_cgpa
                      ? `Min CGPA: ${item.placement.min_cgpa} (Your CGPA: ${studentProfile?.cgpa || "N/A"})`
                      : "Open to all graduating students"}
                  </span>
                </div>
              </div>

              {item.placement.skills && item.placement.skills.length > 0 && (
                <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#EAEAEA] space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Target Skills
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {item.placement.skills.map((skill, idx) => {
                      const isMatched = studentSkills.some(
                        (s) => s.toLowerCase() === skill.toLowerCase()
                      );
                      return (
                        <span
                          key={idx}
                          className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md ${
                            isMatched
                              ? "bg-violet-50 text-violet-700 border border-violet-200 font-semibold"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {isMatched && <CheckCircle className="w-3 h-3 text-violet-600" />}
                          {skill}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Modal Action Buttons */}
          <div className="pt-3 border-t border-[#EAEAEA] flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className={`w-full sm:w-auto px-5 py-2.5 rounded-full font-medium text-xs flex items-center justify-center gap-2 transition ${
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
                  Save to My Items
                </>
              )}
            </button>

            <Link
              href={config.exploreHref}
              className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-medium text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
            >
              <span>{config.exploreLabel}</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            </Link>
          </div>
        </div>
      </Modal>
    </>
  );
}


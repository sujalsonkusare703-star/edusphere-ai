"use client";

import React, { useState } from "react";
import Link from "next/link";
import { College } from "@/types";
import { useAuth } from "@/context/AuthContext";
import {
  Building2,
  MapPin,
  BookOpen,
  DollarSign,
  TrendingUp,
  Bookmark,
  BookmarkCheck,
  Award,
  ExternalLink,
} from "@/components/icons";

export function CollegeCard({ college }: { college: College }) {
  const { isItemSaved, toggleSaveItem } = useAuth();
  const [saving, setSaving] = useState(false);
  const saved = isItemSaved(college.id);

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (saving) return;
    setSaving(true);
    await toggleSaveItem("college", college.id);
    setSaving(false);
  };

  const formatCurrency = (val?: number | null) => {
    if (!val) return "N/A";
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(1)} Lakh`;
    }
    return `₹${val.toLocaleString("en-IN")}`;
  };

  const totalSeats = college.courses?.reduce((acc, c) => acc + (c.intake || 0), 0);
  const totalPrograms = college.courses?.length || college.programs?.length || (college.course ? 1 : 0);

  return (
    <div className="bg-white border border-[#EAEAEA] rounded-2xl p-6 hover:border-slate-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between group shadow-sm">
      <div>
        {/* Card Header: Badges and Bookmark */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex flex-wrap gap-1.5">
            {college.college_type && (
              <span className="text-[11px] font-semibold tracking-wide uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {college.college_type}
              </span>
            )}
            {college.primary_stream && (
              <span className="text-[11px] font-semibold tracking-wide px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                {college.primary_stream}
              </span>
            )}
            {college.naac_grade && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                ★ NAAC {college.naac_grade}
              </span>
            )}
            {(college.accepted_exams && college.accepted_exams.length > 0
              ? college.accepted_exams
              : college.entrance_exam
              ? [college.entrance_exam]
              : []
            ).map((exam, exIdx) => (
              <span
                key={exIdx}
                className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#FAFAFA] text-slate-700 border border-[#EAEAEA]"
              >
                {exam}
              </span>
            ))}
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            title={saved ? "Remove from saved" : "Save college"}
            aria-label={saved ? "Remove college from saved" : "Save college"}
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

        {/* College Name & Location */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#FAFAFA] border border-[#EAEAEA] flex items-center justify-center text-slate-500 flex-shrink-0 group-hover:border-indigo-200 group-hover:text-indigo-600 transition-colors">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <Link
              href={`/colleges/${college.id}`}
              className="text-base font-bold text-slate-900 leading-tight truncate block hover:text-indigo-600 transition-colors"
              title={college.name}
            >
              {college.name}
            </Link>
            <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
              <span className="truncate">
                {college.location ? `${college.location}, ` : ""}
                {college.state || "Maharashtra"}
              </span>
            </div>
          </div>
        </div>

        {/* Course & Programs Info */}
        <Link
          href={`/colleges/${college.id}`}
          className="w-full flex items-center justify-between text-xs font-medium text-slate-700 bg-[#FAFAFA] hover:bg-indigo-50/50 border border-[#F1F5F9] hover:border-indigo-200 px-3 py-2 rounded-xl mb-4 transition text-left"
          title={`View programs and cutoffs for ${college.name}`}
        >
          <div className="flex items-center gap-2 truncate">
            <BookOpen className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <span className="truncate font-medium">
              {totalPrograms} {totalPrograms === 1 ? "Program Offered" : "Programs Offered"}
            </span>
          </div>
          {totalSeats && totalSeats > 0 ? (
            <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200 flex-shrink-0 ml-2">
              {totalSeats} Seats
            </span>
          ) : null}
        </Link>

        {/* Stats Grid: Annual Tuition is NA unconditionally */}
        <div className="grid grid-cols-2 gap-3 py-3 border-y border-[#F1F5F9] text-xs">
          <div>
            <span className="text-slate-500 block mb-0.5 text-[11px]">Annual Tuition</span>
            <span className="font-bold text-slate-900 flex items-center gap-0.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              NA
            </span>
          </div>
          <div>
            <span className="text-slate-500 block mb-0.5 text-[11px]">Avg. Package</span>
            <span className="font-bold text-slate-900 flex items-center gap-0.5">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
              {formatCurrency(college.avg_package)}
            </span>
          </div>
        </div>

        {/* Concise Cutoff & Requirements Links */}
        <div className="pt-2.5 pb-1 flex items-center justify-between text-[11px] text-slate-500">
          <Link
            href={`/colleges/${college.id}#cutoffs`}
            className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
          >
            View Cutoffs &rarr;
          </Link>
          <span className="text-slate-300">•</span>
          <Link
            href={`/colleges/${college.id}#admission-eligibility`}
            className="text-slate-600 hover:text-slate-900 font-medium hover:underline"
          >
            View Requirements
          </Link>
          <span className="text-slate-300">•</span>
          <span className="text-[10px] text-slate-400">
            {college.accepted_exams?.join(" • ") || "MHT-CET"}
          </span>
        </div>

        {/* Placement Rate Progress */}
        {college.placement_rate !== null && college.placement_rate !== undefined && (
          <div className="mt-3.5">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-500 flex items-center gap-1 font-medium">
                <Award className="w-3.5 h-3.5 text-amber-500" />
                Placement Rate
              </span>
              <span className="font-bold text-slate-900">
                {college.placement_rate}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full transition-all"
                style={{ width: `${Math.min(college.placement_rate, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer actions: Highest package, Official Website link & View details */}
      <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex items-center justify-between gap-2">
        <div className="text-[11px] text-slate-500 truncate">
          {college.highest_package ? (
            <span>
              Highest: <strong className="text-slate-900 font-bold">{formatCurrency(college.highest_package)}</strong>
            </span>
          ) : (
            <span className="text-slate-400">Accredited</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {college.official_website && (
            <a
              href={college.official_website}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 transition inline-flex items-center gap-1"
              title={`Visit ${college.name} official website`}
            >
              <span>Website</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          )}
          <Link
            href={`/colleges/${college.id}`}
            className="text-xs font-semibold text-slate-900 hover:text-indigo-600 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 transition inline-flex items-center"
          >
            View Details &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}


"use client";

import React, { useState } from "react";
import { College } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { Modal } from "@/components/Modal";
import {
  Building2,
  MapPin,
  BookOpen,
  DollarSign,
  TrendingUp,
  Bookmark,
  BookmarkCheck,
  Award,
} from "@/components/icons";

export function CollegeCard({ college }: { college: College }) {
  const { isItemSaved, toggleSaveItem } = useAuth();
  const [saving, setSaving] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
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

  return (
    <>
      <div className="bg-white border border-[#EAEAEA] rounded-2xl p-6 hover:border-slate-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between group shadow-sm">
        <div>
          {/* Card Header: Type Badge and Bookmark */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex flex-wrap gap-1.5">
              {college.college_type && (
                <span className="text-[11px] font-semibold tracking-wide uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {college.college_type}
                </span>
              )}
              {college.entrance_exam && (
                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[#FAFAFA] text-slate-600 border border-[#EAEAEA]">
                  Exam: {college.entrance_exam}
                </span>
              )}
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
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 leading-tight truncate">
                {college.name}
              </h3>
              <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                <span className="truncate">
                  {college.location ? `${college.location}, ` : ""}
                  {college.state || "India"}
                </span>
              </div>
            </div>
          </div>

          {/* Course Info */}
          {college.course && (
            <div className="flex items-center gap-2 text-xs font-medium text-slate-700 bg-[#FAFAFA] border border-[#F1F5F9] px-3 py-2 rounded-xl mb-4">
              <BookOpen className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <span className="truncate">Course: {college.course}</span>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 py-3 border-y border-[#F1F5F9] text-xs">
            <div>
              <span className="text-slate-500 block mb-0.5 text-[11px]">Annual Tuition</span>
              <span className="font-bold text-slate-900 flex items-center gap-0.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                {formatCurrency(college.fees)}
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

        {/* Footer actions: Highest package & View details */}
        <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            {college.highest_package && (
              <span>
                Highest: <strong className="text-slate-900 font-bold">{formatCurrency(college.highest_package)}</strong>
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsDetailsOpen(true)}
            className="text-xs font-semibold text-slate-900 hover:text-indigo-600 px-2 py-1 rounded-md transition"
          >
            View Details &rarr;
          </button>
        </div>
      </div>

      {/* College Details Modal */}
      <Modal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title={college.name}
        subtitle={`${college.location ? `${college.location}, ` : ""}${college.state || "India"}`}
      >
        <div className="space-y-6 text-sm text-slate-700">
          {/* Top Badges */}
          <div className="flex flex-wrap gap-2">
            {college.college_type && (
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Type: {college.college_type}
              </span>
            )}
            {college.entrance_exam && (
              <span className="text-xs font-medium px-3 py-1 rounded-full bg-[#FAFAFA] text-slate-600 border border-[#EAEAEA]">
                Entrance Exam: {college.entrance_exam}
              </span>
            )}
          </div>

          {/* Course Details */}
          {college.course && (
            <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#EAEAEA]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Program Offered
              </span>
              <p className="font-bold text-slate-900 text-base">
                {college.course}
              </p>
            </div>
          )}

          {/* Financial & Placement Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100">
              <span className="text-xs text-slate-600 block mb-1">
                Annual Tuition Fee
              </span>
              <span className="text-lg font-bold text-emerald-700 flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                {formatCurrency(college.fees)}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100">
              <span className="text-xs text-slate-600 block mb-1">
                Average Package
              </span>
              <span className="text-lg font-bold text-indigo-700 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                {formatCurrency(college.avg_package)}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-violet-50/60 border border-violet-100">
              <span className="text-xs text-slate-600 block mb-1">
                Highest Package
              </span>
              <span className="text-lg font-bold text-violet-700 flex items-center gap-1">
                <Award className="w-4 h-4" />
                {formatCurrency(college.highest_package)}
              </span>
            </div>
          </div>

          {/* Placement Rate Bar */}
          {college.placement_rate !== null && college.placement_rate !== undefined && (
            <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#EAEAEA]">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold text-slate-700">
                  Campus Placement Rate
                </span>
                <span className="text-base font-extrabold text-emerald-600">
                  {college.placement_rate}%
                </span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full"
                  style={{ width: `${Math.min(college.placement_rate, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Row */}
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
                  Save College
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}


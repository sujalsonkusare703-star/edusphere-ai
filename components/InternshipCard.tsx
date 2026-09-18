"use client";

import React, { useState } from "react";
import { Internship } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { Modal } from "@/components/Modal";
import {
  Briefcase,
  MapPin,
  Clock,
  DollarSign,
  Bookmark,
  BookmarkCheck,
  CheckCircle,
} from "@/components/icons";

export function InternshipCard({ internship }: { internship: Internship }) {
  const { isItemSaved, toggleSaveItem, skills: studentSkills } = useAuth();
  const [saving, setSaving] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const saved = isItemSaved(internship.id);

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (saving) return;
    setSaving(true);
    await toggleSaveItem("internship", internship.id);
    setSaving(false);
  };

  return (
    <>
      <div className="bg-white border border-[#EAEAEA] rounded-2xl p-6 hover:border-slate-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between group shadow-sm">
        <div>
          {/* Header badges & save */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex flex-wrap gap-1.5">
              {internship.remote && (
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Remote
                </span>
              )}
              {internship.duration && (
                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[#FAFAFA] text-slate-600 border border-[#EAEAEA] flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {internship.duration}
                </span>
              )}
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              title={saved ? "Remove from saved" : "Save internship"}
              aria-label={saved ? "Remove internship from saved" : "Save internship"}
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

          {/* Role & Company */}
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <Briefcase className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 leading-tight truncate">
                {internship.role}
              </h3>
              <p className="text-sm font-semibold text-slate-600 mt-0.5 truncate">
                {internship.company}
              </p>
              <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">
                  {internship.location || (internship.remote ? "Anywhere (Remote)" : "Location Flexible")}
                </span>
              </div>
            </div>
          </div>

          {/* Stipend & Details */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAFAFA] border border-[#F1F5F9] text-xs mb-4">
            <span className="text-slate-500 font-medium">Monthly Stipend</span>
            <span className="font-bold text-slate-900 flex items-center gap-0.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              {internship.stipend || "Competitive / Unpaid"}
            </span>
          </div>

          {/* Skills Tag Section */}
          {internship.skills && internship.skills.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                Required Skills
              </span>
              <div className="flex flex-wrap gap-1.5">
                {internship.skills.map((skill, idx) => {
                  const isMatched = studentSkills.some(
                    (s) => s.toLowerCase() === skill.toLowerCase()
                  );
                  return (
                    <span
                      key={idx}
                      className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md ${
                        isMatched
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {isMatched && <CheckCircle className="w-2.5 h-2.5 text-emerald-600" />}
                      {skill}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="mt-5 pt-3 border-t border-[#F1F5F9] text-xs text-slate-500 flex items-center justify-between">
          <span>Verified Opportunity</span>
          <button
            type="button"
            onClick={() => setIsDetailsOpen(true)}
            className="text-xs font-semibold text-slate-900 hover:text-emerald-600 px-2 py-1 rounded-md transition"
          >
            View Details &rarr;
          </button>
        </div>
      </div>

      {/* Internship Details Modal */}
      <Modal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title={internship.role}
        subtitle={`${internship.company} • ${internship.location || (internship.remote ? "Remote" : "Location Flexible")}`}
      >
        <div className="space-y-6 text-sm text-slate-700">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {internship.remote && (
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Work Mode: Remote
              </span>
            )}
            {internship.duration && (
              <span className="text-xs font-medium px-3 py-1 rounded-full bg-[#FAFAFA] text-slate-600 border border-[#EAEAEA]">
                Duration: {internship.duration}
              </span>
            )}
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100">
              <span className="text-xs text-slate-600 block mb-1">
                Monthly Compensation / Stipend
              </span>
              <span className="text-lg font-bold text-emerald-700 flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                {internship.stipend || "Competitive / Unpaid"}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#EAEAEA]">
              <span className="text-xs text-slate-600 block mb-1">
                Location
              </span>
              <span className="text-base font-semibold text-slate-900 flex items-center gap-1">
                <MapPin className="w-4 h-4 text-slate-400" />
                {internship.location || (internship.remote ? "Remote" : "Location Flexible")}
              </span>
            </div>
          </div>

          {/* Required Skills */}
          {internship.skills && internship.skills.length > 0 && (
            <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#EAEAEA] space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Required Technical Proficiencies
              </span>
              <div className="flex flex-wrap gap-2">
                {internship.skills.map((skill, idx) => {
                  const isMatched = studentSkills.some(
                    (s) => s.toLowerCase() === skill.toLowerCase()
                  );
                  return (
                    <span
                      key={idx}
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-lg ${
                        isMatched
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {isMatched && <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
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
                  Save Internship
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}


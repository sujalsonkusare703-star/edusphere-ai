import React from "react";
import Link from "next/link";
import { MapPin, Building2 } from "@/components/icons";
import { display, present } from "@/lib/pune/format";
import type { PuneCollegeSummary } from "@/lib/pune/types";
import { SaveButton } from "./SaveButton";

export function CollegeListCard({ college, action }: { college: PuneCollegeSummary; action?: React.ReactNode }) {
  const place = [present(college.taluka), present(college.city), college.district].filter(Boolean).join(", ");
  return (
    <article className="flex flex-col justify-between gap-3 p-5 bg-white border border-[#EAEAEA] rounded-2xl shadow-sm hover:shadow-md transition">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <Link href={`/colleges/${college.id}`} className="font-semibold text-slate-900 leading-snug hover:text-indigo-700 hover:underline">
            {college.college_name_as_published}
          </Link>
          <SaveButton kind="college" itemId={college.id} compact />
        </div>
        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          <MapPin className="w-3.5 h-3.5 shrink-0" /> {place}
        </p>
        <p className="flex items-start gap-1.5 text-xs text-slate-500">
          <Building2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>University: {display(college.affiliating_university)}</span>
        </p>
        <dl className="grid grid-cols-2 gap-2 pt-1 text-xs">
          <div>
            <dt className="text-slate-400">Ownership</dt>
            <dd className="text-slate-700">{display(college.ownership)}</dd>
          </div>
          <div>
            <dt className="text-slate-400">NAAC grade</dt>
            <dd className="text-slate-700">{display(college.naac_grade)}</dd>
          </div>
        </dl>
      </div>
      <div className="flex items-center justify-between gap-2 pt-1">
        <Link href={`/colleges/${college.id}`} className="text-xs font-semibold text-indigo-600 hover:underline">
          View details →
        </Link>
        {action}
      </div>
    </article>
  );
}

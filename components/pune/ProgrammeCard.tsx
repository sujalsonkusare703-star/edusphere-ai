import React from "react";
import Link from "next/link";
import { display, displayNumber, present } from "@/lib/pune/format";
import type { PuneProgrammeSummary } from "@/lib/pune/queries";
import { SaveButton } from "./SaveButton";

/** Title for a programme row: the official name when published, else degree + specialisation. */
export function programmeTitle(p: Pick<PuneProgrammeSummary, "programme_name_official" | "programme_degree" | "specialisation">): string {
  const official = present(p.programme_name_official);
  if (official) return official;
  const degree = present(p.programme_degree);
  const spec = present(p.specialisation);
  if (degree && spec) return `${degree} (${spec})`;
  return degree ?? spec ?? "Programme name not available";
}

export function ProgrammeCard({
  programme,
  collegeId,
  showCollege = true,
  action,
}: {
  programme: PuneProgrammeSummary;
  collegeId?: number | null;
  showCollege?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <article className="p-4 bg-white border border-[#EAEAEA] rounded-2xl shadow-sm space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <h3 className="font-semibold text-sm text-slate-900 leading-snug">{programmeTitle(programme)}</h3>
          {showCollege &&
            (collegeId ? (
              <Link href={`/colleges/${collegeId}`} className="text-xs text-indigo-600 hover:underline">
                {programme.college_name_as_published}
              </Link>
            ) : (
              <p className="text-xs text-slate-500">{programme.college_name_as_published}</p>
            ))}
        </div>
        <SaveButton kind="programme" itemId={programme.id} compact />
      </div>
      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-xs">
        <Field label="Degree" value={display(programme.programme_degree)} />
        <Field label="Level" value={display(programme.degree_level)} />
        <Field label="Field" value={display(programme.field)} />
        <Field label="Specialisation" value={display(programme.specialisation)} />
        <Field label="Duration (years)" value={display(programme.duration_years)} />
        <Field label="Intake seats" value={displayNumber(programme.intake_seats)} />
        <Field label="Entrance exam" value={display(programme.entrance_exam)} />
      </dl>
      {action}
    </article>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-slate-400">{label}</dt>
      <dd className={`break-words ${value === "Not available" ? "text-slate-400 italic" : "text-slate-700"}`}>{value}</dd>
    </div>
  );
}

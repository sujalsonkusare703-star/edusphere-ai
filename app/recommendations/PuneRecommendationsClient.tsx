"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardShell } from "@/components/DashboardShell";
import { LoadingGrid } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { AlertCircle } from "@/components/icons";
import { ProgrammeCard } from "@/components/pune/ProgrammeCard";
import { Pagination } from "@/components/pune/Pagination";
import { AICareerAssistant } from "@/components/ai-guidance/AICareerAssistant";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { fieldLabel, levelLabel } from "@/lib/degree-master";
import {
  PAGE_SIZE,
  collegeIdsByName,
  cutoffCoverage,
  searchProgrammes,
  type Page,
  type PuneProgrammeSummary,
} from "@/lib/pune/queries";
import { COVERED_DISTRICTS, dbFieldsFor, dbLevelsFor } from "@/lib/pune/profile-match";

export default function PuneRecommendationsClient() {
  return (
    <ProtectedRoute>
      <Recommendations />
    </ProtectedRoute>
  );
}

/**
 * "Recommendations" here means: programmes in the database whose field (and
 * level) match the student's profile. No scores, ranks or chances are invented.
 */
function Recommendations() {
  const { studentProfile, loading: authLoading } = useAuth();
  const fieldCode = studentProfile?.field_code ?? null;
  const levelCode = studentProfile?.degree_level_code ?? null;
  const district = studentProfile?.preferred_district ?? null;

  const dbFields = useMemo(() => dbFieldsFor(fieldCode), [fieldCode]);
  const dbLevels = useMemo(() => dbLevelsFor(levelCode), [levelCode]);

  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Page<PuneProgrammeSummary> | null>(null);
  const [collegeIds, setCollegeIds] = useState<Map<string, number>>(new Map());
  const [coverage, setCoverage] = useState<string[] | null>(null);
  const [error, setError] = useState("");
  const requestKey = `${dbFields.join(",")}|${dbLevels.join(",")}|${page}`;
  const [doneKey, setDoneKey] = useState<string | null>(null);
  const loading = doneKey !== requestKey;

  useEffect(() => {
    cutoffCoverage(createClient())
      .then(setCoverage)
      .catch(() => setCoverage(null));
  }, []);

  useEffect(() => {
    if (dbFields.length === 0) return;
    let active = true;
    const supabase = createClient();
    const key = `${dbFields.join(",")}|${dbLevels.join(",")}|${page}`;
    (async () => {
      try {
        const r = await searchProgrammes(supabase, { fields: dbFields, levels: dbLevels, page });
        const ids = await collegeIdsByName(supabase, r.rows.map((p) => p.college_name_as_published));
        if (!active) return;
        setResult(r);
        setCollegeIds(ids);
        setError("");
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        if (active) setDoneKey(key);
      }
    })();
    return () => {
      active = false;
    };
  }, [dbFields, dbLevels, page]);

  const outsideCoverage = district && !COVERED_DISTRICTS.some((d) => d.toLowerCase() === district.toLowerCase());

  return (
    <DashboardShell title="Recommendations" subtitle="Programmes from the EduSphere database that match your profile">
      <section className="p-5 bg-white border border-[#EAEAEA] rounded-2xl shadow-sm text-sm space-y-2">
        <h2 className="font-semibold text-slate-900">How this list is made</h2>
        <p className="text-slate-600">
          We show programmes whose field{dbLevels.length ? " and level" : ""} match your profile. This list is not a
          ranking and does not predict admission chances.
        </p>
        <p className="text-slate-600">
          Your profile: field <strong>{fieldCode ? fieldLabel(fieldCode) : "not set"}</strong>, level{" "}
          <strong>{levelCode ? levelLabel(levelCode) : "not set"}</strong>.{" "}
          <Link href="/profile" className="text-indigo-600 hover:underline">
            Edit profile
          </Link>
        </p>
        {outsideCoverage && (
          <p className="text-amber-700">
            You prefer {district}. The database currently covers only {COVERED_DISTRICTS.join(", ")} district, so all
            results below are from {COVERED_DISTRICTS.join(", ")}.
          </p>
        )}
        <p className="text-slate-500 text-xs">
          Some programmes in the database have no field recorded and are not included here. You can still find them on
          the{" "}
          <Link href="/programmes" className="text-indigo-600 hover:underline">
            Programmes
          </Link>{" "}
          page.
        </p>
        <p className="text-slate-500 text-xs">
          Cutoffs:{" "}
          {coverage === null
            ? "Not available"
            : coverage.length === 0
              ? "the database has no cutoff data yet."
              : `the database only has cutoffs for ${coverage.join(", ")}. Cutoffs for other programmes (for example engineering) are not available yet.`}
        </p>
      </section>

      {error && (
        <div role="alert" className="flex items-center gap-2 p-3 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700">
          <AlertCircle className="w-4 h-4" /> Could not load programmes: {error}
        </div>
      )}

      {authLoading ? (
        <LoadingGrid count={4} />
      ) : !fieldCode ? (
        <EmptyState
          title="Add your field of study"
          description="Choose your level and field on the profile page to see matching programmes."
          actionText="Complete profile"
          actionHref="/profile"
        />
      ) : dbFields.length === 0 ? (
        <EmptyState
          title="No matching programmes in the database yet"
          description={`The database has no programmes tagged as ${fieldLabel(fieldCode)} yet. Try searching all programmes instead.`}
          actionText="Search programmes"
          actionHref="/programmes"
        />
      ) : loading && !result ? (
        <LoadingGrid count={4} />
      ) : result && result.total === 0 ? (
        <EmptyState
          title="No matching programmes"
          description={`No ${levelCode ? levelLabel(levelCode) + " " : ""}programmes in ${fieldLabel(fieldCode)} were found in the database.`}
          actionText="Search programmes"
          actionHref="/programmes"
        />
      ) : result ? (
        <>
          <div className={`grid gap-3 md:grid-cols-2 ${loading ? "opacity-60" : ""}`}>
            {result.rows.map((p) => (
              <ProgrammeCard key={p.id} programme={p} collegeId={collegeIds.get(p.college_name_as_published)} />
            ))}
          </div>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={result.total}
            onPage={(p) => {
              setPage(p);
              window.scrollTo({ top: 0 });
            }}
          />
        </>
      ) : null}

      <AICareerAssistant />
    </DashboardShell>
  );
}

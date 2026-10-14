"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardShell } from "@/components/DashboardShell";
import { LoadingGrid } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { AlertCircle, Bookmark, Trash2 } from "@/components/icons";
import { CollegeListCard } from "@/components/pune/CollegeListCard";
import { ProgrammeCard } from "@/components/pune/ProgrammeCard";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { listSavedColleges, listSavedProgrammes, type SavedCollegeRow, type SavedProgrammeRow } from "@/lib/pune/saved";
import { collegeIdsByName } from "@/lib/pune/queries";
import type { SavedKind } from "@/lib/pune/saved";

export default function PuneSavedClient() {
  return (
    <ProtectedRoute>
      <SavedList />
    </ProtectedRoute>
  );
}

function SavedList() {
  const { user, toggleSaved } = useAuth();
  const [colleges, setColleges] = useState<SavedCollegeRow[] | null>(null);
  const [programmes, setProgrammes] = useState<SavedProgrammeRow[] | null>(null);
  const [collegeIds, setCollegeIds] = useState<Map<string, number>>(new Map());
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const supabase = createClient();
    (async () => {
      try {
        const [c, p] = await Promise.all([listSavedColleges(supabase, user.id), listSavedProgrammes(supabase, user.id)]);
        const ids = await collegeIdsByName(
          supabase,
          p.map((r) => r.programme?.college_name_as_published).filter((n): n is string => !!n)
        );
        if (!active) return;
        setColleges(c);
        setProgrammes(p);
        setCollegeIds(ids);
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const remove = async (kind: SavedKind, itemId: number) => {
    const key = `${kind}:${itemId}`;
    setRemoving(key);
    const result = await toggleSaved(kind, itemId, false);
    if (result === "removed") {
      if (kind === "college") setColleges((prev) => prev?.filter((r) => r.college?.id !== itemId) ?? null);
      else setProgrammes((prev) => prev?.filter((r) => r.programme?.id !== itemId) ?? null);
    } else {
      setError("Could not remove the item. Please try again.");
    }
    setRemoving(null);
  };

  const loading = colleges === null || programmes === null;
  const empty = !loading && colleges.length === 0 && programmes.length === 0;

  const removeButton = (kind: SavedKind, itemId: number) => (
    <button
      type="button"
      onClick={() => remove(kind, itemId)}
      disabled={removing === `${kind}:${itemId}`}
      className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50 cursor-pointer"
    >
      <Trash2 className="w-3.5 h-3.5" /> Remove
    </button>
  );

  return (
    <DashboardShell title="Saved items" subtitle="Colleges and programmes you have saved">
      {error && (
        <div role="alert" className="flex items-center gap-2 p-3 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading && !error ? (
        <LoadingGrid count={3} />
      ) : empty ? (
        <EmptyState
          icon={<Bookmark className="w-7 h-7" />}
          title="Nothing saved yet"
          description="Use the Save button on a college or programme and it will appear here."
          actionText="Browse colleges"
          actionHref="/colleges"
        />
      ) : (
        <>
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Colleges ({colleges?.length ?? 0})</h2>
              {colleges && colleges.length > 1 && (
                <Link
                  href={`/compare?ids=${colleges
                    .map((r) => r.college?.id)
                    .filter(Boolean)
                    .slice(0, 3)
                    .join(",")}`}
                  className="text-xs font-semibold text-indigo-600 hover:underline"
                >
                  Compare saved colleges →
                </Link>
              )}
            </div>
            {colleges && colleges.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {colleges.map((r) =>
                  r.college ? (
                    <CollegeListCard key={r.id} college={r.college} action={removeButton("college", r.college.id)} />
                  ) : null
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No saved colleges.</p>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">Programmes ({programmes?.length ?? 0})</h2>
            {programmes && programmes.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {programmes.map((r) =>
                  r.programme ? (
                    <ProgrammeCard
                      key={r.id}
                      programme={r.programme}
                      collegeId={collegeIds.get(r.programme.college_name_as_published)}
                      action={<div className="pt-1">{removeButton("programme", r.programme.id)}</div>}
                    />
                  ) : null
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No saved programmes.</p>
            )}
          </section>
        </>
      )}
    </DashboardShell>
  );
}

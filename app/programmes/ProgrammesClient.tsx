"use client";

import React, { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { LoadingGrid } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { Search, AlertCircle } from "@/components/icons";
import { ProgrammeCard } from "@/components/pune/ProgrammeCard";
import { Pagination } from "@/components/pune/Pagination";
import { createClient } from "@/lib/supabase/client";
import {
  PAGE_SIZE,
  collegeIdsByName,
  listProgrammeFields,
  searchProgrammes,
  type Page,
  type PuneProgrammeSummary,
} from "@/lib/pune/queries";
import { display } from "@/lib/pune/format";

const LEVELS = [
  { value: "", label: "All levels" },
  { value: "UG", label: "Undergraduate (UG)" },
  { value: "PG", label: "Postgraduate (PG)" },
  { value: "UG+PG (dual degree)", label: "UG + PG (dual degree)" },
  { value: "NOT_AVAILABLE", label: "Level not available" },
];

export default function ProgrammesClient() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [field, setField] = useState("");
  const [level, setLevel] = useState("");
  const [fields, setFields] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Page<PuneProgrammeSummary> | null>(null);
  const [collegeIds, setCollegeIds] = useState<Map<string, number>>(new Map());
  const [error, setError] = useState("");
  const [doneKey, setDoneKey] = useState<string | null>(null);
  const requestKey = `${query}|${field}|${level}|${page}`;
  const loading = doneKey !== requestKey;

  useEffect(() => {
    listProgrammeFields(createClient())
      .then(setFields)
      .catch(() => setFields([]));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(input.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [input]);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    const key = `${query}|${field}|${level}|${page}`;
    (async () => {
      try {
        const r = await searchProgrammes(supabase, {
          query,
          fields: field ? [field] : undefined,
          levels: level ? [level] : undefined,
          page,
        });
        const ids = await collegeIdsByName(supabase, r.rows.map((p) => p.college_name_as_published));
        if (!active) return;
        setResult(r);
        setCollegeIds(ids);
        setError("");
      } catch (e) {
        if (active) setError((e as Error).message || "Could not load programmes.");
      } finally {
        if (active) setDoneKey(key);
      }
    })();
    return () => {
      active = false;
    };
  }, [query, field, level, page]);

  const goTo = (p: number) => {
    setPage(p);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };

  const selectClass =
    "w-full sm:w-auto px-3 py-2.5 rounded-xl border border-[#EAEAEA] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200";

  return (
    <DashboardShell title="Programmes" subtitle="Programmes offered by Pune district colleges">
      <div className="flex flex-col sm:flex-row gap-3">
        <label className="relative block flex-1">
          <span className="sr-only">Search programmes</span>
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={120}
            placeholder="Search by programme, degree, specialisation or college"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#EAEAEA] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </label>
        <select
          aria-label="Field"
          value={field}
          onChange={(e) => {
            setField(e.target.value);
            setPage(1);
          }}
          className={selectClass}
        >
          <option value="">All fields</option>
          {fields.map((f) => (
            <option key={f} value={f}>
              {f === "NOT_AVAILABLE" ? "Field not available" : display(f)}
            </option>
          ))}
        </select>
        <select
          aria-label="Level"
          value={level}
          onChange={(e) => {
            setLevel(e.target.value);
            setPage(1);
          }}
          className={selectClass}
        >
          {LEVELS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 p-3 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700">
          <AlertCircle className="w-4 h-4" /> Could not load programmes: {error}
        </div>
      )}

      {loading && !result ? (
        <LoadingGrid count={6} />
      ) : result && result.total === 0 ? (
        <EmptyState title="No programmes found" description="No programme in the database matches these filters." />
      ) : result ? (
        <>
          <div className={`grid gap-3 md:grid-cols-2 ${loading ? "opacity-60" : ""}`}>
            {result.rows.map((p) => (
              <ProgrammeCard key={p.id} programme={p} collegeId={collegeIds.get(p.college_name_as_published)} />
            ))}
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={result.total} onPage={goTo} />
        </>
      ) : null}
    </DashboardShell>
  );
}

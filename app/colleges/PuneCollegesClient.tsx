"use client";

import React, { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { LoadingGrid } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { Search, AlertCircle } from "@/components/icons";
import { CollegeListCard } from "@/components/pune/CollegeListCard";
import { Pagination } from "@/components/pune/Pagination";
import { createClient } from "@/lib/supabase/client";
import { PAGE_SIZE, searchColleges, type Page } from "@/lib/pune/queries";
import type { PuneCollegeSummary } from "@/lib/pune/types";

export default function PuneCollegesClient() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Page<PuneCollegeSummary> | null>(null);
  const [error, setError] = useState("");
  // Key of the last finished request; anything else means a request is in flight.
  const [doneKey, setDoneKey] = useState<string | null>(null);
  const requestKey = `${query}|${page}`;
  const loading = doneKey !== requestKey;

  // Debounce typing; a new search always starts at page 1.
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(input.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [input]);

  useEffect(() => {
    let active = true;
    const key = `${query}|${page}`;
    searchColleges(createClient(), { query, page, pageSize: PAGE_SIZE })
      .then((r) => {
        if (!active) return;
        setResult(r);
        setError("");
      })
      .catch((e: Error) => active && setError(e.message || "Could not load colleges."))
      .finally(() => active && setDoneKey(key));
    return () => {
      active = false;
    };
  }, [query, page]);

  const goTo = (p: number) => {
    setPage(p);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };

  return (
    <DashboardShell title="Colleges" subtitle="Colleges in Pune district from the EduSphere dataset">
      <label className="relative block">
        <span className="sr-only">Search colleges</span>
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={120}
          placeholder="Search by college name, taluka or city"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#EAEAEA] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
      </label>

      {error && (
        <div role="alert" className="flex items-center gap-2 p-3 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700">
          <AlertCircle className="w-4 h-4" /> Could not load colleges: {error}
        </div>
      )}

      {loading && !result ? (
        <LoadingGrid count={6} />
      ) : result && result.total === 0 ? (
        <EmptyState
          title="No colleges found"
          description={query ? `No college in the database matches “${query}”.` : "The college list is empty."}
        />
      ) : result ? (
        <>
          <div className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-3 ${loading ? "opacity-60" : ""}`}>
            {result.rows.map((c) => (
              <CollegeListCard key={c.id} college={c} />
            ))}
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={result.total} onPage={goTo} />
        </>
      ) : null}
    </DashboardShell>
  );
}

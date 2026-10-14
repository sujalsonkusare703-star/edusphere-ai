"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/DashboardShell";
import { AlertCircle, Search, X } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { getCollegeRelated, getCollegesByIds, searchColleges } from "@/lib/pune/queries";
import { display, NOT_AVAILABLE, parseNum, present } from "@/lib/pune/format";
import type { CollegeRelated, PuneCollege, PuneCollegeSummary } from "@/lib/pune/types";

const MAX_COMPARE = 3;

interface Entry {
  college: PuneCollege;
  related: CollegeRelated;
}

function readIds(): number[] {
  if (typeof window === "undefined") return [];
  const raw = new URLSearchParams(window.location.search).get("ids") ?? "";
  return Array.from(new Set(raw.split(",").map(Number).filter((n) => Number.isSafeInteger(n) && n > 0))).slice(0, MAX_COMPARE);
}

function writeIds(ids: number[]) {
  const url = new URL(window.location.href);
  if (ids.length) url.searchParams.set("ids", ids.join(","));
  else url.searchParams.delete("ids");
  window.history.replaceState(null, "", url.toString());
}

export default function CompareClient() {
  // Rendered client-side only (see app/_live/pages.tsx), so the URL can seed state.
  const [ids, setIds] = useState<number[]>(readIds);
  const [loaded, setLoaded] = useState<Entry[]>([]);
  const [error, setError] = useState("");
  const [doneKey, setDoneKey] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [found, setFound] = useState<PuneCollegeSummary[]>([]);

  const requestKey = ids.join(",");
  const loading = ids.length > 0 && doneKey !== requestKey;
  const entries = loaded.filter((e) => ids.includes(e.college.id));
  const matches = input.trim().length >= 2 ? found : [];

  useEffect(() => {
    if (ids.length === 0) return;
    let active = true;
    const supabase = createClient();
    const key = ids.join(",");
    (async () => {
      try {
        const colleges = await getCollegesByIds(supabase, ids);
        const loaded = await Promise.all(colleges.map(async (c) => ({ college: c, related: await getCollegeRelated(supabase, c) })));
        if (!active) return;
        const order = new Map(ids.map((id, i) => [id, i]));
        setLoaded(loaded.sort((a, b) => (order.get(a.college.id) ?? 0) - (order.get(b.college.id) ?? 0)));
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
  }, [ids]);

  useEffect(() => {
    const q = input.trim();
    if (q.length < 2) return;
    let active = true;
    const t = setTimeout(() => {
      searchColleges(createClient(), { query: q, pageSize: 8 })
        .then((r) => active && setFound(r.rows))
        .catch(() => active && setFound([]));
    }, 300);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [input]);

  const update = useCallback((next: number[]) => {
    setIds(next);
    writeIds(next);
  }, []);

  const add = (id: number) => {
    if (ids.includes(id) || ids.length >= MAX_COMPARE) return;
    update([...ids, id]);
    setInput("");
    setFound([]);
  };

  const rows: { label: string; value: (e: Entry) => string }[] = [
    { label: "Taluka", value: (e) => display(e.college.taluka) },
    { label: "Affiliating university", value: (e) => display(e.college.affiliating_university) },
    { label: "Ownership", value: (e) => display(e.college.ownership) },
    { label: "Institution type", value: (e) => display(e.college.institution_type) },
    { label: "Autonomous status", value: (e) => display(e.college.autonomous_status) },
    { label: "Established", value: (e) => display(e.college.established_year) },
    { label: "NAAC grade", value: (e) => display(e.college.naac_grade) },
    { label: "NIRF rank (latest)", value: (e) => display(e.college.nirf_rank_latest) },
    { label: "Programmes recorded", value: (e) => String(e.related.programmes.length) },
    { label: "Degrees offered", value: (e) => distinct(e.related.programmes.map((p) => p.programme_degree)) },
    { label: "Total annual fee (range)", value: (e) => feeRange(e.related) },
    { label: "Entrance exams (admissions)", value: (e) => distinct(e.related.admissions.map((a) => a.entrance_exam)) },
    { label: "Cutoff records", value: (e) => (e.related.cutoffs.length ? String(e.related.cutoffs.length) : NOT_AVAILABLE) },
    { label: "Scholarships recorded", value: (e) => String(e.related.scholarships.length) },
    { label: "Facilities recorded", value: (e) => distinct(e.related.facilities.map((f) => f.facility_type)) },
    { label: "Data retrieved", value: (e) => display(e.college.retrieved_date) },
  ];

  return (
    <DashboardShell title="Compare colleges" subtitle={`Pick up to ${MAX_COMPARE} colleges. Only values from the database are shown.`}>
      {ids.length < MAX_COMPARE && (
        <div className="relative">
          <label className="relative block">
            <span className="sr-only">Add a college to compare</span>
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={120}
              placeholder="Type a college name to add it"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#EAEAEA] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </label>
          {matches.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full max-h-72 overflow-y-auto bg-white border border-[#EAEAEA] rounded-xl shadow-lg">
              {matches.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => add(m.id)}
                    disabled={ids.includes(m.id)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    {m.college_name_as_published}
                    <span className="block text-[11px] text-slate-400">{display(m.taluka)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-center gap-2 p-3 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700">
          <AlertCircle className="w-4 h-4" /> Could not load colleges: {error}
        </div>
      )}

      {ids.length === 0 ? (
        <p className="p-6 bg-white border border-[#EAEAEA] rounded-2xl text-sm text-slate-500">
          No colleges selected yet. Search above, or use “Compare” on a college page.
        </p>
      ) : loading && entries.length === 0 ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="overflow-x-auto bg-white border border-[#EAEAEA] rounded-2xl">
          <table className="min-w-full text-xs">
            <thead className="bg-[#FAFAFA] text-left">
              <tr>
                <th scope="col" className="px-3 py-3 w-40 text-slate-500 font-semibold">
                  &nbsp;
                </th>
                {entries.map((e) => (
                  <th key={e.college.id} scope="col" className="px-3 py-3 align-top min-w-[200px]">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/colleges/${e.college.id}`} className="font-semibold text-slate-900 hover:underline">
                        {e.college.college_name_as_published}
                      </Link>
                      <button
                        type="button"
                        aria-label={`Remove ${e.college.college_name_as_published}`}
                        onClick={() => update(ids.filter((id) => id !== e.college.id))}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAEAEA]">
              {rows.map((r) => (
                <tr key={r.label} className="align-top">
                  <th scope="row" className="px-3 py-2 text-left font-medium text-slate-500">
                    {r.label}
                  </th>
                  {entries.map((e) => {
                    const v = r.value(e);
                    return (
                      <td key={e.college.id} className={`px-3 py-2 ${v === NOT_AVAILABLE ? "text-slate-400 italic" : "text-slate-800"}`}>
                        {v}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardShell>
  );
}

function distinct(values: (string | null)[]): string {
  const set = new Set(values.map(present).filter((v): v is string => v !== null));
  return set.size ? Array.from(set).join(", ") : NOT_AVAILABLE;
}

function feeRange(related: CollegeRelated): string {
  const nums = related.fees.map((f) => parseNum(f.total_annual_fee_inr)).filter((n): n is number => n !== null);
  if (nums.length === 0) return NOT_AVAILABLE;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;
  return min === max ? fmt(min) : `${fmt(min)} – ${fmt(max)}`;
}

"use client";

import React, { useEffect, useState, useMemo } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { InternshipCard } from "@/components/InternshipCard";
import { LoadingGrid } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { createClient } from "@/lib/supabase/client";
import { Internship } from "@/types";
import { Search, Briefcase, AlertCircle } from "@/components/icons";

import { fetchInternships } from "@/lib/supabase/opportunities";

export default function InternshipsPage() {
  const supabase = createClient();
  const [internships, setInternships] = useState<Internship[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [reloadIndex, setReloadIndex] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadInternships() {
      setLoading(true);
      setErrorMsg("");
      try {
        const { data, error } = await fetchInternships(supabase);

        if (!isMounted) return;

        if (error) {
          setErrorMsg(error);
          setInternships([]);
        } else {
          setInternships(data);
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : "Failed to load internships from database";
        setErrorMsg(msg);
        setInternships([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadInternships();

    return () => {
      isMounted = false;
    };
  }, [supabase, reloadIndex]);

  const handleRetry = () => {
    setLoading(true);
    setErrorMsg("");
    setReloadIndex((prev) => prev + 1);
  };

  // Unique durations for filter dropdown
  const availableDurations = useMemo(() => {
    const set = new Set<string>();
    internships.forEach((i) => {
      if (i.duration) set.add(i.duration);
    });
    return Array.from(set).sort();
  }, [internships]);

  // Filtered internships
  const filteredInternships = useMemo(() => {
    return internships.filter((item) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesRole = item.role?.toLowerCase().includes(q);
        const matchesCompany = item.company?.toLowerCase().includes(q);
        const matchesLocation = item.location?.toLowerCase().includes(q);
        const matchesSkill = item.skills?.some((s) => s.toLowerCase().includes(q));
        if (!matchesRole && !matchesCompany && !matchesLocation && !matchesSkill) return false;
      }

      if (remoteOnly && !item.remote) return false;
      if (selectedDuration && item.duration !== selectedDuration) return false;

      return true;
    });
  }, [internships, searchQuery, remoteOnly, selectedDuration]);

  const resetFilters = () => {
    setSearchQuery("");
    setRemoteOnly(false);
    setSelectedDuration("");
  };

  return (
    <DashboardShell
      title="Internship Opportunities"
      subtitle="Discover industry internships, remote positions, and required technical skills"
    >
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Database Error: {errorMsg}</span>
          </div>
          <button
            onClick={handleRetry}
            className="px-3 py-1 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-500 transition text-[11px]"
          >
            Retry
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white border border-[#EAEAEA] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by role, company, skill (e.g. Python, React)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#EAEAEA] bg-white text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition shadow-xs"
            />
          </div>

          {/* Remote Toggle */}
          <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#EAEAEA] bg-[#FAFAFA] text-slate-700 text-xs font-semibold cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remoteOnly}
              onChange={(e) => setRemoteOnly(e.target.checked)}
              className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-[#EAEAEA]"
            />
            <span>Remote Only</span>
          </label>

          {/* Duration Filter */}
          {availableDurations.length > 0 && (
            <select
              value={selectedDuration}
              onChange={(e) => setSelectedDuration(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-[#EAEAEA] bg-white text-slate-700 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 shadow-xs"
            >
              <option value="">All Durations</option>
              {availableDurations.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          )}

          {(searchQuery || remoteOnly || selectedDuration) && (
            <button
              onClick={resetFilters}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 py-2 px-3 rounded-lg hover:bg-slate-100 transition"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Count Indicator */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Showing <strong className="text-slate-900 font-bold">{filteredInternships.length}</strong> internship openings
        </span>
      </div>

      {/* Internships Grid */}
      {loading ? (
        <LoadingGrid count={6} />
      ) : filteredInternships.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInternships.map((internship) => (
            <InternshipCard key={internship.id} internship={internship} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Briefcase className="w-8 h-8" />}
          title="No Internships in Catalog"
          description={
            internships.length === 0
              ? "The internships directory is currently empty. Openings added to the platform will appear here."
              : "No internship listings match your active filters. Try clearing your search query or remote filter."
          }
          actionText={internships.length > 0 ? "Clear Filters" : undefined}
          onAction={resetFilters}
        />
      )}
    </DashboardShell>
  );
}

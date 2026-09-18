"use client";

import React, { useEffect, useState, useMemo } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { PlacementCard } from "@/components/PlacementCard";
import { LoadingGrid } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { createClient } from "@/lib/supabase/client";
import { Placement } from "@/types";
import { Search, Award, AlertCircle } from "@/components/icons";

import { fetchPlacements } from "@/lib/supabase/opportunities";

export default function PlacementsPage() {
  const supabase = createClient();
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [reloadIndex, setReloadIndex] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("");
  const [maxCgpaFilter, setMaxCgpaFilter] = useState<number | "">("");

  useEffect(() => {
    let isMounted = true;

    async function loadPlacements() {
      setLoading(true);
      setErrorMsg("");
      try {
        const { data, error } = await fetchPlacements(supabase);

        if (!isMounted) return;

        if (error) {
          setErrorMsg(error);
          setPlacements([]);
        } else {
          setPlacements(data);
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : "Failed to load placements from database";
        setErrorMsg(msg);
        setPlacements([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadPlacements();

    return () => {
      isMounted = false;
    };
  }, [supabase, reloadIndex]);

  const handleRetry = () => {
    setLoading(true);
    setErrorMsg("");
    setReloadIndex((prev) => prev + 1);
  };

  // Unique industries
  const availableIndustries = useMemo(() => {
    const set = new Set<string>();
    placements.forEach((p) => {
      if (p.industry) set.add(p.industry);
    });
    return Array.from(set).sort();
  }, [placements]);

  // Filtered placements
  const filteredPlacements = useMemo(() => {
    return placements.filter((item) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesRole = item.role?.toLowerCase().includes(q);
        const matchesCompany = item.company?.toLowerCase().includes(q);
        const matchesIndustry = item.industry?.toLowerCase().includes(q);
        const matchesLocation = item.location?.toLowerCase().includes(q);
        const matchesSkill = item.skills?.some((s) => s.toLowerCase().includes(q));
        if (!matchesRole && !matchesCompany && !matchesIndustry && !matchesLocation && !matchesSkill) {
          return false;
        }
      }

      if (selectedIndustry && item.industry !== selectedIndustry) return false;

      if (maxCgpaFilter !== "" && item.min_cgpa !== null) {
        if (item.min_cgpa > Number(maxCgpaFilter)) return false;
      }

      return true;
    });
  }, [placements, searchQuery, selectedIndustry, maxCgpaFilter]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedIndustry("");
    setMaxCgpaFilter("");
  };

  return (
    <DashboardShell
      title="Placement Drives"
      subtitle="Explore campus recruitment openings, company eligibility criteria, and technical skills"
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

      {/* Search & Filters */}
      <div className="bg-white border border-[#EAEAEA] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by company, job role, industry, or skill..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#EAEAEA] bg-white text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition shadow-xs"
            />
          </div>

          {/* Industry Filter */}
          <div>
            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[#EAEAEA] bg-white text-slate-700 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 shadow-xs"
            >
              <option value="">All Industries</option>
              {availableIndustries.map((ind) => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
          </div>
        </div>

        {(searchQuery || selectedIndustry || maxCgpaFilter !== "") && (
          <div className="flex justify-end pt-2 border-t border-[#F1F5F9]">
            <button
              onClick={resetFilters}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Count Indicator */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Showing <strong className="text-slate-900 font-bold">{filteredPlacements.length}</strong> campus placement drives
        </span>
      </div>

      {/* Placements Grid */}
      {loading ? (
        <LoadingGrid count={6} />
      ) : filteredPlacements.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlacements.map((placement) => (
            <PlacementCard key={placement.id} placement={placement} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Award className="w-8 h-8" />}
          title="No Placement Drives in Catalog"
          description={
            placements.length === 0
              ? "The placements directory is currently empty. Openings added to the platform will automatically appear here."
              : "No placement openings match your active filters. Try adjusting your search query."
          }
          actionText={placements.length > 0 ? "Clear Filters" : undefined}
          onAction={resetFilters}
        />
      )}
    </DashboardShell>
  );
}

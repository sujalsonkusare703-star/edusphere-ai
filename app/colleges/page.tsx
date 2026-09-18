"use client";

import React, { useEffect, useState, useMemo } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { CollegeCard } from "@/components/CollegeCard";
import { LoadingGrid } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { createClient } from "@/lib/supabase/client";
import { College } from "@/types";
import { Search, Building2, AlertCircle } from "@/components/icons";

import { fetchColleges } from "@/lib/supabase/opportunities";

export default function CollegesPage() {
  const supabase = createClient();
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [reloadIndex, setReloadIndex] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedExam, setSelectedExam] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "fees_asc" | "fees_desc" | "placement_desc" | "avg_pkg_desc">("name");

  useEffect(() => {
    let isMounted = true;

    async function loadColleges() {
      setLoading(true);
      setErrorMsg("");
      try {
        const { data, error } = await fetchColleges(supabase);

        if (!isMounted) return;

        if (error) {
          setErrorMsg(error);
          setColleges([]);
        } else {
          setColleges(data);
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : "Failed to load colleges from database";
        setErrorMsg(msg);
        setColleges([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadColleges();

    return () => {
      isMounted = false;
    };
  }, [supabase, reloadIndex]);

  const handleRetry = () => {
    setLoading(true);
    setErrorMsg("");
    setReloadIndex((prev) => prev + 1);
  };

  // Unique options for filter dropdowns derived strictly from real data
  const availableStates = useMemo(() => {
    const set = new Set<string>();
    colleges.forEach((c) => {
      if (c.state) set.add(c.state);
    });
    return Array.from(set).sort();
  }, [colleges]);

  const availableCourses = useMemo(() => {
    const set = new Set<string>();
    colleges.forEach((c) => {
      if (c.course) set.add(c.course);
    });
    return Array.from(set).sort();
  }, [colleges]);

  const availableExams = useMemo(() => {
    const set = new Set<string>();
    colleges.forEach((c) => {
      if (c.entrance_exam) set.add(c.entrance_exam);
    });
    return Array.from(set).sort();
  }, [colleges]);

  const availableTypes = useMemo(() => {
    const set = new Set<string>();
    colleges.forEach((c) => {
      if (c.college_type) set.add(c.college_type);
    });
    return Array.from(set).sort();
  }, [colleges]);

  // Filtered & sorted colleges
  const filteredColleges = useMemo(() => {
    return colleges
      .filter((college) => {
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchesName = college.name?.toLowerCase().includes(q);
          const matchesLoc = college.location?.toLowerCase().includes(q);
          const matchesCourse = college.course?.toLowerCase().includes(q);
          if (!matchesName && !matchesLoc && !matchesCourse) return false;
        }

        if (selectedState && college.state !== selectedState) return false;
        if (selectedCourse && college.course !== selectedCourse) return false;
        if (selectedExam && college.entrance_exam !== selectedExam) return false;
        if (selectedType && college.college_type !== selectedType) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "fees_asc") {
          return (a.fees || 0) - (b.fees || 0);
        }
        if (sortBy === "fees_desc") {
          return (b.fees || 0) - (a.fees || 0);
        }
        if (sortBy === "placement_desc") {
          return (b.placement_rate || 0) - (a.placement_rate || 0);
        }
        if (sortBy === "avg_pkg_desc") {
          return (b.avg_package || 0) - (a.avg_package || 0);
        }
        return a.name.localeCompare(b.name);
      });
  }, [colleges, searchQuery, selectedState, selectedCourse, selectedExam, selectedType, sortBy]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedState("");
    setSelectedCourse("");
    setSelectedExam("");
    setSelectedType("");
    setSortBy("name");
  };

  return (
    <DashboardShell
      title="Colleges Discovery"
      subtitle="Browse and compare accredited universities, cutoffs, and programs across India"
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

      {/* Search and Filters Bar */}
      <div className="bg-white border border-[#EAEAEA] rounded-2xl p-5 shadow-sm space-y-4">
        {/* Search input and Sort */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by college name, location, or course..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#EAEAEA] bg-white text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition shadow-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">
              Sort by:
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-2.5 rounded-xl border border-[#EAEAEA] bg-white text-slate-700 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition shadow-xs"
            >
              <option value="name">Name (A-Z)</option>
              <option value="fees_asc">Fees: Low to High</option>
              <option value="fees_desc">Fees: High to Low</option>
              <option value="placement_desc">Highest Placement Rate</option>
              <option value="avg_pkg_desc">Highest Average Package</option>
            </select>
          </div>
        </div>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 pt-3 border-t border-[#F1F5F9]">
          <div>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#EAEAEA] bg-white text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 shadow-xs"
            >
              <option value="">All States</option>
              {availableStates.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#EAEAEA] bg-white text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 shadow-xs"
            >
              <option value="">All Courses</option>
              {availableCourses.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#EAEAEA] bg-white text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 shadow-xs"
            >
              <option value="">All Entrance Exams</option>
              {availableExams.map((ex) => (
                <option key={ex} value={ex}>{ex}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#EAEAEA] bg-white text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 shadow-xs"
            >
              <option value="">All College Types</option>
              {availableTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="col-span-2 sm:col-span-4 lg:col-span-1 flex items-center justify-end">
            <button
              onClick={resetFilters}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 py-1.5 px-3 rounded-lg hover:bg-slate-100 transition"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Showing <strong className="text-slate-900 font-bold">{filteredColleges.length}</strong> accredited colleges
        </span>
      </div>


      {/* Colleges List Grid */}
      {loading ? (
        <LoadingGrid count={6} />
      ) : filteredColleges.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredColleges.map((college) => (
            <CollegeCard key={college.id} college={college} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Building2 className="w-8 h-8" />}
          title="No Colleges Found"
          description={
            colleges.length === 0
              ? "The colleges catalog is currently empty. Colleges added to your database will automatically display here."
              : "No colleges match your active search filters. Try adjusting your query or resetting filters."
          }
          actionText={colleges.length > 0 ? "Clear Filters" : undefined}
          onAction={resetFilters}
        />
      )}
    </DashboardShell>
  );
}

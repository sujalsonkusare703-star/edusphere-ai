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
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedStream, setSelectedStream] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedExam, setSelectedExam] = useState("");
  const [selectedNaac, setSelectedNaac] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "placement_desc" | "avg_pkg_desc" | "programs_desc">("name");

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
  const availableLocations = useMemo(() => {
    const set = new Set<string>();
    colleges.forEach((c) => {
      if (c.location) set.add(c.location);
      if (c.state) set.add(c.state);
    });
    return Array.from(set).sort();
  }, [colleges]);

  const availableStreams = useMemo(() => {
    const set = new Set<string>();
    colleges.forEach((c) => {
      if (c.primary_stream) set.add(c.primary_stream);
      c.courses?.forEach((crs) => {
        if (crs.stream) set.add(crs.stream);
      });
    });
    return Array.from(set).sort();
  }, [colleges]);

  const availableCourses = useMemo(() => {
    const set = new Set<string>();
    colleges.forEach((c) => {
      if (c.courses && c.courses.length > 0) {
        c.courses.forEach((crs) => set.add(crs.course_name.trim()));
      } else if (c.programs && c.programs.length > 0) {
        c.programs.forEach((p) => set.add(p.trim()));
      } else if (c.course) {
        c.course.split(",").forEach((p) => set.add(p.trim()));
      }
    });
    return Array.from(set).filter(Boolean).sort();
  }, [colleges]);

  const availableExams = useMemo(() => {
    const set = new Set<string>();
    colleges.forEach((c) => {
      if (c.entrance_exam) set.add(c.entrance_exam);
      c.courses?.forEach((crs) => {
        crs.cutoffs?.forEach((cut) => {
          if (cut.exam) set.add(cut.exam);
        });
      });
    });
    return Array.from(set).sort();
  }, [colleges]);

  const availableNaac = useMemo(() => {
    const set = new Set<string>();
    colleges.forEach((c) => {
      if (c.naac_grade) set.add(c.naac_grade);
    });
    return Array.from(set).sort();
  }, [colleges]);

  const availableTypes = useMemo(() => {
    const set = new Set<string>();
    colleges.forEach((c) => {
      if (c.college_type) set.add(c.college_type.toLowerCase());
    });
    return Array.from(set).sort();
  }, [colleges]);

  const totalProgramsCount = useMemo(() => {
    return colleges.reduce((acc, c) => acc + (c.courses?.length || c.programs?.length || 1), 0);
  }, [colleges]);

  const puneCollegesCount = useMemo(() => {
    return colleges.filter((c) => c.location?.toLowerCase() === "pune").length;
  }, [colleges]);

  // Filtered & sorted colleges
  const filteredColleges = useMemo(() => {
    return colleges
      .filter((college) => {
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchesName = college.name?.toLowerCase().includes(q);
          const matchesLoc = college.location?.toLowerCase().includes(q);
          const matchesState = college.state?.toLowerCase().includes(q);
          const matchesStream = college.primary_stream?.toLowerCase().includes(q);
          const matchesCourse = college.course?.toLowerCase().includes(q);
          const matchesProg = college.programs?.some((p) => p.toLowerCase().includes(q));
          const matchesCrs = college.courses?.some(
            (crs) => crs.course_name.toLowerCase().includes(q) || crs.stream.toLowerCase().includes(q)
          );
          if (
            !matchesName &&
            !matchesLoc &&
            !matchesState &&
            !matchesStream &&
            !matchesCourse &&
            !matchesProg &&
            !matchesCrs
          ) {
            return false;
          }
        }

        if (selectedLocation) {
          const loc = selectedLocation.toLowerCase();
          const matchLoc = college.location?.toLowerCase() === loc;
          const matchState = college.state?.toLowerCase() === loc;
          if (!matchLoc && !matchState) return false;
        }

        if (selectedStream) {
          const s = selectedStream.toLowerCase();
          const matchesPrimary = college.primary_stream?.toLowerCase() === s;
          const matchesCourseStream = college.courses?.some((c) => c.stream.toLowerCase() === s);
          if (!matchesPrimary && !matchesCourseStream) return false;
        }

        if (selectedCourse) {
          const target = selectedCourse.toLowerCase();
          const hasCrs = college.courses?.some((c) => c.course_name.toLowerCase() === target);
          const hasProg = college.programs?.some((p) => p.toLowerCase() === target);
          const matchesCourse = college.course?.toLowerCase().includes(target);
          if (!hasCrs && !hasProg && !matchesCourse) return false;
        }

        if (selectedExam) {
          const matchesColExam = college.entrance_exam === selectedExam;
          const matchesCutoffExam = college.courses?.some((crs) =>
            crs.cutoffs?.some((cut) => cut.exam === selectedExam)
          );
          if (!matchesColExam && !matchesCutoffExam) return false;
        }

        if (selectedNaac && college.naac_grade !== selectedNaac) return false;
        if (selectedType && college.college_type?.toLowerCase() !== selectedType.toLowerCase()) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "placement_desc") {
          return (b.placement_rate || 0) - (a.placement_rate || 0);
        }
        if (sortBy === "avg_pkg_desc") {
          return (b.avg_package || 0) - (a.avg_package || 0);
        }
        if (sortBy === "programs_desc") {
          const bCount = b.courses?.length || b.programs?.length || 0;
          const aCount = a.courses?.length || a.programs?.length || 0;
          return bCount - aCount;
        }
        return a.name.localeCompare(b.name);
      });
  }, [
    colleges,
    searchQuery,
    selectedLocation,
    selectedStream,
    selectedCourse,
    selectedExam,
    selectedNaac,
    selectedType,
    sortBy,
  ]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedLocation("");
    setSelectedStream("");
    setSelectedCourse("");
    setSelectedExam("");
    setSelectedNaac("");
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

      {/* Quick Location Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          type="button"
          onClick={() => setSelectedLocation("")}
          className={`px-3.5 py-1.5 rounded-full transition-all font-medium whitespace-nowrap ${
            selectedLocation === ""
              ? "bg-slate-900 text-white shadow-sm font-semibold"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          All Colleges ({colleges.length})
        </button>
        <button
          type="button"
          onClick={() => setSelectedLocation(selectedLocation === "Pune" ? "" : "Pune")}
          className={`px-3.5 py-1.5 rounded-full transition-all font-medium whitespace-nowrap flex items-center gap-1.5 ${
            selectedLocation === "Pune"
              ? "bg-indigo-600 text-white shadow-sm font-semibold"
              : "bg-indigo-50/70 text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
          }`}
        >
          <span>Pune Region Only</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
            selectedLocation === "Pune" ? "bg-white/20 text-white" : "bg-indigo-200/70 text-indigo-800"
          }`}>
            {puneCollegesCount}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setSelectedLocation(selectedLocation === "Maharashtra" ? "" : "Maharashtra")}
          className={`px-3.5 py-1.5 rounded-full transition-all font-medium whitespace-nowrap ${
            selectedLocation === "Maharashtra"
              ? "bg-slate-900 text-white shadow-sm font-semibold"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          Maharashtra State
        </button>
      </div>

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
              placeholder="Search by college name, Pune, course, or branch..."
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
              <option value="placement_desc">Highest Placement Rate</option>
              <option value="avg_pkg_desc">Highest Average Package</option>
              <option value="programs_desc">Most Programs Offered</option>
            </select>
          </div>
        </div>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 pt-3 border-t border-[#F1F5F9]">
          <div>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#EAEAEA] bg-white text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 shadow-xs"
            >
              <option value="">All Locations</option>
              {availableLocations.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedStream}
              onChange={(e) => setSelectedStream(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#EAEAEA] bg-white text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 shadow-xs"
            >
              <option value="">All Streams</option>
              {availableStreams.map((s) => (
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
              <option value="">All Programs / Courses</option>
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
              value={selectedNaac}
              onChange={(e) => setSelectedNaac(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#EAEAEA] bg-white text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 shadow-xs"
            >
              <option value="">All NAAC Grades</option>
              {availableNaac.map((ng) => (
                <option key={ng} value={ng}>NAAC {ng}</option>
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
                <option key={t} value={t} className="capitalize">
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-2 sm:col-span-3 lg:col-span-1 flex items-center justify-end">
            <button
              onClick={resetFilters}
              className="w-full lg:w-auto text-xs font-semibold text-slate-500 hover:text-slate-900 py-1.5 px-3 rounded-lg hover:bg-slate-100 transition text-center"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Showing <strong className="text-slate-900 font-bold">{filteredColleges.length}</strong> accredited colleges across{" "}
          <strong className="text-slate-900 font-bold">{totalProgramsCount}</strong> programs
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

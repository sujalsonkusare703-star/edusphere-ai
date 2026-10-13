"use client";

import React, { useEffect, useState, useMemo } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { CollegeCard } from "@/components/CollegeCard";
import { LoadingGrid } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { createClient } from "@/lib/supabase/client";
import { College } from "@/types";
import {
  Search,
  Building2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
} from "@/components/icons";
import { getColleges } from "@/lib/supabase/colleges";

const PAGE_SIZE = 24;

export default function CollegesPage() {
  const supabase = createClient();
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [reloadIndex, setReloadIndex] = useState(0);

  // Multi-tier Filters — default District is "Pune" per specification
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("Pune");
  const [selectedType, setSelectedType] = useState("");
  const [selectedOwnership, setSelectedOwnership] = useState("");
  const [selectedUniversity, setSelectedUniversity] = useState("");
  const [selectedField, setSelectedField] = useState("");
  const [selectedDegree, setSelectedDegree] = useState("");
  const [selectedExam, setSelectedExam] = useState("");
  const [selectedVerification, setSelectedVerification] = useState("");
  const [sortBy, setSortBy] = useState<
    "name" | "placement_desc" | "avg_pkg_desc" | "programs_desc"
  >("name");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let isMounted = true;

    async function loadColleges() {
      setLoading(true);
      setErrorMsg("");
      try {
        const { data, error } = await getColleges(undefined, supabase);

        if (!isMounted) return;

        if (error) {
          setErrorMsg(error);
          setColleges([]);
        } else {
          setColleges(data || []);
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg =
          err instanceof Error ? err.message : "Failed to load colleges from database";
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

  const updateFilter = (setter: React.Dispatch<React.SetStateAction<string>>) => (val: string) => {
    setter(val);
    setCurrentPage(1);
  };

  // Distinct filter options derived dynamically from live dataset
  const availableDistricts = useMemo(() => {
    const set = new Set<string>();
    colleges.forEach((c) => {
      if (c.district) set.add(c.district.trim());
      else if (c.location) set.add(c.location.trim());
    });
    return Array.from(set).filter(Boolean).sort();
  }, [colleges]);

  const availableTypes = useMemo(() => {
    const set = new Set<string>();
    colleges.forEach((c) => {
      const t = c.institution_type || c.college_type;
      if (t) set.add(t.trim());
    });
    return Array.from(set).filter(Boolean).sort();
  }, [colleges]);

  const availableOwnerships = useMemo(() => {
    const set = new Set<string>();
    colleges.forEach((c) => {
      if (c.ownership) set.add(c.ownership.trim());
    });
    return Array.from(set).filter(Boolean).sort();
  }, [colleges]);

  const availableUniversities = useMemo(() => {
    const set = new Set<string>();
    colleges.forEach((c) => {
      if (c.university_name) set.add(c.university_name.trim());
    });
    return Array.from(set).filter(Boolean).sort();
  }, [colleges]);

  const availableFields = useMemo(() => {
    const set = new Set<string>();
    colleges.forEach((c) => {
      if (c.primary_stream) set.add(c.primary_stream.trim());
      c.courses?.forEach((crs) => {
        if (crs.field) set.add(crs.field.trim());
        else if (crs.stream) set.add(crs.stream.trim());
      });
    });
    return Array.from(set).filter(Boolean).sort();
  }, [colleges]);

  const availableDegrees = useMemo(() => {
    const set = new Set<string>();
    colleges.forEach((c) => {
      c.courses?.forEach((crs) => {
        if (crs.degree) set.add(crs.degree.trim());
      });
    });
    // Add common degrees if set is small
    ["B.Tech", "B.E.", "BCA", "BBA", "MBA", "MCA", "LL.B.", "B.Pharm", "B.Arch"].forEach(
      (deg) => set.add(deg)
    );
    return Array.from(set).filter(Boolean).sort();
  }, [colleges]);

  const availableExams = useMemo(() => {
    const set = new Set<string>();
    colleges.forEach((c) => {
      if (c.entrance_exam) set.add(c.entrance_exam.trim());
      c.accepted_exams?.forEach((ex) => set.add(ex.trim()));
      c.courses?.forEach((crs) => {
        crs.cutoffs?.forEach((cut) => {
          if (cut.exam) set.add(cut.exam.trim());
        });
      });
    });
    return Array.from(set).filter(Boolean).sort();
  }, [colleges]);

  // Counts for summary
  const puneCollegesCount = useMemo(() => {
    return colleges.filter(
      (c) =>
        c.district?.toLowerCase() === "pune" ||
        c.location?.toLowerCase().includes("pune")
    ).length;
  }, [colleges]);

  const distinctDistrictsCount = useMemo(() => {
    return availableDistricts.length;
  }, [availableDistricts]);

  // Filtered and sorted colleges
  const filteredColleges = useMemo(() => {
    return colleges
      .filter((college) => {
        // Search query: name, short_name, location, university, courses
        if (searchQuery) {
          const q = searchQuery.toLowerCase().trim();
          const matchesName = college.name?.toLowerCase().includes(q);
          const matchesShortName = college.short_name?.toLowerCase().includes(q);
          const matchesLoc = college.location?.toLowerCase().includes(q);
          const matchesDistrict = college.district?.toLowerCase().includes(q);
          const matchesUniv = college.university_name?.toLowerCase().includes(q);
          const matchesStream = college.primary_stream?.toLowerCase().includes(q);
          const matchesCrs = college.courses?.some(
            (crs) =>
              crs.course_name.toLowerCase().includes(q) ||
              crs.degree?.toLowerCase().includes(q) ||
              crs.field?.toLowerCase().includes(q)
          );
          if (
            !matchesName &&
            !matchesShortName &&
            !matchesLoc &&
            !matchesDistrict &&
            !matchesUniv &&
            !matchesStream &&
            !matchesCrs
          ) {
            return false;
          }
        }

        // District filter
        if (selectedDistrict) {
          const d = selectedDistrict.toLowerCase();
          const matchDistrict = college.district?.toLowerCase() === d;
          const matchLoc = college.location?.toLowerCase().includes(d);
          if (!matchDistrict && !matchLoc) return false;
        }

        // Institution Type filter
        if (selectedType) {
          const t = selectedType.toLowerCase();
          const matchType =
            college.institution_type?.toLowerCase() === t ||
            college.college_type?.toLowerCase() === t;
          if (!matchType) return false;
        }

        // Ownership filter
        if (selectedOwnership) {
          const o = selectedOwnership.toLowerCase();
          if (college.ownership?.toLowerCase() !== o) return false;
        }

        // University Affiliation filter
        if (selectedUniversity) {
          const u = selectedUniversity.toLowerCase();
          if (college.university_name?.toLowerCase() !== u) return false;
        }

        // Field / Stream filter
        if (selectedField) {
          const f = selectedField.toLowerCase();
          const matchesPrimary = college.primary_stream?.toLowerCase() === f;
          const matchesCrs = college.courses?.some(
            (c) =>
              c.field?.toLowerCase() === f ||
              c.stream?.toLowerCase() === f ||
              c.course_name.toLowerCase().includes(f)
          );
          if (!matchesPrimary && !matchesCrs) return false;
        }

        // Degree filter
        if (selectedDegree) {
          const deg = selectedDegree.toLowerCase();
          const matchesCrsDegree = college.courses?.some(
            (c) =>
              c.degree?.toLowerCase() === deg ||
              c.course_name.toLowerCase().includes(deg)
          );
          const matchesCourse = college.course?.toLowerCase().includes(deg);
          if (!matchesCrsDegree && !matchesCourse) return false;
        }

        // Entrance exam filter
        if (selectedExam) {
          const ex = selectedExam.toLowerCase();
          const matchesColExam =
            college.entrance_exam?.toLowerCase() === ex ||
            college.accepted_exams?.some((e) => e.toLowerCase() === ex);
          const matchesCutoffExam = college.courses?.some((crs) =>
            crs.cutoffs?.some((cut) => cut.exam?.toLowerCase() === ex)
          );
          if (!matchesColExam && !matchesCutoffExam) return false;
        }

        // Verification status filter
        if (selectedVerification) {
          if (
            selectedVerification === "Verified" &&
            college.verification_status !== "Verified"
          ) {
            return false;
          }
          if (
            selectedVerification === "Review" &&
            college.verification_status === "Verified"
          ) {
            return false;
          }
        }

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
          const bCount = b.courses_count || b.courses?.length || 0;
          const aCount = a.courses_count || a.courses?.length || 0;
          return bCount - aCount;
        }
        return a.name.localeCompare(b.name);
      });
  }, [
    colleges,
    searchQuery,
    selectedDistrict,
    selectedType,
    selectedOwnership,
    selectedUniversity,
    selectedField,
    selectedDegree,
    selectedExam,
    selectedVerification,
    sortBy,
  ]);

  // Total pages and sliced page colleges
  const totalPages = Math.ceil(filteredColleges.length / PAGE_SIZE) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedColleges = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredColleges.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredColleges, safeCurrentPage]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedDistrict(""); // clears to show All Maharashtra
    setSelectedType("");
    setSelectedOwnership("");
    setSelectedUniversity("");
    setSelectedField("");
    setSelectedDegree("");
    setSelectedExam("");
    setSelectedVerification("");
    setSortBy("name");
    setCurrentPage(1);
  };

  const isFiltered =
    Boolean(searchQuery) ||
    selectedDistrict !== "Pune" ||
    Boolean(selectedType) ||
    Boolean(selectedOwnership) ||
    Boolean(selectedUniversity) ||
    Boolean(selectedField) ||
    Boolean(selectedDegree) ||
    Boolean(selectedExam) ||
    Boolean(selectedVerification);

  return (
    <DashboardShell
      title="Colleges Discovery"
      subtitle="Explore 340+ accredited institutions, official cutoffs, seats, and verified higher education data across Maharashtra"
    >
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-3 mb-4">
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

      {/* Quick Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          type="button"
          onClick={() => {
            setSelectedDistrict(selectedDistrict === "Pune" ? "" : "Pune");
            setCurrentPage(1);
          }}
          className={`px-3.5 py-1.5 rounded-full transition-all font-medium whitespace-nowrap flex items-center gap-1.5 ${
            selectedDistrict === "Pune"
              ? "bg-indigo-600 text-white shadow-sm font-semibold"
              : "bg-indigo-50/80 text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
          }`}
        >
          <span>Pune District (Default)</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              selectedDistrict === "Pune"
                ? "bg-white/20 text-white"
                : "bg-indigo-200/70 text-indigo-800"
            }`}
          >
            {puneCollegesCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedDistrict("");
            setCurrentPage(1);
          }}
          className={`px-3.5 py-1.5 rounded-full transition-all font-medium whitespace-nowrap ${
            selectedDistrict === ""
              ? "bg-slate-900 text-white shadow-sm font-semibold"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          All Maharashtra ({colleges.length})
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedOwnership(selectedOwnership === "Government" ? "" : "Government");
            setCurrentPage(1);
          }}
          className={`px-3.5 py-1.5 rounded-full transition-all font-medium whitespace-nowrap ${
            selectedOwnership === "Government"
              ? "bg-slate-900 text-white shadow-sm font-semibold"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          Government Institutions
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedVerification(
              selectedVerification === "Verified" ? "" : "Verified"
            );
            setCurrentPage(1);
          }}
          className={`px-3.5 py-1.5 rounded-full transition-all font-medium whitespace-nowrap flex items-center gap-1 ${
            selectedVerification === "Verified"
              ? "bg-emerald-700 text-white shadow-sm font-semibold"
              : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
          }`}
        >
          <CheckCircle className="w-3.5 h-3.5" />
          <span>Verified Only</span>
        </button>

        {isFiltered && (
          <button
            type="button"
            onClick={resetFilters}
            className="px-3 py-1.5 rounded-full text-slate-500 hover:text-slate-900 font-medium hover:bg-slate-100 transition whitespace-nowrap"
          >
            Reset Filters ↺
          </button>
        )}
      </div>

      {/* Comprehensive Search & Multi-Tier Filter Console */}
      <div className="bg-white border border-[#EAEAEA] rounded-2xl p-5 shadow-sm space-y-4">
        {/* Main Search & Sort row */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => updateFilter(setSearchQuery)(e.target.value)}
              placeholder="Search by college name, short name (e.g. COEP, BMCC), taluka, or course..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#EAEAEA] bg-white text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition shadow-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">
              Sort by:
            </label>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as typeof sortBy);
                setCurrentPage(1);
              }}
              className="px-3 py-2.5 rounded-xl border border-[#EAEAEA] bg-white text-slate-700 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition shadow-xs"
            >
              <option value="name">Name (A-Z)</option>
              <option value="placement_desc">Highest Placement Rate</option>
              <option value="avg_pkg_desc">Highest Average Package</option>
              <option value="programs_desc">Most Programs Offered</option>
            </select>
          </div>
        </div>

        {/* Multi-Tier Filter Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-2.5 pt-3 border-t border-[#F1F5F9]">
          {/* 1. District */}
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              District
            </label>
            <select
              value={selectedDistrict}
              onChange={(e) => updateFilter(setSelectedDistrict)(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[#EAEAEA] bg-white text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 shadow-xs"
            >
              <option value="">All Districts ({distinctDistrictsCount})</option>
              {availableDistricts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Institution Type */}
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => updateFilter(setSelectedType)(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[#EAEAEA] bg-white text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 shadow-xs"
            >
              <option value="">All Types</option>
              {availableTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Ownership */}
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Ownership
            </label>
            <select
              value={selectedOwnership}
              onChange={(e) => updateFilter(setSelectedOwnership)(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[#EAEAEA] bg-white text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 shadow-xs"
            >
              <option value="">All Ownerships</option>
              {availableOwnerships.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          {/* 4. University Affiliation */}
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              University
            </label>
            <select
              value={selectedUniversity}
              onChange={(e) => updateFilter(setSelectedUniversity)(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[#EAEAEA] bg-white text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 shadow-xs truncate"
            >
              <option value="">All Universities</option>
              {availableUniversities.map((u) => (
                <option key={u} value={u} title={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Field / Stream */}
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Field / Stream
            </label>
            <select
              value={selectedField}
              onChange={(e) => updateFilter(setSelectedField)(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[#EAEAEA] bg-white text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 shadow-xs truncate"
            >
              <option value="">All Fields</option>
              {availableFields.map((f) => (
                <option key={f} value={f} title={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          {/* 6. Degree */}
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Degree
            </label>
            <select
              value={selectedDegree}
              onChange={(e) => updateFilter(setSelectedDegree)(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[#EAEAEA] bg-white text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 shadow-xs"
            >
              <option value="">All Degrees</option>
              {availableDegrees.map((deg) => (
                <option key={deg} value={deg}>
                  {deg}
                </option>
              ))}
            </select>
          </div>

          {/* 7. Entrance Exam */}
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Entrance Exam
            </label>
            <select
              value={selectedExam}
              onChange={(e) => updateFilter(setSelectedExam)(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[#EAEAEA] bg-white text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 shadow-xs"
            >
              <option value="">All Exams</option>
              {availableExams.map((ex) => (
                <option key={ex} value={ex}>
                  {ex}
                </option>
              ))}
            </select>
          </div>

          {/* 8. Verification Status */}
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Verification
            </label>
            <select
              value={selectedVerification}
              onChange={(e) => updateFilter(setSelectedVerification)(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[#EAEAEA] bg-white text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 shadow-xs"
            >
              <option value="">All Records</option>
              <option value="Verified">Verified Only</option>
              <option value="Review">Under Review</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Header and Counter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 px-1">
        <div>
          Showing{" "}
          <strong className="text-slate-900 font-bold">
            {filteredColleges.length === 0
              ? 0
              : (currentPage - 1) * PAGE_SIZE + 1}
            {" - "}
            {Math.min(currentPage * PAGE_SIZE, filteredColleges.length)}
          </strong>{" "}
          of <strong className="text-slate-900 font-bold">{filteredColleges.length}</strong>{" "}
          institutions{" "}
          {selectedDistrict ? (
            <span>
              in <strong className="text-indigo-600 font-semibold">{selectedDistrict}</strong>
            </span>
          ) : (
            <span>
              across{" "}
              <strong className="text-slate-900 font-semibold">{distinctDistrictsCount}</strong>{" "}
              districts
            </span>
          )}
          {colleges.length > 0 && (
            <span className="text-slate-400 ml-1">
              (out of {colleges.length} total in database)
            </span>
          )}
        </div>

        {filteredColleges.length > PAGE_SIZE && (
          <div className="flex items-center gap-2">
            <span>
              Page {currentPage} of {totalPages}
            </span>
          </div>
        )}
      </div>

      {/* Colleges List Grid with Progressive Pagination */}
      {loading ? (
        <LoadingGrid count={6} />
      ) : filteredColleges.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedColleges.map((college) => (
              <CollegeCard key={college.id} college={college} />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-[#EAEAEA]">
              <div className="text-xs text-slate-500">
                Showing {(currentPage - 1) * PAGE_SIZE + 1} to{" "}
                {Math.min(currentPage * PAGE_SIZE, filteredColleges.length)} of{" "}
                {filteredColleges.length} institutions
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent flex items-center gap-1 transition"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Previous
                </button>

                {/* Page Number Indicators */}
                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 5 && currentPage > 3) {
                      pageNum = Math.min(currentPage - 2 + i, totalPages - 4 + i);
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-xs font-semibold transition ${
                          currentPage === pageNum
                            ? "bg-slate-900 text-white"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <span className="text-xs text-slate-400 px-1">...</span>
                  )}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent flex items-center gap-1 transition"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          icon={<Building2 className="w-8 h-8" />}
          title="No Colleges Found"
          description={
            colleges.length === 0
              ? "The colleges catalog is currently empty. Colleges added to your database will automatically display here."
              : "No colleges match your active search filters. Try clearing your search query or selecting 'All Maharashtra'."
          }
          actionText={isFiltered ? "Reset Filters" : undefined}
          onAction={resetFilters}
        />
      )}
    </DashboardShell>
  );
}

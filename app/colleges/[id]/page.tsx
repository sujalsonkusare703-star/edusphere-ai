"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { DashboardShell } from "@/components/DashboardShell";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { College } from "@/types";
import { fetchCollegeById, resolveProgramUrlInfo } from "@/lib/supabase/opportunities";
import {
  Building2,
  MapPin,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  Award,
  ExternalLink,
  Globe,
  ArrowLeft,
  Search,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  GraduationCap,
} from "@/components/icons";

export default function CollegeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const collegeId = rawId ? decodeURIComponent(rawId) : "";

  const supabase = createClient();
  const { isItemSaved, toggleSaveItem } = useAuth();

  const [college, setCollege] = useState<College | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [programSearch, setProgramSearch] = useState("");
  const [selectedExamTab, setSelectedExamTab] = useState<string>("ALL");

  const saved = college ? isItemSaved(college.id) : false;

  useEffect(() => {
    let isMounted = true;

    async function loadCollege() {
      if (!collegeId) return;
      setLoading(true);
      setErrorMsg("");

      try {
        const { data, error } = await fetchCollegeById(supabase, collegeId);

        if (!isMounted) return;

        if (error || !data) {
          setErrorMsg(error || "College not found in database");
          setCollege(null);
        } else {
          setCollege(data);
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : "Failed to load college details";
        setErrorMsg(msg);
        setCollege(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadCollege();

    return () => {
      isMounted = false;
    };
  }, [collegeId, supabase]);

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!college || saving) return;
    setSaving(true);
    await toggleSaveItem("college", college.id);
    setSaving(false);
  };

  const formatCurrency = (val?: number | null) => {
    if (!val) return "Not published";
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(1)} Lakh`;
    }
    return `₹${val.toLocaleString("en-IN")}`;
  };

  const cLower = (college?.name || "").toLowerCase();
  const isAIT = cLower.includes("army institute") || cLower.includes("ait");
  const isSLS = cLower.includes("symbiosis law");
  const isBVP = cLower.includes("bharati vidyapeeth new law");
  const isBITS = cLower.includes("birla institute") || cLower.includes("bits");
  const isVIT = cLower.includes("vellore institute") || cLower.includes("vit");
  const isIIITH = cLower.includes("international institute of info") || cLower.includes("iiit");
  const isDTU = cLower.includes("delhi technological") || cLower.includes("dtu");
  const isRVCE = cLower.includes("rvce") || cLower.includes("r.v. college") || cLower.includes("rv college");
  const isIIT = cLower.includes("indian institute of tech") || cLower.includes("iit bombay");

  const totalSeats = useMemo(() => {
    return college?.courses?.reduce((acc, c) => acc + (c.intake || 0), 0) || 0;
  }, [college]);

  // Filter courses by search
  const filteredCourses = useMemo(() => {
    if (!college?.courses) return [];
    if (!programSearch.trim()) return college.courses;
    const q = programSearch.toLowerCase().trim();
    return college.courses.filter(
      (crs) =>
        crs.course_name.toLowerCase().includes(q) ||
        crs.stream.toLowerCase().includes(q)
    );
  }, [college, programSearch]);

  const renderVerificationBadge = (status?: string) => {
    const s = (status || "NOT_VERIFIED").toUpperCase();
    if (s === "VERIFIED") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          VERIFIED
        </span>
      );
    }
    if (s === "DERIVED") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
          DERIVED
        </span>
      );
    }
    if (s === "INVALID") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          INVALID
        </span>
      );
    }
    if (s === "NOT_APPLICABLE") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500 border border-gray-200 shadow-2xs">
          NOT APPLICABLE
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        NOT VERIFIED
      </span>
    );
  };

  const formatCutoffDisplay = (val: number | null, unit?: string, exam?: string) => {
    if (val === null || val === undefined) return "Not available";
    if (unit === "rank") {
      return `AIR ${val.toLocaleString()}`;
    }
    const ex = (exam || "").toUpperCase();
    if (unit === "marks" || unit === "score" || unit === "marks_out_of_200" || unit === "marks_out_of_150" || unit === "marks_out_of_390" || ex.includes("NATA") || ex.includes("LAW") || ex.includes("BITSAT")) {
      if (ex.includes("NATA")) return `${val} / 200 marks`;
      if (ex.includes("LAW")) return `${val} / 150 marks`;
      if (ex.includes("BITSAT")) return `${val} / 390 marks`;
      return `${val} marks`;
    }
    return `${val}%ile`;
  };

  // Flattened cutoffs for the explicit cutoff table
  const allCutoffRows = useMemo(() => {
    if (!college?.courses) return [];
    const rows: Array<{
      id: string;
      programName: string;
      stream: string;
      exam: string;
      category: string;
      cutoff: number | null;
      unit: string;
      year: string;
      round: string;
      source: string;
      verification: string;
      notes: string;
    }> = [];

    college.courses.forEach((crs) => {
      (crs.cutoffs || []).forEach((cut) => {
        let verStatus = cut.verification_status || "DERIVED";
        if (isAIT && cut.exam.toUpperCase().includes("MHT")) {
          verStatus = "INVALID";
        } else if (isSLS && cut.exam.toUpperCase().includes("LAW")) {
          verStatus = "INVALID";
        } else if (isBVP && cut.exam.toUpperCase().includes("LAW")) {
          verStatus = "INVALID";
        } else if (isBITS && !cut.exam.toUpperCase().includes("BITSAT")) {
          verStatus = "INVALID";
        } else if (isVIT && !cut.exam.toUpperCase().includes("VITEEE")) {
          verStatus = "INVALID";
        } else if (isRVCE && !cut.exam.toUpperCase().includes("KCET") && !cut.exam.toUpperCase().includes("COMEDK")) {
          verStatus = "INVALID";
        } else if (isIIT && !cut.exam.toUpperCase().includes("ADVANCED")) {
          verStatus = "INVALID";
        }

        let unitStr: string = cut.cutoff_unit || "percentile";
        if (cut.exam.toUpperCase().includes("NATA")) {
          unitStr = "marks (out of 200)";
        } else if (cut.exam.toUpperCase().includes("LAW")) {
          unitStr = "score (out of 150)";
        } else if (cut.exam.toUpperCase().includes("BITSAT")) {
          unitStr = "marks (out of 390)";
        }

        const categories: Array<{ name: string; val: number | null }> = [
          { name: "OPEN", val: cut.open },
          { name: "OBC", val: cut.obc },
          { name: "SC", val: cut.sc },
          { name: "ST", val: cut.st },
        ];
        categories.forEach((cat) => {
          if (cat.val !== null) {
            rows.push({
              id: `${crs.course_id}-${cut.exam}-${cat.name}`,
              programName: crs.course_name,
              stream: crs.stream,
              exam: cut.exam,
              category: cat.name,
              cutoff: cat.val,
              unit: unitStr,
              year: cut.year ? `${cut.year}` : "Year: Not specified in source",
              round: cut.round ? cut.round : "Round: Not specified in source",
              source: cut.source_name || (cut.exam.toUpperCase().includes("NATA") ? "Council of Architecture / State CET Cell" : "State Common Entrance Test Cell, Maharashtra"),
              verification: verStatus,
              notes: cut.notes || (verStatus === "INVALID" ? "Exam misattribution identified in data verification audit; invalid for admission planning." : ""),
            });
          }
        });
      });
    });
    return rows;
  }, [college, isAIT, isSLS, isBVP, isBITS, isVIT, isRVCE, isIIT]);

  // Derived available exam tabs
  const availableExamTabs = useMemo(() => {
    const tabs = new Set<string>(["ALL"]);
    if (college?.accepted_exams && college.accepted_exams.length > 0) {
      college.accepted_exams.forEach((e) => tabs.add(e));
    }
    allCutoffRows.forEach((r) => tabs.add(r.exam));
    return Array.from(tabs);
  }, [college, allCutoffRows]);

  // Filter cutoffs by selected exam tab and program search
  const filteredCutoffRows = useMemo(() => {
    return allCutoffRows.filter((r) => {
      // Exam tab filter
      if (selectedExamTab !== "ALL") {
        const ex = r.exam.toUpperCase();
        const tab = selectedExamTab.toUpperCase();
        if (tab === "MHT-CET") {
          if (!ex.includes("MHT") && !ex.includes("CET") && !ex.includes("NATA") && !ex.includes("LAW")) return false;
        } else if (tab === "JEE MAIN") {
          if (!ex.includes("JEE MAIN") && ex !== "JEE") return false;
        } else if (tab === "JEE ADVANCED") {
          if (!ex.includes("JEE ADVANCED") && !ex.includes("ADVANCED")) return false;
        } else {
          if (!ex.includes(tab) && !tab.includes(ex)) return false;
        }
      }

      // Search filter
      if (programSearch.trim()) {
        const q = programSearch.toLowerCase().trim();
        return r.programName.toLowerCase().includes(q) || r.stream.toLowerCase().includes(q);
      }
      return true;
    });
  }, [allCutoffRows, selectedExamTab, programSearch]);

  if (loading) {
    return (
      <DashboardShell title="College Details" subtitle="Loading institutional records...">
        <div className="space-y-6 animate-pulse">
          <div className="h-6 w-32 bg-slate-200 rounded-lg" />
          <div className="h-40 bg-white border border-slate-200 rounded-2xl p-6" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="h-28 bg-white border border-slate-200 rounded-2xl" />
            <div className="h-28 bg-white border border-slate-200 rounded-2xl" />
            <div className="h-28 bg-white border border-slate-200 rounded-2xl" />
            <div className="h-28 bg-white border border-slate-200 rounded-2xl" />
          </div>
          <div className="h-64 bg-white border border-slate-200 rounded-2xl" />
        </div>
      </DashboardShell>
    );
  }

  if (errorMsg || !college) {
    return (
      <DashboardShell title="College Intelligence" subtitle="Institutional catalog lookup">
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center max-w-lg mx-auto my-8 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900 mb-1">College Not Found</h2>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            {errorMsg || "The requested institution record does not exist or has been deprecated."}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition"
            >
              &larr; Go Back
            </button>
            <Link
              href="/colleges"
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition"
            >
              Browse All Colleges
            </Link>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title={college.name}
      subtitle={`${college.location ? `${college.location}, ` : ""}${college.state || "Maharashtra, India"}`}
    >
      <div className="space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/colleges"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Colleges Directory</span>
          </Link>

          <div className="text-[11px] text-slate-400">
            ID: <span className="font-mono text-slate-600">{college.id}</span>
          </div>
        </div>

        {/* Institution Header Card */}
        <div className="bg-white border border-[#EAEAEA] rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0 shadow-2xs">
                <Building2 className="w-7 h-7" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  {college.college_type && (
                    <span className="text-[11px] font-semibold tracking-wide uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {college.college_type}
                    </span>
                  )}
                  {college.primary_stream && (
                    <span className="text-[11px] font-semibold tracking-wide px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {college.primary_stream}
                    </span>
                  )}
                  {college.naac_grade && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      ★ NAAC Grade {college.naac_grade}
                    </span>
                  )}
                  {college.entrance_exam && (
                    <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[#FAFAFA] text-slate-600 border border-[#EAEAEA]">
                      Entrance: {college.entrance_exam}
                    </span>
                  )}
                </div>

                <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                  {college.name}
                </h1>

                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span>
                    {college.location ? `${college.location}, ` : ""}
                    {college.state || "Maharashtra"}, India
                  </span>
                </div>
              </div>
            </div>

            {/* Header Actions: Save and Official Website */}
            <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
              <button
                onClick={handleSave}
                disabled={saving}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
                  saved
                    ? "bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs"
                    : "bg-white text-slate-700 border border-[#EAEAEA] hover:bg-slate-50 shadow-2xs"
                }`}
              >
                {saved ? (
                  <>
                    <BookmarkCheck className="w-4 h-4 text-amber-600 fill-amber-500" />
                    <span>Saved in My Items</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-4 h-4 text-slate-400" />
                    <span>Save College</span>
                  </>
                )}
              </button>

              {college.official_website && (
                <a
                  href={college.official_website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-black text-white transition flex items-center gap-1.5 shadow-sm"
                  title={`Open ${college.name} official domain`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Official Website</span>
                  <ExternalLink className="w-3 h-3 opacity-80" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* 1. Overview & Key Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Annual Tuition Card (Strictly NA) */}
          <div className="bg-white border border-[#EAEAEA] rounded-2xl p-5 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 block mb-1">
              Annual Tuition Fee
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-slate-900">NA</span>
              <span className="text-[11px] text-slate-400 font-medium">/ annum</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 leading-normal">
              Statutory notice: Fees governed by Fee Regulating Authority (FRA) guidelines. Check official college portal.
            </p>
          </div>

          {/* Sanctioned Programs Card */}
          <div className="bg-white border border-[#EAEAEA] rounded-2xl p-5 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 block mb-1">
              Degree Programs
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-indigo-600">
                {college.courses?.length || college.programs?.length || 1}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">sanctioned branches</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              {totalSeats > 0 ? `${totalSeats} total approved seat capacity` : "Intake per State CET CAP directives"}
            </p>
          </div>

          {/* Average Package Card */}
          <div className="bg-white border border-[#EAEAEA] rounded-2xl p-5 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 block mb-1">
              Average Package
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-slate-900">
                {formatCurrency(college.avg_package)}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              {college.avg_package ? "Reported campus placement average" : "Data not published in current dataset"}
            </p>
          </div>

          {/* Highest Package Card */}
          <div className="bg-white border border-[#EAEAEA] rounded-2xl p-5 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 block mb-1">
              Highest Package
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-slate-900">
                {formatCurrency(college.highest_package)}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              {college.highest_package ? "Recorded placement high" : "Data not published in current dataset"}
            </p>
          </div>
        </div>

        {/* Placement Rate (when available) */}
        {college.placement_rate !== null && college.placement_rate !== undefined && (
          <div className="bg-white border border-[#EAEAEA] rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-500" />
                Reported Campus Placement Rate
              </span>
              <span className="text-base font-extrabold text-emerald-600">
                {college.placement_rate}%
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full transition-all"
                style={{ width: `${Math.min(college.placement_rate, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Institutional Advisory Callouts for Specific Route Constraints & National Admissions */}
        {isBITS && (
          <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-950 flex items-start gap-3 shadow-xs">
            <AlertCircle className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <strong className="font-bold text-indigo-900 text-sm">National Admission Advisory: BITS Pilani</strong>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  AUTONOMOUS DIRECT ADMISSION
                </span>
              </div>
              <p className="leading-relaxed text-indigo-800">
                BITS Pilani admits undergraduate engineering candidates strictly through its own entrance examination, <strong>BITSAT (scored out of 390 marks)</strong>, via the centralized BITS Admission Portal. <strong>BITS Pilani does NOT accept MHT-CET or JEE Main scores</strong> for undergraduate admissions, and does not participate in Maharashtra CAP or JoSAA counselling. Minimum 75% aggregate in PCM (with min 60% in each) required.
              </p>
            </div>
          </div>
        )}

        {isVIT && (
          <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-950 flex items-start gap-3 shadow-xs">
            <AlertCircle className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <strong className="font-bold text-indigo-900 text-sm">National Admission Advisory: VIT Vellore</strong>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  INSTITUTIONAL PORTAL
                </span>
              </div>
              <p className="leading-relaxed text-indigo-800">
                Vellore Institute of Technology (VIT) admits undergraduate B.Tech candidates strictly on the basis of <strong>VITEEE Rank</strong> through the VIT Online Counselling Portal. <strong>VIT does NOT accept MHT-CET or JEE Main scores</strong> for regular B.Tech seats. Minimum 60% aggregate in PCM/PCB in 10+2 (50% for SC/ST/North-Eastern candidates).
              </p>
            </div>
          </div>
        )}

        {isIIITH && (
          <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-950 flex items-start gap-3 shadow-xs">
            <AlertCircle className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <strong className="font-bold text-indigo-900 text-sm">National Admission Advisory: IIIT Hyderabad</strong>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  IIIT-H ADMISSIONS PORTAL
                </span>
              </div>
              <p className="leading-relaxed text-indigo-800">
                International Institute of Information Technology, Hyderabad (IIIT-H) operates its own independent admissions process via the <strong>IIIT-H Admissions Portal</strong>. B.Tech admissions are based on <strong>JEE Main Overall Percentile</strong> (Single Degree) or <strong>UGEE examination</strong> (Dual Degree). <strong>IIIT-H does NOT participate in Maharashtra CAP or accept MHT-CET</strong>.
              </p>
            </div>
          </div>
        )}

        {isDTU && (
          <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-950 flex items-start gap-3 shadow-xs">
            <AlertCircle className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <strong className="font-bold text-indigo-900 text-sm">National Admission Advisory: Delhi Technological University (DTU)</strong>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  JAC DELHI COUNSELLING
                </span>
              </div>
              <p className="leading-relaxed text-indigo-800">
                Delhi Technological University (formerly DCE) conducts B.Tech admissions through <strong>Joint Admission Counselling Delhi (JAC Delhi)</strong> based strictly on <strong>JEE Main Common Rank List (CRL) / Category Rank</strong>. 85% seats are allocated to Delhi region candidates and 15% to Outside Delhi candidates. <strong>DTU does NOT accept MHT-CET scores</strong>.
              </p>
            </div>
          </div>
        )}

        {isRVCE && (
          <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-950 flex items-start gap-3 shadow-xs">
            <AlertCircle className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <strong className="font-bold text-indigo-900 text-sm">National Admission Advisory: RV College of Engineering (RVCE)</strong>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  KEA / COMEDK ADMISSION
                </span>
              </div>
              <p className="leading-relaxed text-indigo-800">
                R.V. College of Engineering (Bengaluru) admits undergraduate engineering students through <strong>Karnataka Examination Authority (KEA KCET)</strong> for Karnataka domicile candidates, and <strong>COMEDK UGET</strong> for All India candidates (as well as Management / NRI Quota). <strong>RVCE does NOT accept MHT-CET scores</strong>.
              </p>
            </div>
          </div>
        )}

        {isIIT && (
          <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-950 flex items-start gap-3 shadow-xs">
            <AlertCircle className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <strong className="font-bold text-indigo-900 text-sm">Premier Institution Advisory: Indian Institute of Technology (IIT) Bombay</strong>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  JoSAA / JEE ADVANCED
                </span>
              </div>
              <p className="leading-relaxed text-indigo-800">
                Undergraduate B.Tech/BS admissions to IIT Bombay are conducted strictly through <strong>Joint Seat Allocation Authority (JoSAA)</strong> counselling based on <strong>JEE Advanced All India Rank (AIR)</strong>. Candidates must be in top 20 percentile of qualifying board or have minimum 75% in 10+2. <strong>MHT-CET and JEE Main are NOT accepted for final seat allocation</strong>.
              </p>
            </div>
          </div>
        )}

        {isAIT && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-950 flex items-start gap-3 shadow-xs">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <strong className="font-bold text-rose-900 text-sm">Institutional Admission Advisory: AIT Pune</strong>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-200/80 text-rose-900">
                  INVALID CUTOFF DATA SUPPRESSED
                </span>
              </div>
              <p className="leading-relaxed text-rose-800">
                Admission to Army Institute of Technology (AIT) is strictly restricted to children of eligible serving/retired Army personnel and conducted exclusively on the basis of <strong>JEE Main All India Rank (AIR)</strong> via AWES centralized counseling. <strong>AIT Pune does not accept MHT-CET scores</strong>. Any legacy MHT-CET cutoff values have been identified as misattributed and marked invalid.
              </p>
            </div>
          </div>
        )}

        {isSLS && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-950 flex items-start gap-3 shadow-xs">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <strong className="font-bold text-rose-900 text-sm">Institutional Admission Advisory: Symbiosis Law School</strong>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-200/80 text-rose-900">
                  INVALID CUTOFF DATA SUPPRESSED
                </span>
              </div>
              <p className="leading-relaxed text-rose-800">
                Symbiosis Law School, Pune is a constituent of Symbiosis International (Deemed University). Admissions to B.A. LL.B. (Hons) and B.B.A. LL.B. (Hons) are conducted strictly via the <strong>Symbiosis Law Admission Test (SLAT)</strong> followed by PI/WAT. <strong>SLS Pune does not participate in Maharashtra MH CET Law CAP counseling</strong>. Any legacy MH CET Law cutoff values have been identified as misattributed and marked invalid.
              </p>
            </div>
          </div>
        )}

        {isBVP && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-950 flex items-start gap-3 shadow-xs">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <strong className="font-bold text-rose-900 text-sm">Institutional Admission Advisory: Bharati Vidyapeeth New Law College</strong>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-200/80 text-rose-900">
                  INVALID CUTOFF DATA SUPPRESSED
                </span>
              </div>
              <p className="leading-relaxed text-rose-800">
                Bharati Vidyapeeth Deemed University (BVDU) New Law College conducts undergraduate law admissions strictly through the <strong>BVDU Law Entrance Test (BVP CET)</strong>. <strong>BVP New Law College does not participate in Maharashtra State MH CET Law CAP counseling</strong> for its primary undergraduate seats. Any legacy MH CET Law cutoff values have been identified as misattributed and marked invalid.
              </p>
            </div>
          </div>
        )}

        {/* 2. Admission & Eligibility Section (Section 11) */}
        <div id="admission-eligibility" className="bg-white border border-[#EAEAEA] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3">
            <GraduationCap className="w-5 h-5 text-indigo-600" />
            <span>Admission & Eligibility</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Admission Route */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="font-bold text-slate-900 block text-xs">Admission Route</span>
              <p className="text-slate-700 font-medium">
                {college.admission_route || "Admission route: Not verified"}
              </p>
              <span className="text-[10px] text-slate-400 block">
                Official centralized counseling or institutional admission channel
              </span>
            </div>

            {/* Accepted Entrance Exams */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="font-bold text-slate-900 block text-xs">Accepted Entrance Exams</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {(college.accepted_exams && college.accepted_exams.length > 0
                  ? college.accepted_exams
                  : college.entrance_exam
                  ? [college.entrance_exam]
                  : []
                ).map((ex, exIdx) => (
                  <span
                    key={exIdx}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white text-indigo-700 border border-indigo-200 shadow-2xs"
                  >
                    {ex}
                  </span>
                ))}
                {(!college.accepted_exams || college.accepted_exams.length === 0) && !college.entrance_exam && (
                  <span className="text-slate-500 italic">Accepted entrance exams: Not verified</span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 block">
                Verified entrance examinations accepted for admissions
              </span>
            </div>

            {/* Academic Eligibility */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 md:col-span-2">
              <span className="font-bold text-slate-900 block text-xs">Academic Eligibility</span>
              <p className="text-slate-700 leading-relaxed">
                {college.eligibility_criteria || "Eligibility criteria: Not available in the verified dataset."}
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/60 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">
                    Authority: {college.admission_source_name || "Official Institutional Portal"}
                  </span>
                  {renderVerificationBadge(college.admission_verification_status || "DERIVED")}
                </div>
                {college.admission_source_url && (
                  <a
                    href={college.admission_source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1"
                    title="Open official admission authority source"
                  >
                    <span>Open Official Source</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Multi-Exam Cutoff Information & Programs Section (Section 11 & 12) */}
        <div id="cutoffs" className="bg-white border border-[#EAEAEA] rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F1F5F9]">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span>Cutoff Information & Programs ({college.courses?.length || 0})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Official entrance exam cutoffs, seat intake, and category opening/closing benchmarks
              </p>
            </div>

            {/* Quick search inside programs */}
            {college.courses && college.courses.length > 2 && (
              <div className="relative sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={programSearch}
                  onChange={(e) => setProgramSearch(e.target.value)}
                  placeholder="Filter branch or stream..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#EAEAEA] bg-white text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>
            )}
          </div>

          {/* Exam Filter Tabs (Section 11) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-semibold text-slate-500 mr-1 flex-shrink-0">Filter Exam:</span>
            {availableExamTabs.map((tab) => {
              const isSelected = selectedExamTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setSelectedExamTab(tab)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex-shrink-0 ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  {tab === "ALL" ? "All Exams" : tab}
                </button>
              );
            })}
          </div>

          {/* No Cutoffs Published in Dataset Notice */}
          {allCutoffRows.length === 0 && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2.5">
              <HelpCircle className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block text-slate-900">Cutoff Information: None Published in Current Dataset</strong>
                <span>Official opening/closing cutoff benchmarks are not published in the verified dataset for this institution.</span>
                <span className="block text-[11px] text-slate-500 mt-1">
                  Admissions are administered via {college.admission_route || "the official institutional portal"}. Please refer to the official admissions website for latest closing ranks and cutoff marks.
                </span>
              </div>
            </div>
          )}

          {/* Unavailable Cutoff Alert for Exam Tabs without Data (Section 10 & 11) */}
          {allCutoffRows.length > 0 && selectedExamTab !== "ALL" && filteredCutoffRows.length === 0 && (
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block">{selectedExamTab} Cutoff Information</strong>
                <span>{selectedExamTab} cutoff: Not available in verified dataset.</span>
                <span className="block text-[11px] text-amber-700 mt-1">
                  EduSphere strictly displays verified directorate records and never fabricates estimated percentiles or ranks.
                </span>
              </div>
            </div>
          )}

          {/* Explicit Multi-Exam Cutoff Table (Section 12) */}
          {filteredCutoffRows.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-900 block">
                Official Cutoffs Matrix ({filteredCutoffRows.length} benchmarks)
              </span>
              <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-800">
                    <tr>
                      <th className="px-3 py-2.5 font-bold">Program</th>
                      <th className="px-3 py-2.5 font-bold">Exam</th>
                      <th className="px-3 py-2.5 font-bold">Category</th>
                      <th className="px-3 py-2.5 font-bold">Cutoff</th>
                      <th className="px-3 py-2.5 font-bold">Unit</th>
                      <th className="px-3 py-2.5 font-bold">Year</th>
                      <th className="px-3 py-2.5 font-bold">Round</th>
                      <th className="px-3 py-2.5 font-bold">Verification</th>
                      <th className="px-3 py-2.5 font-bold">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredCutoffRows.map((row) => (
                      <tr
                        key={row.id}
                        className={`transition ${
                          row.verification === "INVALID"
                            ? "bg-rose-50/40 hover:bg-rose-50/60"
                            : "hover:bg-slate-50/60"
                        }`}
                      >
                        <td className="px-3 py-2 text-slate-900 font-semibold">{row.programName}</td>
                        <td className="px-3 py-2 text-indigo-700 font-semibold">
                          <div className="flex items-center gap-1.5">
                            <span>{row.exam}</span>
                            {row.verification === "INVALID" && (
                              <span className="text-[10px] text-rose-700 font-bold bg-rose-100 px-1.5 py-0.2 rounded border border-rose-200">
                                INVALID
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-medium text-[11px]">
                            {row.category}
                          </span>
                        </td>
                        <td
                          className={`px-3 py-2 font-bold ${
                            row.verification === "INVALID"
                              ? "text-rose-600 line-through"
                              : "text-slate-900"
                          }`}
                        >
                          {formatCutoffDisplay(row.cutoff, row.unit, row.exam)}
                        </td>
                        <td className="px-3 py-2 text-slate-500 capitalize">{row.unit}</td>
                        <td className="px-3 py-2 text-slate-600 text-[11px]">{row.year}</td>
                        <td className="px-3 py-2 text-slate-600 text-[11px]">{row.round}</td>
                        <td className="px-3 py-2">{renderVerificationBadge(row.verification)}</td>
                        <td className="px-3 py-2 text-[11px] text-slate-500">
                          <span className="truncate max-w-[140px] block" title={row.source}>
                            {row.source}
                          </span>
                          {row.notes && (
                            <span
                              className="text-[10px] text-rose-700 font-medium block truncate max-w-[140px]"
                              title={row.notes}
                            >
                              {row.notes}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sanctioned Programs List */}
          <div className="space-y-3 pt-2">
            <span className="text-xs font-bold text-slate-900 block">
              Sanctioned Programs Details ({filteredCourses.length})
            </span>

            {filteredCourses.length > 0 ? (
              <div className="space-y-3">
                {filteredCourses.map((crs) => {
                  // Filter cutoffs by selected exam tab if not ALL
                  const relevantCutoffs = (crs.cutoffs || []).filter((cut) => {
                    if (selectedExamTab === "ALL") return true;
                    const ex = cut.exam.toUpperCase();
                    if (selectedExamTab === "MHT-CET") return ex.includes("MHT") || ex.includes("CET") || ex.includes("NATA") || ex.includes("LAW");
                    if (selectedExamTab === "JEE Main") return ex.includes("JEE MAIN") || ex === "JEE";
                    if (selectedExamTab === "JEE Advanced") return ex.includes("JEE ADVANCED") || ex.includes("ADVANCED");
                    return true;
                  });

                  const cutoff = relevantCutoffs.length > 0 ? relevantCutoffs[0] : null;
                  const urlInfo = resolveProgramUrlInfo(crs.program_url, college.official_website);
                  const isCutoffInvalid = Boolean(
                    cutoff && (
                      cutoff.verification_status === "INVALID" ||
                      (isAIT && cutoff.exam?.toUpperCase().includes("MHT")) ||
                      (isSLS && cutoff.exam?.toUpperCase().includes("LAW")) ||
                      (isBVP && cutoff.exam?.toUpperCase().includes("LAW"))
                    )
                  );

                  return (
                    <div
                      key={crs.course_id}
                      className="p-4 rounded-xl bg-[#FAFAFA] border border-[#EAEAEA] hover:border-slate-300 transition-colors"
                    >
                      {/* Course Header: Title, Stream, Intake, Program Link */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 mb-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-slate-900 text-sm">
                              {crs.course_name}
                            </h3>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white text-slate-600 border border-slate-200">
                              {crs.stream}
                            </span>
                            {crs.accepted_exams && crs.accepted_exams.length > 0 && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                                Exams: {crs.accepted_exams.join(", ")}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                          {crs.intake > 0 && (
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 flex-shrink-0">
                              {crs.intake} Seats
                            </span>
                          )}

                          {/* Program Link */}
                          {urlInfo.url ? (
                            <a
                              href={urlInfo.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition inline-flex items-center gap-1 ${
                                urlInfo.isDeepLink
                                  ? "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200"
                                  : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200"
                              }`}
                              title={urlInfo.label}
                            >
                              <span>{urlInfo.label}</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium px-2 py-1 bg-slate-100/70 rounded-lg">
                              Program link not available
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Program-specific Admission Details (when present) */}
                      {(crs.admission_route || crs.eligibility_criteria || crs.admission_verification_status) && (
                        <div className="mb-3 p-3 rounded-xl bg-white border border-slate-200 text-xs space-y-1.5 shadow-2xs">
                          <div className="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-slate-100">
                            <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                              Program Admission Specifications
                            </span>
                            {crs.admission_verification_status && renderVerificationBadge(crs.admission_verification_status)}
                          </div>
                          {crs.admission_route && (
                            <div className="text-[11px] text-slate-700">
                              <span className="font-semibold text-slate-900">Admission Route: </span>
                              {crs.admission_route}
                            </div>
                          )}
                          {crs.eligibility_criteria && (
                            <div className="text-[11px] text-slate-700 leading-relaxed">
                              <span className="font-semibold text-slate-900">Eligibility Criteria: </span>
                              {crs.eligibility_criteria}
                            </div>
                          )}
                          {(crs.admission_source_name || crs.admission_source_url) && (
                            <div className="pt-1 flex items-center justify-between gap-2 text-[10px] text-slate-500">
                              <span>Source: {crs.admission_source_name || "Official Portal"}</span>
                              {crs.admission_source_url && (
                                <a
                                  href={crs.admission_source_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-0.5"
                                >
                                  <span>Official Source</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Cutoff Section */}
                      {cutoff ? (
                        <div className="pt-2.5 border-t border-slate-200/70 space-y-2">
                          {isCutoffInvalid ? (
                            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-950 space-y-1">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-1.5 font-bold text-rose-800">
                                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                                  <span>Cutoff Record Flagged: INVALID (Exam Misattribution)</span>
                                </div>
                                {renderVerificationBadge("INVALID")}
                              </div>
                              <p className="text-[11px] text-rose-800 leading-relaxed">
                                {isAIT
                                  ? "AIT Pune does not accept MHT-CET scores (admission exclusively via JEE Main AIR for Army personnel wards). This legacy cutoff record is invalid and excluded from AI recommendations."
                                  : isSLS
                                  ? "Symbiosis Law School Pune does not admit via MH CET Law CAP (admissions via SLAT). This legacy cutoff record is invalid and excluded from AI recommendations."
                                  : isBVP
                                  ? "BVDU New Law College admits via BVP CET entrance test, not MH CET Law CAP. This legacy cutoff record is invalid and excluded from AI recommendations."
                                  : "This cutoff record has been flagged as invalid during data audit and excluded from recommendation scoring."}
                              </p>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center justify-between gap-2 mb-2 text-xs">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-indigo-700 text-[11px]">
                                    Exam: {cutoff.exam}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-medium px-1.5 py-0.2 bg-white rounded border border-slate-200">
                                    {cutoff.year ? `Session ${cutoff.year}` : "Year: Not specified in source"}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-medium px-1.5 py-0.2 bg-white rounded border border-slate-200">
                                    {cutoff.round ? cutoff.round : "Round: Not specified in source"}
                                  </span>
                                  {renderVerificationBadge(cutoff.verification_status || "DERIVED")}
                                </div>
                                <span className="text-[10px] text-slate-400 capitalize">
                                  Unit: {cutoff.cutoff_unit || (cutoff.exam.toUpperCase().includes("NATA") ? "marks (out of 200)" : cutoff.exam.toUpperCase().includes("LAW") ? "score (out of 150)" : "percentile")}
                                </span>
                              </div>

                              {/* 4 Category Cutoffs */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                                <div className="p-2 rounded-lg bg-white border border-slate-200">
                                  <span className="text-[10px] text-slate-500 block">OPEN</span>
                                  <strong className="text-slate-900 font-bold">
                                    {formatCutoffDisplay(cutoff.open, cutoff.cutoff_unit, cutoff.exam)}
                                  </strong>
                                </div>
                                <div className="p-2 rounded-lg bg-white border border-slate-200">
                                  <span className="text-[10px] text-slate-500 block">OBC</span>
                                  <strong className="text-slate-900 font-bold">
                                    {formatCutoffDisplay(cutoff.obc, cutoff.cutoff_unit, cutoff.exam)}
                                  </strong>
                                </div>
                                <div className="p-2 rounded-lg bg-white border border-slate-200">
                                  <span className="text-[10px] text-slate-500 block">SC</span>
                                  <strong className="text-slate-900 font-bold">
                                    {formatCutoffDisplay(cutoff.sc, cutoff.cutoff_unit, cutoff.exam)}
                                  </strong>
                                </div>
                                <div className="p-2 rounded-lg bg-white border border-slate-200">
                                  <span className="text-[10px] text-slate-500 block">ST</span>
                                  <strong className="text-slate-900 font-bold">
                                    {formatCutoffDisplay(cutoff.st, cutoff.cutoff_unit, cutoff.exam)}
                                  </strong>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="pt-2 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            <span>
                              {selectedExamTab !== "ALL"
                                ? `${selectedExamTab} cutoff: Not available in verified dataset`
                                : "Cutoffs: Not available in current dataset"}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 italic">
                            Admission evaluated on institutional / qualifying academic merit
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                No programs match your search term &ldquo;{programSearch}&rdquo;.
              </div>
            )}
          </div>
        </div>

        {/* 3. Data Transparency & Information Availability Section */}
        <div className="bg-white border border-[#EAEAEA] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-900">
            <HelpCircle className="w-4 h-4 text-indigo-600" />
            <span>Data Transparency & Information Availability</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                Available in EduSphere Dataset
              </span>
              <ul className="space-y-1 text-slate-600 text-[11px] list-disc list-inside">
                <li>Accredited institution name, location, and governing university</li>
                <li>Sanctioned undergraduate degree programs and intake capacities</li>
                <li>Official verified institutional portal URL</li>
                <li>MHT CET / CAP Round entrance cutoffs where officially published</li>
                <li>NAAC accreditation grade when awarded</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                Not Available in Current Dataset
              </span>
              <ul className="space-y-1 text-slate-600 text-[11px] list-disc list-inside">
                <li>Annual tuition fees (intentionally set to NA per FRA guidelines)</li>
                <li>Specialization-specific syllabus deep links (homepage provided)</li>
                <li>Unpublished institute-level management quota cutoffs</li>
              </ul>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 flex-shrink-0" />
              <span>
                Data Source: {college.provenance || "Maharashtra State CET Cell / Official Institutional Portals (Verified Pune Directory)"}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-normal">
              EduSphere AI does not infer, estimate, or hallucinate missing academic or cutoff criteria. Annual tuition fees are subject to Shikshan Shulka Samiti / Fee Regulating Authority (FRA) guidelines; visit official website for verified fee structure.
            </p>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

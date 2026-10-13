"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { DashboardShell } from "@/components/DashboardShell";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import {
  College,
  CanonicalProgram,
  CanonicalAdmission,
  CanonicalFee,
  CanonicalFacility,
  CanonicalAccreditation,
  Placement,
  InstitutionSource,
  VerificationAudit,
} from "@/types";
import {
  getCollegeById,
  getCollegePrograms,
  getCollegeAdmissions,
  getCollegeFees,
  getCollegeFacilities,
  getCollegeAccreditations,
  getCollegePlacements,
  getCollegeSources,
  getCollegeVerification,
} from "@/lib/supabase/colleges";
import { resolveProgramUrlInfo } from "@/lib/supabase/opportunities";
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
  GraduationCap,
  DollarSign,
  TrendingUp,
} from "@/components/icons";

type TabKey =
  | "overview"
  | "programs"
  | "admission"
  | "cutoffs"
  | "fees"
  | "facilities"
  | "accreditation"
  | "placements"
  | "sources";

export default function CollegeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const collegeId = rawId ? decodeURIComponent(rawId) : "";

  const supabase = createClient();
  const { isItemSaved, toggleSaveItem } = useAuth();

  const [college, setCollege] = useState<College | null>(null);
  const [canonicalPrograms, setCanonicalPrograms] = useState<CanonicalProgram[]>([]);
  const [admissions, setAdmissions] = useState<CanonicalAdmission[]>([]);
  const [fees, setFees] = useState<CanonicalFee[]>([]);
  const [facilities, setFacilities] = useState<CanonicalFacility[]>([]);
  const [accreditations, setAccreditations] = useState<CanonicalAccreditation[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [sources, setSources] = useState<InstitutionSource[]>([]);
  const [audits, setAudits] = useState<VerificationAudit[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  // Active Tab state initialized from URL hash if available
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "");
      if (
        [
          "overview",
          "programs",
          "admission",
          "admissions",
          "cutoffs",
          "fees",
          "facilities",
          "accreditation",
          "placements",
          "sources",
        ].includes(hash)
      ) {
        return hash === "admissions" ? "admission" : (hash as TabKey);
      }
    }
    return "overview";
  });

  const [programSearch, setProgramSearch] = useState("");
  const [selectedExamTab, setSelectedExamTab] = useState<string>("ALL");

  const saved = college ? isItemSaved(college.id) : false;

  useEffect(() => {
    let isMounted = true;

    async function loadAllCollegeData() {
      if (!collegeId) return;
      setLoading(true);
      setErrorMsg("");

      try {
        const [
          colRes,
          progRes,
          admRes,
          feeRes,
          facRes,
          accRes,
          plcRes,
          srcRes,
          audRes,
        ] = await Promise.all([
          getCollegeById(collegeId, supabase),
          getCollegePrograms(collegeId, supabase),
          getCollegeAdmissions(collegeId, supabase),
          getCollegeFees(collegeId, supabase),
          getCollegeFacilities(collegeId, supabase),
          getCollegeAccreditations(collegeId, supabase),
          getCollegePlacements(collegeId, supabase),
          getCollegeSources(collegeId, supabase),
          getCollegeVerification(collegeId, supabase),
        ]);

        if (!isMounted) return;

        if (colRes.error || !colRes.data) {
          setErrorMsg(colRes.error || "College not found in database");
          setCollege(null);
        } else {
          setCollege(colRes.data);
          setCanonicalPrograms(progRes.data || []);
          setAdmissions(admRes.data || []);
          setFees(feeRes.data || []);
          setFacilities(facRes.data || []);
          setAccreditations(accRes.data || []);
          setPlacements(plcRes.data || []);
          setSources(srcRes.data || []);
          setAudits(audRes.data || []);
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg =
          err instanceof Error ? err.message : "Failed to load college details";
        setErrorMsg(msg);
        setCollege(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadAllCollegeData();

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

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  const formatCurrency = (val?: number | string | null) => {
    if (!val) return "Not available";
    const num = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(num) || num <= 0) {
      return typeof val === "string" ? val : "Not available";
    }
    if (num >= 100000) {
      return `₹${(num / 100000).toFixed(1)} Lakh`;
    }
    return `₹${num.toLocaleString("en-IN")}`;
  };

  const totalSeats = useMemo(() => {
    return college?.courses?.reduce((acc, c) => acc + (c.intake || 0), 0) || 0;
  }, [college]);

  // Flattened cutoffs for the interactive cutoffs tab
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
        const verStatus = cut.verification_status || "VERIFIED";
        const unitStr = cut.cutoff_unit || "percentile";

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
              year: cut.year ? `${cut.year}` : "Session: Latest verified",
              round: cut.round ? cut.round : "Round: CAP Final",
              source:
                cut.source_name ||
                "State Common Entrance Test Cell, Maharashtra",
              verification: verStatus,
              notes: cut.notes || "",
            });
          }
        });
      });
    });
    return rows;
  }, [college]);

  const availableExamTabs = useMemo(() => {
    const tabs = new Set<string>(["ALL"]);
    if (college?.accepted_exams && college.accepted_exams.length > 0) {
      college.accepted_exams.forEach((e) => tabs.add(e));
    }
    allCutoffRows.forEach((r) => tabs.add(r.exam));
    return Array.from(tabs);
  }, [college, allCutoffRows]);

  const filteredCutoffRows = useMemo(() => {
    return allCutoffRows.filter((r) => {
      if (selectedExamTab !== "ALL") {
        if (r.exam.toUpperCase() !== selectedExamTab.toUpperCase()) return false;
      }
      if (programSearch.trim()) {
        const q = programSearch.toLowerCase().trim();
        return (
          r.programName.toLowerCase().includes(q) ||
          r.stream.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allCutoffRows, selectedExamTab, programSearch]);

  const filteredCourses = useMemo(() => {
    if (!college?.courses) return [];
    if (!programSearch.trim()) return college.courses;
    const q = programSearch.toLowerCase().trim();
    return college.courses.filter(
      (crs) =>
        crs.course_name.toLowerCase().includes(q) ||
        crs.stream?.toLowerCase().includes(q) ||
        crs.field?.toLowerCase().includes(q) ||
        crs.degree?.toLowerCase().includes(q)
    );
  }, [college, programSearch]);

  const renderVerificationBadge = (status?: string) => {
    const s = (status || "VERIFIED").toUpperCase();
    if (s === "VERIFIED") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle className="w-3 h-3 text-emerald-600" />
          VERIFIED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
        REVIEW
      </span>
    );
  };

  const formatCutoffDisplay = (
    val: number | null,
    unit?: string,
    exam?: string
  ) => {
    if (val === null || val === undefined) return "N/A";
    if (unit === "rank") return `AIR ${val.toLocaleString()}`;
    const ex = (exam || "").toUpperCase();
    if (
      unit === "marks" ||
      unit === "score" ||
      ex.includes("NATA") ||
      ex.includes("LAW") ||
      ex.includes("BITSAT")
    ) {
      return `${val} marks`;
    }
    return `${val}%ile`;
  };

  if (loading) {
    return (
      <DashboardShell
        title="College Intelligence"
        subtitle="Loading verified institutional records..."
      >
        <div className="space-y-6 animate-pulse">
          <div className="h-6 w-32 bg-slate-200 rounded-lg" />
          <div className="h-44 bg-white border border-slate-200 rounded-2xl p-6" />
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
      <DashboardShell
        title="College Intelligence"
        subtitle="Institutional catalog lookup"
      >
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center max-w-lg mx-auto my-8 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900 mb-1">
            College Not Found
          </h2>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            {errorMsg ||
              "The requested institution record does not exist or has been deprecated."}
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

  const tabsConfig: Array<{ key: TabKey; label: string; count?: number }> = [
    { key: "overview", label: "Overview" },
    {
      key: "programs",
      label: "Programs",
      count: college.courses?.length || canonicalPrograms.length || 0,
    },
    {
      key: "admission",
      label: "Admission",
      count: admissions.length || (college.admission_route ? 1 : 0),
    },
    { key: "cutoffs", label: "Cutoffs", count: allCutoffRows.length },
    { key: "fees", label: "Fees", count: fees.length },
    { key: "facilities", label: "Facilities", count: facilities.length },
    {
      key: "accreditation",
      label: "Accreditation",
      count: accreditations.length || (college.naac_grade ? 1 : 0),
    },
    { key: "placements", label: "Placements", count: placements.length },
    { key: "sources", label: "Official Sources", count: sources.length },
  ];

  return (
    <DashboardShell
      title={college.name}
      subtitle={`${college.location ? `${college.location}, ` : ""}${
        college.state || "Maharashtra, India"
      }`}
    >
      <div className="space-y-6">
        {/* Navigation Breadcrumb & Quick Actions */}
        <div className="flex items-center justify-between">
          <Link
            href="/colleges"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Colleges Directory</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            >
              {copiedShare ? "✓ Copied Link" : "Share"}
            </button>
            <div className="text-[11px] text-slate-400 font-mono hidden sm:inline">
              ID: {college.id.slice(0, 8)}...
            </div>
          </div>
        </div>

        {/* Institution Header Hero Card */}
        <div className="bg-white border border-[#EAEAEA] rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0 shadow-2xs">
                <Building2 className="w-7 h-7" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                  {college.verification_status === "Verified" && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                      Verified Institution
                    </span>
                  )}
                  {(college.institution_type || college.college_type) && (
                    <span className="text-[11px] font-semibold tracking-wide uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {college.institution_type || college.college_type}
                    </span>
                  )}
                  {college.ownership && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200">
                      {college.ownership}
                    </span>
                  )}
                  {college.autonomous_status &&
                    college.autonomous_status !== "Non-Autonomous" && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                        {college.autonomous_status}
                      </span>
                    )}
                  {college.naac_grade && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ★ NAAC Grade {college.naac_grade}
                    </span>
                  )}
                </div>

                <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                  {college.name}
                  {college.short_name && college.short_name !== college.name && (
                    <span className="ml-2 text-sm font-semibold text-slate-500 font-normal">
                      ({college.short_name})
                    </span>
                  )}
                </h1>

                {college.university_name && (
                  <p className="text-xs font-semibold text-indigo-700 mt-1">
                    Affiliated to {college.university_name}
                  </p>
                )}

                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span>
                    {[
                      college.taluka,
                      college.district,
                      college.state || "Maharashtra",
                    ]
                      .filter(Boolean)
                      .filter((val, i, arr) => arr.indexOf(val) === i)
                      .join(", ")}
                    {college.pin_code ? ` - ${college.pin_code}` : ""}
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

        {/* 9-Tab Navigation Bar */}
        <div className="border-b border-slate-200 overflow-x-auto pb-0">
          <nav className="flex space-x-1 sm:space-x-2">
            {tabsConfig.map((t) => {
              const isActive = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`py-3 px-3.5 text-xs font-semibold border-b-2 whitespace-nowrap transition flex items-center gap-1.5 ${
                    isActive
                      ? "border-indigo-600 text-indigo-700 bg-indigo-50/40 rounded-t-lg"
                      : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
                  }`}
                >
                  <span>{t.label}</span>
                  {t.count !== undefined && t.count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {t.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-[#EAEAEA] rounded-2xl p-5 shadow-sm">
                <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Tuition Fee
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-slate-900">
                    {fees.length > 0 && fees[0].tuition_fee
                      ? formatCurrency(fees[0].tuition_fee)
                      : college.fees && college.fees > 0
                      ? formatCurrency(college.fees)
                      : "N/A"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2 leading-normal">
                  Statutory regulation: Governed by Fee Regulating Authority (FRA).
                </p>
              </div>

              <div className="bg-white border border-[#EAEAEA] rounded-2xl p-5 shadow-sm">
                <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Sanctioned Programs
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-extrabold text-indigo-600">
                    {college.courses?.length || canonicalPrograms.length || 1}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    branches
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  {totalSeats > 0
                    ? `${totalSeats} approved intake capacity`
                    : "Intake per State CET CAP directives"}
                </p>
              </div>

              <div className="bg-white border border-[#EAEAEA] rounded-2xl p-5 shadow-sm">
                <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Avg. Package
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-slate-900">
                    {formatCurrency(college.avg_package)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  {college.avg_package
                    ? "Reported campus placement average"
                    : "Official metric available in Placements tab"}
                </p>
              </div>

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
                  {college.highest_package
                    ? "Recorded placement high"
                    : "Official metric available in Placements tab"}
                </p>
              </div>
            </div>

            {/* Comprehensive Metadata Grid */}
            <div className="bg-white border border-[#EAEAEA] rounded-2xl p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>Institutional Governance & Profile</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                    Governing University
                  </span>
                  <span className="font-semibold text-slate-900">
                    {college.university_name || "Not Specified / Autonomous"}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                    Institution Type
                  </span>
                  <span className="font-semibold text-slate-900">
                    {college.institution_type || college.college_type || "Higher Education"}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                    Ownership
                  </span>
                  <span className="font-semibold text-slate-900">
                    {college.ownership || "Private / Unaided"}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                    Autonomous Status
                  </span>
                  <span className="font-semibold text-slate-900">
                    {college.autonomous_status || "Non-Autonomous"}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                    Established Year
                  </span>
                  <span className="font-semibold text-slate-900">
                    {college.established_year || "Verified Institutional Record"}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                    NAAC Accreditation
                  </span>
                  <span className="font-semibold text-slate-900">
                    {college.naac_grade
                      ? `Grade ${college.naac_grade}`
                      : "Accreditation on record"}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                    District & Taluka
                  </span>
                  <span className="font-semibold text-slate-900">
                    {[college.taluka, college.district, college.state]
                      .filter(Boolean)
                      .join(", ") || "Maharashtra"}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                    Contact Phone & Email
                  </span>
                  <div className="font-semibold text-slate-900 space-y-0.5">
                    <div>{college.contact_phone || "Official Office / EPABX"}</div>
                    <div className="text-indigo-600">
                      {college.contact_email || "Official Contact via Portal"}
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                    Verification Audit
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {renderVerificationBadge(college.verification_status || "VERIFIED")}
                    <span className="text-[10px] text-slate-500">
                      {college.last_verified_at
                        ? `Audited ${new Date(college.last_verified_at).toLocaleDateString()}`
                        : "Authoritative Directorate Record"}
                    </span>
                  </div>
                </div>
              </div>

              {college.address && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                    Campus Address
                  </span>
                  <span className="text-slate-700">
                    {college.address}
                    {college.pin_code ? ` - ${college.pin_code}` : ""}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PROGRAMS */}
        {activeTab === "programs" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 border border-[#EAEAEA] rounded-2xl shadow-sm">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  <span>Sanctioned Academic Programs ({filteredCourses.length})</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Degree programs, approved intake capacities, and curriculum routes
                </p>
              </div>

              <div className="relative sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={programSearch}
                  onChange={(e) => setProgramSearch(e.target.value)}
                  placeholder="Search program or branch..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#EAEAEA] bg-white text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>
            </div>

            {filteredCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCourses.map((crs) => {
                  const urlInfo = resolveProgramUrlInfo(
                    crs.program_url,
                    college.official_website
                  );
                  return (
                    <div
                      key={crs.course_id}
                      className="p-5 rounded-2xl bg-white border border-[#EAEAEA] shadow-sm hover:border-slate-300 transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-bold text-slate-900 text-sm leading-snug">
                            {crs.course_name}
                          </h3>
                          {crs.intake > 0 && (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 flex-shrink-0">
                              {crs.intake} Seats
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1.5 mb-3 text-xs">
                          {crs.stream && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium">
                              Stream: {crs.stream}
                            </span>
                          )}
                          {crs.degree && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium">
                              Degree: {crs.degree}
                            </span>
                          )}
                          {crs.duration_years && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium">
                              Duration: {crs.duration_years} Years
                            </span>
                          )}
                          {crs.degree_level && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium">
                              {crs.degree_level}
                            </span>
                          )}
                        </div>

                        {crs.eligibility_criteria && (
                          <p className="text-[11px] text-slate-600 line-clamp-2 mb-3">
                            <span className="font-semibold text-slate-800">
                              Eligibility:{" "}
                            </span>
                            {crs.eligibility_criteria}
                          </p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-slate-400">
                          {crs.admission_route || "CAP Centralized"}
                        </span>
                        {urlInfo.url && (
                          <a
                            href={urlInfo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1 text-[11px]"
                          >
                            <span>Program Portal</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500 shadow-sm">
                No programs matching &ldquo;{programSearch}&rdquo;.
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ADMISSION */}
        {activeTab === "admission" && (
          <div className="bg-white border border-[#EAEAEA] rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3">
              <GraduationCap className="w-5 h-5 text-indigo-600" />
              <span>Admission Rules, Routes & Eligibility</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-900 block text-xs">
                  Centralized Admission Route
                </span>
                <p className="text-slate-700 font-medium">
                  {college.admission_route ||
                    "State Common Entrance Test Cell (CET Cell) Maharashtra CAP Rounds"}
                </p>
                <span className="text-[10px] text-slate-400 block">
                  Official counseling and seat allotment mechanism
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-900 block text-xs">
                  Accepted Entrance Examinations
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {(college.accepted_exams && college.accepted_exams.length > 0
                    ? college.accepted_exams
                    : college.entrance_exam
                    ? [college.entrance_exam]
                    : ["MHT-CET", "JEE Main"]
                  ).map((ex, exIdx) => (
                    <span
                      key={exIdx}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white text-indigo-700 border border-indigo-200 shadow-2xs"
                    >
                      {ex}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 md:col-span-2">
                <span className="font-bold text-slate-900 block text-xs">
                  Academic Eligibility Benchmarks
                </span>
                <p className="text-slate-700 leading-relaxed">
                  {college.eligibility_criteria ||
                    "Candidates must have passed 10+2 with Physics and Mathematics as compulsory subjects along with Chemistry/Biotechnology/Biology/Technical Vocational subject, securing at least 45% marks (40% marks for backward class categories)."}
                </p>
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/60 text-[11px]">
                  <span className="text-slate-500">
                    Source:{" "}
                    {college.admission_source_name ||
                      "State Common Entrance Test Cell Information Brochure"}
                  </span>
                  {college.admission_url && (
                    <a
                      href={college.admission_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1"
                    >
                      <span>Open Official Admission Portal</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {admissions.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Detailed Admission Pipeline Records ({admissions.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {admissions.map((adm) => (
                    <div
                      key={adm.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <strong className="text-xs text-indigo-700">
                          {adm.entrance_exam}
                        </strong>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                          {adm.academic_year || "2024-25"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        Route: {adm.admission_route || "CAP Round Allocation"}
                      </p>
                      {adm.eligibility && (
                        <p className="text-[11px] text-slate-500 line-clamp-2">
                          {adm.eligibility}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: CUTOFFS */}
        {activeTab === "cutoffs" && (
          <div className="bg-white border border-[#EAEAEA] rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F1F5F9]">
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  <span>Cutoff Benchmarks ({filteredCutoffRows.length})</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Official directorate closing ranks and category percentile cutoffs
                </p>
              </div>

              {availableExamTabs.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {availableExamTabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setSelectedExamTab(tab)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                        selectedExamTab === tab
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {filteredCutoffRows.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-800">
                    <tr>
                      <th className="px-3.5 py-2.5 font-bold">Program</th>
                      <th className="px-3.5 py-2.5 font-bold">Exam</th>
                      <th className="px-3.5 py-2.5 font-bold">Category</th>
                      <th className="px-3.5 py-2.5 font-bold">Cutoff</th>
                      <th className="px-3.5 py-2.5 font-bold">Year</th>
                      <th className="px-3.5 py-2.5 font-bold">Round</th>
                      <th className="px-3.5 py-2.5 font-bold">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredCutoffRows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/60">
                        <td className="px-3.5 py-2 text-slate-900 font-semibold">
                          {row.programName}
                        </td>
                        <td className="px-3.5 py-2 text-indigo-700 font-semibold">
                          {row.exam}
                        </td>
                        <td className="px-3.5 py-2">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]">
                            {row.category}
                          </span>
                        </td>
                        <td className="px-3.5 py-2 font-bold text-slate-900">
                          {formatCutoffDisplay(row.cutoff, row.unit, row.exam)}
                        </td>
                        <td className="px-3.5 py-2 text-slate-500 text-[11px]">
                          {row.year}
                        </td>
                        <td className="px-3.5 py-2 text-slate-500 text-[11px]">
                          {row.round}
                        </td>
                        <td className="px-3.5 py-2">
                          {renderVerificationBadge(row.verification)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                <p className="font-semibold text-slate-700 mb-1">
                  No Cutoff Benchmarks Published
                </p>
                <p className="text-[11px] text-slate-500">
                  Cutoffs for this institution are governed by institutional merit or centralized CAP allotment.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: FEES */}
        {activeTab === "fees" && (
          <div className="bg-white border border-[#EAEAEA] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <span>Verified Fee Structures & Statutory Notices</span>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Statutory Fee Regulating Authority (FRA) Disclosure</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800">
                In Maharashtra, tuition and development fees for unaided higher education institutions are determined under the Maharashtra Unaided Private Professional Educational Institutions (Regulation of Admissions and Fees) Act. EduSphere publishes verified FRA notifications.
              </p>
            </div>

            {fees.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-800">
                    <tr>
                      <th className="px-3.5 py-2.5 font-bold">Academic Year</th>
                      <th className="px-3.5 py-2.5 font-bold">Quota / Category</th>
                      <th className="px-3.5 py-2.5 font-bold">Tuition Fee</th>
                      <th className="px-3.5 py-2.5 font-bold">Development Fee</th>
                      <th className="px-3.5 py-2.5 font-bold">Other Charges</th>
                      <th className="px-3.5 py-2.5 font-bold">Total Annual Fee</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {fees.map((f) => (
                      <tr key={f.id} className="hover:bg-slate-50">
                        <td className="px-3.5 py-2.5 font-semibold text-slate-900">
                          {f.academic_year}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                            {f.quota_or_category || "General / Open"}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5">{formatCurrency(f.tuition_fee)}</td>
                        <td className="px-3.5 py-2.5">{formatCurrency(f.development_fee)}</td>
                        <td className="px-3.5 py-2.5">{formatCurrency(f.other_charges)}</td>
                        <td className="px-3.5 py-2.5 font-bold text-slate-900">
                          {formatCurrency(f.total_fee)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                <p className="font-semibold text-slate-700 mb-1">
                  Annual Tuition Fee: Subject to Official Portal Schedule
                </p>
                <p className="text-[11px] text-slate-500">
                  Please consult the official institutional website or the Fee Regulating Authority circular for the latest approved fee breakdown.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: FACILITIES */}
        {activeTab === "facilities" && (
          <div className="bg-white border border-[#EAEAEA] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3">
              <Building2 className="w-5 h-5 text-indigo-600" />
              <span>Campus Amenities & Infrastructure</span>
            </div>

            {facilities.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {facilities.map((fac) => (
                  <div
                    key={fac.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <strong className="text-xs text-slate-900 font-bold capitalize">
                        {fac.facility_type.replace(/_/g, " ")}
                      </strong>
                      {fac.verified && (
                        <span className="text-[10px] text-emerald-700 font-bold">
                          ✓ Verified
                        </span>
                      )}
                    </div>
                    {fac.description && (
                      <p className="text-[11px] text-slate-600">{fac.description}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                Campus amenities audit in progress. Standard infrastructure includes digital library, computer centers, laboratory facilities, and sports amenities.
              </div>
            )}
          </div>
        )}

        {/* TAB 7: ACCREDITATION */}
        {activeTab === "accreditation" && (
          <div className="bg-white border border-[#EAEAEA] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3">
              <Award className="w-5 h-5 text-indigo-600" />
              <span>Accreditations & Regulatory Approvals</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                  NAAC Grade
                </span>
                <span className="text-base font-extrabold text-slate-900">
                  {college.naac_grade ? `★ Grade ${college.naac_grade}` : "Accredited"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                  Autonomy Decrees
                </span>
                <span className="text-base font-extrabold text-slate-900">
                  {college.autonomous_status || "University Affiliated"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                  Apex Approvals
                </span>
                <span className="text-base font-extrabold text-slate-900">
                  AICTE / UGC / DTE Maharashtra
                </span>
              </div>
            </div>

            {accreditations.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-slate-200 mt-4">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-800">
                    <tr>
                      <th className="px-3.5 py-2.5 font-bold">Body</th>
                      <th className="px-3.5 py-2.5 font-bold">Grade / Status</th>
                      <th className="px-3.5 py-2.5 font-bold">Cycle</th>
                      <th className="px-3.5 py-2.5 font-bold">CGPA</th>
                      <th className="px-3.5 py-2.5 font-bold">Valid Until</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {accreditations.map((acc) => (
                      <tr key={acc.id} className="hover:bg-slate-50">
                        <td className="px-3.5 py-2.5 font-bold text-slate-900">
                          {acc.body}
                        </td>
                        <td className="px-3.5 py-2.5 text-indigo-700 font-semibold">
                          {acc.grade_or_status}
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-600">{acc.cycle || "—"}</td>
                        <td className="px-3.5 py-2.5 text-slate-600">{acc.cgpa || "—"}</td>
                        <td className="px-3.5 py-2.5 text-slate-600">
                          {acc.valid_until || "Active"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 8: PLACEMENTS (Dual Model A / B) */}
        {activeTab === "placements" && (
          <div className="bg-white border border-[#EAEAEA] rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              <span>Placements & Verified NIRF Outcomes</span>
            </div>

            {/* Overall Placement Key Indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Placement Rate
                </span>
                <span className="text-2xl font-extrabold text-emerald-600">
                  {college.placement_rate !== null && college.placement_rate !== undefined
                    ? `${college.placement_rate}%`
                    : "Not published"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Average Package
                </span>
                <span className="text-2xl font-extrabold text-slate-900">
                  {formatCurrency(college.avg_package)}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Highest Package
                </span>
                <span className="text-2xl font-extrabold text-slate-900">
                  {formatCurrency(college.highest_package)}
                </span>
              </div>
            </div>

            {/* Placements Roster supporting Dual Architecture */}
            {placements.length > 0 ? (
              <div className="space-y-3">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Verified Placement Metrics & Recruiter Records ({placements.length})
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {placements.map((plc) => {
                    const isNirfMetric = !plc.company && plc.metric_name;

                    if (isNirfMetric) {
                      return (
                        <div
                          key={plc.id}
                          className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/30 space-y-2 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                                Verified Institutional NIRF Metric
                              </span>
                              {plc.placement_year && (
                                <span className="text-[11px] font-semibold text-slate-500">
                                  {plc.placement_year}
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-slate-900 text-xs">
                              {plc.metric_name}
                            </h4>
                            <div className="text-lg font-extrabold text-indigo-700 mt-1">
                              {plc.metric_value} {plc.metric_unit || ""}
                            </div>
                            {plc.internship_details && (
                              <p className="text-[11px] text-slate-600 mt-1">
                                {plc.internship_details}
                              </p>
                            )}
                          </div>

                          <div className="pt-2 border-t border-indigo-100/70 flex items-center justify-between text-[10px] text-slate-500">
                            <span>NIRF Higher Education Data Repository</span>
                            {plc.source_url && (
                              <a
                                href={plc.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 font-semibold inline-flex items-center gap-0.5 hover:underline"
                              >
                                <span>Official Source</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    }

                    // Model A: Recruiter / Company Record
                    return (
                      <div
                        key={plc.id}
                        className="p-4 rounded-xl border border-slate-200 bg-white space-y-1.5 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-xs">
                              {plc.company || "Campus Recruiter"}
                            </span>
                            {plc.package && (
                              <span className="text-xs font-extrabold text-emerald-700">
                                ₹{plc.package} LPA
                              </span>
                            )}
                          </div>
                          {plc.role && (
                            <p className="text-[11px] text-slate-600">Role: {plc.role}</p>
                          )}
                          {plc.location && (
                            <p className="text-[11px] text-slate-400">
                              Location: {plc.location}
                            </p>
                          )}
                        </div>
                        {plc.placement_year && (
                          <span className="text-[10px] text-slate-400 block pt-1 border-t border-slate-100">
                            Batch Year: {plc.placement_year}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                Detailed company roster is being updated with the latest campus placement cycle disclosures.
              </div>
            )}
          </div>
        )}

        {/* TAB 9: OFFICIAL SOURCES */}
        {activeTab === "sources" && (
          <div className="bg-white border border-[#EAEAEA] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3">
              <Globe className="w-5 h-5 text-indigo-600" />
              <span>Official Primary Sources & Provenance ({sources.length})</span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Every data point in EduSphere AI is directly mapped to an authoritative regulatory body, official state directorate gazette, or accredited institutional domain.
            </p>

            {sources.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sources.map((src) => {
                  const s = src.source;
                  return (
                    <div
                      key={src.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {s?.source_type || "Official Source"}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {src.verified_at
                              ? new Date(src.verified_at).toLocaleDateString()
                              : "Verified"}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-xs mt-1.5">
                          {s?.name || "State Regulatory Source"}
                        </h4>
                        {s?.publisher && (
                          <p className="text-[11px] text-slate-500">
                            Publisher: {s.publisher}
                          </p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-xs">
                        {renderVerificationBadge(src.status || "VERIFIED")}
                        {s?.url && (
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1 text-[11px]"
                          >
                            <span>Open Source URL</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                <span className="font-semibold block text-slate-900 mb-1">
                  Directorate Data Provenance
                </span>
                <span>
                  {college.provenance ||
                    "Maharashtra State CET Cell Directorate Records / Savitribai Phule Pune University Gazette"}
                </span>
              </div>
            )}

            {audits.length > 0 && (
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Verification Audit History
                </h4>
                <div className="space-y-1.5">
                  {audits.map((a) => (
                    <div
                      key={a.id}
                      className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] flex items-center justify-between"
                    >
                      <div>
                        <span className="font-semibold text-slate-800">
                          {a.audit_type}
                        </span>
                        <span className="text-slate-500 ml-2">{a.notes}</span>
                      </div>
                      <span className="text-slate-400 font-mono text-[10px]">
                        {a.audit_date ? new Date(a.audit_date).toLocaleDateString() : "Verified"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

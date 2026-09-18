"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardShell } from "@/components/DashboardShell";
import { DashboardCard } from "@/components/DashboardCard";
import { CollegeCard } from "@/components/CollegeCard";
import { InternshipCard } from "@/components/InternshipCard";
import { PlacementCard } from "@/components/PlacementCard";
import { LoadingCard } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { College, Internship, Placement } from "@/types";
import {
  Building2,
  Briefcase,
  Award,
  Bookmark,
  Sparkles,
  ArrowRight,
  AlertCircle,
} from "@/components/icons";

import { calculateProfileStrength } from "@/lib/profile-utils";
import { computeCareerIntelligenceReport } from "@/lib/ai-guidance";
import { fetchAllOpportunities } from "@/lib/supabase/opportunities";
import { CareerReadinessCard } from "@/components/career-intelligence/CareerReadinessCard";
import { PlacementReadinessCard } from "@/components/career-intelligence/PlacementReadinessCard";
import { SkillProgressCard } from "@/components/career-intelligence/SkillProgressCard";
import { CareerSummarySection } from "@/components/career-intelligence/CareerSummarySection";

export default function DashboardPage() {
  const { user, profile, studentProfile, skills, savedItemIds } = useAuth();
  const supabase = createClient();

  const [colleges, setColleges] = useState<College[]>([]);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [collegesCount, setCollegesCount] = useState(0);
  const [internshipsCount, setInternshipsCount] = useState(0);
  const [placementsCount, setPlacementsCount] = useState(0);
  const [loadingData, setLoadingData] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [reloadIndex, setReloadIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function fetchDashboardData() {
      setLoadingData(true);
      setErrorMsg("");
      try {
        const { colleges: cols, internships: ints, placements: plcs, error } =
          await fetchAllOpportunities(supabase);

        if (!isMounted) return;

        if (error) {
          setErrorMsg(error);
        }

        setColleges(cols);
        setCollegesCount(cols.length);

        setInternships(ints);
        setInternshipsCount(ints.length);

        setPlacements(plcs);
        setPlacementsCount(plcs.length);
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : "Failed to load dashboard data from database";
        setErrorMsg(msg);
      } finally {
        if (isMounted) setLoadingData(false);
      }
    }

    fetchDashboardData();

    return () => {
      isMounted = false;
    };
  }, [supabase, reloadIndex]);

  const handleRetry = () => {
    setLoadingData(true);
    setErrorMsg("");
    setReloadIndex((prev) => prev + 1);
  };

  const completionPercentage = calculateProfileStrength(profile, studentProfile, skills);

  const careerReport = useMemo(() => {
    return computeCareerIntelligenceReport(
      profile,
      studentProfile,
      skills,
      colleges,
      internships,
      placements,
      savedItemIds.size
    );
  }, [profile, studentProfile, skills, colleges, internships, placements, savedItemIds.size]);

  const studentDisplayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Student";

  return (
    <ProtectedRoute>
      <DashboardShell
        title="Dashboard"
        subtitle="Personalized academic opportunities, curated data, and AI-powered guidance"
      >
        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={handleRetry}
              className="px-3 py-1 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-500 transition text-[11px]"
            >
              Retry
            </button>
          </div>
        )}

        {/* Welcome Hero Banner */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#EAEAEA] relative overflow-hidden shadow-sm">
          {/* Subtle glowing ambient accent */}
          <div className="absolute right-0 top-0 -mt-10 -mr-10 w-80 h-80 bg-gradient-to-bl from-indigo-500/10 via-violet-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-700 text-xs font-semibold mb-3 border border-indigo-200/60">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>AI Guidance Engine Connected</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Welcome back, {studentDisplayName}
            </h2>
            <p className="mt-1 text-sm font-medium text-indigo-600">
              Your academic and career journey, intelligently guided.
            </p>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-500 leading-relaxed">
              {studentProfile?.preferred_branch
                ? `You are currently tracking opportunities for ${studentProfile.preferred_branch}. Profile completion is at ${completionPercentage}%.`
                : "Configure your target branch, entrance marks, and skills to unlock precision AI recommendations."}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/recommendations"
                className="px-5 py-2.5 rounded-full bg-slate-900 hover:bg-black text-white font-medium text-xs shadow-sm transition flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-indigo-300" />
                <span>Get AI Recommendations</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/profile"
                className="px-5 py-2.5 rounded-full bg-white hover:bg-slate-50 text-slate-800 font-medium text-xs border border-slate-300 transition"
              >
                Complete Profile ({completionPercentage}%) &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* 4-Stat Metric Row - Strictly Real Supabase Counts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <DashboardCard
            title="Available Colleges"
            value={collegesCount}
            description="Accredited degree programs"
            icon={<Building2 className="w-5 h-5" />}
            color="indigo"
            href="/colleges"
          />
          <DashboardCard
            title="Internship Openings"
            value={internshipsCount}
            description="Active industry positions"
            icon={<Briefcase className="w-5 h-5" />}
            color="emerald"
            href="/internships"
          />
          <DashboardCard
            title="Campus Placements"
            value={placementsCount}
            description="Full-time recruitment drives"
            icon={<Award className="w-5 h-5" />}
            color="violet"
            href="/placements"
          />
          <DashboardCard
            title="Saved Items"
            value={savedItemIds.size}
            description="Your bookmarked opportunities"
            icon={<Bookmark className="w-5 h-5" />}
            color="amber"
            href="/saved"
          />
        </div>

        {/* Career Intelligence & Student Progress Layer */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-1 border border-indigo-100">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Student Progress & Career Intelligence</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Career Readiness & Opportunity Compatibility
              </h3>
            </div>
            <Link
              href="/recommendations"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition flex items-center gap-1"
            >
              <span>View Full AI Guidance</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* 3-Card Intelligence Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <CareerReadinessCard readiness={careerReport.readiness} />
            <PlacementReadinessCard
              metrics={careerReport.placement_readiness}
              studentCgpa={studentProfile?.cgpa}
            />
            <SkillProgressCard
              currentSkills={careerReport.skill_progress.current_skills}
              recommendedSkills={careerReport.skill_progress.recommended_skills}
              coveragePercentage={careerReport.skill_progress.coverage_percentage}
              totalMarketSkills={careerReport.skill_progress.total_market_skills}
            />
          </div>

          {/* Career Narrative Summary & Action Priorities */}
          <CareerSummarySection report={careerReport} />
        </section>

        {/* Academic & Profile Summary Banner */}
        <div className="bg-white border border-[#EAEAEA] rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-[#F1F5F9] gap-2">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                Academic & Profile Summary
              </h3>
              <p className="text-xs text-slate-500">
                Attributes used by the recommendation engine to match college cutoffs and job criteria
              </p>
            </div>
            <Link
              href="/profile"
              className="text-xs font-semibold text-slate-900 hover:text-indigo-600 inline-flex items-center gap-1 transition"
            >
              Update Profile &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5 uppercase tracking-wider text-[10px] font-bold">
                Target Branch
              </span>
              <span className="font-semibold text-slate-900 text-sm">
                {studentProfile?.preferred_branch || "Not configured"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5 uppercase tracking-wider text-[10px] font-bold">
                Current CGPA
              </span>
              <span className="font-semibold text-slate-900 text-sm">
                {studentProfile?.cgpa !== null && studentProfile?.cgpa !== undefined
                  ? `${studentProfile.cgpa}`
                  : "Not set"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5 uppercase tracking-wider text-[10px] font-bold">
                Entrance Score
              </span>
              <span className="font-semibold text-slate-900 text-sm">
                {studentProfile?.entrance_score !== null && studentProfile?.entrance_score !== undefined
                  ? `${studentProfile.entrance_score}`
                  : "Not set"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5 uppercase tracking-wider text-[10px] font-bold">
                Preferred Location
              </span>
              <span className="font-semibold text-slate-900 text-sm">
                {studentProfile?.preferred_location || "Any Region"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5 uppercase tracking-wider text-[10px] font-bold">
                Recorded Skills
              </span>
              <span className="font-semibold text-slate-900 text-sm">
                {skills.length > 0 ? `${skills.length} skills listed` : "None added yet"}
              </span>
            </div>
          </div>
        </div>

        {/* AI Career Guide Callout Banner */}
        <div className="bg-gradient-to-r from-indigo-50/60 via-white to-violet-50/60 border border-[#EAEAEA] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">AI Career Guide</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">AI profile matching</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                EduSphere AI benchmarks your score and technical proficiencies against curated admission cutoffs and corporate recruitment criteria.
              </p>
            </div>
          </div>
          <Link
            href="/recommendations"
            className="px-4 py-2 rounded-full bg-slate-900 hover:bg-black text-white text-xs font-medium whitespace-nowrap self-start sm:self-center shadow-xs transition"
          >
            Explore AI Matches &rarr;
          </Link>
        </div>

        {/* Featured Colleges Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Featured Colleges Catalog
              </h3>
              <p className="text-xs text-slate-500">
                Institutions from Supabase colleges table
              </p>
            </div>
            <Link
              href="/colleges"
              className="text-xs font-semibold text-slate-900 hover:text-indigo-600 flex items-center gap-1 transition"
            >
              View all colleges &rarr;
            </Link>
          </div>

          {loadingData ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <LoadingCard />
              <LoadingCard />
              <LoadingCard />
            </div>
          ) : colleges.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {colleges.map((college) => (
                <CollegeCard key={college.id} college={college} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Building2 className="w-8 h-8" />}
              title="No Colleges in Database Yet"
              description="The colleges table in Supabase does not currently contain any records. When colleges are added to Supabase, they will automatically display here."
              actionText="View Colleges Page"
              actionHref="/colleges"
            />
          )}
        </section>

        {/* Internships & Placements Real Data Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Internships Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                  Active Internships
                </h3>
                <p className="text-xs text-slate-500">From internships table</p>
              </div>
              <Link
                href="/internships"
                className="text-xs font-semibold text-slate-900 hover:text-emerald-600 transition"
              >
                View all &rarr;
              </Link>
            </div>

            {loadingData ? (
              <LoadingCard />
            ) : internships.length > 0 ? (
              <div className="space-y-4">
                {internships.map((item) => (
                  <InternshipCard key={item.id} internship={item} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Briefcase className="w-8 h-8" />}
                title="No Internships in Database Yet"
                description="The internships table in Supabase is currently empty. Openings added will automatically display here."
                actionText="Explore Internships"
                actionHref="/internships"
              />
            )}
          </div>

          {/* Placements Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                  Campus Placement Drives
                </h3>
                <p className="text-xs text-slate-500">From placements table</p>
              </div>
              <Link
                href="/placements"
                className="text-xs font-semibold text-slate-900 hover:text-violet-600 transition"
              >
                View all &rarr;
              </Link>
            </div>

            {loadingData ? (
              <LoadingCard />
            ) : placements.length > 0 ? (
              <div className="space-y-4">
                {placements.map((item) => (
                  <PlacementCard key={item.id} placement={item} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Award className="w-8 h-8" />}
                title="No Placements in Database Yet"
                description="The placements table in Supabase is currently empty. Drive listings will automatically appear here."
                actionText="Explore Placements"
                actionHref="/placements"
              />
            )}
          </div>
        </div>
      </DashboardShell>
    </ProtectedRoute>
  );
}


"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardShell } from "@/components/DashboardShell";
import { RecommendationCard } from "@/components/RecommendationCard";
import { LoadingCard } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import {
  College,
  Internship,
  Placement,
  RecommendationItem,
  SkillGapAnalysis,
  CareerRoadmapStage,
  ActionPlanItem,
  AIGuidanceOverviewData,
  CareerIntelligenceReport,
} from "@/types";
import { fetchAllOpportunities, logRecommendationActivity } from "@/lib/supabase/opportunities";
import {
  computeAIGuidanceOverview,
  computeCollegeGuidance,
  computeInternshipGuidance,
  computePlacementGuidance,
  computeSkillGapAnalysis,
  computeCareerRoadmap,
  computeActionPlan,
  computeCareerIntelligenceReport,
} from "@/lib/ai-guidance";
import { GuidanceOverview } from "@/components/ai-guidance/GuidanceOverview";
import { SkillGapPanel } from "@/components/ai-guidance/SkillGapPanel";
import { CareerRoadmapView } from "@/components/ai-guidance/CareerRoadmapView";
import { ActionPlanSection } from "@/components/ai-guidance/ActionPlanSection";
import { AICareerAssistant } from "@/components/ai-guidance/AICareerAssistant";
import { CareerReadinessCard } from "@/components/career-intelligence/CareerReadinessCard";
import { PlacementReadinessCard } from "@/components/career-intelligence/PlacementReadinessCard";
import { SkillProgressCard } from "@/components/career-intelligence/SkillProgressCard";
import { CareerSummarySection } from "@/components/career-intelligence/CareerSummarySection";
import {
  Sparkles,
  Building2,
  Briefcase,
  Award,
  AlertCircle,
  BookOpen,
  Zap,
  Compass,
  TrendingUp,
  Bot,
} from "@/components/icons";
import Link from "next/link";

export default function RecommendationsPage() {
  const { profile, studentProfile, skills, savedItemIds } = useAuth();
  const supabase = createClient();

  const [colleges, setColleges] = useState<College[]>([]);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "all" | "college" | "internship" | "placement" | "skills" | "roadmap" | "intelligence" | "assistant"
  >("all");
  const [errorMsg, setErrorMsg] = useState("");
  const [reloadIndex, setReloadIndex] = useState(0);

  // Profile completeness check
  const isProfileIncomplete = useMemo(() => {
    if (!studentProfile) return true;
    const hasBranch = !!studentProfile.preferred_branch?.trim();
    const hasScore =
      studentProfile.entrance_score !== null &&
      studentProfile.entrance_score !== undefined &&
      studentProfile.entrance_score > 0;
    return !hasBranch || !hasScore;
  }, [studentProfile]);

  // Fetch opportunity data from Supabase using authoritative opportunity service
  useEffect(() => {
    let isMounted = true;

    async function loadOpportunityData() {
      setLoading(true);
      setErrorMsg("");
      try {
        const { colleges: cols, internships: ints, placements: plcs, error } =
          await fetchAllOpportunities(supabase);

        if (!isMounted) return;

        if (error) {
          setErrorMsg(error);
        }

        setColleges(cols);
        setInternships(ints);
        setPlacements(plcs);
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg =
          err instanceof Error
            ? err.message
            : "Failed to load opportunities from database";
        setErrorMsg(msg);
        setColleges([]);
        setInternships([]);
        setPlacements([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadOpportunityData();

    return () => {
      isMounted = false;
    };
  }, [supabase, reloadIndex]);

  const careerReport: CareerIntelligenceReport = useMemo(() => {
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

  // Reactive AI Guidance Calculations (instantly recomputes when profile/skills/data update)
  const overviewData: AIGuidanceOverviewData = useMemo(() => {
    return computeAIGuidanceOverview(profile, studentProfile, skills, careerReport.readiness);
  }, [profile, studentProfile, skills, careerReport.readiness]);

  const collegeRecommendations = useMemo(() => {
    return computeCollegeGuidance(studentProfile, colleges);
  }, [studentProfile, colleges]);

  const internshipRecommendations = useMemo(() => {
    return computeInternshipGuidance(studentProfile, skills, internships);
  }, [studentProfile, skills, internships]);

  const placementRecommendations = useMemo(() => {
    return computePlacementGuidance(studentProfile, skills, placements);
  }, [studentProfile, skills, placements]);

  const allRecommendations: RecommendationItem[] = useMemo(() => {
    return [
      ...collegeRecommendations,
      ...internshipRecommendations,
      ...placementRecommendations,
    ].sort((a, b) => b.match_score - a.match_score);
  }, [collegeRecommendations, internshipRecommendations, placementRecommendations]);

  // Step 4 & 6: Deduplicated Real Recommendation Activity Logging to public.recommendation_log
  const lastLoggedSigRef = useRef<string | null>(null);
  const isLoggingRef = useRef(false);

  // Deterministic calculation signature based on student inputs and opportunities
  const calculationSignature = useMemo(() => {
    if (!studentProfile?.id || studentProfile.id.startsWith("sp-demo") || loading) {
      return null;
    }
    return [
      studentProfile.id,
      studentProfile.cgpa ?? "none",
      studentProfile.entrance_score ?? "none",
      studentProfile.preferred_branch ?? "none",
      studentProfile.preferred_location ?? "none",
      skills.slice().sort().join(","),
      colleges.length,
      internships.length,
      placements.length,
    ].join("::");
  }, [studentProfile, skills, colleges.length, internships.length, placements.length, loading]);

  useEffect(() => {
    // Only execute when recommendations are computed for a real authenticated student
    if (!calculationSignature || loading || allRecommendations.length === 0 || !studentProfile?.id) {
      return;
    }

    // 1. In-memory deduplication (prevents Strict Mode double-invoke and re-render duplicate logs)
    if (lastLoggedSigRef.current === calculationSignature) {
      return;
    }

    // 2. SessionStorage deduplication (prevents duplicate logs on browser page refresh during the same session)
    const sessionKey = `edusphere_rec_log_${studentProfile.id}`;
    if (typeof window !== "undefined") {
      try {
        const cachedSig = sessionStorage.getItem(sessionKey);
        if (cachedSig === calculationSignature) {
          lastLoggedSigRef.current = calculationSignature;
          return;
        }
      } catch {
        // Ignore sessionStorage access errors in restricted environments
      }
    }

    if (isLoggingRef.current) return;
    isLoggingRef.current = true;

    // Mark as logged in memory immediately to prevent concurrent race conditions
    lastLoggedSigRef.current = calculationSignature;

    logRecommendationActivity(supabase, studentProfile.id, allRecommendations)
      .then((res) => {
        if (res.success && typeof window !== "undefined") {
          try {
            sessionStorage.setItem(sessionKey, calculationSignature);
          } catch {
            // Ignore
          }
        }
      })
      .catch((err) => {
        console.warn("Non-blocking recommendation logging note:", err);
      })
      .finally(() => {
        isLoggingRef.current = false;
      });
  }, [calculationSignature, loading, allRecommendations, studentProfile, supabase]);

  const skillGapAnalysis: SkillGapAnalysis = useMemo(() => {
    return computeSkillGapAnalysis(skills, internships, placements);
  }, [skills, internships, placements]);

  const careerRoadmap: CareerRoadmapStage[] = useMemo(() => {
    return computeCareerRoadmap(profile, studentProfile, skills);
  }, [profile, studentProfile, skills]);

  const actionPlan: ActionPlanItem[] = useMemo(() => {
    return computeActionPlan(
      profile,
      studentProfile,
      skills,
      savedItemIds.size,
      skillGapAnalysis.recommended_skills
    );
  }, [profile, studentProfile, skills, savedItemIds.size, skillGapAnalysis.recommended_skills]);

  const handleRetry = () => {
    setLoading(true);
    setErrorMsg("");
    setReloadIndex((prev) => prev + 1);
  };

  return (
    <ProtectedRoute>
      <DashboardShell
        title="AI Guidance Engine"
        subtitle="Intelligent academic cutoffs, skill gap analysis, and tailored career pathways"
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

        {/* Profile Incomplete Notification Banner (Feature 11) */}
        {isProfileIncomplete && (
          <div className="p-6 sm:p-8 rounded-2xl bg-amber-50/70 border border-amber-200 text-slate-900 space-y-3 relative overflow-hidden shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-amber-950">
                    Complete your profile to unlock more personalized guidance
                  </h3>
                  <p className="text-xs text-amber-800/80 mt-0.5 max-w-xl leading-relaxed">
                    Adding your <strong className="font-semibold text-amber-950">Preferred Branch</strong> and <strong className="font-semibold text-amber-950">Entrance Exam Score</strong> enables the engine to benchmark precise cutoffs and rank top institutional choices.
                  </p>
                </div>
              </div>

              <Link
                href="/profile"
                className="px-5 py-2.5 rounded-full bg-slate-900 hover:bg-black text-white font-semibold text-xs transition whitespace-nowrap self-start sm:self-center shadow-xs"
              >
                Complete Profile &rarr;
              </Link>
            </div>
          </div>
        )}

        {/* Feature 1: AI Guidance Overview */}
        <GuidanceOverview overview={overviewData} />

        {/* Navigation Tabs for All Guidance Facets */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#EAEAEA] text-xs font-semibold">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 rounded-full transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === "all"
                ? "bg-slate-900 text-white shadow-xs font-semibold"
                : "bg-white text-slate-600 border border-[#EAEAEA] hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>All Guidance ({allRecommendations.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("college")}
            className={`px-4 py-2 rounded-full transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === "college"
                ? "bg-slate-900 text-white shadow-xs font-semibold"
                : "bg-white text-slate-600 border border-[#EAEAEA] hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Colleges ({collegeRecommendations.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("internship")}
            className={`px-4 py-2 rounded-full transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === "internship"
                ? "bg-slate-900 text-white shadow-xs font-semibold"
                : "bg-white text-slate-600 border border-[#EAEAEA] hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Internships ({internshipRecommendations.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("placement")}
            className={`px-4 py-2 rounded-full transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === "placement"
                ? "bg-slate-900 text-white shadow-xs font-semibold"
                : "bg-white text-slate-600 border border-[#EAEAEA] hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Placements ({placementRecommendations.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("skills")}
            className={`px-4 py-2 rounded-full transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === "skills"
                ? "bg-slate-900 text-white shadow-xs font-semibold"
                : "bg-white text-slate-600 border border-[#EAEAEA] hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Skill Gap ({skillGapAnalysis.recommended_skills.length} Gaps)</span>
          </button>

          <button
            onClick={() => setActiveTab("roadmap")}
            className={`px-4 py-2 rounded-full transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === "roadmap"
                ? "bg-slate-900 text-white shadow-xs font-semibold"
                : "bg-white text-slate-600 border border-[#EAEAEA] hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Career Roadmap (6 Stages)</span>
          </button>

          <button
            onClick={() => setActiveTab("intelligence")}
            className={`px-4 py-2 rounded-full transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === "intelligence"
                ? "bg-slate-900 text-white shadow-xs font-semibold"
                : "bg-white text-slate-600 border border-[#EAEAEA] hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Career Intelligence ({careerReport.readiness.score}% Ready)</span>
          </button>

          <button
            onClick={() => setActiveTab("assistant")}
            className={`px-4 py-2 rounded-full transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === "assistant"
                ? "bg-slate-900 text-white shadow-xs font-semibold"
                : "bg-white text-slate-600 border border-[#EAEAEA] hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Bot className="w-4 h-4 text-indigo-400" />
            <span>AI Career Assistant</span>
          </button>
        </div>

        {/* View Switcher based on Active Tab */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <LoadingCard />
            <LoadingCard />
            <LoadingCard />
          </div>
        ) : (
          <div className="space-y-8">
            {/* 1. ALL GUIDANCE TAB */}
            {activeTab === "all" && (
              <>
                {/* AI Assistant Quick Banner */}
                <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 text-indigo-300 flex items-center justify-center flex-shrink-0 border border-white/10">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        Ask EduSphere AI Assistant
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                          Interactive Guidance
                        </span>
                      </h3>
                      <p className="text-xs text-slate-300 mt-0.5 max-w-xl">
                        Get instant conversational answers regarding your placement cutoffs, skill gaps, and personalized career roadmaps.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab("assistant")}
                    className="px-4 py-2 rounded-full bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs transition whitespace-nowrap self-start sm:self-center shadow-xs flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Open AI Assistant &rarr;</span>
                  </button>
                </div>

                {/* Feature 7: Personalized Action Plan */}
                <ActionPlanSection actions={actionPlan} />

                {/* Career Intelligence 3-Card Summary Grid */}
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

                {/* Top Opportunity Matches Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        Top Curated Opportunity Matches
                      </h2>
                      <p className="text-xs text-slate-500">
                        Ranked by composite compatibility with your academic cutoff, skills, and target stream
                      </p>
                    </div>
                  </div>

                  {allRecommendations.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {allRecommendations.slice(0, 6).map((item) => (
                        <RecommendationCard key={`${item.item_type}-${item.id}`} item={item} />
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={<Sparkles className="w-8 h-8" />}
                      title="No Opportunity Matches Found"
                      description={
                        colleges.length === 0 && internships.length === 0 && placements.length === 0
                          ? "The opportunity database does not currently contain any records. As opportunities are added to Supabase, precision AI recommendations will automatically appear here."
                          : "No opportunities match your current profile criteria. Try updating your target branch, CGPA, or recorded skills."
                      }
                      actionText="Update Profile"
                      actionHref="/profile"
                    />
                  )}
                </div>

                {/* Feature 5: Skill Gap Panel */}
                <SkillGapPanel analysis={skillGapAnalysis} />

                {/* Feature 6: Career Roadmap View */}
                <CareerRoadmapView
                  stages={careerRoadmap}
                  careerGoal={studentProfile?.career_goal}
                  targetBranch={studentProfile?.preferred_branch}
                />

                {/* Career Advisory Narrative Summary */}
                <CareerSummarySection report={careerReport} />
              </>
            )}

            {/* 2. COLLEGES GUIDANCE TAB (Feature 2) */}
            {activeTab === "college" && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-indigo-900">
                  <span>
                    Showing <strong>{collegeRecommendations.length}</strong> accredited colleges scored against your entrance percentile and branch preference.
                  </span>
                  <Link href="/colleges" className="font-bold underline hover:text-indigo-950">
                    Browse Colleges Directory &rarr;
                  </Link>
                </div>

                {collegeRecommendations.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {collegeRecommendations.map((item) => (
                      <RecommendationCard key={`col-${item.id}`} item={item} />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={<Building2 className="w-8 h-8" />}
                    title="No College Recommendations"
                    description="Update your preferred branch or entrance score in your profile to generate matches."
                    actionText="Update Profile"
                    actionHref="/profile"
                  />
                )}
              </div>
            )}

            {/* 3. INTERNSHIPS GUIDANCE TAB (Feature 3) */}
            {activeTab === "internship" && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-900">
                  <span>
                    Showing <strong>{internshipRecommendations.length}</strong> internships ranked by skill overlap and role alignment.
                  </span>
                  <Link href="/internships" className="font-bold underline hover:text-emerald-950">
                    Browse All Internships &rarr;
                  </Link>
                </div>

                {internshipRecommendations.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {internshipRecommendations.map((item) => (
                      <RecommendationCard key={`int-${item.id}`} item={item} />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={<Briefcase className="w-8 h-8" />}
                    title="No Internship Matches"
                    description="Add technical skills to your profile to match with open internship requirements."
                    actionText="Add Skills"
                    actionHref="/profile"
                  />
                )}
              </div>
            )}

            {/* 4. PLACEMENTS GUIDANCE TAB (Feature 4) */}
            {activeTab === "placement" && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-violet-50/50 border border-violet-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-violet-900">
                  <span>
                    Showing <strong>{placementRecommendations.length}</strong> campus recruitment drives with instant eligibility checks against your CGPA.
                  </span>
                  <Link href="/placements" className="font-bold underline hover:text-violet-950">
                    Browse All Placement Drives &rarr;
                  </Link>
                </div>

                {placementRecommendations.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {placementRecommendations.map((item) => (
                      <RecommendationCard key={`plc-${item.id}`} item={item} />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={<Award className="w-8 h-8" />}
                    title="No Placement Matches"
                    description="Enter your CGPA and technical skills in your profile to compute eligibility."
                    actionText="Enter CGPA"
                    actionHref="/profile"
                  />
                )}
              </div>
            )}

            {/* 5. SKILL GAP ANALYSIS TAB (Feature 5) */}
            {activeTab === "skills" && (
              <div className="space-y-6">
                <SkillGapPanel analysis={skillGapAnalysis} />
              </div>
            )}

            {/* 6. CAREER ROADMAP TAB (Feature 6) */}
            {activeTab === "roadmap" && (
              <div className="space-y-6">
                <CareerRoadmapView
                  stages={careerRoadmap}
                  careerGoal={studentProfile?.career_goal}
                  targetBranch={studentProfile?.preferred_branch}
                />
              </div>
            )}

            {/* 7. CAREER INTELLIGENCE TAB */}
            {activeTab === "intelligence" && (
              <div className="space-y-6">
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

                <CareerSummarySection report={careerReport} />
              </div>
            )}

            {/* 8. AI CAREER ASSISTANT TAB */}
            {activeTab === "assistant" && (
              <div className="space-y-6">
                <AICareerAssistant
                  profile={profile}
                  studentProfile={studentProfile}
                  skills={skills}
                  careerReport={careerReport}
                  skillGap={skillGapAnalysis}
                  colleges={collegeRecommendations}
                  internships={internshipRecommendations}
                  placements={placementRecommendations}
                  isDemo={studentProfile?.id?.startsWith("sp-demo")}
                />
              </div>
            )}
          </div>
        )}
      </DashboardShell>
    </ProtectedRoute>
  );
}

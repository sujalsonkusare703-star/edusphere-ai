"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import {
  Sparkles,
  Building2,
  Briefcase,
  Award,
  ArrowRight,
  Check,
  MapPin,
} from "@/components/icons";
import { Logo } from "@/components/Logo";

type FeatureTabId = "colleges" | "internships" | "placements" | "recommendations";

interface TabMeta {
  id: FeatureTabId;
  label: string;
  badge: string;
  icon: React.ReactNode;
}

const TABS: TabMeta[] = [
  {
    id: "colleges",
    label: "Colleges",
    badge: "AI Discovery",
    icon: <Building2 className="w-4 h-4" />,
  },
  {
    id: "internships",
    label: "Internships",
    badge: "Skill Match",
    icon: <Briefcase className="w-4 h-4" />,
  },
  {
    id: "placements",
    label: "Placements",
    badge: "Campus Drives",
    icon: <Award className="w-4 h-4" />,
  },
  {
    id: "recommendations",
    label: "AI Recommendations",
    badge: "Personalized",
    icon: <Sparkles className="w-4 h-4" />,
  },
];

export default function LandingPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<FeatureTabId>("colleges");
  const [isManualOverride, setIsManualOverride] = useState(false);

  // Auto-cycle tabs every 4 seconds unless user recently interacted
  useEffect(() => {
    if (isManualOverride) {
      // Resume auto-cycling after 10 seconds of user inactivity
      const resumeTimer = setTimeout(() => setIsManualOverride(false), 10000);
      return () => clearTimeout(resumeTimer);
    }

    const interval = setInterval(() => {
      setActiveTab((current) => {
        const idx = TABS.findIndex((t) => t.id === current);
        const nextIdx = (idx + 1) % TABS.length;
        return TABS[nextIdx].id;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [isManualOverride]);

  const handleTabClick = (tabId: FeatureTabId) => {
    setActiveTab(tabId);
    setIsManualOverride(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900 selection:bg-neutral-900 selection:text-white font-sans">
      <Navbar />

      <main className="flex-1">
        {/* ========================================================= */}
        {/* 1. HERO SECTION                                           */}
        {/* ========================================================= */}
        <section className="relative overflow-hidden pt-20 pb-16 md:pt-32 md:pb-28">
          {/* Subtle ambient light gradient in background */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[480px] bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(99,102,241,0.06),transparent)] pointer-events-none" />

          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            {/* Small Badge above heading */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-neutral-200/90 bg-neutral-50/80 text-neutral-800 text-xs font-medium mb-8 shadow-xs animate-fade-in-up">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
              <span>AI-Powered Student Guidance</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-neutral-950 leading-[1.08] animate-fade-in-up">
              Shape Your Future.
              <br />
              <span className="bg-gradient-to-r from-neutral-950 via-neutral-800 to-indigo-600 bg-clip-text text-transparent">
                AI Guides You Forward.
              </span>
            </h1>

            {/* Subheading */}
            <p className="mt-7 text-lg sm:text-xl text-neutral-600 max-w-2xl mx-auto font-normal leading-relaxed">
              Discover the right colleges, internships, placement opportunities, and career paths based on your academic profile, skills, and goals.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4">
              {user ? (
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 group"
                >
                  <span>Go to Student Dashboard</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              ) : (
                <Link
                  href="/signup"
                  className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 group"
                >
                  <span>Get Started Free</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              )}

              <Link
                href="/colleges"
                className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-white hover:bg-neutral-50 text-neutral-800 font-medium text-sm border border-neutral-200/90 shadow-xs hover:border-neutral-300 transition-all duration-200 flex items-center justify-center"
              >
                Explore Opportunities
              </Link>
            </div>

            {/* Trust / Social Proof Section */}
            <div className="mt-16 pt-8 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 text-xs text-neutral-500">
              <span className="font-medium text-neutral-700">
                Built to simplify every student&apos;s academic and career journey.
              </span>
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 font-medium text-neutral-600">
                <span className="inline-flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-neutral-900" />
                  Personalized
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-neutral-900" />
                  AI-Powered
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-neutral-900" />
                  Student-Centric
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-neutral-900" />
                  Data-Driven
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 2. FEATURE SHOWCASE (STELLAR TAB SECTION)                 */}
        {/* ========================================================= */}
        <section id="features" className="py-20 md:py-28 bg-neutral-50/60 border-y border-neutral-200/70">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mb-2 block">
                Integrated Capabilities
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-950">
                Everything you need to advance your career
              </h2>
              <p className="text-sm sm:text-base text-neutral-600 mt-3">
                A single, intelligent workspace designed to match student potential with real-world outcomes.
              </p>
            </div>

            {/* Four Interactive Tabs with 4s Auto-cycle */}
            <div className="flex items-center justify-center">
              <div className="inline-flex p-1.5 rounded-2xl bg-neutral-200/60 border border-neutral-200 overflow-x-auto max-w-full">
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabClick(tab.id)}
                      className={`relative px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
                        isActive
                          ? "bg-white text-neutral-950 shadow-sm font-semibold"
                          : "text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100/60"
                      }`}
                    >
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                      {isActive && (
                        <span className="hidden sm:inline-block text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 font-bold border border-neutral-200/60">
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab Mockup Display Card */}
            <div className="mt-8 bg-white rounded-3xl border border-neutral-200/80 shadow-xl shadow-neutral-900/5 p-6 sm:p-10 transition-all duration-300">
              {/* Tab 1: Colleges */}
              {activeTab === "colleges" && (
                <div className="animate-fade-in-up space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
                    <div>
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 mb-1">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>AI College Discovery</span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-950">
                        Find colleges that match your academic profile.
                      </h3>
                      <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
                        Compare cutoffs, fees, branch options, and historical placement records across accredited institutions.
                      </p>
                    </div>

                    <Link
                      href="/colleges"
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 self-start sm:self-auto transition shadow-xs"
                    >
                      <span>Explore Colleges</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Visual Mockup Card */}
                  <div className="p-6 rounded-2xl bg-neutral-50/70 border border-neutral-200/80 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-neutral-900">
                            Birla Institute of Technology &amp; Science (BITS)
                          </h4>
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            College Match 92%
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-neutral-500 mt-1">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>Preferred Location: Rajasthan / Goa • Deemed University</span>
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-xs text-neutral-400 block font-medium">Target Stream</span>
                        <span className="text-xs font-bold text-neutral-900">
                          Computer Science &amp; Engineering
                        </span>
                      </div>
                    </div>

                    {/* Stats Matrix */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                      <div className="p-3.5 rounded-xl bg-white border border-neutral-200/70">
                        <span className="text-[11px] font-medium text-neutral-500 block">Annual Tuition</span>
                        <span className="text-sm font-bold text-neutral-900">₹2,15,000 / yr</span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-white border border-neutral-200/70">
                        <span className="text-[11px] font-medium text-neutral-500 block">Entrance Exam</span>
                        <span className="text-sm font-bold text-neutral-900">BITSAT / JEE 96.5%ile</span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-white border border-neutral-200/70">
                        <span className="text-[11px] font-medium text-neutral-500 block">Placement Rate</span>
                        <span className="text-sm font-bold text-emerald-600">96.4% Recorded</span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-white border border-neutral-200/70">
                        <span className="text-[11px] font-medium text-neutral-500 block">Average Package</span>
                        <span className="text-sm font-bold text-neutral-900">₹18.5 LPA</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Internships */}
              {activeTab === "internships" && (
                <div className="animate-fade-in-up space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
                    <div>
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 mb-1">
                        <Briefcase className="w-3.5 h-3.5" />
                        <span>Internship Discovery</span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-950">
                        Internships matched directly to your verified skills.
                      </h3>
                      <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
                        Filter remote and onsite internships with clear application timelines and required skill prerequisites.
                      </p>
                    </div>

                    <Link
                      href="/internships"
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 self-start sm:self-auto transition shadow-xs"
                    >
                      <span>Explore Internships</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Visual Mockup Card */}
                  <div className="p-6 rounded-2xl bg-neutral-50/70 border border-neutral-200/80 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-neutral-900">
                            Software Engineering Intern
                          </h4>
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Internship Match 89%
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-1 font-medium">
                          Microsoft • Bengaluru / Hyderabad
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                          Onsite / Hybrid
                        </span>
                        <span className="px-3 py-1 rounded-lg bg-white text-neutral-700 text-xs font-bold border border-neutral-200">
                          8–12 Weeks
                        </span>
                      </div>
                    </div>

                    {/* Skill Badges */}
                    <div className="p-4 rounded-xl bg-white border border-neutral-200/70">
                      <span className="text-xs font-semibold text-neutral-700 block mb-2">
                        Matched to your skills:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {["C++", "Java", "Python", "DSA", "Cloud"].map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-800 text-xs font-medium"
                          >
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>{skill}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-neutral-500 pt-1">
                      <span>Stipend: Disclosed on Selection</span>
                      <span className="text-neutral-900 font-semibold">Seasonal Academic Cycle</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Placements */}
              {activeTab === "placements" && (
                <div className="animate-fade-in-up space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
                    <div>
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 mb-1">
                        <Award className="w-3.5 h-3.5" />
                        <span>Placement Drives</span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-950">
                        Campus placement opportunities tailored to your CGPA.
                      </h3>
                      <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
                        Track upcoming corporate hiring drives, minimum academic criteria, and industry sectors.
                      </p>
                    </div>

                    <Link
                      href="/placements"
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 self-start sm:self-auto transition shadow-xs"
                    >
                      <span>Explore Placements</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Visual Mockup Card */}
                  <div className="p-6 rounded-2xl bg-neutral-50/70 border border-neutral-200/80 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-neutral-900">
                            Systems Engineer
                          </h4>
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-violet-50 text-violet-700 border border-violet-200">
                            Placement Opportunity
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-1 font-medium">
                          Tata Consultancy Services • IT &amp; Services
                        </p>
                      </div>

                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                        <Check className="w-3.5 h-3.5" />
                        <span>Eligible based on your profile</span>
                      </div>
                    </div>

                    {/* Criteria and Skills */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-4 rounded-xl bg-white border border-neutral-200/70">
                        <span className="text-[11px] text-neutral-400 font-medium block">Eligibility Criteria</span>
                        <p className="text-xs font-bold text-neutral-900 mt-0.5">
                          Minimum CGPA: 6.0
                        </p>
                        <p className="text-[11px] text-neutral-500 mt-1">
                          Open to Final Year &amp; Pre-Final Year engineering students
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-white border border-neutral-200/70">
                        <span className="text-[11px] text-neutral-400 font-medium block">Target Skills</span>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {["Java", "Python", "C++", "SQL", "Problem Solving"].map((s) => (
                            <span
                              key={s}
                              className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 text-[11px] font-medium"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: AI Recommendations (The Highlight) */}
              {activeTab === "recommendations" && (
                <div className="animate-fade-in-up space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
                    <div>
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 mb-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Personalized for you</span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-950">
                        ✨ AI Recommendation Engine
                      </h3>
                      <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
                        High-confidence admission cutoffs, branches, and career matching powered by Supabase Edge Functions.
                      </p>
                    </div>

                    <Link
                      href="/recommendations"
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 self-start sm:self-auto transition shadow-sm"
                    >
                      <span>View AI Recommendations</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Visual Mockup Card with Subtle AI Glow */}
                  <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-indigo-50/50 via-white to-violet-50/40 border border-indigo-200/80 shadow-sm relative overflow-hidden space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-bold shadow-xs">
                          <Sparkles className="w-3.5 h-3.5 text-white" />
                          <span>92% Match</span>
                        </div>
                        <h4 className="text-lg font-bold text-neutral-950 mt-2">
                          Computer Science Program
                        </h4>
                        <p className="text-xs text-neutral-500">
                          Tier-1 Technical University • Verified Curriculum Match
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-white border border-indigo-100 text-xs text-neutral-700 shadow-xs">
                        <span className="text-[10px] text-neutral-400 uppercase font-bold block">Engine Status</span>
                        <span className="font-semibold text-indigo-700">admission-recommendations</span>
                      </div>
                    </div>

                    {/* Why this matches */}
                    <div className="p-4 rounded-xl bg-white/90 border border-indigo-100/80 space-y-2">
                      <span className="text-xs font-bold text-neutral-900 block">
                        Why this matches:
                      </span>
                      <ul className="space-y-1.5 text-xs text-neutral-700">
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span><strong>Academic score:</strong> Entrance score comfortably exceeds historic cutoff</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span><strong>Preferred branch:</strong> Direct alignment with your chosen Computer Science stream</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span><strong>Skills:</strong> Python, React, and SQL match prerequisite requirements</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span><strong>Location preference:</strong> Located in your indicated target geographic region</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 3. THREE-STEP WORKFLOW                                    */}
        {/* ========================================================= */}
        <section className="py-20 md:py-28 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-2 block">
                How It Works
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-950">
                Three steps to academic clarity
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="p-8 rounded-3xl border border-neutral-200/80 bg-neutral-50/40 hover:bg-neutral-50 transition-colors">
                <span className="text-4xl font-light text-neutral-300 block mb-4">01</span>
                <h3 className="text-lg font-bold text-neutral-950 mb-2">Build Your Profile</h3>
                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                  Enter your entrance percentile, preferred academic branches, target regions, and technical skill tags.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-8 rounded-3xl border border-neutral-200/80 bg-neutral-50/40 hover:bg-neutral-50 transition-colors">
                <span className="text-4xl font-light text-neutral-300 block mb-4">02</span>
                <h3 className="text-lg font-bold text-neutral-950 mb-2">Explore Curated Listings</h3>
                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                  Filter colleges by cutoffs and fees, find remote internships with stipends, and verify campus placement eligibility.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-8 rounded-3xl border border-neutral-200/80 bg-neutral-50/40 hover:bg-neutral-50 transition-colors">
                <span className="text-4xl font-light text-neutral-300 block mb-4">03</span>
                <h3 className="text-lg font-bold text-neutral-950 mb-2">Receive AI Guidance</h3>
                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                  Generate transparent match scores and actionable recommendations with clear explainability on every result.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 4. CALL TO ACTION BANNER                                  */}
        {/* ========================================================= */}
        <section className="py-20 bg-neutral-950 text-white relative overflow-hidden">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
              Shape Your Future with EduSphere AI
            </h2>
            <p className="mt-4 text-neutral-400 text-sm sm:text-base max-w-xl mx-auto">
              Join students discovering their optimal academic institutions, internships, and placement pathways today.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Link
                href="/signup"
                className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-white text-neutral-950 hover:bg-neutral-100 font-semibold text-sm transition shadow-sm"
              >
                Get Started Free
              </Link>
              <Link
                href="/colleges"
                className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-200 font-medium text-sm border border-neutral-800 transition"
              >
                Explore Opportunities
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ========================================================= */}
      {/* 5. FOOTER                                                 */}
      {/* ========================================================= */}
      <footer className="bg-white border-t border-neutral-200/80 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center">
            <Logo variant="full" size="sm" />
          </div>

          <p className="text-xs text-neutral-400">
            &copy; {new Date().getFullYear()} EduSphere AI. Shape Your Future. AI Guides You Forward.
          </p>

          <div className="flex items-center gap-6 text-xs font-medium text-neutral-600">
            <Link href="/colleges" className="hover:text-neutral-950 transition-colors">
              Colleges
            </Link>
            <Link href="/internships" className="hover:text-neutral-950 transition-colors">
              Internships
            </Link>
            <Link href="/placements" className="hover:text-neutral-950 transition-colors">
              Placements
            </Link>
            <Link href="/recommendations" className="hover:text-neutral-950 transition-colors">
              AI Recommendations
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
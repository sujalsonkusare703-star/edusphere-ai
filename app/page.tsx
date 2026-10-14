"use client";

import React from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/SiteFooter";
import { SoonBadge } from "@/components/SoonBadge";
import { useAuth } from "@/context/AuthContext";
import { isDataLive } from "@/lib/feature-flags";
import {
  Sparkles,
  Building2,
  Briefcase,
  Award,
  ArrowRight,
  Check,
} from "@/components/icons";

interface Feature {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  /** In the Pune dataset: "Soon" only while NEXT_PUBLIC_DATA_LIVE is off. Otherwise always "Soon". */
  inDataset: boolean;
}

const FEATURES: Feature[] = [
  {
    title: "Colleges",
    href: "/colleges",
    icon: Building2,
    description:
      "Browse Pune district colleges and their programmes, fees and admissions. Every record shows where it came from, and anything we could not confirm is shown as “Not available” instead of a guess.",
    inDataset: true,
  },
  {
    title: "AI Recommendations",
    href: "/recommendations",
    icon: Sparkles,
    description:
      "See programmes that match your field and level, and ask an AI assistant that answers only from the database. No admission guarantees.",
    inDataset: true,
  },
  {
    title: "Internships",
    href: "/internships",
    icon: Briefcase,
    description:
      "Find internships that match the skills on your profile, with clear requirements and timelines.",
    inDataset: false,
  },
  {
    title: "Placements",
    href: "/placements",
    icon: Award,
    description:
      "See placement records for each college, only where a source for the numbers exists.",
    inDataset: false,
  },
];

const STEPS = [
  {
    title: "Build your profile",
    text: "Add your degree level, field, degree, specialisation, college and district, plus your skills and career goal.",
  },
  {
    title: "Explore sourced data",
    text: "Look through colleges and programmes, with the source and retrieved date shown for each record.",
  },
  {
    title: "Get AI guidance",
    text: "Receive suggestions that explain which parts of your profile they are based on.",
  },
];

export default function LandingPage() {
  const { user } = useAuth();
  const dataLive = isDataLive();

  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900 selection:bg-neutral-900 selection:text-white font-sans">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden pt-16 pb-14 sm:pt-20 md:pt-28 md:pb-24">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[480px] bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(99,102,241,0.06),transparent)] pointer-events-none" />

          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-neutral-200/90 bg-neutral-50/80 text-neutral-800 text-xs font-medium mb-8 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              <span>AI guidance for Maharashtra students</span>
            </div>

            <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-neutral-950 leading-[1.08]">
              Shape Your Future.
              <br />
              <span className="bg-gradient-to-r from-neutral-950 via-neutral-800 to-indigo-600 bg-clip-text text-transparent">
                AI Guides You Forward.
              </span>
            </h1>

            <p className="mt-7 text-base sm:text-xl text-neutral-600 max-w-2xl mx-auto leading-relaxed">
              EduSphere AI helps students in Maharashtra find colleges and courses that fit their
              profile, with every piece of information labelled by its source.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4">
              {user ? (
                <Link
                  href="/profile"
                  className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 group"
                >
                  <span>Go to my profile</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              ) : (
                <Link
                  href="/signup"
                  className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 group"
                >
                  <span>Create a free account</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              )}

              <Link
                href="#features"
                className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-white hover:bg-neutral-50 text-neutral-800 font-medium text-sm border border-neutral-200/90 shadow-xs hover:border-neutral-300 transition-all duration-200 flex items-center justify-center"
              >
                What EduSphere AI does
              </Link>
            </div>

            {!dataLive && (
              <div className="mt-12 mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-amber-50/70 px-5 py-4 text-left">
                <p className="text-sm font-semibold text-amber-900">
                  Colleges, AI recommendations, internships and placements are coming soon.
                </p>
                <p className="mt-1 text-xs sm:text-sm text-amber-800 leading-relaxed">
                  We are building a verified database of Maharashtra colleges. Until it has been
                  checked, these sections are switched off. You can already create an account and
                  complete your profile.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-16 md:py-24 bg-neutral-50/60 border-y border-neutral-200/70 scroll-mt-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mb-2 block">
                What EduSphere AI does
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-950">
                One place to plan your next step
              </h2>
              <p className="text-sm sm:text-base text-neutral-600 mt-3">
                Built for students choosing a college or course in Maharashtra.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {FEATURES.map(({ title, href, icon: Icon, description, inDataset }) => (
                <Link
                  key={href}
                  href={href}
                  className="group p-6 sm:p-7 rounded-3xl bg-white border border-neutral-200/80 shadow-xs hover:border-neutral-300 hover:shadow-sm transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-neutral-950">{title}</h3>
                    {!(inDataset && dataLive) && <SoonBadge />}
                  </div>
                  <p className="mt-3 text-sm text-neutral-600 leading-relaxed">{description}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-2 block">
                How it works
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-950">
                Three steps
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {STEPS.map((step, i) => (
                <div
                  key={step.title}
                  className="p-7 sm:p-8 rounded-3xl border border-neutral-200/80 bg-neutral-50/40"
                >
                  <span className="text-4xl font-light text-neutral-300 block mb-4">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-lg font-bold text-neutral-950 mb-2">{step.title}</h3>
                  <p className="text-sm text-neutral-600 leading-relaxed">{step.text}</p>
                </div>
              ))}
            </div>

            <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs sm:text-sm font-medium text-neutral-600">
              {["Sources shown for every record", "Missing data is marked, not guessed", "Free for students"].map(
                (item) => (
                  <li key={item} className="inline-flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-neutral-900" />
                    {item}
                  </li>
                )
              )}
            </ul>
          </div>
        </section>

        {/* Call to action */}
        <section className="py-16 md:py-20 bg-neutral-950 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Start with your profile
            </h2>
            <p className="mt-4 text-neutral-400 text-sm sm:text-base max-w-xl mx-auto">
              Set up your academic profile now so your guidance is ready as soon as each section opens.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Link
                href={user ? "/profile" : "/signup"}
                className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-white text-neutral-950 hover:bg-neutral-100 font-semibold text-sm transition shadow-sm"
              >
                {user ? "Edit my profile" : "Create a free account"}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

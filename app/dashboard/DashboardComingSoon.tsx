"use client";

import Link from "next/link";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardShell } from "@/components/DashboardShell";
import { useAuth } from "@/context/AuthContext";
import { calculateProfileStrength } from "@/lib/profile-utils";
import { ArrowRight, Award, Briefcase, Building2, Sparkles, User } from "@/components/icons";

const UPCOMING = [
  {
    title: "Colleges",
    text: "A verified, sourced directory of Maharashtra colleges and programmes.",
    icon: Building2,
  },
  {
    title: "AI Recommendations",
    text: "College and course suggestions matched to your profile, with the reasons shown.",
    icon: Sparkles,
  },
  {
    title: "Internships",
    text: "Internship listings matched to your skills.",
    icon: Briefcase,
  },
  {
    title: "Placements",
    text: "Sourced placement records for each college.",
    icon: Award,
  },
];

/**
 * Dashboard shown while NEXT_PUBLIC_DATA_LIVE is off: account and profile only,
 * no college, programme, placement, internship or recommendation data.
 */
export default function DashboardComingSoon() {
  const { profile, studentProfile, skills } = useAuth();
  const strength = calculateProfileStrength(profile, studentProfile, skills);
  const firstName = profile?.full_name?.trim().split(/\s+/)[0];

  return (
    <ProtectedRoute>
      <DashboardShell
        title={firstName ? `Welcome, ${firstName}` : "Welcome"}
        subtitle="Your EduSphere AI account"
      >
        <div className="bg-white border border-[#EAEAEA] rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Profile strength: {strength}%
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Keep your profile up to date so your recommendations are ready when they launch.
                </p>
              </div>
            </div>
            <Link
              href="/profile"
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full bg-slate-900 hover:bg-black text-white text-sm font-medium self-start sm:self-auto transition"
            >
              {strength < 100 ? "Complete profile" : "Edit profile"}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="mt-5 w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full transition-all duration-500"
              style={{ width: `${strength}%` }}
            />
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Coming soon</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {UPCOMING.map(({ title, text, icon: Icon }) => (
              <div
                key={title}
                className="bg-white border border-[#EAEAEA] rounded-2xl p-5 shadow-xs flex items-start gap-3"
              >
                <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-200">
                      Coming soon
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DashboardShell>
    </ProtectedRoute>
  );
}

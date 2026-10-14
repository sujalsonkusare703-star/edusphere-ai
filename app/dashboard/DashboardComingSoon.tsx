"use client";

import Link from "next/link";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardShell } from "@/components/DashboardShell";
import { useAuth } from "@/context/AuthContext";
import { calculateProfileStrength } from "@/lib/profile-utils";
import { ArrowRight, Award, BookOpen, Bookmark, Briefcase, Building2, Compass, Sparkles, User } from "@/components/icons";

const DATA_SECTIONS = [
  { title: "Colleges", text: "Pune district colleges with sources.", icon: Building2, href: "/colleges" },
  { title: "Programmes", text: "Programmes, fees, admissions and cutoffs where available.", icon: BookOpen, href: "/programmes" },
  { title: "Compare", text: "Compare up to 3 colleges side by side.", icon: Compass, href: "/compare" },
  { title: "AI Recommendations", text: "Programmes that match your profile field, plus the AI assistant.", icon: Sparkles, href: "/recommendations" },
];

const NOT_IN_DATABASE = [
  { title: "Internships", text: "Internship listings matched to your skills.", icon: Briefcase },
  { title: "Placements", text: "Sourced placement records for each college.", icon: Award },
];

/**
 * Account dashboard. With NEXT_PUBLIC_DATA_LIVE off (`live` false) it shows the
 * profile only and lists the data sections as coming soon; with it on it links to
 * the Pune data pages. It never loads college data itself.
 */
export default function DashboardComingSoon({ live = false }: { live?: boolean }) {
  const { profile, studentProfile, skills, savedCollegeIds, savedProgrammeIds } = useAuth();
  const savedCount = savedCollegeIds.size + savedProgrammeIds.size;
  const upcoming = live ? NOT_IN_DATABASE : [...DATA_SECTIONS, ...NOT_IN_DATABASE];
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
                  {live ? "Keep your profile up to date so recommendations match your field." : "Keep your profile up to date so your recommendations are ready when they launch."}
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

        {live && (
          <div>
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Explore</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...DATA_SECTIONS, { title: "Saved items", text: `${savedCount} saved`, icon: Bookmark, href: "/saved" }].map(
                ({ title, text, icon: Icon, href }) => (
                  <Link
                    key={title}
                    href={href}
                    className="bg-white border border-[#EAEAEA] rounded-2xl p-5 shadow-xs flex items-start gap-3 hover:shadow-md transition"
                  >
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{text}</p>
                    </div>
                  </Link>
                )
              )}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Coming soon</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {upcoming.map(({ title, text, icon: Icon }) => (
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

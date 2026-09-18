"use client";

import React from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardShell } from "@/components/DashboardShell";
import { ProfileForm } from "@/components/ProfileForm";
import { useAuth } from "@/context/AuthContext";
import { calculateProfileStrength } from "@/lib/profile-utils";
import { User, Sparkles } from "@/components/icons";

export default function ProfilePage() {
  const { profile, studentProfile, skills } = useAuth();

  const percentage = calculateProfileStrength(profile, studentProfile, skills);

  return (
    <ProtectedRoute>
      <DashboardShell
        title="Student Profile"
        subtitle="Manage your personal information, entrance scores, and skill competencies"
      >
        {/* Profile Strength Card */}
        <div className="bg-white border border-[#EAEAEA] rounded-2xl p-6 sm:p-8 text-slate-900 relative overflow-hidden shadow-sm">
          <div className="absolute right-0 top-0 -mt-10 -mr-10 w-80 h-80 bg-gradient-to-bl from-indigo-500/10 via-violet-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-700 text-xs font-semibold border border-indigo-200/60">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Profile Strength: {percentage}%</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {profile?.full_name ? `Hi, ${profile.full_name}` : "Complete Your Profile"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-xl leading-relaxed">
                A completed profile enables the EduSphere AI engine to generate high-accuracy recommendations for college admissions, internships, and placement drives.
              </p>
            </div>

            <div className="w-14 h-14 rounded-2xl bg-[#FAFAFA] border border-[#EAEAEA] flex items-center justify-center text-slate-700 flex-shrink-0 shadow-xs">
              <User className="w-7 h-7" />
            </div>
          </div>

          <div className="mt-6 w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Profile Form */}
        <ProfileForm />
      </DashboardShell>
    </ProtectedRoute>
  );
}


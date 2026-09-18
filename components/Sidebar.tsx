"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { calculateProfileStrength } from "@/lib/profile-utils";
import {
  LayoutDashboard,
  User,
  Building2,
  Briefcase,
  Award,
  Sparkles,
  Bookmark,
  LogOut,
} from "@/components/icons";
import { Logo } from "@/components/Logo";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  isAi?: boolean;
}

export function Sidebar({ onCloseMobile }: { onCloseMobile?: () => void }) {
  const pathname = usePathname();
  const { user, profile, studentProfile, skills, savedItemIds, signOut } = useAuth();

  const navItems: NavItem[] = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Profile", href: "/profile", icon: User },
    { name: "Colleges", href: "/colleges", icon: Building2 },
    { name: "Internships", href: "/internships", icon: Briefcase },
    { name: "Placements", href: "/placements", icon: Award },
    { name: "AI Recommendations", href: "/recommendations", icon: Sparkles, badge: "AI", isAi: true },
    {
      name: "Saved Items",
      href: "/saved",
      icon: Bookmark,
      badge: savedItemIds.size > 0 ? savedItemIds.size.toString() : undefined,
    },
  ];

  const completionPercentage = calculateProfileStrength(profile, studentProfile, skills);

  return (
    <aside className="w-64 bg-white border-r border-[#EAEAEA] flex flex-col h-full text-slate-700 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#EAEAEA]">
        <Link href="/dashboard" className="block group transition-opacity hover:opacity-90">
          <Logo variant="full" size="md" />
          <p className="text-[11px] text-slate-500 mt-2 font-medium tracking-tight">AI Career & Academic Guide</p>
        </Link>
      </div>

      {/* Profile Completion Gauge */}
      <div className="px-5 py-4 border-b border-[#EAEAEA] bg-[#FAFAFA]">
        {user ? (
          <>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-600 font-medium">Profile Strength</span>
              <span className="font-bold text-indigo-600">{completionPercentage}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            {completionPercentage < 100 && (
              <Link
                href="/profile"
                className="text-[11px] text-indigo-600 hover:text-indigo-700 font-medium mt-1.5 inline-flex items-center gap-1 hover:underline"
              >
                <span>Complete profile</span>
                <span>&rarr;</span>
              </Link>
            )}
          </>
        ) : (
          <div className="text-xs space-y-1">
            <span className="font-semibold text-slate-900 block">EduSphere AI Guidance</span>
            <Link
              href="/login"
              className="text-[11px] text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center gap-1 hover:underline"
            >
              <span>Sign in to unlock full features</span>
              <span>&rarr;</span>
            </Link>
          </div>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-slate-900 text-white shadow-sm font-semibold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? "text-white" : item.isAi ? "text-indigo-600" : "text-slate-400"
                  }`}
                />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isActive
                      ? "bg-white/20 text-white"
                      : item.isAi
                      ? "bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-700 border border-indigo-200/60"
                      : "bg-slate-100 text-slate-600 border border-slate-200/60"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Footer & Logout */}
      <div className="p-4 border-t border-[#EAEAEA]">
        {user ? (
          <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[#FAFAFA] border border-[#EAEAEA]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs">
                {profile?.full_name?.charAt(0)?.toUpperCase() || "S"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {profile?.full_name || "Student"}
                </p>
                <p className="text-[10px] text-slate-500 capitalize truncate">
                  {studentProfile?.preferred_branch || "Undergraduate"}
                </p>
              </div>
            </div>
            <button
              onClick={signOut}
              title="Log out"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold shadow-xs transition"
          >
            <span>Sign In to Your Account</span>
          </Link>
        )}
      </div>
    </aside>
  );
}

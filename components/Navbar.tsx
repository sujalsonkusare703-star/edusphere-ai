"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { LayoutDashboard, User, LogOut, Menu, X, Sparkles } from "@/components/icons";
import { Logo } from "@/components/Logo";

export function Navbar() {
  const { user, profile, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-neutral-200/70 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand Logo */}
        <Link href="/" className="flex items-center group transition-opacity hover:opacity-90">
          <Logo variant="full" size="md" priority />
        </Link>

        {/* Center: Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-7">
          <Link
            href="/#features"
            className="text-[13px] font-medium text-neutral-600 hover:text-neutral-950 transition-colors"
          >
            Features
          </Link>
          <Link
            href="/colleges"
            className="text-[13px] font-medium text-neutral-600 hover:text-neutral-950 transition-colors"
          >
            Colleges
          </Link>
          <Link
            href="/internships"
            className="text-[13px] font-medium text-neutral-600 hover:text-neutral-950 transition-colors"
          >
            Internships
          </Link>
          <Link
            href="/placements"
            className="text-[13px] font-medium text-neutral-600 hover:text-neutral-950 transition-colors"
          >
            Placements
          </Link>
          <Link
            href="/recommendations"
            className="text-[13px] font-medium text-neutral-900 flex items-center gap-1.5 hover:text-indigo-600 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>AI Recommendations</span>
          </Link>
        </nav>

        {/* Right: Desktop Auth CTA */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2.5">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-neutral-500" />
                Dashboard
              </Link>
              <Link
                href="/profile"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
              >
                <User className="w-3.5 h-3.5 text-neutral-400" />
                <span>{profile?.full_name?.split(" ")[0] || "Profile"}</span>
              </Link>
              <button
                onClick={signOut}
                title="Log out"
                className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-xs font-medium text-neutral-600 hover:text-neutral-950 px-3 py-2 transition-colors"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center px-4 py-2 rounded-full text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 shadow-xs hover:shadow transition-all duration-200"
              >
                Get Started Free
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-neutral-200 bg-white px-4 pt-3 pb-6 space-y-2">
          <Link
            href="/#features"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Features
          </Link>
          <Link
            href="/colleges"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Colleges
          </Link>
          <Link
            href="/internships"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Internships
          </Link>
          <Link
            href="/placements"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Placements
          </Link>
          <Link
            href="/recommendations"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-neutral-900 hover:bg-neutral-50"
          >
            <Sparkles className="w-4 h-4 text-indigo-500" />
            AI Recommendations
          </Link>

          <div className="pt-3 border-t border-neutral-100">
            {user ? (
              <div className="space-y-2">
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-neutral-900 bg-neutral-100"
                >
                  <LayoutDashboard className="w-4 h-4 text-neutral-600" />
                  Dashboard
                </Link>
                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-neutral-700"
                >
                  <User className="w-4 h-4 text-neutral-500" />
                  Profile ({profile?.full_name || "Student"})
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="w-4 h-4" />
                  Log Out
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 pt-1">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center px-4 py-2.5 rounded-full text-neutral-700 bg-neutral-100 font-medium text-sm"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center px-4 py-2.5 rounded-full text-white bg-neutral-900 font-medium text-sm shadow-xs"
                >
                  Get Started Free
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

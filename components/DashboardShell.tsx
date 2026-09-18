"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Menu, X } from "@/components/icons";
import { Logo } from "@/components/Logo";
import Link from "next/link";

interface DashboardShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function DashboardShell({
  children,
  title,
  subtitle,
  action,
}: DashboardShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#FAFAFA] text-slate-900 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Modal */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white border-r border-[#EAEAEA] z-10 shadow-2xl">
            <div className="absolute top-2 right-2 p-2">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <Sidebar onCloseMobile={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Top Header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-[#EAEAEA]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 text-slate-700 rounded-lg hover:bg-slate-100"
            >
              <Menu className="w-6 h-6" />
            </button>
            <Link href="/dashboard" className="flex items-center transition-opacity hover:opacity-90">
              <Logo variant="full" size="sm" />
            </Link>
          </div>
        </div>

        {/* Desktop / Standard Header Bar */}
        {(title || action) && (
          <header className="bg-white/80 backdrop-blur-md border-b border-[#EAEAEA] px-6 py-4 sm:py-5 flex items-center justify-between flex-shrink-0 z-10">
            <div>
              {title && (
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
            {action && <div>{action}</div>}
          </header>
        )}

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#FAFAFA]">
          <div className="max-w-7xl mx-auto space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}


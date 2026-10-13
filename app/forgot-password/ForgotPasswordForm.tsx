"use client";

import React, { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AuthCard } from "@/components/AuthCard";
import { AlertCircle, CheckCircle } from "@/components/icons";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const submittingRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    setErrorMsg("");

    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    try {
      const { error } = await createClient().auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("rate limit") || msg.includes("too many")) {
          setErrorMsg("Too many requests. Please wait a few minutes and try again.");
          return;
        }
        // Any other error: fall through to the same message, so the page never reveals
        // whether an account exists for this email.
        console.warn("resetPasswordForEmail note:", error.message);
      }
      setSent(true);
    } catch {
      setErrorMsg("A network error occurred. Please check your connection and try again.");
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Forgot your password?" subtitle="We will email you a link to choose a new one.">
      {sent ? (
        <div role="status" className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-3">
          <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          <span>
            If an account exists for <strong className="break-all">{email.trim()}</strong>, a reset link is on its way.
            Check your inbox and spam folder.
          </span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {errorMsg && (
            <div role="alert" className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-neutral-700 mb-1.5">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@example.com"
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50/50 text-neutral-900 text-base sm:text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white font-medium text-sm shadow-sm transition flex items-center justify-center gap-2"
          >
            {loading && <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
    </AuthCard>
  );
}

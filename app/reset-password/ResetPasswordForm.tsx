"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthCard } from "@/components/AuthCard";
import { AlertCircle, CheckCircle, Eye, EyeOff } from "@/components/icons";

type LinkState = "checking" | "ready" | "invalid";

export default function ResetPasswordForm() {
  const router = useRouter();
  const [linkState, setLinkState] = useState<LinkState>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const submittingRef = useRef(false);

  // The Supabase client reads the recovery code from the URL and creates a
  // short-lived session. Wait for it; if none appears, the link is invalid or expired.
  useEffect(() => {
    const supabase = createClient();
    let settled = false;
    const markReady = () => {
      settled = true;
      setLinkState("ready");
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        markReady();
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) markReady();
    });

    const timer = setTimeout(() => {
      if (!settled) setLinkState("invalid");
    }, 6000);

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    setErrorMsg("");

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirm) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    try {
      const { error } = await createClient().auth.updateUser({ password });
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("different from the old")) {
          setErrorMsg("Please choose a password different from your old one.");
        } else if (msg.includes("weak") || msg.includes("password")) {
          setErrorMsg("That password is too weak. Please choose a stronger one.");
        } else {
          setErrorMsg("Could not update your password. Please request a new reset link.");
        }
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/profile"), 1500);
    } catch {
      setErrorMsg("A network error occurred. Please check your connection and try again.");
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const inputClass =
    "w-full px-4 py-2.5 pr-11 rounded-xl border border-neutral-200 bg-neutral-50/50 text-neutral-900 text-base sm:text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition";

  return (
    <AuthCard title="Choose a new password" subtitle="Enter a new password for your EduSphere AI account.">
      {linkState === "checking" && (
        <p role="status" className="text-sm text-neutral-500 flex items-center gap-2">
          <span className="w-4 h-4 rounded-full border-2 border-neutral-200 border-t-neutral-600 animate-spin" />
          Checking your reset link…
        </p>
      )}

      {linkState === "invalid" && (
        <div role="alert" className="space-y-4">
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
            <span>This reset link is invalid or has expired. Please request a new one.</span>
          </div>
          <Link
            href="/forgot-password"
            className="block w-full text-center py-3 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-sm"
          >
            Request a new link
          </Link>
        </div>
      )}

      {linkState === "ready" && done && (
        <div role="status" className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <span>Your password has been updated. Redirecting…</span>
        </div>
      )}

      {linkState === "ready" && !done && (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {errorMsg && (
            <div role="alert" className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}
          <div>
            <label htmlFor="new-password" className="block text-xs font-semibold text-neutral-700 mb-1.5">
              New password
            </label>
            <div className="relative">
              <input
                id="new-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-2.5 p-1 text-neutral-400 hover:text-neutral-700"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="confirm-password" className="block text-xs font-semibold text-neutral-700 mb-1.5">
              Confirm new password
            </label>
            <input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white font-medium text-sm shadow-sm transition flex items-center justify-center gap-2"
          >
            {loading && <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>
      )}
    </AuthCard>
  );
}

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { AlertCircle, ArrowRight, Eye, EyeOff, Sparkles } from "@/components/icons";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const router = useRouter();
  const supabase = createClient();
  const { loginDemo, refreshProfile } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setInfoMsg("");

    if (!email.trim() || !password) {
      setErrorMsg("Please enter both your email and password.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("invalid login credentials") || msg.includes("invalid credentials")) {
          setErrorMsg("Invalid email or password. Please verify your credentials and try again.");
        } else if (msg.includes("email not confirmed")) {
          setErrorMsg("Your email has not been confirmed yet. Please check your inbox for the verification link.");
        } else if (msg.includes("rate limit") || msg.includes("too many requests")) {
          setErrorMsg("Too many sign-in attempts. Please wait a few moments and try again.");
        } else {
          setErrorMsg("Unable to sign in. Please verify your email and password.");
        }
        return;
      }

      if (data.session) {
        if (refreshProfile) {
          try {
            await refreshProfile(data.session.user);
          } catch (e) {
            console.warn("Post-login profile load note:", e);
          }
        }
        const searchParams = new URLSearchParams(window.location.search);
        const redirectUrl = searchParams.get("redirect") || "/dashboard";
        router.push(redirectUrl);
      }
    } catch (err: unknown) {
      console.error("Sign in error:", err);
      setErrorMsg("A network error occurred. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async () => {
    setLoading(true);
    setEmail("student@edusphere.ai");
    setPassword("password123");
    await loginDemo("student@edusphere.ai", "Sujal Sonkusare");
    router.push("/dashboard");
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      setErrorMsg("Please enter your email above to resend the confirmation email.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
      });
      if (error) throw error;
      setInfoMsg("Confirmation email resent. Please check your inbox.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to resend confirmation.";
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-white text-neutral-900 relative selection:bg-indigo-100 selection:text-indigo-900">
      {/* Subtle radial ambient background light */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center opacity-40"
        aria-hidden="true"
      >
        <div className="w-[600px] h-[500px] bg-gradient-to-tr from-indigo-100/50 via-purple-100/30 to-blue-50/40 blur-3xl rounded-full" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center mb-6 group transition-opacity hover:opacity-90">
          <Logo variant="full" size="lg" priority />
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
          Welcome back
        </h1>
        <p className="mt-2 text-sm text-neutral-500 font-normal">
          Enter your credentials to access your student guidance command center
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white border border-neutral-200/90 rounded-3xl p-8 sm:p-9 shadow-xl shadow-neutral-900/5">
          {errorMsg && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-800 text-xs flex items-start gap-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1">
                {(errorMsg.includes("not yet confirmed") || errorMsg.includes("not been confirmed")) && (
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    className="block mt-2 font-bold underline hover:no-underline text-rose-900"
                  >
                    Resend verification email &rarr;
                  </button>
                )}
              </div>
            </div>
          )}

          {infoMsg && (
            <div className="mb-6 p-4 rounded-2xl bg-indigo-50 border border-indigo-200/80 text-indigo-800 text-xs font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <span>{infoMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-neutral-700 mb-1.5"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50/50 text-neutral-900 text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-neutral-700"
                >
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-11 rounded-xl border border-neutral-200 bg-neutral-50/50 text-neutral-900 text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-2.5 p-1 text-neutral-400 hover:text-neutral-700 transition"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-3 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white font-medium text-sm shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="relative my-4 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200" />
              </div>
              <span className="relative bg-white px-3 text-[11px] font-medium text-neutral-400">
                OR
              </span>
            </div>

            <button
              type="button"
              onClick={handleQuickDemo}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-medium text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Explore as Demo Student (1-Click)</span>
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-neutral-100 text-center">
            <p className="text-xs text-neutral-500">
              Don&apos;t have an account yet?{" "}
              <Link
                href="/signup"
                className="font-semibold text-neutral-900 hover:underline inline-flex items-center gap-0.5"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>

        {/* Back to home link */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-xs font-medium text-neutral-400 hover:text-neutral-700 transition"
          >
            &larr; Back to EduSphere Home
          </Link>
        </div>
      </div>
    </div>
  );
}

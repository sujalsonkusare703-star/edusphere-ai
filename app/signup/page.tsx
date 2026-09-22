"use client";

import React, { useState, useMemo, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Check,
} from "@/components/icons";
import { Logo } from "@/components/Logo";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [requiresEmailConfirmation, setRequiresEmailConfirmation] = useState(false);
  const [resendInfo, setResendInfo] = useState("");

  const isSubmittingRef = useRef(false);
  const supabase = createClient();

  // Calculate password strength
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: "", color: "bg-neutral-200" };
    if (password.length < 6) {
      return { score: 1, label: "Too short (min 6 chars)", color: "bg-rose-500" };
    }
    let score = 1;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password) && /[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score = 3;

    if (score === 1) return { score: 1, label: "Weak", color: "bg-rose-500" };
    if (score === 2) return { score: 2, label: "Medium", color: "bg-amber-500" };
    return { score: 3, label: "Strong", color: "bg-emerald-500" };
  }, [password]);

  const passwordsMatch = confirmPassword && password === confirmPassword;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current || loading) return;

    setErrorMsg("");
    setResendInfo("");

    if (!fullName.trim()) {
      setErrorMsg("Please enter your full name.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match. Please re-check.");
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("already registered") || msg.includes("already exists") || msg.includes("unique")) {
          setErrorMsg("An account with this email already exists. Please sign in instead.");
        } else if (msg.includes("password") || msg.includes("weak")) {
          setErrorMsg("Password is too weak. Please use at least 6 characters.");
        } else if (msg.includes("invalid email") || msg.includes("valid format")) {
          setErrorMsg("Please enter a valid email address.");
        } else if (msg.includes("rate limit") || msg.includes("too many requests")) {
          setErrorMsg("Too many signup attempts. Please wait a few moments before trying again.");
        } else {
          setErrorMsg("Unable to complete registration. Please check your details and try again.");
        }
        return;
      }

      // Check if email confirmation is required or session was created immediately
      if (data.session) {
        setRequiresEmailConfirmation(false);
        setSignupSuccess(true);
      } else if (data.user) {
        // In Supabase with email confirmations enabled, duplicate users return empty identities
        if (data.user.identities && data.user.identities.length === 0) {
          setErrorMsg("An account with this email already exists. Please sign in instead.");
          return;
        }
        setRequiresEmailConfirmation(true);
        setSignupSuccess(true);
      }
    } catch (err: unknown) {
      console.error("Signup error:", err);
      setErrorMsg("A network error occurred. Please check your connection and try again.");
    } finally {
      isSubmittingRef.current = false;
      setLoading(false);
    }
  };

  const handleResendSignupEmail = async () => {
    if (isSubmittingRef.current || loading) return;
    isSubmittingRef.current = true;
    setLoading(true);
    setResendInfo("");
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
      });
      if (error) throw error;
      setResendInfo("Verification email resent! Please check your inbox and spam folder.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to resend confirmation.";
      setErrorMsg(message);
    } finally {
      isSubmittingRef.current = false;
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
          Create your account
        </h1>
        <p className="mt-2 text-sm text-neutral-500 font-normal">
          Start receiving personalized AI college, internship, and placement guidance
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white border border-neutral-200/90 rounded-3xl p-8 sm:p-9 shadow-xl shadow-neutral-900/5">
          {signupSuccess ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-bold text-neutral-900">
                {requiresEmailConfirmation
                  ? "Verify Your Email Address"
                  : "Account Created Successfully!"}
              </h2>
              <p className="text-xs text-neutral-600 leading-relaxed max-w-sm mx-auto">
                {requiresEmailConfirmation ? (
                  <>
                    We have sent a verification link to <strong className="text-neutral-900">{email}</strong>. Please check your inbox and click the confirmation link to activate your EduSphere account.
                  </>
                ) : (
                  <>
                    Welcome to EduSphere AI, <strong className="text-neutral-900">{fullName}</strong>. Your account is active and your guidance dashboard is ready.
                  </>
                )}
              </p>

              {resendInfo && (
                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-medium">
                  {resendInfo}
                </div>
              )}

              <div className="pt-3 space-y-2">
                {requiresEmailConfirmation ? (
                  <>
                    <Link
                      href="/login"
                      className="w-full inline-flex items-center justify-center py-3 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-sm shadow-sm transition"
                    >
                      Proceed to Sign In &rarr;
                    </Link>
                    <button
                      type="button"
                      onClick={handleResendSignupEmail}
                      disabled={loading}
                      className="w-full inline-flex items-center justify-center py-2 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium text-xs transition cursor-pointer"
                    >
                      Resend Verification Email
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/dashboard"
                      className="w-full inline-flex items-center justify-center py-3 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-sm shadow-sm transition"
                    >
                      Enter Student Dashboard &rarr;
                    </Link>
                    <Link
                      href="/login"
                      className="w-full inline-flex items-center justify-center py-2 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium text-xs transition"
                    >
                      Go to Login Page
                    </Link>
                  </>
                )}
              </div>
            </div>
          ) : (
            <>
              {errorMsg && (
                <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-800 text-xs flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
                  <span className="font-medium">{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label
                    htmlFor="fullName"
                    className="block text-xs font-semibold text-neutral-700 mb-1.5"
                  >
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Sujal Sonkusare"
                    className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50/50 text-neutral-900 text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition"
                  />
                </div>

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
                    {password && (
                      <span className="text-[11px] font-medium text-neutral-500">
                        {passwordStrength.label}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
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

                  {/* Password Strength Indicator Bar */}
                  {password && (
                    <div className="mt-2 grid grid-cols-3 gap-1">
                      <div
                        className={`h-1 rounded-full transition-colors ${
                          passwordStrength.score >= 1 ? passwordStrength.color : "bg-neutral-100"
                        }`}
                      />
                      <div
                        className={`h-1 rounded-full transition-colors ${
                          passwordStrength.score >= 2 ? passwordStrength.color : "bg-neutral-100"
                        }`}
                      />
                      <div
                        className={`h-1 rounded-full transition-colors ${
                          passwordStrength.score >= 3 ? passwordStrength.color : "bg-neutral-100"
                        }`}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="confirmPassword"
                      className="block text-xs font-semibold text-neutral-700"
                    >
                      Confirm Password
                    </label>
                    {passwordsMatch && (
                      <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Passwords match
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full px-4 py-2.5 pr-11 rounded-xl border border-neutral-200 bg-neutral-50/50 text-neutral-900 text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      className="absolute right-3 top-2.5 p-1 text-neutral-400 hover:text-neutral-700 transition"
                    >
                      {showConfirmPassword ? (
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
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Create EduSphere Account</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-neutral-100 text-center">
                <p className="text-xs text-neutral-500">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="font-semibold text-neutral-900 hover:underline inline-flex items-center gap-0.5"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </>
          )}
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


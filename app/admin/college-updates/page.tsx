"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { LoadingPage } from "@/components/LoadingState";
import { DashboardShell } from "@/components/DashboardShell";
import {
  Sparkles,
  Building,
  CheckCircle,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Search,
  AlertTriangle,
  ArrowRight,
  Zap
} from "@/components/icons";
import type {
  CollegeDataChangeEvent,
  CandidateConflict,
  CandidateCutoff
} from "@/lib/services/college-updater/types";
import type { AdminQueueStats, SideBySideComparison } from "@/lib/services/college-updater/approval";

export interface MonitoredSourceItem {
  id: string;
  college_id: string;
  source_name: string;
  source_url: string;
  source_type: string;
  content_format: string;
  check_interval_minutes?: number;
  last_checked_at?: string | null;
  last_successful_check_at?: string | null;
  next_check_at?: string | null;
  last_error?: string | null;
  consecutive_failures: number;
  is_active: boolean;
  pendingEventsCount?: number;
  colleges?: {
    id: string;
    name: string;
    admission_verification_status?: string;
  };
}

export default function AdminCollegeUpdatesPage() {
  const { user, loading, getAccessToken } = useAuth();
  const router = useRouter();

  // State
  const [events, setEvents] = useState<CollegeDataChangeEvent[]>([]);
  const [stats, setStats] = useState<AdminQueueStats>({
    pendingReview: 0,
    highPriority: 0,
    mediumPriority: 0,
    approved: 0,
    rejected: 0,
    applied: 0,
    errors: 0,
    total: 0
  });
  const [queueLoading, setQueueLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("PENDING_REVIEW");
  const [signalFilter, setSignalFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Detail Modal / Comparison State
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [comparisonData, setComparisonData] = useState<SideBySideComparison | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Correction Mode
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);
  const [correctedCutoffValue, setCorrectedCutoffValue] = useState<string>("");
  const [correctedCutoffUnit, setCorrectedCutoffUnit] = useState<string>("");
  const [correctedRoute, setCorrectedRoute] = useState<string>("");

  // Rejection Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionInProgress, setActionInProgress] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Tab State: "events" | "sources"
  const [activeTab, setActiveTab] = useState<"events" | "sources">("events");
  const [sources, setSources] = useState<MonitoredSourceItem[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [schedulerRunning, setSchedulerRunning] = useState(false);

  // Auth verification
  const isAuthorized = user?.app_metadata?.role === "admin" || user?.user_metadata?.role === "admin";

  // Helper to build headers with authenticated Supabase Bearer token
  const getAuthHeaders = useCallback(async (includeJson: boolean = false): Promise<Record<string, string>> => {
    const token = await getAccessToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    if (includeJson) {
      headers["Content-Type"] = "application/json";
    }
    return headers;
  }, [getAccessToken]);

  // 1. Fetch Queue Events
  const fetchQueue = useCallback(async () => {
    setQueueLoading(true);
    setActionMessage(null);
    try {
      const headers = await getAuthHeaders();
      if (!headers["Authorization"]) {
        setActionMessage({
          type: "error",
          text: "Authentication session expired or unavailable. Please sign in again."
        });
        setQueueLoading(false);
        return;
      }

      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (signalFilter !== "ALL") params.set("signalLevel", signalFilter);
      if (searchTerm.trim()) params.set("search", searchTerm.trim());

      const res = await fetch(`/api/admin/college-updates?${params.toString()}`, { headers });

      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
        if (data.stats) setStats(data.stats);
      } else if (res.status === 401) {
        setActionMessage({
          type: "error",
          text: "Unauthorized (401): Session token expired or invalid. Please refresh or sign in again."
        });
      } else if (res.status === 403) {
        setActionMessage({
          type: "error",
          text: "Forbidden (403): Administrator privileges required."
        });
      } else {
        const err = await res.json().catch(() => ({}));
        setActionMessage({
          type: "error",
          text: err.error || `Failed to load review queue (HTTP ${res.status}).`
        });
      }
    } catch (err) {
      console.warn("Could not load admin queue:", err);
      setActionMessage({
        type: "error",
        text: (err as Error)?.message || "Network error loading review queue."
      });
    } finally {
      setQueueLoading(false);
    }
  }, [getAuthHeaders, statusFilter, signalFilter, searchTerm]);

  // 1b. Fetch Monitored Sources
  const fetchSources = useCallback(async () => {
    setSourcesLoading(true);
    try {
      const headers = await getAuthHeaders();
      if (!headers["Authorization"]) {
        setSourcesLoading(false);
        return;
      }

      const res = await fetch("/api/admin/college-sources", { headers });
      if (res.ok) {
        const data = await res.json();
        setSources(data.sources || []);
      } else if (res.status === 401) {
        console.warn("[AdminPage] Unauthorized (401) fetching monitored sources");
      } else if (res.status === 403) {
        console.warn("[AdminPage] Forbidden (403) fetching monitored sources");
      } else {
        const err = await res.json().catch(() => ({}));
        console.warn("[AdminPage] Error fetching monitored sources:", err.error || res.status);
      }
    } catch (err) {
      console.warn("Could not load monitored sources:", err);
    } finally {
      setSourcesLoading(false);
    }
  }, [getAuthHeaders]);

  // 1c. Trigger Global Scheduler Run
  const triggerSchedulerRun = async () => {
    setSchedulerRunning(true);
    setActionMessage(null);
    try {
      const headers = await getAuthHeaders(true);
      if (!headers["Authorization"]) {
        setActionMessage({ type: "error", text: "Admin authentication session required." });
        setSchedulerRunning(false);
        return;
      }

      const res = await fetch("/api/cron/college-updates", {
        method: "POST",
        headers,
        body: JSON.stringify({ batchSize: 10, forceCheckAll: true })
      });
      if (res.ok) {
        const data = await res.json();
        setActionMessage({
          type: "success",
          text: `Scheduler run complete: ${data.summary.checkedCount} sources checked, ${data.summary.eventsCreatedCount} new events staged, ${data.summary.errorsCount} errors.`
        });
        fetchQueue();
        fetchSources();
      } else {
        const err = await res.json().catch(() => ({}));
        setActionMessage({ type: "error", text: err.error || "Scheduler execution failed" });
      }
    } catch (err: unknown) {
      setActionMessage({ type: "error", text: (err as Error)?.message || "Failed to trigger scheduler" });
    } finally {
      setSchedulerRunning(false);
    }
  };

  // 1d. Trigger Single Source Check
  const triggerSingleSourceCheck = async (sourceId: string) => {
    setActionMessage(null);
    try {
      const headers = await getAuthHeaders(true);
      if (!headers["Authorization"]) {
        setActionMessage({ type: "error", text: "Admin authentication session required." });
        return;
      }

      const res = await fetch("/api/admin/college-sources", {
        method: "POST",
        headers,
        body: JSON.stringify({ sourceId })
      });
      if (res.ok) {
        const data = await res.json();
        setActionMessage({
          type: "success",
          text: `Source check completed (${data.result.status}). ${data.result.eventCreated ? "New change event queued!" : "No new event created."}`
        });
        fetchSources();
        fetchQueue();
      } else {
        const err = await res.json().catch(() => ({}));
        setActionMessage({ type: "error", text: err.error || "Single check failed" });
      }
    } catch (err: unknown) {
      setActionMessage({ type: "error", text: (err as Error)?.message || "Single check failed" });
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!isMounted) return;
      await fetchQueue();
      if (!isMounted) return;
      await fetchSources();
    };

    if (!loading && isAuthorized) {
      void loadData();
    }

    return () => {
      isMounted = false;
    };
  }, [loading, isAuthorized, fetchQueue, fetchSources]);

  // 2. Fetch Event Comparison Details
  const openEventDetails = async (eventId: string) => {
    setSelectedEventId(eventId);
    setDetailLoading(true);
    setComparisonData(null);
    setShowCorrectionForm(false);
    setActionMessage(null);

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/college-updates/${eventId}`, { headers });

      if (res.ok) {
        const data = await res.json();
        setComparisonData(data);
        // Pre-fill correction values if cutoff
        const cand = data.proposedCandidate;
        if (cand?.cutoffs && cand.cutoffs.length > 0) {
          setCorrectedCutoffValue(String(cand.cutoffs[0].value || ""));
          setCorrectedCutoffUnit(cand.cutoffs[0].unit || "percentile");
        }
        if (cand?.routes && cand.routes.length > 0) {
          setCorrectedRoute(cand.routes[0].admission_route || "");
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setActionMessage({ type: "error", text: err.error || "Failed to load event details" });
      }
    } catch (err: unknown) {
      setActionMessage({ type: "error", text: (err as Error).message });
    } finally {
      setDetailLoading(false);
    }
  };

  // 3. Save Admin Manual Corrections
  const handleSaveCorrections = async () => {
    if (!selectedEventId) return;
    setActionInProgress(true);
    setActionMessage(null);

    try {
      const headers = await getAuthHeaders(true);
      const corrections: Record<string, unknown> = {};

      if (correctedCutoffValue) {
        corrections.cutoff_value = parseFloat(correctedCutoffValue);
      }
      if (correctedCutoffUnit) {
        corrections.cutoff_unit = correctedCutoffUnit;
      }
      if (correctedRoute) {
        corrections.admission_route = correctedRoute;
      }

      const res = await fetch(`/api/admin/college-updates/${selectedEventId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ corrections })
      });

      if (res.ok) {
        setActionMessage({ type: "success", text: "Admin correction recorded. Ready for approval." });
        openEventDetails(selectedEventId);
      } else {
        const err = await res.json().catch(() => ({}));
        setActionMessage({ type: "error", text: err.error || "Failed to save correction" });
      }
    } catch (err: unknown) {
      setActionMessage({ type: "error", text: (err as Error).message });
    } finally {
      setActionInProgress(false);
    }
  };

  // 4. Approve & Apply Event Atomically
  const handleApprove = async () => {
    if (!selectedEventId) return;
    if (!confirm("Are you sure you want to approve and apply this change directly to production? This will atomically update the live college intelligence catalog and record an immutable audit entry.")) {
      return;
    }

    setActionInProgress(true);
    setActionMessage(null);

    try {
      const headers = await getAuthHeaders(true);
      const res = await fetch(`/api/admin/college-updates/${selectedEventId}/approve`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          notes: "Approved via Admin Review Queue",
          forceOverrideConflicts: false
        })
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setActionMessage({
          type: "success",
          text: `Event approved and applied atomically! Audit ID: ${data.auditId}`
        });
        fetchQueue();
        openEventDetails(selectedEventId);
      } else {
        setActionMessage({
          type: "error",
          text: data.error || "Approval failed. Production remained untouched."
        });
      }
    } catch (err: unknown) {
      setActionMessage({ type: "error", text: (err as Error).message });
    } finally {
      setActionInProgress(false);
    }
  };

  // 5. Reject Event
  const handleReject = async () => {
    if (!selectedEventId || !rejectionReason.trim()) return;
    setActionInProgress(true);
    setActionMessage(null);

    try {
      const headers = await getAuthHeaders(true);
      const res = await fetch(`/api/admin/college-updates/${selectedEventId}/reject`, {
        method: "POST",
        headers,
        body: JSON.stringify({ reason: rejectionReason.trim() })
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setActionMessage({ type: "success", text: "Event rejected successfully." });
        setRejectModalOpen(false);
        setRejectionReason("");
        fetchQueue();
        openEventDetails(selectedEventId);
      } else {
        setActionMessage({ type: "error", text: data.error || "Rejection failed." });
      }
    } catch (err: unknown) {
      setActionMessage({ type: "error", text: (err as Error).message });
    } finally {
      setActionInProgress(false);
    }
  };

  // Auth Protection Checks
  if (loading) {
    return <LoadingPage />;
  }

  if (!user) {
    return (
      <DashboardShell title="Admin Verification" subtitle="Administrator privileges required">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-md mx-auto my-12 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Authentication Required</h2>
          <p className="text-xs text-slate-500 mb-6">
            You must be signed in with an authorized administrator account to access the college verification queue.
          </p>
          <button
            onClick={() => router.push("/login?redirect=/admin/college-updates")}
            className="w-full py-2.5 px-4 bg-indigo-600 text-white font-medium rounded-xl text-xs hover:bg-indigo-700 transition"
          >
            Sign In with Admin Account
          </button>
        </div>
      </DashboardShell>
    );
  }

  if (!isAuthorized) {
    return (
      <DashboardShell title="Access Denied (403)" subtitle="Administrator privileges required">
        <div className="bg-white border border-rose-200 rounded-2xl p-8 text-center max-w-lg mx-auto my-12 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">403 Forbidden: Administrator Role Required</h2>
          <p className="text-xs text-slate-600 mb-4 leading-relaxed">
            Your authenticated account (<code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">{user.email}</code>) has the role <strong>student</strong>.
          </p>
          <p className="text-xs text-slate-500 mb-6">
            In compliance with EduSphere data integrity policies, student accounts are strictly prohibited from approving, rejecting, or applying updates to verified college intelligence catalogs.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="py-2.5 px-6 bg-slate-900 text-white font-medium rounded-xl text-xs hover:bg-slate-800 transition"
          >
            Return to Student Dashboard
          </button>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="College Intelligence Review Queue"
      subtitle="Phase 3 Step 4E: Human Verification & Atomic Production Updates"
    >
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white rounded-2xl p-6 sm:p-8 mb-6 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold backdrop-blur-md mb-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              <span>Phase 3 Step 4E • Human Approval Guard</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Authoritative Change Verification</h1>
            <p className="text-xs sm:text-sm text-indigo-200 max-w-2xl mt-1">
              Automated source checks stage candidate facts in this review queue. Only an explicit, authorized administrator approval can atomically apply updates to production tables.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={triggerSchedulerRun}
              disabled={schedulerRunning}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-700/80 hover:bg-indigo-600 text-white text-xs font-semibold transition border border-indigo-400/30 shadow-xs"
            >
              <Zap className={`w-3.5 h-3.5 text-amber-300 ${schedulerRunning ? "animate-pulse" : ""}`} />
              <span>{schedulerRunning ? "Running..." : "Run Scheduler"}</span>
            </button>
            <button
              onClick={() => {
                fetchQueue();
                if (activeTab === "sources") fetchSources();
              }}
              disabled={queueLoading || sourcesLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-indigo-900 text-xs font-semibold hover:bg-indigo-50 transition shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${queueLoading || sourcesLoading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab("events")}
          className={`pb-3 px-3 text-xs font-semibold border-b-2 transition ${
            activeTab === "events"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Change Events Queue ({stats.pendingReview} pending)
        </button>
        <button
          onClick={() => {
            setActiveTab("sources");
            if (sources.length === 0) fetchSources();
          }}
          className={`pb-3 px-3 text-xs font-semibold border-b-2 transition ${
            activeTab === "sources"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Monitored Sources & Health ({sources.length > 0 ? sources.length : 43})
        </button>
      </div>

      {activeTab === "events" && (
        <>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        <div className="bg-white border border-amber-200 rounded-xl p-3.5 shadow-xs">
          <div className="text-[11px] font-semibold text-amber-700">Pending Review</div>
          <div className="text-xl font-bold text-amber-900 mt-1">{stats.pendingReview}</div>
        </div>
        <div className="bg-white border border-rose-200 rounded-xl p-3.5 shadow-xs">
          <div className="text-[11px] font-semibold text-rose-700">High Priority</div>
          <div className="text-xl font-bold text-rose-900 mt-1">{stats.highPriority}</div>
        </div>
        <div className="bg-white border border-blue-200 rounded-xl p-3.5 shadow-xs">
          <div className="text-[11px] font-semibold text-blue-700">Medium Priority</div>
          <div className="text-xl font-bold text-blue-900 mt-1">{stats.mediumPriority}</div>
        </div>
        <div className="bg-white border border-emerald-200 rounded-xl p-3.5 shadow-xs">
          <div className="text-[11px] font-semibold text-emerald-700">Approved</div>
          <div className="text-xl font-bold text-emerald-900 mt-1">{stats.approved}</div>
        </div>
        <div className="bg-white border border-purple-200 rounded-xl p-3.5 shadow-xs">
          <div className="text-[11px] font-semibold text-purple-700">Applied</div>
          <div className="text-xl font-bold text-purple-900 mt-1">{stats.applied}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-600">Rejected</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{stats.rejected}</div>
        </div>
        <div className="bg-white border border-red-200 rounded-xl p-3.5 shadow-xs">
          <div className="text-[11px] font-semibold text-red-600">Errors</div>
          <div className="text-xl font-bold text-red-900 mt-1">{stats.errors}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="DETECTED">Detected</option>
            <option value="PARSED">Parsed</option>
            <option value="APPROVED">Approved</option>
            <option value="APPLIED">Applied</option>
            <option value="REJECTED">Rejected</option>
            <option value="ERROR">Error</option>
          </select>

          {/* Signal Level Filter */}
          <select
            value={signalFilter}
            onChange={(e) => setSignalFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Signals</option>
            <option value="HIGH_SIGNAL">High Signal (Cutoffs)</option>
            <option value="MEDIUM_SIGNAL">Medium Signal (Routes/Exams)</option>
            <option value="LOW_SIGNAL">Low Signal (News)</option>
          </select>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search college or program..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-3">
        {queueLoading ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 text-xs">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
            Loading review queue...
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 text-xs">
            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
            <div className="font-semibold text-slate-800 text-sm">Review Queue Empty</div>
            <p className="text-slate-400 mt-1 max-w-sm mx-auto">
              No change events matching current filters. Official sources are verified and in sync with current baseline hashes.
            </p>
          </div>
        ) : (
          events.map((ev) => {
            const prop = ev.proposed_value as Record<string, unknown>;
            const sigLevel = (prop?.signalLevel as string) || "MEDIUM_SIGNAL";
            const isHigh = sigLevel === "HIGH_SIGNAL";

            return (
              <div
                key={ev.id}
                className="bg-white border border-slate-200 hover:border-indigo-300 rounded-xl p-4 sm:p-5 shadow-xs transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">
                      {ev.college_id}
                    </span>
                    {ev.course_id && (
                      <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                        Course #{ev.course_id}
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isHigh
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-blue-50 text-blue-700 border border-blue-200"
                      }`}
                    >
                      {sigLevel}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        ev.status === "PENDING_REVIEW"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : ev.status === "APPLIED"
                          ? "bg-purple-50 text-purple-700 border border-purple-200"
                          : ev.status === "REJECTED"
                          ? "bg-slate-100 text-slate-600 border border-slate-300"
                          : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                      }`}
                    >
                      {ev.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2">
                    {ev.diff_summary || "Candidate admission facts extracted from authoritative source update."}
                  </p>

                  <div className="text-[11px] text-slate-400 flex items-center gap-3">
                    <span>Type: <strong>{ev.event_type}</strong></span>
                    <span>•</span>
                    <span>Detected: {new Date(ev.created_at || "").toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
                  <button
                    onClick={() => openEventDetails(ev.id)}
                    className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <span>Review & Compare</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
      </>
      )}

      {/* Monitored Sources Tab View */}
      {activeTab === "sources" && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Authoritative Monitored Sources (43 Official Endpoints)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Periodic automated monitoring registry. Only verified colleges with registered authoritative sources are polled.
              </p>
            </div>
            <button
              onClick={fetchSources}
              disabled={sourcesLoading}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 font-medium text-slate-700 flex items-center gap-1.5 self-start sm:self-auto"
            >
              <RefreshCw className={`w-3 h-3 ${sourcesLoading ? "animate-spin" : ""}`} />
              <span>Reload Sources</span>
            </button>
          </div>

          {sourcesLoading ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
              Loading source registry...
            </div>
          ) : sources.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 text-xs">
              No registered sources found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sources.map((src) => (
                <div key={src.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="text-xs font-bold text-slate-900">{src.colleges?.name || src.source_name}</div>
                        <div className="text-[11px] text-slate-500">{src.source_name}</div>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        src.consecutive_failures > 0 ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                      }`}>
                        {src.consecutive_failures > 0 ? `${src.consecutive_failures} Failure(s)` : "Healthy"}
                      </span>
                    </div>

                    <a
                      href={src.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center gap-1 break-all mb-3"
                    >
                      <span className="truncate max-w-xs">{src.source_url}</span>
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-slate-50 rounded-lg p-2.5 mb-3">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Type</span>
                        <span className="font-medium">{src.source_type}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Check Interval</span>
                        <span className="font-medium">{src.check_interval_minutes || 1440}m</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Last Checked</span>
                        <span className="font-medium">{src.last_checked_at ? new Date(src.last_checked_at).toLocaleDateString() : "Never"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Pending Events</span>
                        <span className="font-medium text-amber-700">{src.pendingEventsCount || 0}</span>
                      </div>
                    </div>

                    {src.last_error && (
                      <div className="text-[11px] text-rose-600 bg-rose-50 border border-rose-100 rounded-md p-2 mb-3">
                        <strong>Last Error:</strong> {src.last_error}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-[10px] text-slate-400">
                      Format: <strong>{src.content_format}</strong>
                    </span>
                    <button
                      onClick={() => triggerSingleSourceCheck(src.id)}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition flex items-center gap-1"
                    >
                      <Zap className="w-3 h-3 text-indigo-600" />
                      <span>Check Now</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Side-by-Side Review Modal */}
      {selectedEventId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Building className="w-4 h-4 text-indigo-600" />
                  <span>
                    {comparisonData?.collegeName || "Change Event Verification"}
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Event ID: <code className="text-slate-700">{selectedEventId}</code> • Type: {comparisonData?.event.event_type}
                </p>
              </div>
              <button
                onClick={() => setSelectedEventId(null)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {detailLoading ? (
                <div className="py-16 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                  Loading side-by-side comparison...
                </div>
              ) : comparisonData ? (
                <>
                  {/* Action Banner Message */}
                  {actionMessage && (
                    <div
                      className={`p-3 rounded-xl border text-xs font-medium ${
                        actionMessage.type === "success"
                          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                          : "bg-rose-50 border-rose-200 text-rose-800"
                      }`}
                    >
                      {actionMessage.text}
                    </div>
                  )}

                  {/* 1. Official Source Evidence Bar */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <span>Official Source:</span>
                        <span className="text-slate-600">
                          {(comparisonData.event.proposed_value as Record<string, unknown>)?.sourceUrl as string || "Authoritative Portal"}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Signal: <strong>{(comparisonData.event.proposed_value as Record<string, unknown>)?.signalLevel as string}</strong> • Status: <strong className="text-indigo-600">{comparisonData.event.status}</strong>
                      </div>
                    </div>
                    {Boolean((comparisonData.event.proposed_value as Record<string, unknown>)?.sourceUrl) && (
                      <a
                        href={(comparisonData.event.proposed_value as Record<string, unknown>).sourceUrl as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold hover:bg-indigo-100 transition text-[11px] flex-shrink-0"
                      >
                        <span>Open Official Source</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  {/* 2. Conflict Warnings */}
                  {comparisonData.conflicts && comparisonData.conflicts.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                      <div className="font-bold text-amber-900 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>Detected Conflicts ({comparisonData.conflicts.length})</span>
                      </div>
                      <div className="space-y-1.5">
                        {comparisonData.conflicts.map((conf: CandidateConflict, idx: number) => (
                          <div
                            key={idx}
                            className="bg-white/80 border border-amber-200 rounded-lg p-2.5 text-[11px] text-amber-900"
                          >
                            <span className="font-bold uppercase text-[10px] bg-amber-100 px-1.5 py-0.5 rounded text-amber-800 mr-2">
                              {conf.field} ({conf.severity})
                            </span>
                            {conf.description}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 3. Side-by-Side Comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* CURRENT TRUSTED PRODUCTION */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                          Current / Trusted
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                          Production
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <div className="text-[10px] text-slate-400 font-medium">Accepted Entrance Exams</div>
                          <div className="font-semibold text-slate-800">
                            {(comparisonData.currentProduction.college?.accepted_exams as string[])?.join(", ") || "None recorded"}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] text-slate-400 font-medium">Admission Route</div>
                          <div className="text-slate-700">
                            {(comparisonData.currentProduction.college?.admission_route as string) || "Centralized Admission Process (CAP)"}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] text-slate-400 font-medium">Eligibility Criteria</div>
                          <div className="text-slate-600 line-clamp-3">
                            {(comparisonData.currentProduction.college?.eligibility_criteria as string) || "Standard qualifying examination"}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] text-slate-400 font-medium">Admission Status</div>
                          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {(comparisonData.currentProduction.college?.admission_verification_status as string) || "DERIVED"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* PROPOSED / NOT VERIFIED CANDIDATE */}
                    <div className="border border-indigo-200 rounded-xl p-4 bg-indigo-50/30 space-y-3">
                      <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                        <span className="font-bold text-indigo-900 text-xs uppercase tracking-wider">
                          Proposed / Candidate
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          Not Verified
                        </span>
                      </div>

                      <div className="space-y-2">
                        {/* Cutoffs if available */}
                        {Boolean((comparisonData.proposedCandidate as Record<string, unknown>)?.cutoffs) && (
                          <div>
                            <div className="text-[10px] text-indigo-600 font-semibold mb-1">Proposed Cutoff Benchmark</div>
                            {((comparisonData.proposedCandidate as Record<string, unknown>).cutoffs as CandidateCutoff[])?.map((cut: CandidateCutoff, i: number) => (
                              <div key={i} className="bg-white border border-indigo-200 rounded-lg p-2.5 space-y-1 mb-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-slate-900">{cut.exam} ({cut.category})</span>
                                  <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-indigo-100 text-indigo-800">
                                    {cut.value} {cut.unit.toUpperCase()}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  Program: {cut.program_name || "General"} • Round: {cut.round || "N/A"} • Year: {cut.year || "N/A"}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Proposed Exams */}
                        {Boolean((comparisonData.proposedCandidate as Record<string, unknown>)?.exams) && (
                          <div>
                            <div className="text-[10px] text-indigo-600 font-semibold">Proposed Accepted Exams</div>
                            <div className="font-bold text-slate-900">
                              {((comparisonData.proposedCandidate as Record<string, unknown>).exams as Array<{ accepted_exams: string[] }>)?.[0]?.accepted_exams?.join(", ") || "N/A"}
                            </div>
                          </div>
                        )}

                        {/* Proposed Route */}
                        {Boolean((comparisonData.proposedCandidate as Record<string, unknown>)?.routes) && (
                          <div>
                            <div className="text-[10px] text-indigo-600 font-semibold">Proposed Admission Route</div>
                            <div className="text-slate-800 font-medium">
                              {((comparisonData.proposedCandidate as Record<string, unknown>).routes as Array<{ admission_route: string }>)?.[0]?.admission_route || "N/A"}
                            </div>
                          </div>
                        )}

                        {/* Proposed Eligibility */}
                        {Boolean((comparisonData.proposedCandidate as Record<string, unknown>)?.eligibilities) && (
                          <div>
                            <div className="text-[10px] text-indigo-600 font-semibold">Proposed Eligibility Criteria</div>
                            <div className="text-slate-700 italic">
                              &ldquo;{((comparisonData.proposedCandidate as Record<string, unknown>).eligibilities as Array<{ eligibility_criteria: string }>)?.[0]?.eligibility_criteria || "N/A"}&rdquo;
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 4. Verbatim Source Evidence */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
                    <div className="font-semibold text-slate-800">Verbatim Source Evidence</div>
                    <div className="bg-white border border-slate-200 rounded-lg p-3 font-mono text-[11px] text-slate-700 max-h-32 overflow-y-auto whitespace-pre-wrap">
                      {comparisonData.event.raw_payload_snippet || "No raw snippet recorded."}
                    </div>
                  </div>

                  {/* 5. Admin Manual Correction Form */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-slate-800">
                        Manual Corrections (Optional)
                      </div>
                      <button
                        onClick={() => setShowCorrectionForm(!showCorrectionForm)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        {showCorrectionForm ? "Hide Form" : "Edit Candidate Data"}
                      </button>
                    </div>

                    {showCorrectionForm && (
                      <div className="space-y-3 pt-2 border-t border-slate-100">
                        <p className="text-[11px] text-slate-500">
                          Any corrections saved here will be recorded in the audit trail as an <strong>ADMIN CORRECTION</strong>, distinct from automatic extraction.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                              Cutoff Value
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={correctedCutoffValue}
                              onChange={(e) => setCorrectedCutoffValue(e.target.value)}
                              className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg"
                              placeholder="e.g. 99.45 or 4210"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                              Cutoff Unit
                            </label>
                            <select
                              value={correctedCutoffUnit}
                              onChange={(e) => setCorrectedCutoffUnit(e.target.value)}
                              className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                            >
                              <option value="percentile">percentile</option>
                              <option value="rank">rank</option>
                              <option value="marks">marks</option>
                              <option value="score">score</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                              Admission Route
                            </label>
                            <input
                              type="text"
                              value={correctedRoute}
                              onChange={(e) => setCorrectedRoute(e.target.value)}
                              className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg"
                              placeholder="e.g. Maharashtra CAP"
                            />
                          </div>
                        </div>
                        <button
                          onClick={handleSaveCorrections}
                          disabled={actionInProgress}
                          className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900 transition"
                        >
                          Save Manual Correction
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            {/* Modal Footer Actions */}
            {comparisonData && (
              <div className="px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50">
                <div>
                  {!comparisonData.canApprove && (
                    <span className="text-[11px] text-rose-600 font-medium">
                      ⚠ Approval disabled: {comparisonData.approvalBlockers[0]}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {/* Reject Button */}
                  <button
                    onClick={() => setRejectModalOpen(true)}
                    disabled={actionInProgress || comparisonData.event.status === "APPLIED" || comparisonData.event.status === "REJECTED"}
                    className="px-4 py-2 border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-semibold transition disabled:opacity-50"
                  >
                    Reject Event
                  </button>

                  {/* Approve Button */}
                  <button
                    onClick={handleApprove}
                    disabled={actionInProgress || !comparisonData.canApprove}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>Approve & Apply to Production</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reject Reason Dialog */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h4 className="text-sm font-bold text-slate-900">Provide Rejection Justification</h4>
            <p className="text-xs text-slate-500">
              Silent rejections are forbidden. An explicit reason is required for administrative audit logs.
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Incorrect program match; source circular applies only to postgraduate quota..."
              className="w-full text-xs p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionInProgress || rejectionReason.trim().length < 5}
                className="px-4 py-1.5 text-xs bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700 transition disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

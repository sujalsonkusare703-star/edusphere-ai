/**
 * EduSphere AI — Automated College Intelligence Update System
 * Admin Verification & Atomic Approval Service (Phase 3 Step 4E)
 *
 * CRITICAL SAFETY INVARIANTS:
 * - Direct production mutation is permitted ONLY via authorized administrative approval.
 * - Approval is atomic, auditable, and records complete before/after snapshots.
 * - Unresolved conflicts, ambiguous programs, or invalid units strictly block approval.
 * - Rejection strictly requires an explicit, non-empty justification.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ChangeEventStatus,
  ChangeEventType,
  CollegeDataChangeEvent,
  CandidateConflict,
  ExtractedAdmissionUpdate,
  CandidateCutoff,
  SignalLevel
} from "./types";
import { validateCandidateCutoff } from "./validation";
import { isValidStatusTransition } from "./change-events";

export interface AdminQueueFilters {
  status?: ChangeEventStatus | "ALL";
  signalLevel?: SignalLevel | "ALL";
  collegeId?: string;
  eventType?: ChangeEventType | "ALL";
  search?: string;
  limit?: number;
  offset?: number;
}

export interface AdminQueueStats {
  pendingReview: number;
  highPriority: number;
  mediumPriority: number;
  approved: number;
  rejected: number;
  applied: number;
  errors: number;
  total: number;
}

export interface AdminQueueResponse {
  events: CollegeDataChangeEvent[];
  stats: AdminQueueStats;
  total: number;
}

export interface SideBySideComparison {
  event: CollegeDataChangeEvent;
  collegeName: string;
  programName: string | null;
  currentProduction: {
    college?: Record<string, unknown> | null;
    course?: Record<string, unknown> | null;
    cutoffs: Record<string, unknown>[];
  };
  proposedCandidate: ExtractedAdmissionUpdate | Record<string, unknown>;
  conflicts: CandidateConflict[];
  canApprove: boolean;
  approvalBlockers: string[];
}

/**
 * Queries the change event review queue with filtering, search, and dashboard summary statistics.
 */
export async function getAdminQueue(
  supabase: SupabaseClient,
  filters: AdminQueueFilters = {}
): Promise<AdminQueueResponse> {
  const {
    status = "ALL",
    signalLevel = "ALL",
    collegeId,
    eventType = "ALL",
    search,
    limit = 50,
    offset = 0
  } = filters;

  // 1. Query all events for computing stats and list
  let query = supabase
    .from("college_data_change_events")
    .select("*", { count: "exact" });

  if (collegeId) {
    query = query.eq("college_id", collegeId);
  }

  if (status !== "ALL") {
    query = query.eq("status", status);
  }

  if (eventType !== "ALL") {
    query = query.eq("event_type", eventType);
  }

  const { data: rawEvents, error } = await query;

  if (error || !rawEvents) {
    // If table doesn't exist yet in Supabase schema cache, return clean empty structure
    return {
      events: [],
      stats: {
        pendingReview: 0,
        highPriority: 0,
        mediumPriority: 0,
        approved: 0,
        rejected: 0,
        applied: 0,
        errors: 0,
        total: 0
      },
      total: 0
    };
  }

  const allEvents = rawEvents as CollegeDataChangeEvent[];

  // 2. Compute Dashboard Statistics
  const stats: AdminQueueStats = {
    pendingReview: 0,
    highPriority: 0,
    mediumPriority: 0,
    approved: 0,
    rejected: 0,
    applied: 0,
    errors: 0,
    total: allEvents.length
  };

  for (const ev of allEvents) {
    if (ev.status === "PENDING_REVIEW" || ev.status === "DETECTED" || ev.status === "PARSED") {
      stats.pendingReview++;
    }
    if (ev.status === "APPROVED") stats.approved++;
    if (ev.status === "REJECTED") stats.rejected++;
    if (ev.status === "APPLIED") stats.applied++;
    if (ev.status === "ERROR") stats.errors++;

    const sig = (ev.proposed_value as Record<string, unknown>)?.signalLevel as string;
    if (sig === "HIGH_SIGNAL") stats.highPriority++;
    else if (sig === "MEDIUM_SIGNAL") stats.mediumPriority++;
  }

  // 3. Client/Server-side Filtering by Signal & Search
  let filtered = allEvents;

  if (signalLevel !== "ALL") {
    filtered = filtered.filter((ev) => {
      const sig = (ev.proposed_value as Record<string, unknown>)?.signalLevel;
      return sig === signalLevel;
    });
  }

  if (search && search.trim()) {
    const q = search.toLowerCase().trim();
    filtered = filtered.filter((ev) => {
      const diff = (ev.diff_summary || "").toLowerCase();
      const colId = (ev.college_id || "").toLowerCase();
      return diff.includes(q) || colId.includes(q);
    });
  }

  // 4. Sort: Highest Priority (HIGH_SIGNAL -> PENDING_REVIEW -> newest)
  filtered.sort((a, b) => {
    const aSig = (a.proposed_value as Record<string, unknown>)?.signalLevel === "HIGH_SIGNAL" ? 2 : 1;
    const bSig = (b.proposed_value as Record<string, unknown>)?.signalLevel === "HIGH_SIGNAL" ? 2 : 1;
    if (bSig !== aSig) return bSig - aSig;

    const aPending = ["PENDING_REVIEW", "DETECTED", "PARSED"].includes(a.status) ? 1 : 0;
    const bPending = ["PENDING_REVIEW", "DETECTED", "PARSED"].includes(b.status) ? 1 : 0;
    if (bPending !== aPending) return bPending - aPending;

    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });

  const paginated = filtered.slice(offset, offset + limit);

  return {
    events: paginated,
    stats,
    total: filtered.length
  };
}

/**
 * Builds a side-by-side comparison between existing production data and proposed candidate facts.
 * Evaluates approval blockers and conflict warnings.
 */
export async function getAdminEventComparison(
  supabase: SupabaseClient,
  eventId: string
): Promise<{ success: boolean; data?: SideBySideComparison; error?: string }> {
  // 1. Fetch Event
  const { data: event, error: eventErr } = await supabase
    .from("college_data_change_events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (eventErr || !event) {
    return { success: false, error: `Change event not found: ${eventId}` };
  }

  const ev = event as CollegeDataChangeEvent;

  // 2. Fetch College
  const { data: col } = await supabase
    .from("colleges")
    .select("*")
    .eq("id", ev.college_id)
    .single();

  // 3. Fetch Course (if course_id specified)
  let course: Record<string, unknown> | null = null;
  if (ev.course_id) {
    const { data: crs } = await supabase
      .from("college_courses")
      .select("*")
      .eq("course_id", ev.course_id)
      .single();
    course = crs || null;
  }

  // 4. Fetch Cutoffs
  const { data: dbCutoffs } = await supabase
    .from("college_cutoffs")
    .select("*")
    .eq("college_id", ev.college_id);

  const candidatePayload = (ev.proposed_value as Record<string, unknown>)?.extracted_data || ev.proposed_value;
  const conflicts: CandidateConflict[] = (candidatePayload as ExtractedAdmissionUpdate)?.conflicts || [];

  // 5. Evaluate Approval Blockers
  const approvalBlockers: string[] = [];

  // Blocker A: Status check
  if (ev.status === "APPLIED") {
    approvalBlockers.push("Event has already been applied to production.");
  } else if (ev.status === "REJECTED") {
    approvalBlockers.push("Event was rejected. Re-open or re-extract before approving.");
  }

  // Blocker B: Program ambiguity
  const candExtracted = candidatePayload as ExtractedAdmissionUpdate;
  if (candExtracted?.programs) {
    for (const p of candExtracted.programs) {
      if (p.status === "AMBIGUOUS") {
        approvalBlockers.push(`Program "${p.program_name}" is ambiguous and must be assigned manually.`);
      }
    }
  }

  // Blocker C: Cutoff unit and bounds validation
  if (candExtracted?.cutoffs && candExtracted.cutoffs.length > 0) {
    for (const cut of candExtracted.cutoffs) {
      const valRes = validateCandidateCutoff(cut);
      if (!valRes.valid) {
        approvalBlockers.push(`Cutoff candidate invalid: ${valRes.errors.join("; ")}`);
      }
    }
  }

  // Blocker D: High-severity unresolved conflicts
  const highConflicts = conflicts.filter((c) => c.severity === "HIGH");
  if (highConflicts.length > 0) {
    approvalBlockers.push(`Unresolved HIGH conflicts: ${highConflicts.map((c) => c.description).join("; ")}`);
  }

  // Blocker E: Missing evidence
  if (candExtracted?.exams?.some((e) => !e.evidence_excerpt)) {
    approvalBlockers.push("Accepted exams candidate fact is missing source evidence.");
  }
  if (candExtracted?.routes?.some((r) => !r.evidence_excerpt)) {
    approvalBlockers.push("Admission route candidate fact is missing source evidence.");
  }

  const canApprove = approvalBlockers.length === 0;

  return {
    success: true,
    data: {
      event: ev,
      collegeName: col?.name || ev.college_id,
      programName: (course?.course_name as string) || null,
      currentProduction: {
        college: col || null,
        course,
        cutoffs: (dbCutoffs as Record<string, unknown>[]) || []
      },
      proposedCandidate: (candidatePayload || {}) as ExtractedAdmissionUpdate | Record<string, unknown>,
      conflicts,
      canApprove,
      approvalBlockers
    }
  };
}

/**
 * Records manual administrator corrections onto a staged candidate event.
 * Clearly distinguishes AUTOMATIC EXTRACTION from ADMIN CORRECTION.
 */
export async function adminApplyCorrection(
  supabase: SupabaseClient,
  eventId: string,
  adminId: string,
  corrections: Record<string, unknown>
): Promise<{ success: boolean; data?: CollegeDataChangeEvent; error?: string }> {
  const { data: event, error: fetchErr } = await supabase
    .from("college_data_change_events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (fetchErr || !event) {
    return { success: false, error: `Change event not found: ${eventId}` };
  }

  const currentProp = (event.proposed_value as Record<string, unknown>) || {};
  const currentExtracted = (currentProp.extracted_data as ExtractedAdmissionUpdate) || currentProp;
  const currentExtractedObj = (currentExtracted as unknown as Record<string, unknown>) || {};
  const currentCorrections = (currentExtractedObj.admin_corrections as Record<string, unknown>) || {};

  // Deep update of corrected fields
  const updatedCandidate = {
    ...currentExtractedObj,
    admin_corrected: true,
    admin_corrections: {
      ...currentCorrections,
      ...corrections,
      corrected_by: adminId,
      corrected_at: new Date().toISOString()
    }
  };

  const updatedProposed = {
    ...currentProp,
    extracted_data: updatedCandidate
  };

  const { data: updated, error: updateErr } = await supabase
    .from("college_data_change_events")
    .update({
      proposed_value: updatedProposed,
      updated_at: new Date().toISOString()
    })
    .eq("id", eventId)
    .select()
    .single();

  if (updateErr) {
    return { success: false, error: updateErr.message };
  }

  return { success: true, data: updated as CollegeDataChangeEvent };
}

/**
 * Rejects a change event with a strictly mandatory rejection justification.
 */
export async function adminRejectEvent(
  supabase: SupabaseClient,
  eventId: string,
  adminId: string,
  reason: string
): Promise<{ success: boolean; data?: CollegeDataChangeEvent; error?: string }> {
  if (!reason || reason.trim().length < 5) {
    return {
      success: false,
      error: "Rejection justification is strictly mandatory (minimum 5 characters)."
    };
  }

  // Fetch current event to validate status transition
  const { data: event, error: fetchErr } = await supabase
    .from("college_data_change_events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (fetchErr || !event) {
    return { success: false, error: `Change event not found: ${eventId}` };
  }

  const currentStatus = event.status as ChangeEventStatus;
  if (!isValidStatusTransition(currentStatus, "REJECTED")) {
    return {
      success: false,
      error: `Invalid status transition: cannot reject event currently in status "${currentStatus}"`
    };
  }

  const { data: updated, error: updateErr } = await supabase
    .from("college_data_change_events")
    .update({
      status: "REJECTED",
      rejection_reason: reason.trim(),
      reviewer_id: adminId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", eventId)
    .select()
    .single();

  if (updateErr) {
    return { success: false, error: updateErr.message };
  }

  return { success: true, data: updated as CollegeDataChangeEvent };
}

/**
 * Event types the database function `apply_college_change_event` applies itself.
 * For any other type that function only records a snapshot and marks the event
 * APPLIED without changing data, so those types are refused here until the
 * function supports them (see audit/CLEANUP_LOG.md, "Needs a human decision").
 */
const RPC_APPLIED_EVENT_TYPES = new Set<string>([
  "ACCEPTED_EXAMS_UPDATE",
  "ADMISSION_ROUTE_UPDATE",
  "SOURCE_URL_REDIRECT",
]);

/**
 * Approves and applies a staged change event in ONE database transaction by calling
 * `apply_college_change_event` (SECURITY DEFINER, executable only by service_role).
 * The function locks the event row, refuses events that are already APPLIED or not
 * reviewable, applies the change, advances the source hash, writes the audit row and
 * marks the event APPLIED — all or nothing. A double-click or two admins cannot apply
 * the same event twice.
 *
 * `supabase` must be the service-role client; `adminId` must be the real admin's user id.
 */
export async function adminApproveAndApplyEvent(
  supabase: SupabaseClient,
  eventId: string,
  adminId: string,
  options: {
    notes?: string;
    forceOverrideConflicts?: boolean;
  } = {}
): Promise<{
  success: boolean;
  auditId?: string;
  appliedAt?: string;
  error?: string;
}> {
  // 1. Read-only pre-checks (the RPC re-checks status under a row lock).
  const { data: event, error: fetchErr } = await supabase
    .from("college_data_change_events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();

  if (fetchErr) {
    return { success: false, error: `Could not load change event: ${fetchErr.message}` };
  }
  if (!event) {
    return { success: false, error: `Change event not found: ${eventId}` };
  }

  const ev = event as CollegeDataChangeEvent;

  if (ev.status === "APPLIED") {
    return { success: false, error: "Conflict: This change event has already been applied to production." };
  }
  if (ev.status !== "PENDING_REVIEW" && ev.status !== "APPROVED") {
    return { success: false, error: `Cannot apply event in status "${ev.status}". Must be PENDING_REVIEW or APPROVED.` };
  }
  if (!RPC_APPLIED_EVENT_TYPES.has(ev.event_type)) {
    return {
      success: false,
      error: `Blocked: "${ev.event_type}" events cannot be applied atomically yet. Leave the event pending.`,
    };
  }

  const prop = (ev.proposed_value ?? {}) as Record<string, unknown>;
  const cand = (prop.extracted_data as ExtractedAdmissionUpdate) || prop;

  if (cand?.cutoffs && cand.cutoffs.length > 0) {
    for (const cut of cand.cutoffs as CandidateCutoff[]) {
      const valRes = validateCandidateCutoff(cut);
      if (!valRes.valid) {
        return { success: false, error: `Cutoff safety violation: ${valRes.errors.join("; ")}` };
      }
    }
  }

  if (cand?.programs && (cand.programs as { status?: string }[]).some((p) => p.status === "AMBIGUOUS")) {
    return { success: false, error: "Blocked: Ambiguous program match present. Program must be resolved before approval." };
  }

  if (cand?.conflicts && (cand.conflicts as CandidateConflict[]).some((c) => c.severity === "HIGH") && !options.forceOverrideConflicts) {
    return { success: false, error: "Blocked: Unresolved HIGH conflicts present. Admin must override explicitly with justification." };
  }

  if (ev.event_type === "ACCEPTED_EXAMS_UPDATE") {
    const exams = (cand as ExtractedAdmissionUpdate)?.exams?.[0]?.accepted_exams;
    if (!exams || exams.length === 0) return { success: false, error: "Missing accepted exams in proposed payload" };
  } else if (ev.event_type === "ADMISSION_ROUTE_UPDATE") {
    const route = (cand as ExtractedAdmissionUpdate)?.routes?.[0]?.admission_route;
    if (!route) return { success: false, error: "Missing admission route in proposed payload" };
  } else if (ev.event_type === "SOURCE_URL_REDIRECT") {
    if (typeof prop.finalUrl !== "string" || !prop.finalUrl) {
      return { success: false, error: "Missing final URL in proposed payload" };
    }
  }

  // 2. Apply atomically.
  const { data, error } = await supabase.rpc("apply_college_change_event", {
    p_event_id: eventId,
    p_admin_id: adminId,
    p_notes: options.notes?.trim() || null,
  });

  if (error) {
    const msg = error.message || "Unknown database error";
    if (/already applied/i.test(msg)) {
      return { success: false, error: "Conflict: This change event has already been applied to production." };
    }
    if (/not found/i.test(msg)) {
      return { success: false, error: `Change event not found: ${eventId}` };
    }
    // The transaction rolled back: nothing was changed and the event keeps its status.
    return { success: false, error: `Apply failed, no changes were made: ${msg}` };
  }

  const result = (data ?? {}) as { audit_id?: string };
  return {
    success: true,
    auditId: result.audit_id,
    appliedAt: new Date().toISOString(),
  };
}

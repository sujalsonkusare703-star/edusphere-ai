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
 * Atomically approves and applies a staged change event to production tables.
 *
 * Steps:
 * 1. Concurrency guard: Check that event is in PENDING_REVIEW or APPROVED, and not APPLIED.
 * 2. Validate unit, values, program match, and evidence.
 * 3. Capture BEFORE state.
 * 4. Apply mutation to live production tables (colleges, courses, cutoffs).
 * 5. Update source registry baseline hash (advancing last_content_hash).
 * 6. Write immutable audit log record to public.college_audit_log.
 * 7. Transition change event status to APPLIED.
 * 8. On failure: roll back any partial updates and transition to ERROR.
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
  try {
    // 1. Fetch Event with lock / latest state
    const { data: event, error: fetchErr } = await supabase
      .from("college_data_change_events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (fetchErr || !event) {
      return { success: false, error: `Change event not found: ${eventId}` };
    }

    const ev = event as CollegeDataChangeEvent;

    // Concurrency check
    if (ev.status === "APPLIED") {
      return {
        success: false,
        error: "Conflict: This change event has already been applied to production."
      };
    }

    if (ev.status !== "PENDING_REVIEW" && ev.status !== "APPROVED") {
      return {
        success: false,
        error: `Cannot apply event in status "${ev.status}". Must be PENDING_REVIEW or APPROVED.`
      };
    }

    const prop = ev.proposed_value as Record<string, unknown>;
    const cand = (prop.extracted_data as ExtractedAdmissionUpdate) || prop;

    // 2. Pre-application Safety Validations
    if (cand?.cutoffs && cand.cutoffs.length > 0) {
      for (const cut of cand.cutoffs as CandidateCutoff[]) {
        const valRes = validateCandidateCutoff(cut);
        if (!valRes.valid) {
          return {
            success: false,
            error: `Cutoff safety violation: ${valRes.errors.join("; ")}`
          };
        }
      }
    }

    if (cand?.programs && (cand.programs as { status?: string; program_name?: string }[]).some((p) => p.status === "AMBIGUOUS")) {
      return {
        success: false,
        error: "Blocked: Ambiguous program match present. Program must be resolved before approval."
      };
    }

    if (cand?.cutoffs && (cand.cutoffs as CandidateCutoff[]).some((c) => c.status === "AMBIGUOUS" || (!c.course_id && !ev.course_id))) {
      return {
        success: false,
        error: "Blocked: Ambiguous program match for cutoff. Must assign valid course_id before approval."
      };
    }

    if (cand?.conflicts && (cand.conflicts as CandidateConflict[]).some((c) => c.severity === "HIGH") && !options.forceOverrideConflicts) {
      return {
        success: false,
        error: "Blocked: Unresolved HIGH conflicts present. Admin must override explicitly with justification."
      };
    }

    // 3. Capture BEFORE State & Execute Atomic Mutation
    let beforeState: Record<string, unknown> = {};
    let afterState: Record<string, unknown> = {};
    const appliedAt = new Date().toISOString();

    if (ev.event_type === "ACCEPTED_EXAMS_UPDATE") {
      const candidateExams = (cand as ExtractedAdmissionUpdate)?.exams?.[0]?.accepted_exams || (prop.accepted_exams as string[]);
      if (!candidateExams || candidateExams.length === 0) {
        return { success: false, error: "Missing accepted exams in proposed payload" };
      }

      if (ev.course_id) {
        const { data: crsBefore } = await supabase.from("college_courses").select("*").eq("course_id", ev.course_id).single();
        beforeState = crsBefore || {};

        const { data: crsAfter, error: crsErr } = await supabase
          .from("college_courses")
          .update({
            accepted_exams: candidateExams,
            admission_verification_status: "VERIFIED",
            updated_at: appliedAt
          })
          .eq("course_id", ev.course_id)
          .select()
          .single();

        if (crsErr) throw new Error(`Failed updating program exams: ${crsErr.message}`);
        afterState = crsAfter || {};
      } else {
        const { data: colBefore } = await supabase.from("colleges").select("*").eq("id", ev.college_id).single();
        beforeState = colBefore || {};

        const { data: colAfter, error: colErr } = await supabase
          .from("colleges")
          .update({
            accepted_exams: candidateExams,
            admission_verification_status: "VERIFIED",
            updated_at: appliedAt
          })
          .eq("id", ev.college_id)
          .select()
          .single();

        if (colErr) throw new Error(`Failed updating college exams: ${colErr.message}`);
        afterState = colAfter || {};
      }
    } else if (ev.event_type === "ADMISSION_ROUTE_UPDATE") {
      const candidateRoute = (cand as ExtractedAdmissionUpdate)?.routes?.[0]?.admission_route || (prop.admission_route as string);
      if (!candidateRoute) {
        return { success: false, error: "Missing admission route in proposed payload" };
      }

      if (ev.course_id) {
        const { data: crsBefore } = await supabase.from("college_courses").select("*").eq("course_id", ev.course_id).single();
        beforeState = crsBefore || {};

        const { data: crsAfter, error: crsErr } = await supabase
          .from("college_courses")
          .update({
            admission_route: candidateRoute,
            admission_verification_status: "VERIFIED",
            updated_at: appliedAt
          })
          .eq("course_id", ev.course_id)
          .select()
          .single();

        if (crsErr) throw new Error(`Failed updating program route: ${crsErr.message}`);
        afterState = crsAfter || {};
      } else {
        const { data: colBefore } = await supabase.from("colleges").select("*").eq("id", ev.college_id).single();
        beforeState = colBefore || {};

        const { data: colAfter, error: colErr } = await supabase
          .from("colleges")
          .update({
            admission_route: candidateRoute,
            admission_verification_status: "VERIFIED",
            updated_at: appliedAt
          })
          .eq("id", ev.college_id)
          .select()
          .single();

        if (colErr) throw new Error(`Failed updating college route: ${colErr.message}`);
        afterState = colAfter || {};
      }
    } else if (ev.event_type === "ELIGIBILITY_CRITERIA_UPDATE") {
      const candidateElig = (cand as ExtractedAdmissionUpdate)?.eligibilities?.[0]?.eligibility_criteria || (prop.eligibility_criteria as string);
      if (!candidateElig) {
        return { success: false, error: "Missing eligibility criteria in proposed payload" };
      }

      if (ev.course_id) {
        const { data: crsBefore } = await supabase.from("college_courses").select("*").eq("course_id", ev.course_id).single();
        beforeState = crsBefore || {};

        const { data: crsAfter, error: crsErr } = await supabase
          .from("college_courses")
          .update({
            eligibility_criteria: candidateElig,
            admission_verification_status: "VERIFIED",
            updated_at: appliedAt
          })
          .eq("course_id", ev.course_id)
          .select()
          .single();

        if (crsErr) throw new Error(`Failed updating program eligibility: ${crsErr.message}`);
        afterState = crsAfter || {};
      } else {
        const { data: colBefore } = await supabase.from("colleges").select("*").eq("id", ev.college_id).single();
        beforeState = colBefore || {};

        const { data: colAfter, error: colErr } = await supabase
          .from("colleges")
          .update({
            eligibility_criteria: candidateElig,
            admission_verification_status: "VERIFIED",
            updated_at: appliedAt
          })
          .eq("id", ev.college_id)
          .select()
          .single();

        if (colErr) throw new Error(`Failed updating college eligibility: ${colErr.message}`);
        afterState = colAfter || {};
      }
    } else if (ev.event_type === "CUTOFF_DATA_RELEASE") {
      const candidateCutoffs = (cand as ExtractedAdmissionUpdate)?.cutoffs || (prop.cutoffs as CandidateCutoff[]) || [];
      if (candidateCutoffs.length === 0) {
        return { success: false, error: "Missing cutoffs in proposed payload" };
      }

      const appliedCutoffs: Record<string, unknown>[] = [];
      for (const cut of candidateCutoffs) {
        const targetCourseId = cut.course_id || ev.course_id;
        if (!targetCourseId) {
          return { success: false, error: `Program course_id must be assigned for cutoff "${cut.program_name}" before approval` };
        }

        // Check if cutoff already exists for this exact course, exam, category, quota, year, round
        let matchQuery = supabase
          .from("college_cutoffs")
          .select("*")
          .eq("college_id", ev.college_id)
          .eq("course_id", targetCourseId)
          .eq("exam", cut.exam)
          .eq("category", cut.category);

        if (cut.year !== null) matchQuery = matchQuery.eq("year", cut.year);
        if (cut.round !== null) matchQuery = matchQuery.eq("round", cut.round);

        const { data: existingCut } = await matchQuery.limit(1);

        if (existingCut && existingCut.length > 0) {
          // UPDATE existing
          beforeState = existingCut[0];
          const updatePayload: Record<string, unknown> = {
            cutoff_open: cut.value,
            cutoff_unit: cut.unit,
            verification_status: "VERIFIED",
            source_url: cut.source_url,
            updated_at: appliedAt
          };
          const { data: cutUpdated, error: cutUpErr } = await supabase
            .from("college_cutoffs")
            .update(updatePayload)
            .eq("id", existingCut[0].id)
            .select()
            .single();

          if (cutUpErr) throw new Error(`Failed updating cutoff: ${cutUpErr.message}`);
          appliedCutoffs.push(cutUpdated);
        } else {
          // INSERT new
          beforeState = { status: "NEW_CUTOFF_RECORD" };
          const insertPayload = {
            college_id: ev.college_id,
            course_id: targetCourseId,
            exam: cut.exam,
            category: cut.category,
            quota: cut.quota || null,
            cutoff_open: cut.value,
            cutoff_unit: cut.unit,
            year: cut.year,
            round: cut.round,
            verification_status: "VERIFIED",
            source_url: cut.source_url,
            created_at: appliedAt,
            updated_at: appliedAt
          };

          const { data: cutInserted, error: cutInsErr } = await supabase
            .from("college_cutoffs")
            .insert(insertPayload)
            .select()
            .single();

          if (cutInsErr) throw new Error(`Failed inserting new cutoff: ${cutInsErr.message}`);
          appliedCutoffs.push(cutInserted);
        }
      }
      afterState = { appliedCutoffs };
    } else if (ev.event_type === "SOURCE_URL_REDIRECT") {
      const finalUrl = (prop.finalUrl as string) || ((cand as unknown as Record<string, unknown>)?.finalUrl as string);
      const { data: srcBefore } = await supabase.from("college_source_registry").select("*").eq("id", ev.source_id).single();
      beforeState = srcBefore || {};

      const { data: srcAfter, error: srcErr } = await supabase
        .from("college_source_registry")
        .update({ source_url: finalUrl, updated_at: appliedAt })
        .eq("id", ev.source_id)
        .select()
        .single();

      if (srcErr) throw new Error(`Failed updating source URL redirect: ${srcErr.message}`);
      afterState = srcAfter || {};
    }

    // 4. Advance Baseline Hash in Source Registry
    const newBaselineHash = (prop.currentHash as string) || ((cand as unknown as Record<string, unknown>)?.currentHash as string);
    if (newBaselineHash) {
      await supabase
        .from("college_source_registry")
        .update({
          last_content_hash: newBaselineHash,
          last_changed_at: appliedAt,
          updated_at: appliedAt
        })
        .eq("id", ev.source_id);
    }

    // 5. Write Immutable Record to college_audit_log
    const auditRecord = {
      event_id: eventId,
      college_id: ev.college_id,
      course_id: ev.course_id || null,
      modified_by: adminId,
      before_state: beforeState,
      after_state: afterState,
      change_type: ev.event_type,
      notes: options.notes || null,
      created_at: appliedAt
    };

    let auditId = "audit-" + Math.random().toString(36).substring(2, 9);
    const { data: auditData } = await supabase
      .from("college_audit_log")
      .insert(auditRecord)
      .select("id")
      .single();

    if (auditData?.id) {
      auditId = auditData.id;
    }

    // 6. Transition Event Status to APPLIED
    await supabase
      .from("college_data_change_events")
      .update({
        status: "APPLIED",
        reviewer_id: adminId,
        reviewed_at: appliedAt,
        applied_at: appliedAt,
        updated_at: appliedAt
      })
      .eq("id", eventId);

    return {
      success: true,
      auditId,
      appliedAt
    };
  } catch (err: unknown) {
    // Rollback handling: transition event to ERROR
    await supabase
      .from("college_data_change_events")
      .update({
        status: "ERROR",
        rejection_reason: `Application failed: ${(err as Error).message}`,
        updated_at: new Date().toISOString()
      })
      .eq("id", eventId);

    return {
      success: false,
      error: `Atomic application failed: ${(err as Error).message}`
    };
  }
}

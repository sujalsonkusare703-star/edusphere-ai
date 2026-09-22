/**
 * EduSphere AI — Automated College Intelligence Update System
 * Change Event Queue & Staging Layer (Phase 3 Step 4C)
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ChangeEventStatus,
  ChangeEventType,
  CollegeDataChangeEvent,
  CollegeSourceRegistry
} from "@/types";
import { checkSource, updateSourceMonitoringMetadata } from "./detector";
import type { FetchOptions, SourceCheckResult } from "./types";

const MAX_RAW_SNIPPET_BYTES = 50 * 1024; // 50 KB ceiling to prevent DB bloat

/**
 * Permitted status transitions in the change event lifecycle.
 */
const VALID_TRANSITIONS: Record<ChangeEventStatus, ChangeEventStatus[]> = {
  DETECTED: ["PARSED", "PENDING_REVIEW", "ERROR"],
  PARSED: ["PENDING_REVIEW", "ERROR"],
  PENDING_REVIEW: ["APPROVED", "REJECTED", "ERROR"],
  APPROVED: ["APPLIED", "ERROR"],
  REJECTED: [], // Terminal state
  APPLIED: [], // Terminal state
  ERROR: ["DETECTED"] // Can retry from error
};

/**
 * Validates whether a proposed lifecycle state transition is legitimate.
 */
export function isValidStatusTransition(
  currentStatus: ChangeEventStatus,
  targetStatus: ChangeEventStatus
): boolean {
  if (currentStatus === targetStatus) return true;
  return VALID_TRANSITIONS[currentStatus]?.includes(targetStatus) ?? false;
}

/**
 * Truncates raw evidence snippet to the 50KB limit to prevent DB bloat.
 */
export function truncateSnippet(snippet?: string | null): string | null {
  if (!snippet) return null;
  if (snippet.length <= MAX_RAW_SNIPPET_BYTES) return snippet;
  return snippet.slice(0, MAX_RAW_SNIPPET_BYTES) + "\n...[TRUNCATED_AT_50KB]";
}

/**
 * Infers the initial ChangeEventType based on detection signals and redirect evidence.
 */
export function determineEventType(result: SourceCheckResult): ChangeEventType {
  // 1. Redirect check: Destination URL differs from configured source URL
  if (result.finalUrl && result.finalUrl !== result.sourceUrl) {
    return "SOURCE_URL_REDIRECT";
  }

  // 2. High-signal check: Cutoffs, ranks, percentiles, seat matrix
  if (result.signalLevel === "HIGH_SIGNAL") {
    return "CUTOFF_DATA_RELEASE";
  }

  // 3. Medium-signal check: Specific admission policy aspects
  const keywords = result.detectedKeywords || [];
  if (keywords.some((k) => k.includes("eligibility") || k.includes("aggregate") || k.includes("pcm"))) {
    return "ELIGIBILITY_CRITERIA_UPDATE";
  }

  if (keywords.some((k) => k.includes("exam") || k.includes("mht-cet") || k.includes("jee") || k.includes("bitsat"))) {
    return "ACCEPTED_EXAMS_UPDATE";
  }

  return "ADMISSION_ROUTE_UPDATE";
}

/**
 * Finds an open (DETECTED, PARSED, PENDING_REVIEW) event for a given source and content hash.
 * Used for deterministic event deduplication.
 */
export async function findExistingOpenEvent(
  supabase: SupabaseClient,
  sourceId: string,
  currentHash: string
): Promise<CollegeDataChangeEvent | null> {
  const { data, error } = await supabase
    .from("college_data_change_events")
    .select("*")
    .eq("source_id", sourceId)
    .in("status", ["DETECTED", "PARSED", "PENDING_REVIEW"])
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) {
    return null;
  }

  // Find match where proposed_value.currentHash matches
  const match = data.find((e) => {
    const proposed = e.proposed_value as Record<string, unknown> | null;
    return proposed?.currentHash === currentHash;
  });

  return (match as CollegeDataChangeEvent) || null;
}

/**
 * Creates a new change event in the staging queue with deduplication guards.
 */
export async function createChangeEvent(
  supabase: SupabaseClient,
  params: {
    sourceId: string;
    collegeId: string;
    courseId?: number | null;
    eventType: ChangeEventType;
    previousValue?: Record<string, unknown> | null;
    proposedValue: Record<string, unknown>;
    diffSummary: string;
    rawSnippet?: string | null;
    status?: ChangeEventStatus;
  }
): Promise<{
  success: boolean;
  data?: CollegeDataChangeEvent;
  deduplicated?: boolean;
  error?: string;
}> {
  try {
    const currentHash = params.proposedValue.currentHash as string | undefined;

    // Deduplication check
    if (currentHash) {
      const existing = await findExistingOpenEvent(supabase, params.sourceId, currentHash);
      if (existing) {
        return {
          success: true,
          data: existing,
          deduplicated: true
        };
      }
    }

    const payload = {
      source_id: params.sourceId,
      college_id: params.collegeId,
      course_id: params.courseId || null,
      event_type: params.eventType,
      previous_value: params.previousValue || null,
      proposed_value: params.proposedValue,
      diff_summary: params.diffSummary,
      status: params.status || "DETECTED",
      raw_payload_snippet: truncateSnippet(params.rawSnippet),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("college_data_change_events")
      .insert(payload)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as CollegeDataChangeEvent, deduplicated: false };
  } catch (err: unknown) {
    return { success: false, error: (err as Error)?.message || "Failed to create change event" };
  }
}

/**
 * Updates a change event's lifecycle status with state machine enforcement.
 */
export async function updateChangeEventStatus(
  supabase: SupabaseClient,
  eventId: string,
  targetStatus: ChangeEventStatus,
  options?: {
    rejectionReason?: string;
    reviewerId?: string;
  }
): Promise<{ success: boolean; data?: CollegeDataChangeEvent; error?: string }> {
  try {
    // 1. Fetch current status
    const { data: current, error: fetchErr } = await supabase
      .from("college_data_change_events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (fetchErr || !current) {
      return { success: false, error: `Change event not found: ${eventId}` };
    }

    const currentStatus = current.status as ChangeEventStatus;

    // 2. Validate transition
    if (!isValidStatusTransition(currentStatus, targetStatus)) {
      return {
        success: false,
        error: `Invalid status transition: cannot transition event from "${currentStatus}" to "${targetStatus}"`
      };
    }

    // 3. Prepare update payload
    const updatePayload: Record<string, unknown> = {
      status: targetStatus,
      updated_at: new Date().toISOString()
    };

    if (targetStatus === "REJECTED" && options?.rejectionReason) {
      updatePayload.rejection_reason = options.rejectionReason;
    }

    if (options?.reviewerId) {
      updatePayload.reviewer_id = options.reviewerId;
      updatePayload.reviewed_at = new Date().toISOString();
    }

    if (targetStatus === "APPLIED") {
      updatePayload.applied_at = new Date().toISOString();
    }

    const { data: updated, error: updateErr } = await supabase
      .from("college_data_change_events")
      .update(updatePayload)
      .eq("id", eventId)
      .select()
      .single();

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    return { success: true, data: updated as CollegeDataChangeEvent };
  } catch (err: unknown) {
    return { success: false, error: (err as Error)?.message || "Failed to update event status" };
  }
}

/**
 * Retrieves all pending change events waiting for review.
 */
export async function getPendingChangeEvents(
  supabase: SupabaseClient,
  collegeId?: string
): Promise<{ data: CollegeDataChangeEvent[] | null; error: string | null }> {
  try {
    let query = supabase
      .from("college_data_change_events")
      .select("*")
      .in("status", ["DETECTED", "PARSED", "PENDING_REVIEW"])
      .order("created_at", { ascending: false });

    if (collegeId) {
      query = query.eq("college_id", collegeId);
    }

    const { data, error } = await query;
    if (error) {
      return { data: null, error: error.message };
    }

    return { data: (data as CollegeDataChangeEvent[]) || [], error: null };
  } catch (err: unknown) {
    return { data: null, error: (err as Error)?.message || "Failed to query pending events" };
  }
}

/**
 * Coordinates source check, baseline preservation, signal filtering, and event queueing.
 */
export async function processAndQueueSourceCheck(
  supabase: SupabaseClient,
  source: CollegeSourceRegistry,
  options?: FetchOptions
): Promise<{
  checkResult: SourceCheckResult;
  eventCreated: boolean;
  eventDeduplicated: boolean;
  eventId?: string;
}> {
  // 1. Run Step 4B Source Checker
  const checkResult = await checkSource(source, options);

  // 2. Update monitoring metadata (preserves baseline hash!)
  await updateSourceMonitoringMetadata(supabase, checkResult);

  // 3. Evaluate queueing conditions
  if (checkResult.status !== "CHANGED" || !checkResult.currentHash) {
    return {
      checkResult,
      eventCreated: false,
      eventDeduplicated: false
    };
  }

  // 4. Low-signal filtering: Monitoring-only, no review noise
  if (checkResult.signalLevel === "LOW_SIGNAL") {
    return {
      checkResult,
      eventCreated: false,
      eventDeduplicated: false
    };
  }

  // 5. High or Medium signal detected: Construct event
  const eventType = determineEventType(checkResult);

  const proposedValue: Record<string, unknown> = {
    sourceUrl: checkResult.sourceUrl,
    finalUrl: checkResult.finalUrl || checkResult.sourceUrl,
    previousHash: checkResult.previousHash,
    currentHash: checkResult.currentHash,
    signalLevel: checkResult.signalLevel,
    detectedKeywords: checkResult.detectedKeywords,
    detectedAt: checkResult.checkedAt
  };

  const previousValue: Record<string, unknown> = {
    sourceUrl: source.source_url,
    baselineHash: source.last_content_hash || null,
    lastCheckedAt: source.last_checked_at || null
  };

  const eventRes = await createChangeEvent(supabase, {
    sourceId: source.id,
    collegeId: source.college_id,
    eventType,
    previousValue,
    proposedValue,
    diffSummary: checkResult.changeSummary,
    status: "DETECTED"
  });

  return {
    checkResult,
    eventCreated: eventRes.success && !eventRes.deduplicated,
    eventDeduplicated: Boolean(eventRes.deduplicated),
    eventId: eventRes.data?.id
  };
}

/**
 * EduSphere AI — Automated College Intelligence Update System
 * Automatic College Source Monitoring & Scheduler Engine (Phase 3 Step 4F)
 *
 * CRITICAL SAFETY INVARIANTS:
 * - Purely a MONITORING & STAGING system.
 * - Maximum progression: SOURCE -> FETCH -> DETECT -> EXTRACT -> VALIDATE -> PENDING_REVIEW.
 * - ZERO direct mutations to public.colleges, public.college_courses, or public.college_cutoffs.
 * - ZERO automatic verification or approval. Events remain PENDING_REVIEW awaiting Step 4E admin approval.
 * - The trusted baseline content hash is NEVER overwritten on change detection.
 * - Failure isolation: single source timeout/429/5xx never halts the scheduler batch.
 * - Strict execution duration budget and bounded batch sizing.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CollegeSourceRegistry, SignalLevel } from "@/types";
import { checkSource } from "./detector";
import { createChangeEvent, determineEventType } from "./change-events";
import { processAndExtractChangeEvent } from "./extractor";
import type { DetectionStatus, FetchOptions, SourceCheckResult } from "./types";

export interface SchedulerOptions {
  batchSize?: number;
  maxDurationMs?: number;
  forceCheckAll?: boolean;
  sourceId?: string;
  fetchOptions?: FetchOptions;
}

export interface SchedulerSourceResult {
  sourceId: string;
  collegeId: string;
  sourceName: string;
  sourceUrl: string;
  status: DetectionStatus;
  signalLevel?: SignalLevel;
  eventCreated: boolean;
  eventDeduplicated: boolean;
  eventId?: string;
  durationMs: number;
  error?: string;
}

export interface SchedulerRunSummary {
  startedAt: string;
  completedAt: string;
  durationMs: number;
  eligibleSourcesCount: number;
  checkedCount: number;
  unchangedCount: number;
  changedCount: number;
  highSignalCount: number;
  mediumSignalCount: number;
  lowSignalCount: number;
  eventsCreatedCount: number;
  eventsDeduplicatedCount: number;
  skippedCount: number;
  errorsCount: number;
  stoppedEarlyDueToBudget: boolean;
  sources: SchedulerSourceResult[];
}

const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_MAX_DURATION_MS = 25000; // 25s safe ceiling for serverless execution

/**
 * Calculates the next scheduled check timestamp with exponential backoff on consecutive failures.
 */
export function calculateNextCheckAt(
  sourceType: string,
  checkIntervalMinutes?: number | null,
  consecutiveFailures: number = 0
): string {
  let baseMinutes = checkIntervalMinutes || 1440; // Default 24 hours

  if (!checkIntervalMinutes) {
    switch (sourceType) {
      case "EXAM_AUTHORITY":
      case "ADMISSION_PAGE":
        baseMinutes = 360; // 6 hours
        break;
      case "NOTIFICATION_CIRCULAR":
        baseMinutes = 720; // 12 hours
        break;
      case "FEE_STRUCTURE":
        baseMinutes = 10080; // 7 days
        break;
      case "OFFICIAL_PORTAL":
      default:
        baseMinutes = 1440; // 24 hours
        break;
    }
  }

  // Exponential backoff on consecutive failures (up to 16x base interval, capped at 7 days)
  let effectiveMinutes = baseMinutes;
  if (consecutiveFailures > 0) {
    const backoffFactor = Math.min(Math.pow(2, consecutiveFailures), 16);
    effectiveMinutes = Math.min(baseMinutes * backoffFactor, 10080);
  }

  const nextCheckDate = new Date(Date.now() + effectiveMinutes * 60 * 1000);
  return nextCheckDate.toISOString();
}

/**
 * Queries eligible sources from public.college_source_registry ready for monitoring.
 */
export async function getEligibleSources(
  supabase: SupabaseClient,
  options: {
    batchSize?: number;
    forceCheckAll?: boolean;
    sourceId?: string;
  } = {}
): Promise<CollegeSourceRegistry[]> {
  const { batchSize = DEFAULT_BATCH_SIZE, forceCheckAll = false, sourceId } = options;

  let query = supabase
    .from("college_source_registry")
    .select("*")
    .eq("is_active", true);

  if (sourceId) {
    query = query.eq("id", sourceId);
  } else if (!forceCheckAll) {
    // Only query sources where next_check_at <= now() or never checked
    const nowIso = new Date().toISOString();
    query = query.or(`next_check_at.lte.${nowIso},next_check_at.is.null,last_checked_at.is.null`);
  }

  query = query.order("next_check_at", { ascending: true, nullsFirst: true }).limit(batchSize);

  const { data, error } = await query;
  if (error || !data) {
    console.warn("Error fetching eligible sources from registry:", error?.message);
    return [];
  }

  return data as CollegeSourceRegistry[];
}

/**
 * Executes monitoring pipeline for a single source:
 * 1. Checks source via Step 4B fetcher & detector
 * 2. Updates monitoring and scheduling metadata (preserving baseline hash on change!)
 * 3. If HIGH or MEDIUM change detected: creates event & extracts candidate facts into PENDING_REVIEW
 */
export async function runSourceMonitoringPipeline(
  supabase: SupabaseClient,
  source: CollegeSourceRegistry,
  fetchOptions?: FetchOptions
): Promise<SchedulerSourceResult> {
  const startTime = Date.now();

  try {
    // 1. Check Source
    const checkResult: SourceCheckResult = await checkSource(source, fetchOptions);

    const isSuccess = checkResult.status !== "ERROR";
    const currentFailures = isSuccess ? 0 : (source.consecutive_failures || 0) + 1;
    const nextCheckAt = calculateNextCheckAt(
      source.source_type,
      (source as unknown as Record<string, unknown>).check_interval_minutes as number | undefined,
      currentFailures
    );

    // 2. Prepare metadata update for college_source_registry
    const updatePayload: Record<string, unknown> = {
      last_checked_at: checkResult.checkedAt,
      next_check_at: nextCheckAt,
      consecutive_failures: currentFailures,
      updated_at: checkResult.checkedAt
    };

    if (isSuccess) {
      updatePayload.last_successful_check_at = checkResult.checkedAt;
      updatePayload.last_error = null;

      if (checkResult.status === "FIRST_CHECK" && checkResult.currentHash) {
        // Initial baseline establishment
        updatePayload.last_content_hash = checkResult.currentHash;
      } else if (checkResult.status === "CHANGED") {
        // CRITICAL INVARIANT: Record change timestamp, but PRESERVE last_content_hash!
        // Trusted baseline only advances upon Step 4E admin approval.
        updatePayload.last_changed_at = checkResult.checkedAt;
      }
    } else {
      updatePayload.last_error = checkResult.errorMessage || checkResult.errorCode || "Unknown fetch error";
    }

    // Update source registry metadata safely
    await supabase
      .from("college_source_registry")
      .update(updatePayload)
      .eq("id", source.id);

    // 3. Event Creation & Staging for HIGH or MEDIUM signal changes
    let eventCreated = false;
    let eventDeduplicated = false;
    let eventId: string | undefined;

    if (
      checkResult.status === "CHANGED" &&
      checkResult.currentHash &&
      (checkResult.signalLevel === "HIGH_SIGNAL" || checkResult.signalLevel === "MEDIUM_SIGNAL")
    ) {
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

      if (eventRes.success && eventRes.data) {
        eventId = eventRes.data.id;
        eventCreated = !eventRes.deduplicated;
        eventDeduplicated = Boolean(eventRes.deduplicated);

        // If newly created event, run structured extraction pipeline into PENDING_REVIEW
        if (eventCreated) {
          try {
            await processAndExtractChangeEvent(supabase, eventId);
          } catch (extractErr) {
            console.warn(`Extraction error for event ${eventId}:`, (extractErr as Error)?.message);
          }
        }
      }
    }

    return {
      sourceId: source.id,
      collegeId: source.college_id,
      sourceName: source.source_name,
      sourceUrl: source.source_url,
      status: checkResult.status,
      signalLevel: checkResult.signalLevel,
      eventCreated,
      eventDeduplicated,
      eventId,
      durationMs: Date.now() - startTime,
      error: checkResult.errorMessage
    };
  } catch (err: unknown) {
    const errorMsg = (err as Error)?.message || "Unexpected failure in source monitoring";
    console.error(`Source monitoring failure for ${source.id} (${source.source_url}):`, errorMsg);

    // Record failure in registry without throwing
    try {
      const failures = (source.consecutive_failures || 0) + 1;
      await supabase
        .from("college_source_registry")
        .update({
          last_checked_at: new Date().toISOString(),
          next_check_at: calculateNextCheckAt(source.source_type, null, failures),
          consecutive_failures: failures,
          last_error: errorMsg,
          updated_at: new Date().toISOString()
        })
        .eq("id", source.id);
    } catch {
      // Ignore secondary update error
    }

    return {
      sourceId: source.id,
      collegeId: source.college_id,
      sourceName: source.source_name,
      sourceUrl: source.source_url,
      status: "ERROR",
      eventCreated: false,
      eventDeduplicated: false,
      durationMs: Date.now() - startTime,
      error: errorMsg
    };
  }
}

/**
 * Main Scheduler Coordinator:
 * Bounded batch execution, duration budget guarding, failure isolation, and summary reporting.
 */
export async function runCollegeUpdateScheduler(
  supabase: SupabaseClient,
  options: SchedulerOptions = {}
): Promise<SchedulerRunSummary> {
  const startedAt = new Date().toISOString();
  const startTime = Date.now();
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    maxDurationMs = DEFAULT_MAX_DURATION_MS,
    forceCheckAll = false,
    sourceId,
    fetchOptions
  } = options;

  console.log(`[Scheduler] Started run at ${startedAt} (batchSize=${batchSize}, budget=${maxDurationMs}ms)`);

  // 1. Fetch eligible sources
  const sources = await getEligibleSources(supabase, {
    batchSize,
    forceCheckAll,
    sourceId
  });

  console.log(`[Scheduler] Found ${sources.length} eligible source(s) to process`);

  const results: SchedulerSourceResult[] = [];
  let stoppedEarlyDueToBudget = false;

  // 2. Process sources with failure isolation and budget checks
  for (let i = 0; i < sources.length; i++) {
    // Check execution budget before each source
    const elapsedMs = Date.now() - startTime;
    if (elapsedMs >= maxDurationMs) {
      console.warn(`[Scheduler] Execution budget reached (${elapsedMs}ms >= ${maxDurationMs}ms). Stopping early.`);
      stoppedEarlyDueToBudget = true;
      break;
    }

    const source = sources[i];
    console.log(`[Scheduler] Checking source [${i + 1}/${sources.length}]: ${source.source_name} (${source.source_url})`);

    const result = await runSourceMonitoringPipeline(supabase, source, fetchOptions);
    results.push(result);

    console.log(`[Scheduler] Result for ${source.id}: ${result.status} (${result.durationMs}ms, eventCreated=${result.eventCreated})`);
  }

  const completedAt = new Date().toISOString();
  const totalDurationMs = Date.now() - startTime;

  // 3. Compile metrics summary
  const summary: SchedulerRunSummary = {
    startedAt,
    completedAt,
    durationMs: totalDurationMs,
    eligibleSourcesCount: sources.length,
    checkedCount: results.length,
    unchangedCount: results.filter((r) => r.status === "UNCHANGED").length,
    changedCount: results.filter((r) => r.status === "CHANGED").length,
    highSignalCount: results.filter((r) => r.signalLevel === "HIGH_SIGNAL").length,
    mediumSignalCount: results.filter((r) => r.signalLevel === "MEDIUM_SIGNAL").length,
    lowSignalCount: results.filter((r) => r.signalLevel === "LOW_SIGNAL").length,
    eventsCreatedCount: results.filter((r) => r.eventCreated).length,
    eventsDeduplicatedCount: results.filter((r) => r.eventDeduplicated).length,
    skippedCount: sources.length - results.length,
    errorsCount: results.filter((r) => r.status === "ERROR").length,
    stoppedEarlyDueToBudget,
    sources: results
  };

  console.log(`[Scheduler] Completed run in ${totalDurationMs}ms: ${summary.checkedCount} checked, ${summary.changedCount} changed, ${summary.eventsCreatedCount} events created, ${summary.errorsCount} errors.`);

  return summary;
}

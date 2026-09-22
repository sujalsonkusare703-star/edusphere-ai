/**
 * EduSphere AI — Automated College Intelligence Update System
 * Change Detection Engine, Signal Classification & Metadata Updates (Phase 3 Step 4B)
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CollegeSourceRegistry } from "@/types";
import { fetchSource } from "./fetcher";
import { calculateContentHash, processNormalizedContent } from "./normalizer";
import type {
  FetchOptions,
  SelectorConfig,
  SignalLevel,
  SourceCheckResult
} from "./types";

// High-signal keywords indicate active cutoff or allotment release
const HIGH_SIGNAL_KEYWORDS = [
  "cutoff",
  "cut off",
  "cut-off",
  "closing rank",
  "opening rank",
  "percentile",
  "merit list",
  "cap round",
  "seat allotment",
  "allotment list",
  "seat matrix",
  "round 1",
  "round 2",
  "round 3",
  "round-1",
  "round-2",
  "round-3"
];

// Medium-signal keywords indicate admission criteria or policy updates
const MEDIUM_SIGNAL_KEYWORDS = [
  "admission",
  "admissions",
  "eligibility",
  "entrance exam",
  "counselling",
  "counseling",
  "application form",
  "registration deadline",
  "fee structure",
  "annual fee",
  "intake capacity",
  "approved intake",
  "b.tech",
  "m.tech",
  "mht-cet",
  "jee main",
  "bitsat",
  "viteee"
];

/**
 * Classifies signal level and extracts matched admission keywords from text.
 */
export function classifySignal(text: string): {
  signalLevel: SignalLevel;
  detectedKeywords: string[];
  summary: string;
} {
  const lower = text.toLowerCase();
  const matchedHigh = HIGH_SIGNAL_KEYWORDS.filter((k) => lower.includes(k));
  const matchedMedium = MEDIUM_SIGNAL_KEYWORDS.filter((k) => lower.includes(k));

  const allMatched = Array.from(new Set([...matchedHigh, ...matchedMedium]));

  if (matchedHigh.length > 0) {
    return {
      signalLevel: "HIGH_SIGNAL",
      detectedKeywords: allMatched,
      summary: `High-signal admission/cutoff terms detected in updated content: ${matchedHigh.slice(0, 5).join(", ")}.`
    };
  }

  if (matchedMedium.length > 0) {
    return {
      signalLevel: "MEDIUM_SIGNAL",
      detectedKeywords: allMatched,
      summary: `Medium-signal admission policy/procedure terms detected in updated content: ${matchedMedium.slice(0, 5).join(", ")}.`
    };
  }

  return {
    signalLevel: "LOW_SIGNAL",
    detectedKeywords: [],
    summary: "General institutional text changed with no specific admission or cutoff keywords detected."
  };
}

/**
 * Evaluates hash comparison and determines the detection status.
 */
export function evaluateDetection(params: {
  sourceId: string;
  collegeId: string;
  sourceUrl: string;
  sourceType: CollegeSourceRegistry["source_type"];
  contentFormat: CollegeSourceRegistry["content_format"];
  previousHash: string | null;
  currentHash: string | null;
  normalizedText?: string;
  httpStatus?: number;
  contentType?: string;
  finalUrl?: string;
  durationMs: number;
  errorCode?: string;
  errorMessage?: string;
}): SourceCheckResult {
  const checkedAt = new Date().toISOString();

  // Handle fetch error
  if (params.errorCode || !params.currentHash) {
    return {
      sourceId: params.sourceId,
      collegeId: params.collegeId,
      sourceUrl: params.sourceUrl,
      sourceType: params.sourceType,
      contentFormat: params.contentFormat,
      status: "ERROR",
      httpStatus: params.httpStatus,
      contentType: params.contentType,
      finalUrl: params.finalUrl,
      previousHash: params.previousHash,
      currentHash: params.previousHash, // Preserve last known good hash
      hashChanged: false,
      signalLevel: "LOW_SIGNAL",
      changeSummary: `Source check failed: ${params.errorMessage || params.errorCode}`,
      detectedKeywords: [],
      durationMs: params.durationMs,
      checkedAt,
      errorCode: params.errorCode,
      errorMessage: params.errorMessage
    };
  }

  // Handle PDF format
  if (params.contentFormat === "PDF") {
    const hashChanged = params.previousHash !== null && params.previousHash !== params.currentHash;
    const isFirstCheck = params.previousHash === null;

    return {
      sourceId: params.sourceId,
      collegeId: params.collegeId,
      sourceUrl: params.sourceUrl,
      sourceType: params.sourceType,
      contentFormat: "PDF",
      status: isFirstCheck ? "FIRST_CHECK" : "PENDING_PDF_EXTRACTION",
      httpStatus: params.httpStatus,
      contentType: params.contentType,
      finalUrl: params.finalUrl,
      previousHash: params.previousHash,
      currentHash: params.currentHash,
      hashChanged,
      signalLevel: "LOW_SIGNAL",
      changeSummary: isFirstCheck
        ? "Initial baseline PDF hash recorded. PDF extraction deferred to dedicated extractor."
        : "PDF document detected. Text extraction deferred to Step 4D PDF pipeline.",
      detectedKeywords: [],
      durationMs: params.durationMs,
      checkedAt
    };
  }

  // First-check handling (last_content_hash IS NULL)
  if (params.previousHash === null || params.previousHash.trim().length === 0) {
    return {
      sourceId: params.sourceId,
      collegeId: params.collegeId,
      sourceUrl: params.sourceUrl,
      sourceType: params.sourceType,
      contentFormat: params.contentFormat,
      status: "FIRST_CHECK",
      httpStatus: params.httpStatus,
      contentType: params.contentType,
      finalUrl: params.finalUrl,
      previousHash: null,
      currentHash: params.currentHash,
      hashChanged: false,
      signalLevel: "LOW_SIGNAL",
      changeSummary: "Baseline content hash established on initial check. No change event generated.",
      detectedKeywords: [],
      durationMs: params.durationMs,
      checkedAt
    };
  }

  // Unchanged content check
  if (params.currentHash === params.previousHash) {
    return {
      sourceId: params.sourceId,
      collegeId: params.collegeId,
      sourceUrl: params.sourceUrl,
      sourceType: params.sourceType,
      contentFormat: params.contentFormat,
      status: "UNCHANGED",
      httpStatus: params.httpStatus,
      contentType: params.contentType,
      finalUrl: params.finalUrl,
      previousHash: params.previousHash,
      currentHash: params.currentHash,
      hashChanged: false,
      signalLevel: "LOW_SIGNAL",
      changeSummary: "Source content is unchanged since last check.",
      detectedKeywords: [],
      durationMs: params.durationMs,
      checkedAt
    };
  }

  // Changed content
  const classification = classifySignal(params.normalizedText || "");

  return {
    sourceId: params.sourceId,
    collegeId: params.collegeId,
    sourceUrl: params.sourceUrl,
    sourceType: params.sourceType,
    contentFormat: params.contentFormat,
    status: "CHANGED",
    httpStatus: params.httpStatus,
    contentType: params.contentType,
    finalUrl: params.finalUrl,
    previousHash: params.previousHash,
    currentHash: params.currentHash,
    hashChanged: true,
    signalLevel: classification.signalLevel,
    changeSummary: classification.summary,
    detectedKeywords: classification.detectedKeywords,
    durationMs: params.durationMs,
    checkedAt
  };
}

/**
 * End-to-end check of a single registered source endpoint.
 */
export async function checkSource(
  source: CollegeSourceRegistry,
  options: FetchOptions = {}
): Promise<SourceCheckResult> {
  const fetchRes = await fetchSource(source.source_url, options);

  if (!fetchRes.success) {
    return evaluateDetection({
      sourceId: source.id,
      collegeId: source.college_id,
      sourceUrl: source.source_url,
      sourceType: source.source_type,
      contentFormat: source.content_format,
      previousHash: source.last_content_hash || null,
      currentHash: null,
      httpStatus: fetchRes.httpStatus,
      contentType: fetchRes.contentType,
      finalUrl: fetchRes.finalUrl,
      durationMs: fetchRes.durationMs,
      errorCode: fetchRes.errorCode,
      errorMessage: fetchRes.errorMessage
    });
  }

  // PDF handling
  if (fetchRes.detectedFormat === "PDF" && fetchRes.bodyBuffer) {
    const pdfHash = calculateContentHash(fetchRes.bodyBuffer.toString("binary"));
    return evaluateDetection({
      sourceId: source.id,
      collegeId: source.college_id,
      sourceUrl: source.source_url,
      sourceType: source.source_type,
      contentFormat: "PDF",
      previousHash: source.last_content_hash || null,
      currentHash: pdfHash,
      httpStatus: fetchRes.httpStatus,
      contentType: fetchRes.contentType,
      finalUrl: fetchRes.finalUrl,
      durationMs: fetchRes.durationMs
    });
  }

  // HTML / JSON handling
  const rawContent = fetchRes.bodyText || "";
  const selectorConfig = source.selector_config as SelectorConfig | undefined;
  const processed = processNormalizedContent(rawContent, selectorConfig);

  return evaluateDetection({
    sourceId: source.id,
    collegeId: source.college_id,
    sourceUrl: source.source_url,
    sourceType: source.source_type,
    contentFormat: source.content_format,
    previousHash: source.last_content_hash || null,
    currentHash: processed.contentHash,
    normalizedText: processed.normalizedText,
    httpStatus: fetchRes.httpStatus,
    contentType: fetchRes.contentType,
    finalUrl: fetchRes.finalUrl,
    durationMs: fetchRes.durationMs
  });
}

/**
 * Safely updates ONLY monitoring metadata on public.college_source_registry.
 * Absolutely NEVER alters public.colleges, public.college_courses, or public.college_cutoffs.
 */
export async function updateSourceMonitoringMetadata(
  supabaseClient: SupabaseClient,
  result: SourceCheckResult
): Promise<{ success: boolean; error?: string }> {
  try {
    const updatePayload: Record<string, unknown> = {
      last_checked_at: result.checkedAt,
      updated_at: result.checkedAt
    };

    if (result.status === "ERROR") {
      // Increment consecutive failures without erasing last_content_hash or last_changed_at
      const { data: current } = await supabaseClient
        .from("college_source_registry")
        .select("consecutive_failures, last_content_hash, last_changed_at")
        .eq("id", result.sourceId)
        .single();

      updatePayload.consecutive_failures = ((current?.consecutive_failures as number) || 0) + 1;
    } else {
      // Successful check resets consecutive failures
      updatePayload.consecutive_failures = 0;

      if (result.status === "FIRST_CHECK" && result.currentHash) {
        // Establish initial baseline hash
        updatePayload.last_content_hash = result.currentHash;
      } else if (result.status === "CHANGED") {
        // Record detection timestamp while preserving the last approved baseline hash
        updatePayload.last_changed_at = result.checkedAt;
      }
    }

    const { error } = await supabaseClient
      .from("college_source_registry")
      .update(updatePayload)
      .eq("id", result.sourceId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error)?.message || "Unknown update error" };
  }
}

/**
 * EduSphere AI — Automated College Intelligence Update System
 * Zod Schemas & Validation Rules for Extracted Admission Data (Phase 3 Step 4D)
 */

import { z } from "zod";
import type {
  CandidateCutoff,
  ExtractedAdmissionUpdate,
  CandidateRecordStatus
} from "./types";

// ==================================================
// 1. ZOD BASE ENUMS & SCHEMAS
// ==================================================

export const CutoffUnitSchema = z.enum(["percentile", "rank", "score", "marks"]);

export const CandidateRecordStatusSchema = z.enum([
  "VALID",
  "INVALID",
  "ANOMALY",
  "CONFLICT",
  "AMBIGUOUS",
  "NEW_DISCOVERY"
]);

export const ExtractionMethodSchema = z.enum([
  "DETERMINISTIC",
  "TABLE",
  "LLM",
  "PDF_FALLBACK"
]);

export const ConflictSeveritySchema = z.enum(["LOW", "MEDIUM", "HIGH"]);

export const ConflictFieldSchema = z.enum([
  "accepted_exams",
  "admission_route",
  "eligibility_criteria",
  "cutoff",
  "unit",
  "year",
  "round",
  "program",
  "duplicate_cutoff"
]);

// ==================================================
// 2. CANDIDATE COMPONENT SCHEMAS
// ==================================================

export const CandidateCutoffSchema = z.object({
  exam: z.string().min(1, "Exam name is mandatory"),
  quota: z.string().nullable(),
  category: z.string().min(1, "Category is mandatory"),
  value: z.number(),
  unit: CutoffUnitSchema,
  year: z.number().int().nullable(),
  round: z.string().nullable(),
  course_id: z.number().int().nullable().optional().default(null),
  program_name: z.string().nullable().optional().default(null),
  source_url: z.string().min(1, "Source URL is mandatory"),
  evidence_excerpt: z.string().min(1, "Evidence excerpt is mandatory"),
  confidence_score: z.number().min(0).max(1),
  status: CandidateRecordStatusSchema,
  validation_notes: z.array(z.string()).optional()
});

export const CandidateExamSchema = z.object({
  accepted_exams: z.array(z.string().min(1)).min(1, "At least one accepted exam must be specified"),
  course_id: z.number().int().nullable().optional().default(null),
  program_name: z.string().nullable().optional().default(null),
  source_url: z.string().min(1, "Source URL is mandatory"),
  evidence_excerpt: z.string().min(1, "Evidence excerpt is mandatory"),
  confidence_score: z.number().min(0).max(1),
  status: CandidateRecordStatusSchema
});

export const CandidateRouteSchema = z.object({
  admission_route: z.string().min(1, "Admission route is mandatory"),
  course_id: z.number().int().nullable().optional().default(null),
  program_name: z.string().nullable().optional().default(null),
  source_url: z.string().min(1, "Source URL is mandatory"),
  evidence_excerpt: z.string().min(1, "Evidence excerpt is mandatory"),
  confidence_score: z.number().min(0).max(1),
  status: CandidateRecordStatusSchema
});

export const CandidateEligibilitySchema = z.object({
  eligibility_criteria: z.string().min(1, "Eligibility criteria is mandatory"),
  is_source_stated: z.boolean(),
  course_id: z.number().int().nullable().optional().default(null),
  program_name: z.string().nullable().optional().default(null),
  source_url: z.string().min(1, "Source URL is mandatory"),
  evidence_excerpt: z.string().min(1, "Evidence excerpt is mandatory"),
  confidence_score: z.number().min(0).max(1),
  status: CandidateRecordStatusSchema
});

export const CandidateProgramSchema = z.object({
  program_name: z.string().min(1, "Program name is mandatory"),
  program_code: z.string().nullable().optional().default(null),
  stream: z.string().nullable().optional().default(null),
  intake: z.number().int().nullable().optional().default(null),
  matched_course_id: z.number().int().nullable().optional().default(null),
  match_confidence: z.number().min(0).max(1),
  source_url: z.string().min(1, "Source URL is mandatory"),
  evidence_excerpt: z.string().min(1, "Evidence excerpt is mandatory"),
  status: CandidateRecordStatusSchema
});

export const CandidateSourceRedirectSchema = z.object({
  original_url: z.string().min(1),
  redirect_url: z.string().min(1),
  evidence_excerpt: z.string().min(1),
  confidence_score: z.number().min(0).max(1)
});

export const CandidateConflictSchema = z.object({
  field: ConflictFieldSchema,
  severity: ConflictSeveritySchema,
  course_id: z.number().int().nullable().optional().default(null),
  program_name: z.string().nullable().optional().default(null),
  existing_value: z.unknown(),
  candidate_value: z.unknown(),
  description: z.string().min(1)
});

export const ExtractedAdmissionUpdateSchema = z.object({
  college_id: z.string().min(1, "College ID is mandatory"),
  source_id: z.string().min(1, "Source ID is mandatory"),
  source_url: z.string().min(1, "Source URL is mandatory"),
  source_name: z.string().optional(),
  extraction_method: ExtractionMethodSchema,
  exams: z.array(CandidateExamSchema),
  routes: z.array(CandidateRouteSchema),
  eligibilities: z.array(CandidateEligibilitySchema),
  cutoffs: z.array(CandidateCutoffSchema),
  programs: z.array(CandidateProgramSchema),
  redirects: z.array(CandidateSourceRedirectSchema).optional(),
  conflicts: z.array(CandidateConflictSchema),
  anomalies: z.array(z.string()),
  is_pdf: z.boolean(),
  status: z.enum(["PARSED", "PENDING_REVIEW", "PENDING_PDF_REVIEW", "ERROR"]),
  overall_confidence: z.number().min(0).max(1),
  extracted_at: z.string(),
  error_message: z.string().optional()
});

// ==================================================
// 3. CUTOFF UNIT & BOUNDS VALIDATION
// ==================================================

export interface CutoffValidationResult {
  valid: boolean;
  status: CandidateRecordStatus;
  errors: string[];
  anomalies: string[];
}

/**
 * Validates a single candidate cutoff against strict domain bounds.
 *
 * Rules:
 * - Percentile: strictly 0.00 to 100.00. Values < 0 or > 100 are INVALID / ANOMALY.
 * - Rank: strictly positive integers (1 to 1,500,000). Decimals, negatives, 0 are INVALID.
 * - Marks: exam-specific known bounds (BITSAT: 0–390, NATA: 0–200, MH CET Law: 0–150).
 * - Evidence: non-empty string is strictly mandatory.
 * - Year: if present, must be within valid range [2000, currentYear + 1]. Never invent year.
 * - Status transitions to INVALID if any hard constraint fails.
 */
export function validateCandidateCutoff(cutoff: Partial<CandidateCutoff>): CutoffValidationResult {
  const errors: string[] = [];
  const anomalies: string[] = [];

  // 1. Mandatory evidence check
  if (!cutoff.evidence_excerpt || cutoff.evidence_excerpt.trim().length === 0) {
    errors.push("Cutoff candidate rejected: evidence_excerpt is strictly mandatory");
  }

  // 2. Mandatory exam check
  if (!cutoff.exam || cutoff.exam.trim().length === 0) {
    errors.push("Cutoff candidate rejected: exam name is missing");
  }

  // 3. Mandatory unit check
  if (!cutoff.unit) {
    errors.push("Cutoff candidate rejected: unit is missing (must be percentile, rank, score, or marks)");
  }

  // 4. Value existence check
  if (cutoff.value === undefined || cutoff.value === null || typeof cutoff.value !== "number" || isNaN(cutoff.value)) {
    errors.push("Cutoff candidate rejected: numeric value is missing or NaN");
    return {
      valid: false,
      status: "INVALID",
      errors,
      anomalies
    };
  }

  const val = cutoff.value;
  const unit = cutoff.unit;
  const examUpper = (cutoff.exam || "").toUpperCase();

  // 5. Strict unit-specific bound validations
  if (unit === "percentile") {
    if (val < 0 || val > 100) {
      errors.push(`Impossible percentile: ${val}. Percentile must be between 0.00 and 100.00`);
      anomalies.push(`Percentile out of bounds: ${val}`);
    }
  } else if (unit === "rank") {
    if (!Number.isInteger(val)) {
      errors.push(`Invalid rank: ${val}. Rank must be an integer`);
      anomalies.push(`Non-integer rank value: ${val}`);
    }
    if (val <= 0) {
      errors.push(`Invalid rank: ${val}. Rank must be a strictly positive integer`);
      anomalies.push(`Non-positive rank value: ${val}`);
    }
    if (val > 1500000) {
      anomalies.push(`Suspiciously high rank: ${val} exceeds 1,500,000`);
    }
  } else if (unit === "marks" || unit === "score") {
    if (examUpper.includes("BITSAT")) {
      if (val < 0 || val > 390) {
        errors.push(`Impossible BITSAT score: ${val}. BITSAT maximum is 390 marks`);
        anomalies.push(`BITSAT marks out of range: ${val} (allowed 0-390)`);
      }
    } else if (examUpper.includes("NATA")) {
      if (val < 0 || val > 200) {
        errors.push(`Impossible NATA marks: ${val}. NATA maximum is 200 marks`);
        anomalies.push(`NATA marks out of range: ${val} (allowed 0-200)`);
      }
    } else if (examUpper.includes("LAW") || examUpper.includes("CLAT")) {
      if (val < 0 || val > 150) {
        errors.push(`Impossible MH CET Law score: ${val}. MH CET Law maximum is 150 marks`);
        anomalies.push(`MH CET Law score out of range: ${val} (allowed 0-150)`);
      }
    } else if (examUpper.includes("MHT") && unit === "marks") {
      if (val < 0 || val > 200) {
        errors.push(`Impossible MHT-CET marks: ${val}. MHT-CET maximum is 200 marks`);
        anomalies.push(`MHT-CET marks out of range: ${val} (allowed 0-200)`);
      }
    } else {
      if (val < 0) {
        errors.push(`Negative score value: ${val} is invalid`);
        anomalies.push(`Negative score value: ${val}`);
      }
    }
  }

  // 6. Year validation
  if (cutoff.year !== null && cutoff.year !== undefined) {
    const currentYear = new Date().getFullYear();
    if (cutoff.year < 2000 || cutoff.year > currentYear + 1) {
      anomalies.push(`Suspicious year: ${cutoff.year} outside academic cycle (2000-${currentYear + 1})`);
    }
  }

  const valid = errors.length === 0;
  let status: CandidateRecordStatus = valid ? "VALID" : "INVALID";
  if (valid && anomalies.length > 0) {
    status = "ANOMALY";
  }

  return {
    valid,
    status,
    errors,
    anomalies
  };
}

/**
 * Validates an entire ExtractedAdmissionUpdate object against Zod and domain rules.
 */
export function validateExtractedAdmissionUpdate(
  candidate: unknown
): { success: boolean; data?: ExtractedAdmissionUpdate; errors?: string[] } {
  const parsed = ExtractedAdmissionUpdateSchema.safeParse(candidate);
  if (!parsed.success) {
    const errors = parsed.error.issues.map(
      (iss) => `${iss.path.join(".") || "root"}: ${iss.message}`
    );
    return { success: false, errors };
  }

  // Deep domain validation on each cutoff
  const update = parsed.data;
  for (const cut of update.cutoffs) {
    const res = validateCandidateCutoff(cut);
    if (!res.valid) {
      cut.status = "INVALID";
      cut.validation_notes = [...(cut.validation_notes || []), ...res.errors];
      update.anomalies.push(...res.anomalies);
    }
  }

  return { success: true, data: update };
}

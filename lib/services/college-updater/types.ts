/**
 * EduSphere AI — Automated College Intelligence Update System
 * Types for Source Fetcher, Content Normalization, Change Detection,
 * and Structured Admission Data Extraction (Phase 3 Step 4B, 4C, 4D)
 */

import type {
  ContentFormat,
  SourceType,
  ChangeEventType,
  ChangeEventStatus,
  CollegeDataChangeEvent
} from "@/types";

export type { ChangeEventType, ChangeEventStatus, CollegeDataChangeEvent };

export type DetectionStatus =
  | "UNCHANGED"
  | "CHANGED"
  | "FIRST_CHECK"
  | "ERROR"
  | "PENDING_PDF_EXTRACTION"
  | "UNSUPPORTED";

export type SignalLevel = "LOW_SIGNAL" | "MEDIUM_SIGNAL" | "HIGH_SIGNAL";

export interface FetchOptions {
  timeoutMs?: number;
  maxSizeBytes?: number;
  userAgent?: string;
  maxRedirects?: number;
  allowLocalhostForTesting?: boolean;
}

export interface FetchResult {
  success: boolean;
  url: string;
  finalUrl: string;
  httpStatus?: number;
  contentType?: string;
  detectedFormat: ContentFormat | "UNKNOWN";
  bodyBuffer?: Buffer;
  bodyText?: string;
  durationMs: number;
  redirectCount: number;
  errorCode?: string;
  errorMessage?: string;
}

export interface SelectorConfig {
  cutoff_container?: string;
  eligibility_box?: string;
  main_container?: string;
  [key: string]: unknown;
}

export interface NormalizedResult {
  rawLength: number;
  normalizedLength: number;
  normalizedText: string;
  contentHash: string;
  detectedKeywords: string[];
}

export interface SourceCheckResult {
  sourceId: string;
  collegeId: string;
  sourceUrl: string;
  sourceType: SourceType;
  contentFormat: ContentFormat;
  status: DetectionStatus;
  httpStatus?: number;
  contentType?: string;
  finalUrl?: string;
  previousHash: string | null;
  currentHash: string | null;
  hashChanged: boolean;
  signalLevel: SignalLevel;
  changeSummary: string;
  detectedKeywords: string[];
  durationMs: number;
  checkedAt: string;
  errorCode?: string;
  errorMessage?: string;
}

// ==================================================
// PHASE 3 STEP 4D: STRUCTURED EXTRACTION TYPES
// ==================================================

export type CutoffUnit = "percentile" | "rank" | "score" | "marks";

export type CandidateRecordStatus =
  | "VALID"
  | "INVALID"
  | "ANOMALY"
  | "CONFLICT"
  | "AMBIGUOUS"
  | "NEW_DISCOVERY";

export type ExtractionMethod =
  | "DETERMINISTIC"
  | "TABLE"
  | "LLM"
  | "PDF_FALLBACK";

export interface CandidateCutoff {
  exam: string;
  quota: string | null;
  category: string;
  value: number;
  unit: CutoffUnit;
  year: number | null;
  round: string | null;
  course_id: number | null;
  program_name: string | null;
  source_url: string;
  evidence_excerpt: string;
  confidence_score: number;
  status: CandidateRecordStatus;
  validation_notes?: string[];
}

export interface CandidateExam {
  accepted_exams: string[];
  course_id: number | null;
  program_name: string | null;
  source_url: string;
  evidence_excerpt: string;
  confidence_score: number;
  status: CandidateRecordStatus;
}

export interface CandidateRoute {
  admission_route: string;
  course_id: number | null;
  program_name: string | null;
  source_url: string;
  evidence_excerpt: string;
  confidence_score: number;
  status: CandidateRecordStatus;
}

export interface CandidateEligibility {
  eligibility_criteria: string;
  is_source_stated: boolean;
  course_id: number | null;
  program_name: string | null;
  source_url: string;
  evidence_excerpt: string;
  confidence_score: number;
  status: CandidateRecordStatus;
}

export interface CandidateProgram {
  program_name: string;
  program_code: string | null;
  stream?: string | null;
  intake?: number | null;
  matched_course_id: number | null;
  match_confidence: number;
  source_url: string;
  evidence_excerpt: string;
  status: CandidateRecordStatus;
}

export interface CandidateSourceRedirect {
  original_url: string;
  redirect_url: string;
  evidence_excerpt: string;
  confidence_score: number;
}

export type ConflictSeverity = "LOW" | "MEDIUM" | "HIGH";

export type ConflictField =
  | "accepted_exams"
  | "admission_route"
  | "eligibility_criteria"
  | "cutoff"
  | "unit"
  | "year"
  | "round"
  | "program"
  | "duplicate_cutoff";

export interface CandidateConflict {
  field: ConflictField;
  severity: ConflictSeverity;
  course_id: number | null;
  program_name: string | null;
  existing_value: unknown;
  candidate_value: unknown;
  description: string;
}

export interface ExtractedAdmissionUpdate {
  college_id: string;
  source_id: string;
  source_url: string;
  source_name?: string;
  extraction_method: ExtractionMethod;
  exams: CandidateExam[];
  routes: CandidateRoute[];
  eligibilities: CandidateEligibility[];
  cutoffs: CandidateCutoff[];
  programs: CandidateProgram[];
  redirects?: CandidateSourceRedirect[];
  conflicts: CandidateConflict[];
  anomalies: string[];
  is_pdf: boolean;
  status: "PARSED" | "PENDING_REVIEW" | "PENDING_PDF_REVIEW" | "ERROR";
  overall_confidence: number;
  extracted_at: string;
  error_message?: string;
}

export interface KnownCourseReference {
  id: number;
  course_name: string;
  stream: string | null;
  accepted_exams?: string[] | null;
  admission_route?: string | null;
  eligibility_criteria?: string | null;
  admission_verification_status?: string | null;
}

export interface ParserContext {
  collegeId: string;
  sourceId: string;
  sourceUrl: string;
  sourceName?: string;
  sourceType?: SourceType;
  knownCourses?: KnownCourseReference[];
  currentCollegeData?: {
    name: string;
    accepted_exams?: string[] | null;
    admission_route?: string | null;
    eligibility_criteria?: string | null;
    admission_verification_status?: string | null;
  };
}

export interface ExtractorOptions {
  allowLLMFallback?: boolean;
  forceLLM?: boolean;
  skipConflictDetection?: boolean;
}

export interface LLMExtractionResult {
  success: boolean;
  data?: ExtractedAdmissionUpdate;
  provider?: "gemini" | "openai";
  rawResponse?: string;
  error?: string;
}

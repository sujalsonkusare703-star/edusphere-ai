/**
 * EduSphere AI — Automated College Intelligence Update System
 * NATA / Architecture Deterministic Parser (Phase 3 Step 4D)
 */

import type {
  CandidateCutoff,
  CandidateExam,
  CandidateRoute,
  CandidateEligibility,
  CandidateProgram,
  ExtractedAdmissionUpdate,
  ParserContext
} from "../types";
import { validateCandidateCutoff } from "../validation";
import { extractYearExplicit, extractRoundExplicit } from "./mht-cet";

export function parseNATA(text: string, context: ParserContext): ExtractedAdmissionUpdate {
  const cutoffs: CandidateCutoff[] = [];
  const exams: CandidateExam[] = [];
  const routes: CandidateRoute[] = [];
  const eligibilities: CandidateEligibility[] = [];
  const programs: CandidateProgram[] = [];
  const anomalies: string[] = [];

  const year = extractYearExplicit(text);
  const round = extractRoundExplicit(text);

  // Route Candidate
  routes.push({
    admission_route: "Directorate of Technical Education (CAP Architecture) / COA",
    course_id: null,
    program_name: null,
    source_url: context.sourceUrl,
    evidence_excerpt: text.slice(0, 250).trim(),
    confidence_score: 0.98,
    status: "VALID"
  });

  // Exam Candidate
  exams.push({
    accepted_exams: ["NATA"],
    course_id: null,
    program_name: null,
    source_url: context.sourceUrl,
    evidence_excerpt: "Admission to B.Arch requires a valid NATA score",
    confidence_score: 0.99,
    status: "VALID"
  });

  // Program Candidate
  programs.push({
    program_name: "Bachelor of Architecture (B.Arch)",
    program_code: "BARCH",
    stream: "Architecture",
    matched_course_id: null,
    match_confidence: 0.95,
    source_url: context.sourceUrl,
    evidence_excerpt: "Bachelor of Architecture program",
    status: "VALID"
  });

  // Eligibility Candidate
  const eligMatch = text.match(/(?:10\+2\s*with\s*physics,\s*chemistry\s*and\s*math(?:ematics)?|valid\s*nata\s*score)[^.\n]{0,100}/i);
  if (eligMatch) {
    eligibilities.push({
      eligibility_criteria: eligMatch[0].trim(),
      is_source_stated: true,
      course_id: null,
      program_name: "Bachelor of Architecture (B.Arch)",
      source_url: context.sourceUrl,
      evidence_excerpt: eligMatch[0].trim(),
      confidence_score: 0.94,
      status: "VALID"
    });
  }

  // Parse lines for NATA cutoffs (out of 200)
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;

    // e.g. "B.Arch OPEN Cutoff: 138 marks" or "OPEN: 138 / 200"
    const catRegex = /\b(OPEN|OBC|SC|ST|EWS)\s*[:=–-]?\s*([0-9]{2,3}(?:\.[0-9]{1,2})?)(?:\s*(?:marks|\/200))?/gi;
    let match: RegExpExecArray | null;

    while ((match = catRegex.exec(line)) !== null) {
      const category = match[1].toUpperCase();
      const scoreVal = parseFloat(match[2]);

      const candidate: CandidateCutoff = {
        exam: "NATA",
        quota: "Home State",
        category,
        value: scoreVal,
        unit: "marks",
        year,
        round,
        course_id: null,
        program_name: "Bachelor of Architecture (B.Arch)",
        source_url: context.sourceUrl,
        evidence_excerpt: line.trim(),
        confidence_score: 0.96,
        status: "VALID"
      };

      const valRes = validateCandidateCutoff(candidate);
      if (!valRes.valid) {
        candidate.status = "INVALID";
        candidate.validation_notes = valRes.errors;
        anomalies.push(...valRes.anomalies);
      } else if (valRes.status === "ANOMALY") {
        candidate.status = "ANOMALY";
        anomalies.push(...valRes.anomalies);
      }

      cutoffs.push(candidate);
    }
  }

  return {
    college_id: context.collegeId,
    source_id: context.sourceId,
    source_url: context.sourceUrl,
    source_name: context.sourceName,
    extraction_method: "DETERMINISTIC",
    exams,
    routes,
    eligibilities,
    cutoffs,
    programs,
    conflicts: [],
    anomalies,
    is_pdf: false,
    status: "PARSED",
    overall_confidence: cutoffs.length > 0 ? 0.96 : 0.88,
    extracted_at: new Date().toISOString()
  };
}

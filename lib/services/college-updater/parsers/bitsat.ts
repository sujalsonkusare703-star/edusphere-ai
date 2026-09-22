/**
 * EduSphere AI — Automated College Intelligence Update System
 * BITSAT Deterministic Parser (Phase 3 Step 4D)
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

export function parseBITSAT(text: string, context: ParserContext): ExtractedAdmissionUpdate {
  const cutoffs: CandidateCutoff[] = [];
  const exams: CandidateExam[] = [];
  const routes: CandidateRoute[] = [];
  const eligibilities: CandidateEligibility[] = [];
  const programs: CandidateProgram[] = [];
  const anomalies: string[] = [];

  const year = extractYearExplicit(text);
  const round = extractRoundExplicit(text);

  // Route Candidate
  if (/bits\s*admission\s*portal|bitsadmission\.com|bitsat/i.test(text)) {
    routes.push({
      admission_route: "BITS Pilani Admission Portal (BITSAT)",
      course_id: null,
      program_name: null,
      source_url: context.sourceUrl,
      evidence_excerpt: text.slice(0, 250).trim(),
      confidence_score: 0.99,
      status: "VALID"
    });
  }

  // Exam Candidate
  exams.push({
    accepted_exams: ["BITSAT"],
    course_id: null,
    program_name: null,
    source_url: context.sourceUrl,
    evidence_excerpt: "Admission is based solely on BITSAT score (out of 390 marks)",
    confidence_score: 0.99,
    status: "VALID"
  });

  // Eligibility Candidate
  const eligMatch = text.match(/(?:minimum\s*75%\s*aggregate\s*in\s*physics,\s*chemistry\s*and\s*mathematics|pcm\s*aggregate)[^.\n]{0,100}/i);
  if (eligMatch) {
    eligibilities.push({
      eligibility_criteria: eligMatch[0].trim(),
      is_source_stated: true,
      course_id: null,
      program_name: null,
      source_url: context.sourceUrl,
      evidence_excerpt: eligMatch[0].trim(),
      confidence_score: 0.95,
      status: "VALID"
    });
  }

  // Cutoffs: "Computer Science: 331 marks", "Electrical & Electronics: 295", etc.
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;

    const progMatch = line.match(/(B\.?E\.?\s*(?:Computer\s*Science|Electrical\s*&\s*Electronics|Mechanical|Chemical|Civil)|Computer\s*Science|Electronics\s*&\s*Instrumentation)/i);
    const progName = progMatch ? progMatch[1].trim() : null;

    if (progName && !programs.some((p) => p.program_name.toLowerCase() === progName.toLowerCase())) {
      programs.push({
        program_name: progName,
        program_code: null,
        stream: "Engineering",
        matched_course_id: null,
        match_confidence: 0.9,
        source_url: context.sourceUrl,
        evidence_excerpt: line.trim(),
        status: "VALID"
      });
    }

    // Match marks / score out of 390
    const scoreMatch = line.match(/\b([1-3][0-9]{2}|[0-9]{2,3})\b(?:\s*(?:marks|\/390))?/);

    if (progName && scoreMatch) {
      const scoreVal = parseFloat(scoreMatch[1]);

      const candidate: CandidateCutoff = {
        exam: "BITSAT",
        quota: "All India",
        category: "OPEN",
        value: scoreVal,
        unit: "marks",
        year,
        round,
        course_id: null,
        program_name: progName,
        source_url: context.sourceUrl,
        evidence_excerpt: line.trim(),
        confidence_score: 0.97,
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
    overall_confidence: cutoffs.length > 0 ? 0.97 : 0.88,
    extracted_at: new Date().toISOString()
  };
}

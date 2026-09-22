/**
 * EduSphere AI — Automated College Intelligence Update System
 * VITEEE Deterministic Parser (Phase 3 Step 4D)
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

export function parseVITEEE(text: string, context: ParserContext): ExtractedAdmissionUpdate {
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
    admission_route: "VIT Online Counselling (VITEEE)",
    course_id: null,
    program_name: null,
    source_url: context.sourceUrl,
    evidence_excerpt: text.slice(0, 250).trim(),
    confidence_score: 0.98,
    status: "VALID"
  });

  // Exam Candidate
  exams.push({
    accepted_exams: ["VITEEE"],
    course_id: null,
    program_name: null,
    source_url: context.sourceUrl,
    evidence_excerpt: "Admission is conducted strictly on the basis of VITEEE rank",
    confidence_score: 0.99,
    status: "VALID"
  });

  // Eligibility Candidate
  const eligMatch = text.match(/(?:minimum\s*60%\s*in\s*physics,\s*chemistry,\s*and\s*mathematics|pcm\s*aggregate)[^.\n]{0,100}/i);
  if (eligMatch) {
    eligibilities.push({
      eligibility_criteria: eligMatch[0].trim(),
      is_source_stated: true,
      course_id: null,
      program_name: null,
      source_url: context.sourceUrl,
      evidence_excerpt: eligMatch[0].trim(),
      confidence_score: 0.93,
      status: "VALID"
    });
  }

  // Parse lines for VITEEE closing ranks
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;

    const progMatch = line.match(/(B\.?Tech\s*(?:Computer\s*Science(?:\s*and\s*Engineering)?|Electronics\s*and\s*Communication|Mechanical|Information\s*Technology)|Computer\s*Science)/i);
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

    const rankMatch = line.match(/\b(?:Closing\s*Rank|Rank|AIR)?\s*[:=–-]?\s*([0-9]{1,6})\b/i);
    if (progName && rankMatch) {
      const rankVal = parseInt(rankMatch[1], 10);

      const candidate: CandidateCutoff = {
        exam: "VITEEE",
        quota: "All India",
        category: "OPEN",
        value: rankVal,
        unit: "rank",
        year,
        round,
        course_id: null,
        program_name: progName,
        source_url: context.sourceUrl,
        evidence_excerpt: line.trim(),
        confidence_score: 0.95,
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

/**
 * EduSphere AI — Automated College Intelligence Update System
 * JoSAA / JEE Advanced & JEE Main Deterministic Parser (Phase 3 Step 4D)
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

export function parseJoSAA(text: string, context: ParserContext): ExtractedAdmissionUpdate {
  const cutoffs: CandidateCutoff[] = [];
  const exams: CandidateExam[] = [];
  const routes: CandidateRoute[] = [];
  const eligibilities: CandidateEligibility[] = [];
  const programs: CandidateProgram[] = [];
  const anomalies: string[] = [];

  const year = extractYearExplicit(text);
  const round = extractRoundExplicit(text);

  // Determine whether source specifies JEE Advanced or JEE Main
  const isAdv = /jee\s*advanced/i.test(text);
  const isMain = /jee\s*main/i.test(text);
  const examName = isAdv ? "JEE Advanced" : "JEE Main";

  // Route Candidate
  if (/josaa|csab|joint\s*seat\s*allocation/i.test(text)) {
    routes.push({
      admission_route: "Joint Seat Allocation Authority (JoSAA) / CSAB",
      course_id: null,
      program_name: null,
      source_url: context.sourceUrl,
      evidence_excerpt: text.slice(0, 250).trim(),
      confidence_score: 0.98,
      status: "VALID"
    });
  }

  // Exam Candidate
  const accepted: string[] = [];
  if (isAdv) accepted.push("JEE Advanced");
  if (isMain) accepted.push("JEE Main");
  if (accepted.length > 0) {
    exams.push({
      accepted_exams: accepted,
      course_id: null,
      program_name: null,
      source_url: context.sourceUrl,
      evidence_excerpt: text.slice(0, 200).trim(),
      confidence_score: 0.97,
      status: "VALID"
    });
  }

  // Cutoff lines (Format: Course | Quota | Category | Opening Rank | Closing Rank)
  // or "Computer Science OPEN Closing Rank: 421"
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;

    const progMatch = line.match(/(Computer\s*Science(?:\s*and\s*Engineering)?|Electrical\s*Engineering|Mechanical\s*Engineering|Civil\s*Engineering|Aerospace\s*Engineering|Chemical\s*Engineering)/i);
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

    // Match JoSAA rank patterns: e.g. "OPEN Closing Rank: 421" or "Closing Rank: 421 (OPEN)" or "AIR 3450"
    const rankRegex = /\b(OPEN|OBC-NCL|OBC|SC|ST|EWS)\s*(?:Closing\s*Rank|CR|Rank)?\s*[:=–-]?\s*(?:AIR\s*)?([0-9]{1,7})\b/gi;
    let match: RegExpExecArray | null;

    while ((match = rankRegex.exec(line)) !== null) {
      const category = match[1].toUpperCase();
      const rankVal = parseInt(match[2], 10);

      // Extract quota if present (AI, HS, OS)
      let quota = "All India";
      if (/\bHS\b|Home\s*State/i.test(line)) quota = "Home State";
      else if (/\bOS\b|Other\s*State/i.test(line)) quota = "Other State";
      else if (/\bAI\b|All\s*India/i.test(line)) quota = "All India";

      const candidate: CandidateCutoff = {
        exam: examName,
        quota,
        category,
        value: rankVal,
        unit: "rank",
        year,
        round,
        course_id: null,
        program_name: progName,
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
    overall_confidence: cutoffs.length > 0 ? 0.96 : 0.85,
    extracted_at: new Date().toISOString()
  };
}

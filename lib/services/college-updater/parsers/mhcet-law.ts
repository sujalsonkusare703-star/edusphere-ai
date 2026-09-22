/**
 * EduSphere AI — Automated College Intelligence Update System
 * MH CET Law Deterministic Parser (Phase 3 Step 4D)
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

export function parseMHCETLaw(text: string, context: ParserContext): ExtractedAdmissionUpdate {
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
    admission_route: "Maharashtra State CET Cell (CAP Law)",
    course_id: null,
    program_name: null,
    source_url: context.sourceUrl,
    evidence_excerpt: text.slice(0, 250).trim(),
    confidence_score: 0.98,
    status: "VALID"
  });

  // Exam Candidate
  exams.push({
    accepted_exams: ["MH CET Law"],
    course_id: null,
    program_name: null,
    source_url: context.sourceUrl,
    evidence_excerpt: "Admission based on MH CET Law score (out of 150 marks)",
    confidence_score: 0.99,
    status: "VALID"
  });

  // Eligibility Candidate
  const eligMatch = text.match(/(?:10\+2\s*with\s*minimum\s*45%|aggregate\s*marks|qualifying\s*examination)[^.\n]{0,100}/i);
  if (eligMatch) {
    eligibilities.push({
      eligibility_criteria: eligMatch[0].trim(),
      is_source_stated: true,
      course_id: null,
      program_name: null,
      source_url: context.sourceUrl,
      evidence_excerpt: eligMatch[0].trim(),
      confidence_score: 0.92,
      status: "VALID"
    });
  }

  // Parse lines for MH CET Law cutoffs (score out of 150)
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;

    const progMatch = line.match(/(B\.?A\.?\s*LL\.?B\.?(?:\s*\(5\s*Years?\))?|B\.?B\.?A\.?\s*LL\.?B\.?|LL\.?B\.?(?:\s*\(3\s*Years?\))?)/i);
    const progName = progMatch ? progMatch[1].trim() : null;

    if (progName && !programs.some((p) => p.program_name.toLowerCase() === progName.toLowerCase())) {
      programs.push({
        program_name: progName,
        program_code: null,
        stream: "Law",
        matched_course_id: null,
        match_confidence: 0.9,
        source_url: context.sourceUrl,
        evidence_excerpt: line.trim(),
        status: "VALID"
      });
    }

    const catRegex = /\b(OPEN|OBC|SC|ST|EWS|OMS)\s*[:=–-]?\s*([0-9]{2,3}(?:\.[0-9]{1,2})?)(?:\s*(?:marks|score|\/150))?/gi;
    let match: RegExpExecArray | null;

    while ((match = catRegex.exec(line)) !== null) {
      const category = match[1].toUpperCase();
      const scoreVal = parseFloat(match[2]);

      const candidate: CandidateCutoff = {
        exam: "MH CET Law",
        quota: category === "OMS" ? "Other State" : "Home State",
        category: category === "OMS" ? "OPEN" : category,
        value: scoreVal,
        unit: "score",
        year,
        round,
        course_id: null,
        program_name: progName || "B.A. LL.B.",
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

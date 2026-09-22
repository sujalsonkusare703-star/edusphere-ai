/**
 * EduSphere AI — Automated College Intelligence Update System
 * MHT-CET State CET Cell Deterministic Parser (Phase 3 Step 4D)
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

/**
 * Extracts year explicitly from source text. Never defaults to current year.
 */
export function extractYearExplicit(text: string): number | null {
  const match = text.match(/\b(?:AY\s*|Academic\s*Year\s*|Admission\s*|CAP\s*|Year\s*)?(202[4-9])(?:-(?:2[5-9]|3[0-9]))?\b/i);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return null;
}

/**
 * Extracts round explicitly from source text. Never defaults to Round 1.
 */
export function extractRoundExplicit(text: string): string | null {
  const match = text.match(/\b(CAP\s*Round\s*[1-4]|Round\s*[1-4]|Special\s*Round|Mop-up\s*Round|Institutional\s*Round)\b/i);
  if (match && match[1]) {
    return match[1].replace(/\s+/g, " ").trim();
  }
  return null;
}

/**
 * Parses MHT-CET / Maharashtra CAP admission announcements, circulars, and cutoffs.
 */
export function parseMHTCETSource(text: string, context: ParserContext): ExtractedAdmissionUpdate {
  const cutoffs: CandidateCutoff[] = [];
  const exams: CandidateExam[] = [];
  const routes: CandidateRoute[] = [];
  const eligibilities: CandidateEligibility[] = [];
  const programs: CandidateProgram[] = [];
  const anomalies: string[] = [];

  const year = extractYearExplicit(text);
  const round = extractRoundExplicit(text);

  // 1. Route Candidate
  if (/centralized\s*admission\s*process|cap\b|state\s*cet\s*cell/i.test(text)) {
    const routeExcerpt = text.slice(0, 300).trim();
    routes.push({
      admission_route: "Maharashtra State Centralized Admission Process (CAP)",
      course_id: null,
      program_name: null,
      source_url: context.sourceUrl,
      evidence_excerpt: routeExcerpt,
      confidence_score: 0.98,
      status: "VALID"
    });
  }

  // 2. Exam Candidate
  const hasMhtCet = /mht[\s-]?cet/i.test(text);
  const hasJeeMain = /jee\s*main/i.test(text);
  if (hasMhtCet || hasJeeMain) {
    const accepted: string[] = [];
    if (hasMhtCet) accepted.push("MHT-CET");
    if (hasJeeMain) accepted.push("JEE Main");

    const matchEx = text.match(/(?:accepted\s*exams?|admission\s*through|entrance\s*examination)[^.\n]{5,150}/i);
    exams.push({
      accepted_exams: accepted,
      course_id: null,
      program_name: null,
      source_url: context.sourceUrl,
      evidence_excerpt: matchEx ? matchEx[0].trim() : text.slice(0, 200).trim(),
      confidence_score: 0.96,
      status: "VALID"
    });
  }

  // 3. Eligibility Candidate
  const eligMatch = text.match(/(?:eligibility|qualification|minimum\s*marks)[^.\n]{10,250}(?:pcm|aggregate|physics)[^.\n]{0,100}/i);
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

  // 4. Cutoff Candidates (Patterns: Program Name + Category + Percentile)
  // e.g. "Computer Engineering OPEN: 99.45%ile, OBC: 98.20%ile"
  // or "GOPENH: 98.75 GOPENO: 99.12"
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;

    // Pattern A: Multi-category line: "Computer Engineering - OPEN: 99.45%ile, OBC: 98.20%ile, SC: 95.10%ile"
    const progMatch = line.match(/(Computer\s*Engineering|Computer\s*Science|Information\s*Technology|Mechanical\s*Engineering|Civil\s*Engineering|Electrical\s*Engineering|Electronics(?:\s*and\s*Telecommunication)?|AI\s*(?:&|and)?\s*Data\s*Science)/i);
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

    // Match categories: OPEN, OBC, SC, ST, EWS, TFWS with numeric values
    const catRegex = /\b(OPEN|OBC|SC|ST|EWS|TFWS|GOPENH|GOPENO|LOPENH|LOPENO|GOBC|GSC|GST)\s*[:=–-]?\s*([0-9]{1,3}(?:\.[0-9]{1,7})?)(?:\s*(%ile|percentile|marks))?/gi;
    let match: RegExpExecArray | null;

    while ((match = catRegex.exec(line)) !== null) {
      let rawCat = match[1].toUpperCase();
      const valStr = match[2];
      const unitStr = match[3]?.toLowerCase();
      const val = parseFloat(valStr);

      let quota: string | null = null;
      if (rawCat.endsWith("H")) {
        quota = "Home State";
        rawCat = rawCat.slice(1, -1) || "OPEN";
      } else if (rawCat.endsWith("O")) {
        quota = "Other State";
        rawCat = rawCat.slice(1, -1) || "OPEN";
      }

      if (rawCat.startsWith("G") && rawCat.length > 1 && rawCat !== "GST") {
        rawCat = rawCat.slice(1);
      } else if (rawCat.startsWith("L") && rawCat.length > 1) {
        rawCat = rawCat.slice(1);
      }

      // Default unit for MHT-CET is percentile unless explicit marks stated
      const unit = unitStr === "marks" ? "marks" : "percentile";

      const candidate: CandidateCutoff = {
        exam: "MHT-CET",
        quota,
        category: rawCat,
        value: val,
        unit,
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
    overall_confidence: cutoffs.length > 0 ? 0.95 : 0.85,
    extracted_at: new Date().toISOString()
  };
}

/**
 * EduSphere AI — Automated College Intelligence Update System
 * Tabular Data Deterministic Parser (Phase 3 Step 4D)
 */

import type {
  CandidateCutoff,
  CandidateProgram,
  ExtractedAdmissionUpdate,
  ParserContext,
  CutoffUnit
} from "../types";
import { validateCandidateCutoff } from "../validation";
import { extractYearExplicit, extractRoundExplicit } from "./mht-cet";

/**
 * Strips HTML tags from cell text.
 */
function cleanCell(cell: string): string {
  return cell.replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").trim();
}

/**
 * Infers unit from cell text or header text.
 */
function inferUnit(valStr: string, header: string, exam: string): CutoffUnit {
  const combined = (valStr + " " + header + " " + exam).toLowerCase();
  if (combined.includes("rank") || combined.includes("air") || combined.includes("cr")) return "rank";
  if (combined.includes("percentile") || combined.includes("%ile") || combined.includes("%")) return "percentile";
  if (combined.includes("marks") || combined.includes("/200") || combined.includes("/390")) return "marks";
  if (combined.includes("score") || combined.includes("/150")) return "score";

  // Default by exam if known
  const exUpper = exam.toUpperCase();
  if (exUpper.includes("MHT")) return "percentile";
  if (exUpper.includes("JEE") || exUpper.includes("VITEEE")) return "rank";
  if (exUpper.includes("BITSAT") || exUpper.includes("NATA")) return "marks";
  if (exUpper.includes("LAW")) return "score";

  return "percentile";
}

/**
 * Parses tabular content (HTML <table> or pipe-delimited text).
 */
export function parseTableSource(text: string, context: ParserContext): ExtractedAdmissionUpdate {
  const cutoffs: CandidateCutoff[] = [];
  const programs: CandidateProgram[] = [];
  const anomalies: string[] = [];

  const defaultYear = extractYearExplicit(text);
  const defaultRound = extractRoundExplicit(text);

  // 1. Check for HTML tables
  const tableMatches = text.match(/<table[\s\S]*?<\/table>/gi);
  const rowsToProcess: string[][] = [];

  if (tableMatches && tableMatches.length > 0) {
    for (const tableHtml of tableMatches) {
      const trMatches = tableHtml.match(/<tr[\s\S]*?<\/tr>/gi);
      if (!trMatches) continue;

      for (const tr of trMatches) {
        const cellMatches = tr.match(/<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi);
        if (!cellMatches) continue;
        const cells = cellMatches.map(cleanCell);
        if (cells.length >= 2) {
          rowsToProcess.push(cells);
        }
      }
    }
  } else {
    // 2. Fallback: Parse pipe-delimited or tab-delimited rows
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      if (line.includes("|")) {
        const parts = line.split("|").map((p) => p.trim()).filter((p) => p.length > 0);
        if (parts.length >= 2 && !line.includes("---")) {
          rowsToProcess.push(parts);
        }
      } else if (line.includes("\t")) {
        const parts = line.split("\t").map((p) => p.trim()).filter((p) => p.length > 0);
        if (parts.length >= 2) {
          rowsToProcess.push(parts);
        }
      }
    }
  }

  if (rowsToProcess.length >= 2) {
    // Detect header indices
    const header = rowsToProcess[0].map((h) => h.toLowerCase());
    let progIdx = header.findIndex((h) => h.includes("program") || h.includes("course") || h.includes("branch"));
    let catIdx = header.findIndex((h) => h.includes("category") || h.includes("caste") || h.includes("quota"));
    let cutIdx = header.findIndex((h) => h.includes("cutoff") || h.includes("percentile") || h.includes("rank") || h.includes("score") || h.includes("marks") || h.includes("closing"));
    const examIdx = header.findIndex((h) => h.includes("exam"));
    const yearIdx = header.findIndex((h) => h.includes("year"));
    const roundIdx = header.findIndex((h) => h.includes("round"));

    // Fallbacks if header is not explicitly labeled
    if (progIdx === -1 && cutIdx === -1) {
      progIdx = 0;
      cutIdx = 1;
      catIdx = rowsToProcess[0].length > 2 ? 2 : -1;
    }

    const headerCutoffText = cutIdx !== -1 ? header[cutIdx] : "";

    for (let i = 1; i < rowsToProcess.length; i++) {
      const row = rowsToProcess[i];
      if (progIdx === -1 || cutIdx === -1 || cutIdx >= row.length) continue;

      const progName = row[progIdx];
      const cutRaw = row[cutIdx];
      const catRaw = catIdx !== -1 && catIdx < row.length ? row[catIdx] : "OPEN";
      const examRaw = examIdx !== -1 && examIdx < row.length ? row[examIdx] : "MHT-CET";
      const rowYear = yearIdx !== -1 && yearIdx < row.length ? parseInt(row[yearIdx], 10) : defaultYear;
      const rowRound = roundIdx !== -1 && roundIdx < row.length ? row[roundIdx] : defaultRound;

      const numMatch = cutRaw.match(/([0-9]{1,7}(?:\.[0-9]{1,7})?)/);
      if (!numMatch || !progName) continue;

      const val = parseFloat(numMatch[1]);
      const unit = inferUnit(cutRaw, headerCutoffText, examRaw);

      if (!programs.some((p) => p.program_name.toLowerCase() === progName.toLowerCase())) {
        programs.push({
          program_name: progName,
          program_code: null,
          matched_course_id: null,
          match_confidence: 0.9,
          source_url: context.sourceUrl,
          evidence_excerpt: row.join(" | "),
          status: "VALID"
        });
      }

      const candidate: CandidateCutoff = {
        exam: examRaw,
        quota: "Home State",
        category: catRaw.toUpperCase(),
        value: val,
        unit,
        year: isNaN(rowYear as number) ? null : rowYear,
        round: rowRound,
        course_id: null,
        program_name: progName,
        source_url: context.sourceUrl,
        evidence_excerpt: row.join(" | "),
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
    extraction_method: "TABLE",
    exams: [],
    routes: [],
    eligibilities: [],
    cutoffs,
    programs,
    conflicts: [],
    anomalies,
    is_pdf: false,
    status: "PARSED",
    overall_confidence: cutoffs.length > 0 ? 0.95 : 0.8,
    extracted_at: new Date().toISOString()
  };
}

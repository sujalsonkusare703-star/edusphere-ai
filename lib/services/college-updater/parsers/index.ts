/**
 * EduSphere AI — Automated College Intelligence Update System
 * Parser Registry & Deterministic Dispatcher (Phase 3 Step 4D)
 */

import type { ExtractedAdmissionUpdate, ParserContext } from "../types";
import { parseMHTCETSource, extractYearExplicit, extractRoundExplicit } from "./mht-cet";
import { parseJoSAA } from "./josaa";
import { parseBITSAT } from "./bitsat";
import { parseVITEEE } from "./viteee";
import { parseNATA } from "./nata";
import { parseMHCETLaw } from "./mhcet-law";
import { parseTableSource } from "./table";

export {
  parseMHTCETSource,
  parseJoSAA,
  parseBITSAT,
  parseVITEEE,
  parseNATA,
  parseMHCETLaw,
  parseTableSource,
  extractYearExplicit,
  extractRoundExplicit
};

/**
 * Deterministic Parser Selector: routes source text to the most authoritative
 * domain-specific parser without invoking an LLM.
 */
export function dispatchDeterministicParser(
  text: string,
  context: ParserContext
): ExtractedAdmissionUpdate | null {
  const urlLower = (context.sourceUrl || "").toLowerCase();
  const textLower = text.toLowerCase();

  // 1. BITSAT / BITS Pilani
  if (urlLower.includes("bitsadmission") || urlLower.includes("bits-pilani") || textLower.includes("bitsat") || textLower.includes("bits admission")) {
    const res = parseBITSAT(text, context);
    if (res.cutoffs.length > 0 || res.exams.length > 0) return res;
  }

  // 2. VITEEE / VIT Vellore
  if (urlLower.includes("vit.ac.in") || textLower.includes("viteee") || textLower.includes("vit online counselling")) {
    const res = parseVITEEE(text, context);
    if (res.cutoffs.length > 0 || res.exams.length > 0) return res;
  }

  // 3. NATA / Architecture
  if (urlLower.includes("nata.in") || urlLower.includes("coa.gov.in") || textLower.includes("nata score") || textLower.includes("cap architecture")) {
    const res = parseNATA(text, context);
    if (res.cutoffs.length > 0 || res.exams.length > 0) return res;
  }

  // 4. MH CET Law / Legal Admissions
  if (textLower.includes("mh cet law") || textLower.includes("cap law") || textLower.includes("ll.b.") || textLower.includes("b.a. ll.b.")) {
    const res = parseMHCETLaw(text, context);
    if (res.cutoffs.length > 0 || res.exams.length > 0) return res;
  }

  // 5. JoSAA / JEE Advanced / JEE Main
  if (urlLower.includes("josaa.nic.in") || urlLower.includes("csab.nic.in") || textLower.includes("josaa") || textLower.includes("jee advanced")) {
    const res = parseJoSAA(text, context);
    if (res.cutoffs.length > 0 || res.exams.length > 0) return res;
  }

  // 6. Structured Table Content (HTML or Pipe grid)
  if (text.includes("<table") || (text.includes("|") && text.includes("\n"))) {
    const tableRes = parseTableSource(text, context);
    if (tableRes.cutoffs.length > 0) return tableRes;
  }

  // 7. General Maharashtra State CET Cell CAP
  if (urlLower.includes("cetcell") || textLower.includes("mht-cet") || textLower.includes("cap round") || textLower.includes("centralized admission")) {
    const mhtRes = parseMHTCETSource(text, context);
    if (mhtRes.cutoffs.length > 0 || mhtRes.exams.length > 0 || mhtRes.routes.length > 0) {
      return mhtRes;
    }
  }

  return null;
}

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AcademicProfile } from "@/lib/profile-store";
import { fieldLabel, levelLabel } from "@/lib/degree-master";
import { isMissing } from "./format";
import { cutoffCoverage, fetchAllRows, getCollegeRelated, searchWords, type PuneProgrammeSummary, PROGRAMME_LIST_COLUMNS } from "./queries";
import { dbFieldsFor, dbLevelsFor, COVERED_DISTRICTS } from "./profile-match";
import type { CollegeRelated, PuneCollege, PuneEntranceExam } from "./types";

/**
 * Server-side retrieval for the AI assistant. Everything the model sees comes
 * from pune_* rows fetched here; nothing is taken from the client except the
 * question text, and nothing is made up when a lookup finds no rows.
 */

const STOP_WORDS = new Set(
  (
    "a an and are about any at be between by can colleges college compare data database do does for from get give " +
    "has have how i in institute institutes is it list me much my of offer offers on or please programme programmes " +
    "program programs course courses show tell the there their these this to university versus vs what when where which " +
    "who with fees fee admission admissions cutoff cutoffs scholarship scholarships facilities facility accreditation " +
    "accreditations naac pune district available yet also all its than them they you your should would could best top good " +
    "near details info information about eligible eligibility exam exams entrance match matches profile field"
  ).split(" ")
);

const MAX_COLLEGES = 3;
const MAX_CONTEXT_CHARS = 40_000;

export interface AssistantContext {
  /** Text block handed to the model (and summarised by the fallback reply). */
  text: string;
  colleges: { college: PuneCollege; related: CollegeRelated }[];
  programmes: PuneProgrammeSummary[];
  profileProgrammes: PuneProgrammeSummary[];
  exams: PuneEntranceExam[];
  cutoffCoverage: string[];
  asksAboutProfile: boolean;
}

function keywords(text: string): string[] {
  return searchWords(text)
    .map((w) => w.replace(/^[.'\-/]+|[.'\-/]+$/g, ""))
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w.toLowerCase()));
}

/** Drops missing values so the model only sees what the database actually has. */
function compact<T extends object>(row: T, omit: string[] = []): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    if (omit.includes(k) || isMissing(v)) continue;
    out[k] = String(v);
  }
  return out;
}

async function findColleges(supabase: SupabaseClient, words: string[]): Promise<PuneCollege[]> {
  if (words.length === 0) return [];
  const orFilter = words
    .flatMap((w) => [`college_name_as_published.ilike."%${w}%"`, `short_name.ilike."%${w}%"`])
    .join(",");
  const { data, error } = await supabase
    .from("pune_colleges")
    .select("*")
    .or(orFilter)
    .order("id")
    .range(0, 999);
  if (error) throw new Error(error.message);
  const lowerWords = words.map((w) => w.toLowerCase());
  // Rank by how many question words appear in the name; require at least half of them.
  const scored = ((data ?? []) as PuneCollege[])
    .map((c) => {
      const name = `${c.college_name_as_published} ${c.short_name ?? ""}`.toLowerCase();
      return { c, score: lowerWords.filter((w) => name.includes(w)).length };
    })
    .filter((s) => s.score >= Math.max(1, Math.ceil(lowerWords.length / 2)))
    .sort((a, b) => b.score - a.score || a.c.college_name_as_published.length - b.c.college_name_as_published.length);
  // Same name listed twice (duplicate rows) adds nothing for the model.
  const seen = new Set<string>();
  const out: PuneCollege[] = [];
  for (const { c } of scored) {
    const key = c.college_name_as_published.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
    if (out.length >= MAX_COLLEGES) break;
  }
  return out;
}

async function findProgrammes(supabase: SupabaseClient, words: string[]): Promise<PuneProgrammeSummary[]> {
  if (words.length === 0) return [];
  const cols = ["programme_degree", "programme_name_official", "specialisation", "field"];
  const orFilter = words.flatMap((w) => cols.map((c) => `${c}.ilike."%${w}%"`)).join(",");
  const rows = await fetchAllRows<PuneProgrammeSummary>((from, to) =>
    supabase
      .from("pune_programmes")
      .select(PROGRAMME_LIST_COLUMNS)
      .or(orFilter)
      .order("id")
      .range(from, to) as unknown as PromiseLike<{ data: PuneProgrammeSummary[] | null; error: { message: string } | null }>
  );
  const lowerWords = words.map((w) => w.toLowerCase());
  return rows
    .map((p) => {
      const hay = cols.map((c) => String((p as unknown as Record<string, unknown>)[c] ?? "")).join(" ").toLowerCase();
      return { p, score: lowerWords.filter((w) => hay.includes(w)).length };
    })
    .filter((s) => s.score >= Math.max(1, Math.ceil(lowerWords.length / 2)))
    .sort((a, b) => b.score - a.score || a.p.id - b.p.id)
    .slice(0, 40)
    .map((s) => s.p);
}

async function profileProgrammes(supabase: SupabaseClient, academic: AcademicProfile): Promise<PuneProgrammeSummary[]> {
  const fields = dbFieldsFor(academic.field);
  if (fields.length === 0) return [];
  let q = supabase.from("pune_programmes").select(PROGRAMME_LIST_COLUMNS).in("field", fields);
  const levels = dbLevelsFor(academic.degree_level);
  if (levels.length) q = q.in("degree_level", levels);
  const { data, error } = await q.order("college_name_as_published").order("id").range(0, 29);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as PuneProgrammeSummary[];
}

async function entranceExams(supabase: SupabaseClient): Promise<PuneEntranceExam[]> {
  const { data, error } = await supabase.from("pune_entrance_exams").select("*").order("id").range(0, 199);
  if (error) throw new Error(error.message);
  return (data ?? []) as PuneEntranceExam[];
}

export async function buildAssistantContext(
  supabase: SupabaseClient,
  userMessages: string[],
  academic: AcademicProfile
): Promise<AssistantContext> {
  const latest = userMessages[userMessages.length - 1] ?? "";
  const lower = latest.toLowerCase();
  let words = keywords(latest);
  // Follow-up questions ("what about its fees?") reuse the previous question's names.
  if (words.length === 0 && userMessages.length > 1) words = keywords(userMessages[userMessages.length - 2]);

  const asksAboutProfile = /\b(my|me|i)\b/.test(lower) && /(profile|field|degree|suit|match|for me|eligible)/.test(lower);
  const asksAboutExams = /(exam|entrance|cet|neet|jee|cuet|nata|clat)/.test(lower);

  const [colleges, programmes, profileRows, exams, coverage] = await Promise.all([
    findColleges(supabase, words),
    findProgrammes(supabase, words),
    asksAboutProfile ? profileProgrammes(supabase, academic) : Promise.resolve([]),
    asksAboutExams ? entranceExams(supabase) : Promise.resolve([]),
    cutoffCoverage(supabase),
  ]);
  const collegeData = await Promise.all(colleges.map(async (c) => ({ college: c, related: await getCollegeRelated(supabase, c) })));

  const sections: string[] = [];
  sections.push(
    `DATASET SCOPE: Pune district only (${COVERED_DISTRICTS.join(", ")}). Tables: colleges, programmes, fees, admissions, cutoffs, accreditations, facilities, scholarships, entrance exams. Values not listed for a row are "Not available".`
  );
  sections.push(
    coverage.length
      ? `CUTOFF COVERAGE: cutoff rows exist only for: ${coverage.join("; ")}. Any other programme (for example engineering B.E./B.Tech) has NO cutoff data in the database.`
      : "CUTOFF COVERAGE: the database has no cutoff rows."
  );
  sections.push(
    `STUDENT PROFILE: level=${academic.degree_level ? levelLabel(academic.degree_level) : "not set"}; field=${
      academic.field ? fieldLabel(academic.field) : "not set"
    }; degree=${academic.degree ?? "not set"}; preferred district=${academic.preferred_district ?? "not set"}.`
  );

  for (const { college, related } of collegeData) {
    sections.push(
      [
        `COLLEGE: ${JSON.stringify(compact(college, ["evidence_quote", "latitude", "longitude"]))}`,
        `  PROGRAMMES (${related.programmes.length}): ${JSON.stringify(
          related.programmes.slice(0, 40).map((p) => compact(p, ["college_name_as_published", "district", "evidence_quote", "source_type", "retrieved_date", "affiliating_university"]))
        )}`,
        `  FEES (${related.fees.length}): ${JSON.stringify(related.fees.slice(0, 30).map((f) => compact(f, ["college_name_as_published", "district", "evidence_quote", "source_type"])))}`,
        `  ADMISSIONS (${related.admissions.length}): ${JSON.stringify(related.admissions.slice(0, 15).map((a) => compact(a, ["college_name_as_published", "district", "evidence_quote", "source_type"])))}`,
        `  CUTOFFS (${related.cutoffs.length}): ${JSON.stringify(related.cutoffs.slice(0, 40).map((c) => compact(c, ["college_name_as_published", "district", "evidence_quote", "source_type"])))}`,
        `  ACCREDITATIONS (${related.accreditations.length}): ${JSON.stringify(related.accreditations.slice(0, 10).map((a) => compact(a, ["college_name_as_published", "district", "evidence_quote", "source_type"])))}`,
        `  FACILITIES (${related.facilities.length}): ${JSON.stringify(related.facilities.slice(0, 10).map((f) => compact(f, ["college_name_as_published", "district", "evidence_quote", "source_type"])))}`,
        `  SCHOLARSHIPS (${related.scholarships.length}): ${JSON.stringify(related.scholarships.slice(0, 15).map((s) => compact(s, ["college_name_as_published", "district", "evidence_quote", "source_type"])))}`,
      ].join("\n")
    );
  }

  if (programmes.length) {
    sections.push(
      `PROGRAMMES MATCHING THE QUESTION (first ${programmes.length}): ${JSON.stringify(programmes.map((p) => compact(p, ["district"])))}`
    );
  }
  if (profileRows.length) {
    sections.push(
      `PROGRAMMES MATCHING THE STUDENT'S FIELD (first ${profileRows.length}): ${JSON.stringify(profileRows.map((p) => compact(p, ["district"])))}`
    );
  }
  if (exams.length) {
    sections.push(`ENTRANCE EXAMS: ${JSON.stringify(exams.map((e) => compact(e, ["evidence_quote", "source_type"])))}`);
  }
  if (collegeData.length === 0 && programmes.length === 0 && profileRows.length === 0 && exams.length === 0) {
    sections.push("NO MATCHING ROWS: the database search found no college, programme or exam for this question.");
  }

  let text = sections.join("\n\n");
  if (text.length > MAX_CONTEXT_CHARS) text = `${text.slice(0, MAX_CONTEXT_CHARS)}\n[context truncated]`;

  return { text, colleges: collegeData, programmes, profileProgrammes: profileRows, exams, cutoffCoverage: coverage, asksAboutProfile };
}

export function buildAssistantInstruction(context: AssistantContext): string {
  return [
    "You are the EduSphere AI assistant for students choosing colleges in Pune district, Maharashtra.",
    "RULES:",
    "1. Answer ONLY from the DATABASE CONTEXT below. Do not use outside knowledge about colleges, fees, cutoffs, rankings, placements or salaries.",
    "2. If the answer is not in the context, say plainly that it is not in the EduSphere database (for example: \"Cutoffs for engineering are not available in the database yet.\"). Never estimate, guess or invent numbers, names, dates or links.",
    "3. Fields missing from a row are \"Not available\"; say so instead of filling them in.",
    "4. Quote numbers exactly as stored and mention the academic year when the row has one. Fees are in INR.",
    "5. Do not predict admission chances or rank colleges; you may list what the data shows.",
    "6. Keep answers short and use bullet points. When useful, give the source link from the row.",
    "",
    "DATABASE CONTEXT:",
    context.text,
  ].join("\n");
}

function programmeName(p: PuneProgrammeSummary): string {
  if (!isMissing(p.programme_name_official)) return String(p.programme_name_official);
  if (!isMissing(p.programme_degree)) return String(p.programme_degree);
  return "Programme name not available";
}

/** Deterministic answer used when no AI provider is configured or reachable. */
export function groundedReply(context: AssistantContext, question: string): string {
  const lower = question.toLowerCase();
  const lines: string[] = [];
  const v = (x: string | null | undefined) => (isMissing(x) ? "Not available" : String(x));

  if (/cutoff|cut-off|cut off|merit/.test(lower)) {
    lines.push(
      context.cutoffCoverage.length
        ? `**Cutoff data in the database** covers only: ${context.cutoffCoverage.join(", ")}. Other programmes (for example engineering) have no cutoff data yet.`
        : "The database has no cutoff data yet."
    );
  }

  for (const { college, related } of context.colleges) {
    lines.push(`\n**${college.college_name_as_published}** (${v(college.taluka)}, ${college.district})`);
    lines.push(`• University: ${v(college.affiliating_university)} · NAAC grade: ${v(college.naac_grade)}`);
    lines.push(`• Programmes recorded: ${related.programmes.length}`);
    const fees = related.fees.slice(0, 5);
    if (fees.length) {
      for (const f of fees) {
        lines.push(`• Fee: ${v(f.programme_degree)} (${v(f.academic_year)}): total ${v(f.total_annual_fee_inr)} INR per year`);
      }
    } else {
      lines.push("• Fees: Not available in the database");
    }
    const exams = Array.from(new Set(related.admissions.map((a) => a.entrance_exam).filter((e) => !isMissing(e))));
    lines.push(`• Entrance exams (admissions): ${exams.length ? exams.join(", ") : "Not available"}`);
    lines.push(`• Cutoff records: ${related.cutoffs.length || "Not available"}`);
    lines.push(`• Scholarships recorded: ${related.scholarships.length}`);
  }

  const progs = context.colleges.length ? [] : context.programmes.slice(0, 10);
  if (progs.length) {
    lines.push(`\n**Programmes in the database matching your question** (showing ${progs.length}):`);
    for (const p of progs) lines.push(`• ${programmeName(p)} at ${p.college_name_as_published}`);
  }
  if (context.profileProgrammes.length) {
    lines.push(`\n**Programmes matching your profile field** (showing ${Math.min(10, context.profileProgrammes.length)}):`);
    for (const p of context.profileProgrammes.slice(0, 10)) {
      lines.push(`• ${programmeName(p)} at ${p.college_name_as_published}`);
    }
  } else if (context.asksAboutProfile) {
    lines.push("\nI could not match your profile field to programmes in the database. Please check your field on the profile page.");
  }
  if (context.exams.length) {
    lines.push("\n**Entrance exams in the database:**");
    for (const e of context.exams.slice(0, 15)) lines.push(`• ${v(e.exam_name)}: used for ${v(e.used_for_programmes)}`);
  }

  if (lines.length === 0) {
    return "I could not find that in the EduSphere database. The database covers colleges in Pune district and their programmes, fees, admissions, cutoffs, accreditations, facilities and scholarships. Try asking with a college or programme name.";
  }
  return `${lines.join("\n").trim()}\n\n> Only data from the EduSphere database is shown. Anything not listed is not available in the database.`;
}

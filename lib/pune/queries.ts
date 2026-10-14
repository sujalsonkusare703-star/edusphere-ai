import type { SupabaseClient } from "@supabase/supabase-js";
import {
  COLLEGE_SUMMARY_COLUMNS,
  type CollegeRelated,
  type PuneCollege,
  type PuneCollegeSummary,
  type PuneProgramme,
} from "./types";

/**
 * Read-only queries over the pune_* tables. Nothing here reads the old
 * colleges / programs / saved_items tables.
 *
 * - Lists use range() with a stable order (name, then id) so the 1,000-row
 *   PostgREST cap never silently truncates results.
 * - User search text never reaches a filter string unescaped: it is reduced to
 *   letters, digits and a few punctuation marks (searchWords), so it cannot add
 *   filter operators or LIKE wildcards.
 */

export const PAGE_SIZE = 24;
const MAX_ROWS_PER_REQUEST = 1000;

export interface Page<T> {
  rows: T[];
  total: number;
}

/** Splits search text into at most 6 safe words (letters, digits, . & ' + / -). */
export function searchWords(input: string): string[] {
  return input
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}.&'+/\-\s]/gu, " ")
    .split(/\s+/)
    .map((w) => w.slice(0, 40))
    .filter((w) => w.length > 0)
    .slice(0, 6);
}

/** Escapes LIKE wildcards so a stored value is matched literally (case-insensitive). */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** PostgREST or-filter: `word` (already reduced by searchWords) in any of `columns`. */
function anyColumnContains(columns: readonly string[], word: string): string {
  return columns.map((c) => `${c}.ilike."%${word}%"`).join(",");
}

/** Reads every row of a query in 1,000-row pages. `build` must apply a stable order. */
export async function fetchAllRows<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += MAX_ROWS_PER_REQUEST) {
    const { data, error } = await build(from, from + MAX_ROWS_PER_REQUEST - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < MAX_ROWS_PER_REQUEST) return rows;
  }
}

function pageRange(page: number, pageSize: number): [number, number] {
  const safePage = Math.max(1, Math.floor(page) || 1);
  const from = (safePage - 1) * pageSize;
  return [from, from + pageSize - 1];
}

// ---------------------------------------------------------------- colleges

export async function searchColleges(
  supabase: SupabaseClient,
  opts: { query?: string; page?: number; pageSize?: number }
): Promise<Page<PuneCollegeSummary>> {
  const pageSize = opts.pageSize ?? PAGE_SIZE;
  const [from, to] = pageRange(opts.page ?? 1, pageSize);

  let q = supabase.from("pune_colleges").select(COLLEGE_SUMMARY_COLUMNS, { count: "exact" });
  for (const word of searchWords(opts.query ?? "")) {
    q = q.or(anyColumnContains(["college_name_as_published", "short_name", "taluka", "city"], word));
  }
  const { data, error, count } = await q
    .order("college_name_as_published", { ascending: true })
    .order("id", { ascending: true })
    .range(from, to);
  if (error) throw new Error(error.message);
  return { rows: (data ?? []) as unknown as PuneCollegeSummary[], total: count ?? 0 };
}

export async function getCollege(supabase: SupabaseClient, id: number): Promise<PuneCollege | null> {
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  const { data, error } = await supabase.from("pune_colleges").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as PuneCollege | null) ?? null;
}

export async function getCollegesByIds(supabase: SupabaseClient, ids: number[]): Promise<PuneCollege[]> {
  const clean = ids.filter((id) => Number.isSafeInteger(id) && id > 0).slice(0, 200);
  if (clean.length === 0) return [];
  const { data, error } = await supabase.from("pune_colleges").select("*").in("id", clean).order("id");
  if (error) throw new Error(error.message);
  return (data ?? []) as PuneCollege[];
}

/**
 * All rows of one child table that belong to a college. Child tables link by
 * name + district, not by id; the name is matched case-insensitively but
 * otherwise literally (some cutoff rows differ from the college list only in case).
 */
async function rowsForCollege<T>(
  supabase: SupabaseClient,
  table: string,
  college: Pick<PuneCollege, "college_name_as_published" | "district">
): Promise<T[]> {
  return fetchAllRows<T>((from, to) =>
    supabase
      .from(table)
      .select("*")
      .ilike("college_name_as_published", escapeLike(college.college_name_as_published))
      .eq("district", college.district)
      .order("id")
      .range(from, to) as unknown as PromiseLike<{ data: T[] | null; error: { message: string } | null }>
  );
}

export async function getCollegeRelated(
  supabase: SupabaseClient,
  college: Pick<PuneCollege, "college_name_as_published" | "district">
): Promise<CollegeRelated> {
  const [programmes, fees, admissions, accreditations, cutoffs, facilities, scholarships] = await Promise.all([
    rowsForCollege<CollegeRelated["programmes"][number]>(supabase, "pune_programmes", college),
    rowsForCollege<CollegeRelated["fees"][number]>(supabase, "pune_fees", college),
    rowsForCollege<CollegeRelated["admissions"][number]>(supabase, "pune_admissions", college),
    rowsForCollege<CollegeRelated["accreditations"][number]>(supabase, "pune_accreditations", college),
    rowsForCollege<CollegeRelated["cutoffs"][number]>(supabase, "pune_cutoffs", college),
    rowsForCollege<CollegeRelated["facilities"][number]>(supabase, "pune_facilities", college),
    rowsForCollege<CollegeRelated["scholarships"][number]>(supabase, "pune_scholarships", college),
  ]);
  return { programmes, fees, admissions, accreditations, cutoffs, facilities, scholarships };
}

/** Finds the pune_colleges row a child row belongs to (case-insensitive name + district). */
export async function findCollegeIdByName(
  supabase: SupabaseClient,
  name: string,
  district: string
): Promise<number | null> {
  const { data, error } = await supabase
    .from("pune_colleges")
    .select("id")
    .ilike("college_name_as_published", escapeLike(name))
    .eq("district", district)
    .order("id")
    .limit(1);
  if (error) throw new Error(error.message);
  return (data?.[0]?.id as number | undefined) ?? null;
}

// -------------------------------------------------------------- programmes

export const PROGRAMME_LIST_COLUMNS =
  "id,college_name_as_published,district,field,degree_level,programme_degree,programme_name_official,specialisation,duration_years,intake_seats,entrance_exam";

export type PuneProgrammeSummary = Pick<
  PuneProgramme,
  | "id"
  | "college_name_as_published"
  | "district"
  | "field"
  | "degree_level"
  | "programme_degree"
  | "programme_name_official"
  | "specialisation"
  | "duration_years"
  | "intake_seats"
  | "entrance_exam"
>;

export async function searchProgrammes(
  supabase: SupabaseClient,
  opts: { query?: string; fields?: string[]; levels?: string[]; page?: number; pageSize?: number }
): Promise<Page<PuneProgrammeSummary>> {
  const pageSize = opts.pageSize ?? PAGE_SIZE;
  const [from, to] = pageRange(opts.page ?? 1, pageSize);

  let q = supabase.from("pune_programmes").select(PROGRAMME_LIST_COLUMNS, { count: "exact" });
  for (const word of searchWords(opts.query ?? "")) {
    q = q.or(
      anyColumnContains(
        ["programme_name_official", "programme_degree", "specialisation", "college_name_as_published"],
        word
      )
    );
  }
  if (opts.fields?.length) q = q.in("field", opts.fields);
  if (opts.levels?.length) q = q.in("degree_level", opts.levels);

  const { data, error, count } = await q
    .order("college_name_as_published", { ascending: true })
    .order("id", { ascending: true })
    .range(from, to);
  if (error) throw new Error(error.message);
  return { rows: (data ?? []) as unknown as PuneProgrammeSummary[], total: count ?? 0 };
}

/** Distinct values of pune_programmes.field (reads the whole column in pages). */
export async function listProgrammeFields(supabase: SupabaseClient): Promise<string[]> {
  const rows = await fetchAllRows<{ field: string | null }>((from, to) =>
    supabase.from("pune_programmes").select("field").order("id").range(from, to)
  );
  const values = new Set<string>();
  for (const r of rows) if (r.field) values.add(r.field);
  return Array.from(values).sort((a, b) => a.localeCompare(b));
}

/**
 * Maps exact college names (as published) to their pune_colleges id, for linking
 * child rows such as programmes. When a name appears twice in pune_colleges
 * (15 names do), the lowest id is used.
 */
export async function collegeIdsByName(supabase: SupabaseClient, names: string[]): Promise<Map<string, number>> {
  const unique = Array.from(new Set(names)).slice(0, 200);
  const map = new Map<string, number>();
  if (unique.length === 0) return map;
  const { data, error } = await supabase
    .from("pune_colleges")
    .select("id,college_name_as_published")
    .in("college_name_as_published", unique)
    .order("id");
  if (error) throw new Error(error.message);
  for (const row of data ?? []) {
    const name = row.college_name_as_published as string;
    if (!map.has(name)) map.set(name, row.id as number);
  }
  return map;
}

/** Which programmes / exams the cutoff table covers, e.g. ["B.Pharm (MHT-CET)", "BCA (MAH-CET)"]. */
export async function cutoffCoverage(supabase: SupabaseClient): Promise<string[]> {
  const rows = await fetchAllRows<{ programme_degree: string | null; exam: string | null }>((from, to) =>
    supabase.from("pune_cutoffs").select("programme_degree,exam").order("id").range(from, to)
  );
  const set = new Set<string>();
  for (const r of rows) {
    const degree = r.programme_degree && r.programme_degree !== "NOT_AVAILABLE" ? r.programme_degree : null;
    const exam = r.exam && r.exam !== "NOT_AVAILABLE" ? r.exam : null;
    if (degree) set.add(exam ? `${degree} (${exam})` : degree);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

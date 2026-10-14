import type { SupabaseClient } from "@supabase/supabase-js";
import type { PuneCollege, PuneProgramme } from "./types";

/**
 * Saved colleges / programmes live in pune_saved_colleges and
 * pune_saved_programmes (RLS: a user can only see and change their own rows).
 * The old saved_items table is never read or written.
 */

export type SavedKind = "college" | "programme";

const TABLE: Record<SavedKind, { table: string; column: string }> = {
  college: { table: "pune_saved_colleges", column: "college_id" },
  programme: { table: "pune_saved_programmes", column: "programme_id" },
};

export async function loadSavedIds(
  supabase: SupabaseClient,
  userId: string
): Promise<{ colleges: Set<number>; programmes: Set<number> }> {
  const [c, p] = await Promise.all([
    supabase.from("pune_saved_colleges").select("college_id").eq("user_id", userId),
    supabase.from("pune_saved_programmes").select("programme_id").eq("user_id", userId),
  ]);
  if (c.error) throw new Error(c.error.message);
  if (p.error) throw new Error(p.error.message);
  return {
    colleges: new Set((c.data ?? []).map((r) => Number(r.college_id))),
    programmes: new Set((p.data ?? []).map((r) => Number(r.programme_id))),
  };
}

export async function setSaved(
  supabase: SupabaseClient,
  userId: string,
  kind: SavedKind,
  itemId: number,
  saved: boolean
): Promise<void> {
  const { table, column } = TABLE[kind];
  if (!saved) {
    const { error } = await supabase.from(table).delete().eq("user_id", userId).eq(column, itemId);
    if (error) throw new Error(error.message);
    return;
  }
  const { data: existing, error: readErr } = await supabase
    .from(table)
    .select("id")
    .eq("user_id", userId)
    .eq(column, itemId)
    .limit(1);
  if (readErr) throw new Error(readErr.message);
  if (existing && existing.length > 0) return;
  const { error } = await supabase.from(table).insert({ user_id: userId, [column]: itemId });
  // 23505 = unique violation: a parallel click already saved it.
  if (error && error.code !== "23505") throw new Error(error.message);
}

export interface SavedCollegeRow {
  id: number;
  created_at: string | null;
  college: PuneCollege | null;
}

export interface SavedProgrammeRow {
  id: number;
  created_at: string | null;
  programme: PuneProgramme | null;
}

export async function listSavedColleges(supabase: SupabaseClient, userId: string): Promise<SavedCollegeRow[]> {
  const { data, error } = await supabase
    .from("pune_saved_colleges")
    .select("id, created_at, college:pune_colleges(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(0, 999);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as SavedCollegeRow[];
}

export async function listSavedProgrammes(supabase: SupabaseClient, userId: string): Promise<SavedProgrammeRow[]> {
  const { data, error } = await supabase
    .from("pune_saved_programmes")
    .select("id, created_at, programme:pune_programmes(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(0, 999);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as SavedProgrammeRow[];
}

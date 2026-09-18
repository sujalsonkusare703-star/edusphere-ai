import { SupabaseClient } from "@supabase/supabase-js";
import { College, Internship, Placement, RecommendationItem } from "@/types";
import { dbUuidToItemId, itemIdToDbUuid, isUuid } from "./db-helpers";

export interface DatabaseCollegeRow {
  id: string;
  name: string | null;
  location: string | null;
  state: string | null;
  course: string | null;
  fees: number | string | null;
  avg_package: number | string | null;
  highest_package: number | string | null;
  placement_rate: number | string | null;
  college_type: string | null;
  entrance_exam: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DatabaseInternshipRow {
  id: string;
  company: string | null;
  role: string | null;
  location: string | null;
  remote: boolean | string | null;
  stipend: number | string | null;
  duration: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DatabasePlacementRow {
  id: string;
  company: string | null;
  role: string | null;
  industry: string | null;
  min_cgpa: number | string | null;
  location: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Formats numeric or raw string stipend into clean display string:
 * e.g. 25000 -> "₹25,000 / month"
 */
export function formatStipend(stipend: number | string | null | undefined): string | null {
  if (stipend === null || stipend === undefined || stipend === "") return null;
  if (typeof stipend === "number") {
    return `₹${stipend.toLocaleString("en-IN")} / month`;
  }
  const trimmed = String(stipend).trim();
  const numericVal = Number(trimmed);
  if (!isNaN(numericVal) && !trimmed.includes("₹")) {
    return `₹${numericVal.toLocaleString("en-IN")} / month`;
  }
  return trimmed;
}

/**
 * Maps a public.colleges database row into a frontend-compatible College object.
 */
export function mapDatabaseCollege(row: DatabaseCollegeRow): College {
  return {
    id: dbUuidToItemId(row.id || ""),
    name: row.name || "University",
    location: row.location || null,
    state: row.state || null,
    course: row.course || null,
    fees: row.fees !== null && row.fees !== undefined ? Number(row.fees) : null,
    entrance_exam: row.entrance_exam || null,
    placement_rate: row.placement_rate !== null && row.placement_rate !== undefined ? Number(row.placement_rate) : null,
    avg_package: row.avg_package !== null && row.avg_package !== undefined ? Number(row.avg_package) : null,
    highest_package: row.highest_package !== null && row.highest_package !== undefined ? Number(row.highest_package) : null,
    college_type: row.college_type || null,
  };
}

/**
 * Maps a public.internships database row and its skills into a frontend-compatible Internship object.
 */
export function mapDatabaseInternship(row: DatabaseInternshipRow, skills: string[] = []): Internship {
  return {
    id: dbUuidToItemId(row.id || ""),
    role: row.role || "Intern",
    company: row.company || "Company",
    location: row.location || (row.remote ? "Remote" : "Location Flexible"),
    remote: Boolean(row.remote),
    stipend: formatStipend(row.stipend),
    duration: row.duration || null,
    skills: skills || [],
  };
}

/**
 * Maps a public.placements database row and its skills into a frontend-compatible Placement object.
 */
export function mapDatabasePlacement(row: DatabasePlacementRow, skills: string[] = []): Placement {
  return {
    id: dbUuidToItemId(row.id || ""),
    company: row.company || "Company",
    role: row.role || "Software Engineer",
    industry: row.industry || null,
    min_cgpa: row.min_cgpa !== null && row.min_cgpa !== undefined ? Number(row.min_cgpa) : null,
    location: row.location || "Location Flexible",
    skills: skills || [],
  };
}

/**
 * Fetches all colleges from Supabase public.colleges.
 */
export async function fetchColleges(
  supabase: SupabaseClient
): Promise<{ data: College[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("colleges")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      return { data: [], error: error.message };
    }

    const mapped = ((data as DatabaseCollegeRow[]) || []).map(mapDatabaseCollege);
    return { data: mapped, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load colleges from database";
    return { data: [], error: msg };
  }
}

/**
 * Fetches all internships and their associated skills from Supabase efficiently (2 batched queries).
 */
export async function fetchInternships(
  supabase: SupabaseClient
): Promise<{ data: Internship[]; error: string | null }> {
  try {
    const { data: intData, error: intErr } = await supabase
      .from("internships")
      .select("*")
      .order("company", { ascending: true });

    if (intErr) {
      return { data: [], error: intErr.message };
    }

    if (!intData || intData.length === 0) {
      return { data: [], error: null };
    }

    const intIds = (intData as DatabaseInternshipRow[]).map((i) => i.id);
    const skillsMap: Record<string, string[]> = {};

    if (intIds.length > 0) {
      const { data: skillsData, error: skillsErr } = await supabase
        .from("internship_skills")
        .select("internship_id, skill_name")
        .in("internship_id", intIds);

      if (skillsErr) {
        console.warn("Warning fetching internship_skills:", skillsErr.message);
      } else if (skillsData) {
        skillsData.forEach((s: { internship_id: string; skill_name: string }) => {
          if (!skillsMap[s.internship_id]) skillsMap[s.internship_id] = [];
          skillsMap[s.internship_id].push(s.skill_name);
        });
      }
    }

    const mapped = (intData as DatabaseInternshipRow[]).map((item) =>
      mapDatabaseInternship(item, skillsMap[item.id] || [])
    );

    return { data: mapped, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load internships from database";
    return { data: [], error: msg };
  }
}

/**
 * Fetches all placements and their associated skills from Supabase efficiently (2 batched queries).
 */
export async function fetchPlacements(
  supabase: SupabaseClient
): Promise<{ data: Placement[]; error: string | null }> {
  try {
    const { data: plcData, error: plcErr } = await supabase
      .from("placements")
      .select("*")
      .order("company", { ascending: true });

    if (plcErr) {
      return { data: [], error: plcErr.message };
    }

    if (!plcData || plcData.length === 0) {
      return { data: [], error: null };
    }

    const plcIds = (plcData as DatabasePlacementRow[]).map((p) => p.id);
    const skillsMap: Record<string, string[]> = {};

    if (plcIds.length > 0) {
      const { data: skillsData, error: skillsErr } = await supabase
        .from("placement_skills")
        .select("placement_id, skill_name")
        .in("placement_id", plcIds);

      if (skillsErr) {
        console.warn("Warning fetching placement_skills:", skillsErr.message);
      } else if (skillsData) {
        skillsData.forEach((s: { placement_id: string; skill_name: string }) => {
          if (!skillsMap[s.placement_id]) skillsMap[s.placement_id] = [];
          skillsMap[s.placement_id].push(s.skill_name);
        });
      }
    }

    const mapped = (plcData as DatabasePlacementRow[]).map((item) =>
      mapDatabasePlacement(item, skillsMap[item.id] || [])
    );

    return { data: mapped, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load placements from database";
    return { data: [], error: msg };
  }
}

/**
 * Fetches all opportunity catalogs (colleges, internships with skills, placements with skills) in parallel.
 * Reused by Dashboard and Recommendations to guarantee cross-app data parity.
 */
export async function fetchAllOpportunities(
  supabase: SupabaseClient
): Promise<{
  colleges: College[];
  internships: Internship[];
  placements: Placement[];
  error: string | null;
}> {
  try {
    const [colResult, intResult, plcResult] = await Promise.all([
      fetchColleges(supabase),
      fetchInternships(supabase),
      fetchPlacements(supabase),
    ]);

    const error = colResult.error || intResult.error || plcResult.error || null;
    return {
      colleges: colResult.data,
      internships: intResult.data,
      placements: plcResult.data,
      error,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load opportunities from database";
    return {
      colleges: [],
      internships: [],
      placements: [],
      error: msg,
    };
  }
}

export interface DatabaseRecommendationLogRow {
  id?: string;
  created_at?: string;
  student_profile_id: string;
  item_type: "college" | "internship" | "placement";
  item_id: string;
  match_score: number;
}

/**
 * Logs personalized recommendation activity to public.recommendation_log for authenticated students.
 * Safe and non-blocking: catches any error and never interrupts recommendation delivery.
 */
export async function logRecommendationActivity(
  supabase: SupabaseClient,
  studentProfileId: string,
  items: RecommendationItem[]
): Promise<{ success: boolean; count: number; error: string | null }> {
  if (!studentProfileId || studentProfileId.startsWith("sp-demo-") || !isUuid(studentProfileId)) {
    return { success: false, count: 0, error: "Invalid or demo student profile ID" };
  }

  if (!items || items.length === 0) {
    return { success: true, count: 0, error: null };
  }

  try {
    // Select top AI recommendations (is_ai_recommended) or top 10 ranked items
    const aiRecommended = items.filter((item) => item.is_ai_recommended);
    const targetItems = aiRecommended.length > 0 ? aiRecommended.slice(0, 10) : items.slice(0, 6);

    const rows = targetItems.map((item) => ({
      student_profile_id: studentProfileId,
      item_type: item.item_type,
      item_id: itemIdToDbUuid(item.id),
      match_score: Number(item.match_score.toFixed(1)),
    }));

    const { data, error } = await supabase
      .from("recommendation_log")
      .insert(rows)
      .select("id");

    if (error) {
      console.warn("Recommendation activity logging warning:", error.message);
      return { success: false, count: 0, error: error.message };
    }

    return { success: true, count: data?.length || rows.length, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to log recommendation activity";
    console.warn("Recommendation activity logging error:", msg);
    return { success: false, count: 0, error: msg };
  }
}

/**
 * Fetches recent recommendation logs for an authenticated student from public.recommendation_log.
 */
export async function fetchRecommendationLogs(
  supabase: SupabaseClient,
  studentProfileId: string,
  limit = 20
): Promise<{ data: DatabaseRecommendationLogRow[]; error: string | null }> {
  if (!studentProfileId || studentProfileId.startsWith("sp-demo-") || !isUuid(studentProfileId)) {
    return { data: [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from("recommendation_log")
      .select("*")
      .eq("student_profile_id", studentProfileId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: (data as DatabaseRecommendationLogRow[]) || [], error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch recommendation logs";
    return { data: [], error: msg };
  }
}

export default fetchAllOpportunities;


import { SupabaseClient } from "@supabase/supabase-js";
import { College, CollegeCourse, Internship, Placement, RecommendationItem, VerificationStatus, CollegeSourceRegistry } from "@/types";
import { dbUuidToItemId, itemIdToDbUuid, isUuid } from "./db-helpers";

import { getColleges, getCollegeById } from "./colleges";
export * from "./colleges";

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
  data_source?: string | null;
  primary_stream?: string | null;
  naac_grade?: string | null;
  official_website?: string | null;
  provenance?: string | null;
  accepted_exams?: string[] | null;
  admission_route?: string | null;
  eligibility_criteria?: string | null;
  admission_source_name?: string | null;
  admission_source_url?: string | null;
  admission_verification_status?: string | null;
  university_id?: number | null;
  university_name?: string | null;
  university?: string | null;
  district?: string | null;
  taluka?: string | null;
  city?: string | null;
  address?: string | null;
  pin_code?: string | null;
  institution_type?: string | null;
  ownership?: string | null;
  established_year?: number | string | null;
  autonomous_status?: string | null;
  admission_url?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  verification_status?: string | null;
  last_verified_at?: string | null;
  academic_year?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Helper to derive admission verification status
 */
export function deriveAdmissionStatus(college: { name?: string | null; primary_stream?: string | null }): VerificationStatus {
  const name = (college.name || "").toLowerCase();
  const stream = (college.primary_stream || "").toLowerCase();

  if (name.includes("birla institute of technology") || name.includes("bits")) return "VERIFIED";
  if (name.includes("vellore institute of technology") || name.includes("vit")) return "VERIFIED";
  if (name.includes("international institute of info") || name.includes("iiit")) return "VERIFIED";
  if (name.includes("delhi technological") || name.includes("dtu")) return "VERIFIED";
  if (name.includes("rvce") || name.includes("r.v. college") || name.includes("rv college")) return "VERIFIED";
  if (name.includes("army institute of technology") || name.includes("ait")) return "VERIFIED";
  if (name.includes("indian institute of technology") || name.includes("iit")) return "VERIFIED";
  if (name.includes("coep") || name.includes("college of engineering, pune")) return "VERIFIED";
  if (name.includes("symbiosis law") || name.includes("bharati vidyapeeth new law")) return "VERIFIED";
  if (name.includes("ils law") || name.includes("navalmal")) return "VERIFIED";
  if (stream.includes("arch")) return "VERIFIED";
  if (stream.includes("engineering") || stream.includes("tech")) return "DERIVED";
  return "NOT_VERIFIED";
}

/**
 * Helper to derive accepted entrance exams
 */
export function deriveAcceptedExams(college: { name?: string | null; primary_stream?: string | null; entrance_exam?: string | null }): string[] {
  const name = (college.name || "").toLowerCase();
  const stream = (college.primary_stream || "").toLowerCase();
  const exam = (college.entrance_exam || "").toLowerCase();

  if (name.includes("birla institute of technology") || name.includes("bits")) {
    return ["BITSAT"];
  }
  if (name.includes("vellore institute of technology") || name.includes("vit")) {
    return ["VITEEE"];
  }
  if (name.includes("international institute of info") || name.includes("iiit")) {
    return ["JEE Main", "UGEE"];
  }
  if (name.includes("delhi technological") || name.includes("dtu")) {
    return ["JEE Main"];
  }
  if (name.includes("rvce") || name.includes("r.v. college") || name.includes("rv college")) {
    return ["KCET", "COMEDK UGET"];
  }
  if (name.includes("army institute of technology") || name.includes("ait")) {
    return ["JEE Main"];
  }
  if (name.includes("indian institute of technology") || name.includes("iit")) {
    return ["JEE Advanced"];
  }
  if (name.includes("symbiosis law")) {
    return ["SLAT"];
  }
  if (name.includes("bharati vidyapeeth new law")) {
    return ["BVP CET"];
  }
  if (stream.includes("law") || exam.includes("law")) {
    return ["MH CET Law"];
  }
  if (stream.includes("arch") || exam.includes("nata")) {
    return ["NATA", "JEE Main Paper 2"];
  }
  if (stream.includes("engineering") || stream.includes("tech") || exam.includes("mht") || exam.includes("jee")) {
    return ["MHT-CET", "JEE Main"];
  }
  if (college.entrance_exam && college.entrance_exam.trim() && college.entrance_exam.trim() !== "Merit") {
    return [college.entrance_exam.trim()];
  }
  return ["Not verified"];
}

/**
 * Helper to derive admission route
 */
export function deriveAdmissionRoute(college: { name?: string | null; primary_stream?: string | null }): string {
  const name = (college.name || "").toLowerCase();
  const stream = (college.primary_stream || "").toLowerCase();

  if (name.includes("birla institute of technology") || name.includes("bits")) {
    return "BITS Admission Portal Direct Counselling based on BITSAT Score (out of 390 marks)";
  }
  if (name.includes("vellore institute of technology") || name.includes("vit")) {
    return "VIT Online Counselling Portal based on VITEEE Rank";
  }
  if (name.includes("international institute of info") || name.includes("iiit")) {
    return "IIIT-H Admissions Portal based on JEE Main Overall Percentile / UGEE Exam";
  }
  if (name.includes("delhi technological") || name.includes("dtu")) {
    return "Joint Admission Counselling Delhi (JAC Delhi) based on JEE Main CRL / Category Rank";
  }
  if (name.includes("rvce") || name.includes("r.v. college") || name.includes("rv college")) {
    return "Karnataka Examination Authority (KEA KCET Counselling for Karnataka candidates) / COMEDK Counselling (All India candidates) / Institutional Quota";
  }
  if (name.includes("army institute of technology") || name.includes("ait")) {
    return "AWES Institutional Admission via JEE Main All India Rank (AIR)";
  }
  if (name.includes("indian institute of technology") || name.includes("iit")) {
    return "Joint Seat Allocation Authority (JoSAA) Counselling based on JEE Advanced AIR";
  }
  if (name.includes("coep") || name.includes("college of engineering, pune")) {
    return "State CET Cell Maharashtra Centralized Admission Process (CAP) Counselling (Maharashtra State Quota via MHT-CET; All India Quota via JEE Main Paper 1)";
  }
  if (name.includes("symbiosis law")) {
    return "Symbiosis International (Deemed University) Admission via SLAT";
  }
  if (name.includes("bharati vidyapeeth new law")) {
    return "Bharati Vidyapeeth (Deemed to be University) Admission via BVP CET Law";
  }
  if (stream.includes("law")) {
    return "State CET Cell Law Centralized Admission Process (CAP) Counselling";
  }
  if (stream.includes("arch")) {
    return "State CET Cell Architecture Centralized Admission Process (CAP) based on NATA / JEE Main Paper 2 score";
  }
  if (stream.includes("engineering") || stream.includes("tech")) {
    return "State CET Cell Maharashtra Centralized Admission Process (CAP) Counselling (Maharashtra State Quota via MHT-CET; All India Quota via JEE Main Paper 1)";
  }
  return "Admission route: Not verified in current dataset";
}

/**
 * Helper to derive academic eligibility criteria
 */
export function deriveEligibilityCriteria(college: { name?: string | null; primary_stream?: string | null }): string {
  const name = (college.name || "").toLowerCase();
  const stream = (college.primary_stream || "").toLowerCase();

  if (name.includes("birla institute of technology") || name.includes("bits")) {
    return "Passed 12th examination of 10+2 system from a recognized Central or State board or its equivalent with Physics, Chemistry, and Mathematics (PCM) and adequate proficiency in English. Minimum aggregate 75% marks in PCM, with at least 60% marks in each of Physics, Chemistry, and Mathematics.";
  }
  if (name.includes("vellore institute of technology") || name.includes("vit")) {
    return "Passed 10+2 Higher Secondary Examination conducted by the State Board/CBSE/ICSE with a minimum aggregate of 60% in Physics, Chemistry, and Mathematics (PCM) or Biology (PCB) (50% for SC/ST/North-Eastern states).";
  }
  if (name.includes("international institute of info") || name.includes("iiit")) {
    return "Passed 10+2 or equivalent with Physics, Mathematics, and Chemistry with minimum aggregate marks or valid JEE Main CRL/percentile as mandated by IIIT-H admission criteria.";
  }
  if (name.includes("delhi technological") || name.includes("dtu")) {
    return "Passed 10+2 examination from CBSE or equivalent with 60% or more aggregate marks in Physics, Chemistry, and Mathematics, and English as a subject of study; seat allotment strictly via JAC Delhi counselling based on JEE Main CRL Rank.";
  }
  if (name.includes("rvce") || name.includes("r.v. college") || name.includes("rv college")) {
    return "Passed 10+2 or equivalent with Physics and Mathematics as compulsory subjects along with Chemistry/Biotechnology/Biology/Computer Science with minimum 45% aggregate marks (40% for SC/ST/OBC of Karnataka); valid KCET or COMEDK rank.";
  }
  if (name.includes("army institute of technology") || name.includes("ait")) {
    return "Passed 10+2 with Physics, Chemistry, and Mathematics with minimum 50% marks; ward of eligible serving/retired Army personnel; admission based strictly on JEE Main All India Rank.";
  }
  if (name.includes("indian institute of technology") || name.includes("iit")) {
    return "Qualified JEE Advanced with valid All India Rank; passed 10+2 with top 20 percentile in respective board or minimum 75% aggregate in 10+2 (65% for SC/ST/PwD).";
  }
  if (name.includes("coep") || name.includes("college of engineering, pune")) {
    return "Passed 10+2 (HSC) or equivalent with Physics & Mathematics compulsory + Chemistry/Biotechnology/Biology/Technical Vocational with min 45% marks (40% for reserved Maharashtra candidates); valid MHT-CET / JEE Main score.";
  }
  if (name.includes("symbiosis law")) {
    return "Passed 10+2 examination with at least 45% marks (40% for SC/ST candidates). Institution-specific SLAT selection process applies.";
  }
  if (name.includes("bharati vidyapeeth new law")) {
    return "Passed 10+2 examination with at least 45% marks (40% for SC/ST candidates). Admission via BVP CET Law entrance test.";
  }
  if (stream.includes("law")) {
    return "Passed 10+2 examination with at least 45% marks (40% for SC/ST candidates belonging to Maharashtra State, 42% for VJNT/NT/OBC/SBC). Admission strictly via MH CET Law CAP.";
  }
  if (stream.includes("arch")) {
    return "Passed 10+2 scheme of examination with Physics, Chemistry and Mathematics or 10+3 Diploma with Mathematics, with valid NATA score or JEE Main Paper 2.";
  }
  if (stream.includes("engineering") || stream.includes("tech")) {
    return "Regulatory Framework Minimum: Passed 10+2 (HSC) with Physics & Mathematics compulsory + Chemistry/Biotechnology/Biology/Technical Vocational subject with min 45% marks (40% for reserved Maharashtra candidates). Institution-specific eligibility not verified in current dataset.";
  }
  return "Institution-specific eligibility: Not verified in current dataset.";
}


export interface DatabaseInternshipRow {
  id: string;
  company: string | null;
  role: string | null;
  location: string | null;
  remote: boolean | string | null;
  stipend: number | string | null;
  duration: string | null;
  data_source?: string | null;
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
  data_source?: string | null;
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
 * Maps a public.colleges database row and optional normalized programs into a frontend-compatible College object.
 */
export function mapDatabaseCollege(
  row: DatabaseCollegeRow,
  programs: string[] = [],
  courses: CollegeCourse[] = []
): College {
  let resolvedPrograms = programs;
  if ((!resolvedPrograms || resolvedPrograms.length === 0) && courses.length > 0) {
    resolvedPrograms = courses.map((c) => c.course_name);
  } else if ((!resolvedPrograms || resolvedPrograms.length === 0) && row.course) {
    resolvedPrograms = row.course
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return {
    id: dbUuidToItemId(row.id || ""),
    name: row.name || "University",
    location: row.location || null,
    state: row.state || null,
    course: row.course || null,
    fees: null, // Strictly NA for all colleges unconditionally
    entrance_exam: row.entrance_exam || null,
    placement_rate: row.placement_rate !== null && row.placement_rate !== undefined ? Number(row.placement_rate) : null,
    avg_package: row.avg_package !== null && row.avg_package !== undefined ? Number(row.avg_package) : null,
    highest_package: row.highest_package !== null && row.highest_package !== undefined ? Number(row.highest_package) : null,
    college_type: row.college_type || null,
    programs: resolvedPrograms,
    data_source: row.data_source || null,
    primary_stream: row.primary_stream || null,
    naac_grade: row.naac_grade || null,
    official_website: row.official_website || null,
    provenance: row.provenance || "Maharashtra State CET Cell / Official Institutional Portals (Verified Pune Directory)",
    accepted_exams: (row.accepted_exams && row.accepted_exams.length > 0)
      ? row.accepted_exams
      : deriveAcceptedExams(row),
    admission_route: row.admission_route || deriveAdmissionRoute(row),
    eligibility_criteria: row.eligibility_criteria || deriveEligibilityCriteria(row),
    admission_source_name: row.admission_source_name || (row.primary_stream === "Engineering" ? "State Common Entrance Test Cell, Maharashtra" : "Official Institutional Portal"),
    admission_source_url: row.admission_source_url || (row.official_website || "https://cetcell.mahacet.org"),
    admission_verification_status: (row.admission_verification_status as VerificationStatus) || deriveAdmissionStatus(row),
    courses_count: courses.length,
    courses: courses.length > 0 ? courses : undefined,
    university_id: row.university_id !== undefined ? row.university_id : null,
    university_name: row.university_name || row.university || null,
    district: row.district || null,
    taluka: row.taluka || null,
    city: row.city || null,
    address: row.address || null,
    pin_code: row.pin_code || null,
    institution_type: row.institution_type || null,
    ownership: row.ownership || null,
    established_year: row.established_year !== undefined ? row.established_year : null,
    autonomous_status: row.autonomous_status || null,
    admission_url: row.admission_url || null,
    contact_email: row.contact_email || null,
    contact_phone: row.contact_phone || null,
    verification_status: row.verification_status || (row.admission_verification_status as VerificationStatus) || deriveAdmissionStatus(row),
    last_verified_at: row.last_verified_at || null,
    academic_year: row.academic_year || null,
    notes: row.notes || null,
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
 * Fetches all colleges from Supabase public.colleges, including normalized courses, cutoffs, and programs.
 */
export async function fetchColleges(
  supabase: SupabaseClient,
  options?: { isDemo?: boolean }
): Promise<{ data: College[]; error: string | null }> {
  const res = await getColleges({ isDemo: options?.isDemo }, supabase);
  return { data: res.data, error: res.error };
}

/**
 * Fetches all internships and their associated skills from Supabase efficiently (2 batched queries).
 * In normal flow, Supabase is the sole source of truth; returns [] if table is empty.
 * Isolated demo mode is supported via options.isDemo.
 */
export async function fetchInternships(
  supabase: SupabaseClient,
  options?: { isDemo?: boolean }
): Promise<{ data: Internship[]; error: string | null }> {
  // Explicit isolated demo-preview mode
  if (options?.isDemo) {
    const { demoInternships } = await import("@/lib/demo-data");
    return { data: demoInternships, error: null };
  }

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

    // Defensive filtering: exclude legacy demo_seed rows and companies starting with "Demo"
    const cleanRows = (intData as DatabaseInternshipRow[]).filter((i) => {
      if (!i.company) return false;
      const compLower = i.company.toLowerCase().trim();
      if (i.data_source === "demo_seed" || compLower.startsWith("demo")) {
        return false;
      }
      return true;
    });

    if (cleanRows.length === 0) {
      return { data: [], error: null };
    }

    const intIds = cleanRows.map((i) => i.id);
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

    const mapped = cleanRows.map((item) =>
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
 * In normal flow, Supabase is the sole source of truth; returns [] if table is empty.
 * Isolated demo mode is supported via options.isDemo.
 */
export async function fetchPlacements(
  supabase: SupabaseClient,
  options?: { isDemo?: boolean }
): Promise<{ data: Placement[]; error: string | null }> {
  // Explicit isolated demo-preview mode
  if (options?.isDemo) {
    const { demoPlacements } = await import("@/lib/demo-data");
    return { data: demoPlacements, error: null };
  }

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

    // Defensive filtering: exclude legacy demo_seed rows and companies starting with "Demo"
    const cleanRows = (plcData as DatabasePlacementRow[]).filter((p) => {
      if (!p.company) return false;
      const compLower = p.company.toLowerCase().trim();
      if (p.data_source === "demo_seed" || compLower.startsWith("demo")) {
        return false;
      }
      return true;
    });

    if (cleanRows.length === 0) {
      return { data: [], error: null };
    }

    const plcIds = cleanRows.map((p) => p.id);
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

    const mapped = cleanRows.map((item) =>
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
  supabase: SupabaseClient,
  options?: { isDemo?: boolean }
): Promise<{
  colleges: College[];
  internships: Internship[];
  placements: Placement[];
  error: string | null;
}> {
  try {
    const [colResult, intResult, plcResult] = await Promise.all([
      fetchColleges(supabase),
      fetchInternships(supabase, options),
      fetchPlacements(supabase, options),
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
    // Verify that the student profile row actually exists in Supabase before attempting insert
    const { data: profileCheck, error: profileCheckErr } = await supabase
      .from("student_profiles")
      .select("id")
      .eq("id", studentProfileId)
      .maybeSingle();

    if (profileCheckErr) {
      console.warn("Student profile verification note for recommendation log:", profileCheckErr.message);
      return { success: false, count: 0, error: profileCheckErr.message };
    }

    if (!profileCheck) {
      // Profile does not exist yet; skip logging gracefully without erroring or blocking
      return { success: false, count: 0, error: "Student profile not found in database" };
    }

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

export interface ProgramUrlResolution {
  url: string | null;
  label: "Program Website" | "Official College Website" | "Program link not available";
  isDeepLink: boolean;
}

/**
 * Distinguishes genuine specialization-specific/department URLs from college homepage fallbacks.
 * Adheres strictly to the rule:
 * - If program_url equals the college's official homepage or is a homepage fallback, label it "Official College Website".
 * - If genuine departmental deep-link, label it "Program Website".
 * - If missing or unavailable, label it "Program link not available".
 */
export function resolveProgramUrlInfo(
  programUrl?: string | null,
  collegeWebsite?: string | null
): ProgramUrlResolution {
  if (!programUrl || typeof programUrl !== "string" || !programUrl.trim()) {
    return { url: null, label: "Program link not available", isDeepLink: false };
  }

  const cleanProg = programUrl.trim().replace(/\/+$/, "");
  const cleanCol = (collegeWebsite || "").trim().replace(/\/+$/, "");

  if (!cleanCol) {
    return { url: cleanProg, label: "Official College Website", isDeepLink: false };
  }

  try {
    const progUrlObj = new URL(cleanProg);
    const colUrlObj = new URL(cleanCol);

    const progHost = progUrlObj.hostname.replace(/^www\./, "").toLowerCase();
    const colHost = colUrlObj.hostname.replace(/^www\./, "").toLowerCase();

    // If hostnames match and pathname is just root or empty, or matches college URL exactly
    const isSameHost = progHost === colHost;
    const isRootPath = progUrlObj.pathname === "" || progUrlObj.pathname === "/";

    if (cleanProg === cleanCol || (isSameHost && isRootPath)) {
      return { url: cleanProg, label: "Official College Website", isDeepLink: false };
    }

    // Has distinct path or department sub-path
    if (progUrlObj.pathname && progUrlObj.pathname !== "/") {
      return { url: cleanProg, label: "Program Website", isDeepLink: true };
    }

    return { url: cleanProg, label: "Official College Website", isDeepLink: false };
  } catch {
    if (cleanCol && cleanProg.toLowerCase().includes(cleanCol.toLowerCase())) {
      return { url: cleanProg, label: "Official College Website", isDeepLink: false };
    }
    return { url: null, label: "Program link not available", isDeepLink: false };
  }
}

/**
 * Fetches a single college by ID from Supabase public.colleges, including all its courses from
 * public.college_courses and cutoffs from public.college_cutoffs.
 * Falls back to authoritative local dataset if database returns empty or offline.
 */
export async function fetchCollegeById(
  supabase: SupabaseClient,
  id: string
): Promise<{ data: College | null; error: string | null }> {
  return getCollegeById(id, supabase);
}

export async function fetchCollegeSources(
  collegeId?: string
): Promise<{ data: CollegeSourceRegistry[] | null; error: string | null }> {
  try {
    const { createClient: createBrowserClient } = await import("./client");
    const supabase = createBrowserClient();
    let query = supabase
      .from("college_source_registry")
      .select("*")
      .eq("is_active", true);

    if (collegeId) {
      const dbUuid = isUuid(collegeId) ? collegeId : itemIdToDbUuid(collegeId);
      query = query.eq("college_id", dbUuid);
    }

    const { data, error } = await query.order("source_name", { ascending: true });

    if (error) {
      console.warn("fetchCollegeSources error:", error.message);
      return { data: null, error: error.message };
    }

    return { data: (data as CollegeSourceRegistry[]) || [], error: null };
  } catch (err: unknown) {
    console.warn("fetchCollegeSources exception:", err instanceof Error ? err.message : err);
    return { data: null, error: err instanceof Error ? err.message : "Unknown error fetching sources" };
  }
}

export default fetchAllOpportunities;


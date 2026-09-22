import { SupabaseClient } from "@supabase/supabase-js";
import { College, CollegeCourse, CollegeCutoff, Internship, Placement, RecommendationItem, VerificationStatus, CutoffUnit, CollegeSourceRegistry } from "@/types";
import { dbUuidToItemId, itemIdToDbUuid, isUuid } from "./db-helpers";

import { EDUSPHERE_COLLEGES_DATASET } from "@/lib/data/edusphere-colleges-dataset";

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
  supabase: SupabaseClient
): Promise<{ data: College[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("colleges")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.warn("Error fetching colleges from Supabase, falling back to authoritative dataset:", error.message);
      return { data: EDUSPHERE_COLLEGES_DATASET, error: null };
    }

    const rawRows = (data as DatabaseCollegeRow[]) || [];
    // Purge any demo colleges and duplicate legacy GCOEP row
    const collegeRows = rawRows.filter((c) => {
      if (!c.name) return false;
      const nameLower = c.name.toLowerCase().trim();
      if (
        nameLower.startsWith("demo ") ||
        nameLower.includes("demo college") ||
        nameLower.includes("demo institute") ||
        nameLower.includes("demo school")
      ) {
        return false;
      }
      if (
        c.id === "00000000-0000-0000-0002-000000000002" ||
        (nameLower === "government college of engineering pune" && c.id !== "00000000-0000-0000-0000-00636f6c2d32")
      ) {
        return false;
      }
      return true;
    });

    const collegeIds = collegeRows.map((c) => c.id).filter(Boolean);

    // Fetch courses from public.college_courses
    const coursesMap: Record<string, CollegeCourse[]> = {};
    if (collegeIds.length > 0) {
      try {
        const { data: courseData, error: courseErr } = await supabase
          .from("college_courses")
          .select("*")
          .in("college_id", collegeIds);

        if (!courseErr && courseData && courseData.length > 0) {
          // Fetch cutoffs
          const courseIds = courseData.map((cd: { course_id: number }) => cd.course_id);
          const cutoffsMap: Record<number, CollegeCutoff[]> = {};

          if (courseIds.length > 0) {
            try {
              const { data: cutoffData, error: cutErr } = await supabase
                .from("college_cutoffs")
                .select("*")
                .in("course_id", courseIds);

              if (!cutErr && cutoffData) {
                cutoffData.forEach((ct: {
                  id?: string;
                  course_id: number;
                  college_id?: string;
                  exam: string;
                  cutoff_open?: number | null;
                  cutoff_obc?: number | null;
                  cutoff_sc?: number | null;
                  cutoff_st?: number | null;
                  quota?: string;
                  year?: number;
                  cutoff_unit?: string | null;
                  round?: string | null;
                  cutoff_type?: string | null;
                  source_name?: string | null;
                  source_url?: string | null;
                  verification_status?: string | null;
                  notes?: string | null;
                }) => {
                  if (!cutoffsMap[ct.course_id]) cutoffsMap[ct.course_id] = [];
                  const colRow = collegeRows.find((c) => c.id === ct.college_id);
                  const cName = (colRow?.name || "").toLowerCase();
                  let verStatus: VerificationStatus = (ct.verification_status as VerificationStatus) || "DERIVED";
                  if ((cName.includes("army institute of technology") || cName.includes("ait")) && ct.exam === "MHT CET") {
                    verStatus = "INVALID";
                  } else if (cName.includes("symbiosis law") && ct.exam === "MH CET Law") {
                    verStatus = "INVALID";
                  } else if (cName.includes("bharati vidyapeeth new law") && ct.exam === "MH CET Law") {
                    verStatus = "INVALID";
                  }
                  const unitVal: CutoffUnit = (ct.cutoff_unit as CutoffUnit) || (ct.exam === "NATA" ? "marks" : ct.exam === "MH CET Law" ? "score" : "percentile");

                  cutoffsMap[ct.course_id].push({
                    id: ct.id,
                    course_id: ct.course_id,
                    college_id: ct.college_id,
                    exam: ct.exam,
                    open: ct.cutoff_open !== undefined ? ct.cutoff_open : null,
                    obc: ct.cutoff_obc !== undefined ? ct.cutoff_obc : null,
                    sc: ct.cutoff_sc !== undefined ? ct.cutoff_sc : null,
                    st: ct.cutoff_st !== undefined ? ct.cutoff_st : null,
                    quota: ct.quota,
                    year: ct.year || undefined,
                    cutoff_unit: unitVal,
                    round: ct.round || undefined,
                    cutoff_type: ct.cutoff_type || "closing_merit",
                    source_name: ct.source_name || "State Common Entrance Test Cell, Maharashtra",
                    source_url: ct.source_url || "https://cetcell.mahacet.org",
                    verification_status: verStatus,
                    notes: ct.notes || (verStatus === "INVALID" ? "INVALID: Exam misattribution identified in data verification audit." : undefined),
                  });
                });
              }
            } catch {
              // Ignore cutoff fetch errors
            }
          }

          courseData.forEach((cd: {
            id?: string;
            course_id: number;
            college_id: string;
            source_college_id?: number;
            stream: string;
            course_name: string;
            intake: number;
            program_url?: string | null;
            jee_cutoff?: string | null;
            accepted_exams?: string[] | null;
            admission_route?: string | null;
            eligibility_criteria?: string | null;
            admission_source_name?: string | null;
            admission_source_url?: string | null;
            admission_verification_status?: string | null;
          }) => {
            if (!coursesMap[cd.college_id]) coursesMap[cd.college_id] = [];
            coursesMap[cd.college_id].push({
              id: cd.id,
              course_id: cd.course_id,
              college_id: cd.college_id,
              source_college_id: cd.source_college_id,
              stream: cd.stream,
              course_name: cd.course_name,
              intake: cd.intake,
              program_url: cd.program_url || null,
              jee_cutoff: cd.jee_cutoff || null,
              accepted_exams: cd.accepted_exams && cd.accepted_exams.length > 0 ? cd.accepted_exams : undefined,
              admission_route: cd.admission_route || undefined,
              eligibility_criteria: cd.eligibility_criteria || undefined,
              admission_source_name: cd.admission_source_name || undefined,
              admission_source_url: cd.admission_source_url || undefined,
              admission_verification_status: (cd.admission_verification_status as VerificationStatus) || undefined,
              cutoffs: cutoffsMap[cd.course_id] || [],
            });
          });
        }
      } catch {
        // Fallback to local dataset courses
      }
    }

    // Also fetch normalized programs from public.college_programs if available
    const programsMap: Record<string, string[]> = {};
    if (collegeIds.length > 0) {
      try {
        const { data: progData, error: progErr } = await supabase
          .from("college_programs")
          .select("college_id, program_name")
          .in("college_id", collegeIds);

        if (!progErr && progData) {
          progData.forEach((p: { college_id: string; program_name: string }) => {
            if (!programsMap[p.college_id]) programsMap[p.college_id] = [];
            programsMap[p.college_id].push(p.program_name);
          });
        }
      } catch {
        // Graceful fallback
      }
    }

    // Map rows and enrich with offline dataset if courses/details aren't in Supabase yet
    const datasetById = new Map<string, College>();
    const datasetByName = new Map<string, College>();
    for (const ec of EDUSPHERE_COLLEGES_DATASET) {
      datasetById.set(ec.id, ec);
      datasetByName.set(ec.name.toLowerCase().trim(), ec);
    }

    const mapped = collegeRows.map((item) => {
      const dbCourses = coursesMap[item.id] || [];
      const dbPrograms = programsMap[item.id] || [];
      const col = mapDatabaseCollege(item, dbPrograms, dbCourses);

      // Enrich from authoritative dataset
      const enrichedFromDataset = datasetById.get(col.id) || datasetByName.get(col.name.toLowerCase().trim());
      if (enrichedFromDataset) {
        if (!col.primary_stream) col.primary_stream = enrichedFromDataset.primary_stream;
        if (!col.naac_grade) col.naac_grade = enrichedFromDataset.naac_grade;
        if (!col.official_website) col.official_website = enrichedFromDataset.official_website;
        if (!col.accepted_exams || col.accepted_exams.length === 0) col.accepted_exams = enrichedFromDataset.accepted_exams;
        if (!col.admission_route) col.admission_route = enrichedFromDataset.admission_route;
        if (!col.eligibility_criteria) col.eligibility_criteria = enrichedFromDataset.eligibility_criteria;
        if (!col.admission_source_name) col.admission_source_name = enrichedFromDataset.admission_source_name;
        if (!col.admission_source_url) col.admission_source_url = enrichedFromDataset.admission_source_url;
        if (!col.admission_verification_status) col.admission_verification_status = enrichedFromDataset.admission_verification_status;
        if (!col.courses || col.courses.length === 0) {
          col.courses = enrichedFromDataset.courses;
          col.courses_count = enrichedFromDataset.courses_count;
        } else {
          // Enrich program_url, jee_cutoff, and verified admission details from dataset course if missing in DB
          col.courses = col.courses.map((crs) => {
            const matchedCrs = enrichedFromDataset.courses?.find((ec) => ec.course_id === crs.course_id);
            if (!matchedCrs) return crs;
            return {
              ...crs,
              program_url: crs.program_url || matchedCrs.program_url || enrichedFromDataset.official_website || null,
              jee_cutoff: crs.jee_cutoff || matchedCrs.jee_cutoff || null,
              accepted_exams: crs.accepted_exams || (matchedCrs.accepted_exams && matchedCrs.accepted_exams.length > 0 ? matchedCrs.accepted_exams : undefined),
              admission_route: crs.admission_route || matchedCrs.admission_route || undefined,
              eligibility_criteria: crs.eligibility_criteria || matchedCrs.eligibility_criteria || undefined,
              admission_source_name: crs.admission_source_name || matchedCrs.admission_source_name || undefined,
              admission_source_url: crs.admission_source_url || matchedCrs.admission_source_url || undefined,
              admission_verification_status: crs.admission_verification_status || (matchedCrs.admission_verification_status as VerificationStatus) || undefined,
            };
          });
        }
        if (!col.programs || col.programs.length === 0) {
          col.programs = enrichedFromDataset.programs;
        }
      }

      return col;
    });

    // Merge any missing colleges from EDUSPHERE_COLLEGES_DATASET
    const existingIds = new Set(mapped.map((c) => c.id));
    const existingNames = new Set(mapped.map((c) => c.name.toLowerCase().trim()));

    const merged: College[] = [...mapped];
    for (const eduCol of EDUSPHERE_COLLEGES_DATASET) {
      if (!existingIds.has(eduCol.id) && !existingNames.has(eduCol.name.toLowerCase().trim())) {
        merged.push(eduCol);
      }
    }

    merged.sort((a, b) => a.name.localeCompare(b.name));
    return { data: merged, error: null };
  } catch (err: unknown) {
    console.warn("fetchColleges catch fallback:", err instanceof Error ? err.message : err);
    return { data: EDUSPHERE_COLLEGES_DATASET, error: null };
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
  if (!id) return { data: null, error: "College ID is required" };

  const dbUuid = itemIdToDbUuid(id);
  const normalId = dbUuidToItemId(id);

  try {
    // 1. Fetch from Supabase public.colleges
    const { data: rawCollege, error: colErr } = await supabase
      .from("colleges")
      .select("*")
      .or(`id.eq.${dbUuid},id.eq.${id}`)
      .maybeSingle();

    if (colErr) {
      console.warn("Error fetching college from Supabase, falling back to local dataset:", colErr.message);
    }

    const targetCollegeRow: DatabaseCollegeRow | null = rawCollege as DatabaseCollegeRow | null;

    // Filter out demo colleges
    if (targetCollegeRow?.name) {
      const nameLower = targetCollegeRow.name.toLowerCase().trim();
      if (
        nameLower.startsWith("demo ") ||
        nameLower.includes("demo college") ||
        nameLower.includes("demo institute") ||
        nameLower.includes("demo school") ||
        targetCollegeRow.id === "00000000-0000-0000-0002-000000000002"
      ) {
        return { data: null, error: "College not found" };
      }
    }

    // If found in Supabase, load courses and cutoffs
    if (targetCollegeRow) {
      const collegeId = targetCollegeRow.id;

      // Query college_courses
      const { data: courseData } = await supabase
        .from("college_courses")
        .select("*")
        .eq("college_id", collegeId)
        .order("course_id", { ascending: true });

      const coursesList: CollegeCourse[] = [];

      if (courseData && courseData.length > 0) {
        const courseIds = courseData.map((c: { course_id: number }) => c.course_id);

        // Query college_cutoffs
        const cutoffsMap: Record<number, CollegeCutoff[]> = {};
        if (courseIds.length > 0) {
          const { data: cutoffData } = await supabase
            .from("college_cutoffs")
            .select("*")
            .in("course_id", courseIds);

          if (cutoffData) {
            cutoffData.forEach((ct: {
              id?: string;
              course_id: number;
              college_id?: string;
              exam: string;
              cutoff_open?: number | null;
              cutoff_obc?: number | null;
              cutoff_sc?: number | null;
              cutoff_st?: number | null;
              quota?: string;
              year?: number;
              cutoff_unit?: string | null;
              round?: string | null;
              cutoff_type?: string | null;
              source_name?: string | null;
              source_url?: string | null;
              verification_status?: string | null;
              notes?: string | null;
            }) => {
              if (!cutoffsMap[ct.course_id]) cutoffsMap[ct.course_id] = [];
              const cName = (targetCollegeRow?.name || "").toLowerCase();
              let verStatus: VerificationStatus = (ct.verification_status as VerificationStatus) || "DERIVED";
              if ((cName.includes("army institute of technology") || cName.includes("ait")) && ct.exam === "MHT CET") {
                verStatus = "INVALID";
              } else if (cName.includes("symbiosis law") && ct.exam === "MH CET Law") {
                verStatus = "INVALID";
              } else if (cName.includes("bharati vidyapeeth new law") && ct.exam === "MH CET Law") {
                verStatus = "INVALID";
              }
              const unitVal: CutoffUnit = (ct.cutoff_unit as CutoffUnit) || (ct.exam === "NATA" ? "marks" : ct.exam === "MH CET Law" ? "score" : "percentile");

              cutoffsMap[ct.course_id].push({
                id: ct.id,
                course_id: ct.course_id,
                college_id: ct.college_id,
                exam: ct.exam,
                open: ct.cutoff_open !== undefined ? ct.cutoff_open : null,
                obc: ct.cutoff_obc !== undefined ? ct.cutoff_obc : null,
                sc: ct.cutoff_sc !== undefined ? ct.cutoff_sc : null,
                st: ct.cutoff_st !== undefined ? ct.cutoff_st : null,
                quota: ct.quota,
                year: ct.year || undefined,
                cutoff_unit: unitVal,
                round: ct.round || undefined,
                cutoff_type: ct.cutoff_type || "closing_merit",
                source_name: ct.source_name || "State Common Entrance Test Cell, Maharashtra",
                source_url: ct.source_url || "https://cetcell.mahacet.org",
                verification_status: verStatus,
                notes: ct.notes || (verStatus === "INVALID" ? "INVALID: Exam misattribution identified in data verification audit." : undefined),
              });
            });
          }
        }

        courseData.forEach((cd: {
          id?: string;
          course_id: number;
          college_id: string;
          source_college_id?: number;
          stream: string;
          course_name: string;
          intake: number;
          program_url?: string | null;
          jee_cutoff?: string | null;
          accepted_exams?: string[] | null;
          admission_route?: string | null;
          eligibility_criteria?: string | null;
          admission_source_name?: string | null;
          admission_source_url?: string | null;
          admission_verification_status?: string | null;
        }) => {
          coursesList.push({
            id: cd.id,
            course_id: cd.course_id,
            college_id: cd.college_id,
            source_college_id: cd.source_college_id,
            stream: cd.stream,
            course_name: cd.course_name,
            intake: cd.intake,
            program_url: cd.program_url || targetCollegeRow?.official_website || null,
            jee_cutoff: cd.jee_cutoff || null,
            accepted_exams: cd.accepted_exams && cd.accepted_exams.length > 0 ? cd.accepted_exams : undefined,
            admission_route: cd.admission_route || undefined,
            eligibility_criteria: cd.eligibility_criteria || undefined,
            admission_source_name: cd.admission_source_name || undefined,
            admission_source_url: cd.admission_source_url || undefined,
            admission_verification_status: (cd.admission_verification_status as VerificationStatus) || undefined,
            cutoffs: cutoffsMap[cd.course_id] || [],
          });
        });
      }

      // Map row into College object
      const mapped = mapDatabaseCollege(targetCollegeRow, [], coursesList);

      // Enrich from dataset if courses or website are missing in Supabase
      const matchedInDataset = EDUSPHERE_COLLEGES_DATASET.find(
        (c) => c.id === mapped.id || c.id === collegeId || c.name.toLowerCase().trim() === mapped.name.toLowerCase().trim()
      );

      if (matchedInDataset) {
        if (!mapped.primary_stream) mapped.primary_stream = matchedInDataset.primary_stream;
        if (!mapped.naac_grade) mapped.naac_grade = matchedInDataset.naac_grade;
        if (!mapped.official_website) mapped.official_website = matchedInDataset.official_website;
        if (!mapped.provenance) mapped.provenance = matchedInDataset.provenance;
        if (!mapped.accepted_exams || mapped.accepted_exams.length === 0) mapped.accepted_exams = matchedInDataset.accepted_exams;
        if (!mapped.admission_route) mapped.admission_route = matchedInDataset.admission_route;
        if (!mapped.eligibility_criteria) mapped.eligibility_criteria = matchedInDataset.eligibility_criteria;
        if (!mapped.admission_source_name) mapped.admission_source_name = matchedInDataset.admission_source_name;
        if (!mapped.admission_source_url) mapped.admission_source_url = matchedInDataset.admission_source_url;
        if (!mapped.admission_verification_status) mapped.admission_verification_status = matchedInDataset.admission_verification_status;
        if (!mapped.courses || mapped.courses.length === 0) {
          mapped.courses = matchedInDataset.courses;
          mapped.courses_count = matchedInDataset.courses_count;
        } else {
          mapped.courses = mapped.courses.map((crs) => {
            const matchedCrs = matchedInDataset.courses?.find((ec) => ec.course_id === crs.course_id);
            if (!matchedCrs) return crs;
            return {
              ...crs,
              program_url: crs.program_url || matchedCrs.program_url || matchedInDataset.official_website || null,
              jee_cutoff: crs.jee_cutoff || matchedCrs.jee_cutoff || null,
              accepted_exams: crs.accepted_exams || (matchedCrs.accepted_exams && matchedCrs.accepted_exams.length > 0 ? matchedCrs.accepted_exams : undefined),
              admission_route: crs.admission_route || matchedCrs.admission_route || undefined,
              eligibility_criteria: crs.eligibility_criteria || matchedCrs.eligibility_criteria || undefined,
              admission_source_name: crs.admission_source_name || matchedCrs.admission_source_name || undefined,
              admission_source_url: crs.admission_source_url || matchedCrs.admission_source_url || undefined,
              admission_verification_status: crs.admission_verification_status || (matchedCrs.admission_verification_status as VerificationStatus) || undefined,
            };
          });
        }
      }

      return { data: mapped, error: null };
    }

    // 2. Fallback to authoritative local dataset
    const fallbackCollege = EDUSPHERE_COLLEGES_DATASET.find(
      (c) => c.id === id || c.id === dbUuid || c.id === normalId
    );

    if (fallbackCollege) {
      return { data: fallbackCollege, error: null };
    }

    return { data: null, error: "College not found" };
  } catch (err: unknown) {
    console.warn("fetchCollegeById error fallback:", err instanceof Error ? err.message : err);
    const fallbackCollege = EDUSPHERE_COLLEGES_DATASET.find(
      (c) => c.id === id || c.id === dbUuid || c.id === normalId
    );
    return { data: fallbackCollege || null, error: null };
  }
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


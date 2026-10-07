import { SupabaseClient } from "@supabase/supabase-js";
import {
  College,
  CollegeCourse,
  CollegeCutoff,
  CanonicalUniversity,
  CanonicalProgram,
  CanonicalAdmission,
  CanonicalCutoff,
  CanonicalFee,
  CanonicalFacility,
  CanonicalAccreditation,
  InstitutionSource,
  VerificationAudit,
  Placement,
  VerificationStatus,
  CutoffUnit,
} from "@/types";
import { createClient } from "./client";
import { isUuid, itemIdToDbUuid, dbUuidToItemId } from "./db-helpers";
import { demoColleges } from "@/lib/demo-data";

export interface CollegeFilters {
  state?: string;
  district?: string;
  taluka?: string;
  city?: string;
  institutionType?: string;
  ownership?: string;
  university?: string;
  autonomousStatus?: string;
  naacGrade?: string;
  field?: string;
  subField?: string;
  degreeLevel?: string;
  degree?: string;
  course?: string;
  specialization?: string;
  admissionRoute?: string;
  entranceExam?: string;
  verificationStatus?: string;
  searchQuery?: string;
}

export interface CollegeFilterOptions {
  limit?: number;
  offset?: number;
  sortBy?: "name" | "naac" | "established" | "placement_desc" | "avg_pkg_desc" | "programs_desc";
  sortOrder?: "asc" | "desc";
  isDemo?: boolean;
}

// Memory caches for stable reference data
let cachedUniversities: CanonicalUniversity[] | null = null;
let cachedAdmissionRoutes: string[] | null = null;
let cachedEntranceExams: string[] | null = null;

/**
 * Normalizes raw Supabase database row to canonical College entity
 */
export function mapDatabaseCollegeRow(
  row: Record<string, unknown>,
  programs: string[] = [],
  courses: CollegeCourse[] = []
): College {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = row as any;
  const rowId = String(r.id || "");
  const normId = dbUuidToItemId(rowId);
  const vStatus = (r.verification_status as VerificationStatus) ||
    (r.admission_verification_status as VerificationStatus) ||
    (r.provenance === "OFFICIAL_PORTAL" ? "VERIFIED" : "DERIVED");

  return {
    id: normId,
    source_id: r.source_id ? Number(r.source_id) : null,
    name: r.name || "Unnamed Institution",
    short_name: r.short_name || null,
    location: r.location || r.city || r.district || null,
    state: r.state || "Maharashtra",
    course: r.course || null,
    fees: r.fees !== null && r.fees !== undefined && r.fees !== "" ? Number(r.fees) : null,
    entrance_exam: r.entrance_exam || null,
    placement_rate: r.placement_rate !== null && r.placement_rate !== undefined && r.placement_rate !== "" ? Number(r.placement_rate) : null,
    avg_package: r.avg_package !== null && r.avg_package !== undefined && r.avg_package !== "" ? Number(r.avg_package) : null,
    highest_package: r.highest_package !== null && r.highest_package !== undefined && r.highest_package !== "" ? Number(r.highest_package) : null,
    college_type: r.college_type || r.institution_type || null,
    programs: programs.length > 0 ? programs : (r.course ? String(r.course).split(",").map((s: string) => s.trim()) : []),
    data_source: r.data_source || "EduSphere Supabase Database",
    primary_stream: r.primary_stream || null,
    naac_grade: r.naac_grade || null,
    official_website: r.official_website || null,
    provenance: r.provenance || null,
    accepted_exams: Array.isArray(r.accepted_exams) ? r.accepted_exams : (r.entrance_exam ? [String(r.entrance_exam)] : []),
    admission_route: r.admission_route || null,
    eligibility_criteria: r.eligibility_criteria || null,
    admission_source_name: r.admission_source_name || null,
    admission_source_url: r.admission_source_url || null,
    admission_verification_status: (r.admission_verification_status as VerificationStatus) || vStatus,
    courses_count: courses.length > 0 ? courses.length : (programs.length > 0 ? programs.length : (Number(r.courses_count) || 0)),
    courses: courses.length > 0 ? courses : undefined,
    university_id: r.university_id !== undefined && r.university_id !== null ? Number(r.university_id) : null,
    university_name: r.university_name || r.university || null,
    district: r.district || null,
    taluka: r.taluka || null,
    city: r.city || null,
    address: r.address || null,
    pin_code: r.pin_code || null,
    institution_type: r.institution_type || r.college_type || null,
    ownership: r.ownership || null,
    established_year: r.established_year !== undefined && r.established_year !== null ? Number(r.established_year) : null,
    autonomous_status: r.autonomous_status || null,
    admission_url: r.admission_url || null,
    contact_email: r.contact_email || null,
    contact_phone: r.contact_phone || null,
    verification_status: vStatus,
    last_verified_at: r.last_verified_at || null,
    academic_year: r.academic_year || null,
    notes: r.notes || null,
    created_at: r.created_at ? String(r.created_at) : undefined,
    updated_at: r.updated_at ? String(r.updated_at) : undefined,
  };
}

/**
 * 1. getColleges - Fetches all colleges with optional pagination and filters
 */
export async function getColleges(
  options?: CollegeFilterOptions,
  client?: SupabaseClient
): Promise<{ data: College[]; total: number; error: string | null }> {
  if (options?.isDemo) {
    return { data: demoColleges, total: demoColleges.length, error: null };
  }

  const supabase = client || createClient();

  try {
    let query = supabase.from("colleges").select("*", { count: "exact" });

    // Exclude demo rows and duplicates
    query = query.not("name", "ilike", "Demo %");

    if (options?.sortBy) {
      if (options.sortBy === "name") {
        query = query.order("name", { ascending: options.sortOrder !== "desc" });
      } else if (options.sortBy === "established") {
        query = query.order("established_year", { ascending: options.sortOrder === "asc", nullsFirst: false });
      } else if (options.sortBy === "placement_desc") {
        query = query.order("placement_rate", { ascending: false, nullsFirst: false });
      } else if (options.sortBy === "avg_pkg_desc") {
        query = query.order("avg_package", { ascending: false, nullsFirst: false });
      }
    } else {
      query = query.order("name", { ascending: true });
    }

    if (options?.limit) {
      const from = options.offset || 0;
      const to = from + options.limit - 1;
      query = query.range(from, to);
    }

    const { data, count, error } = await query;

    if (error) {
      return { data: [], total: 0, error: error.message };
    }

    const rows = (data || []).map((r) => mapDatabaseCollegeRow(r));
    return { data: rows, total: count || rows.length, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load colleges from database";
    return { data: [], total: 0, error: msg };
  }
}

/**
 * 2. searchColleges - Searches colleges across name, short name, location, district, and university
 */
export async function searchColleges(
  searchQuery: string,
  options?: CollegeFilterOptions,
  client?: SupabaseClient
): Promise<{ data: College[]; total: number; error: string | null }> {
  return filterColleges({ searchQuery }, options, client);
}

/**
 * 3. filterColleges - Multi-dimensional search & filtering against live Supabase dataset
 */
export async function filterColleges(
  filters: CollegeFilters,
  options?: CollegeFilterOptions,
  client?: SupabaseClient
): Promise<{ data: College[]; total: number; error: string | null }> {
  if (options?.isDemo) {
    return { data: demoColleges, total: demoColleges.length, error: null };
  }

  const supabase = client || createClient();

  try {
    let query = supabase.from("colleges").select("*", { count: "exact" });
    query = query.not("name", "ilike", "Demo %");

    if (filters.district) {
      query = query.ilike("district", `%${filters.district}%`);
    }

    if (filters.state) {
      query = query.ilike("state", `%${filters.state}%`);
    }

    if (filters.taluka) {
      query = query.ilike("taluka", `%${filters.taluka}%`);
    }

    if (filters.city) {
      query = query.ilike("city", `%${filters.city}%`);
    }

    if (filters.institutionType) {
      query = query.ilike("institution_type", `%${filters.institutionType}%`);
    }

    if (filters.ownership) {
      query = query.ilike("ownership", `%${filters.ownership}%`);
    }

    if (filters.university) {
      query = query.or(`university_name.ilike.%${filters.university}%,university.ilike.%${filters.university}%`);
    }

    if (filters.autonomousStatus) {
      query = query.ilike("autonomous_status", `%${filters.autonomousStatus}%`);
    }

    if (filters.naacGrade) {
      query = query.eq("naac_grade", filters.naacGrade);
    }

    if (filters.admissionRoute) {
      query = query.ilike("admission_route", `%${filters.admissionRoute}%`);
    }

    if (filters.entranceExam) {
      query = query.or(`entrance_exam.ilike.%${filters.entranceExam}%,accepted_exams.cs.{"${filters.entranceExam}"}`);
    }

    if (filters.verificationStatus) {
      query = query.ilike("verification_status", `%${filters.verificationStatus}%`);
    }

    if (filters.searchQuery) {
      const q = filters.searchQuery.trim();
      query = query.or(
        `name.ilike.%${q}%,short_name.ilike.%${q}%,city.ilike.%${q}%,taluka.ilike.%${q}%,district.ilike.%${q}%,university_name.ilike.%${q}%`
      );
    }

    // Ordering
    if (options?.sortBy === "established") {
      query = query.order("established_year", { ascending: options.sortOrder === "asc", nullsFirst: false });
    } else if (options?.sortBy === "placement_desc") {
      query = query.order("placement_rate", { ascending: false, nullsFirst: false });
    } else if (options?.sortBy === "avg_pkg_desc") {
      query = query.order("avg_package", { ascending: false, nullsFirst: false });
    } else {
      query = query.order("name", { ascending: true });
    }

    // Pagination
    if (options?.limit) {
      const from = options.offset || 0;
      const to = from + options.limit - 1;
      query = query.range(from, to);
    }

    const { data, count, error } = await query;

    if (error) {
      return { data: [], total: 0, error: error.message };
    }

    const rows = (data || []).map((r) => mapDatabaseCollegeRow(r));
    return { data: rows, total: count || rows.length, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to filter colleges from database";
    return { data: [], total: 0, error: msg };
  }
}

/**
 * 4. getCollegeById - Resolves full college record with courses, cutoffs, and programs
 */
export async function getCollegeById(
  id: string,
  client?: SupabaseClient
): Promise<{ data: College | null; error: string | null }> {
  if (!id) return { data: null, error: "College ID is required" };

  const supabase = client || createClient();
  const dbUuid = isUuid(id) ? id : itemIdToDbUuid(id);

  try {
    const { data: rawCollege, error: colErr } = await supabase
      .from("colleges")
      .select("*")
      .or(`id.eq.${dbUuid},id.eq.${id}`)
      .maybeSingle();

    if (colErr || !rawCollege) {
      // Check isolated demo
      const demoMatch = demoColleges.find((c) => c.id === id || c.id === dbUuid);
      if (demoMatch) return { data: demoMatch, error: null };
      return { data: null, error: colErr ? colErr.message : "College not found" };
    }

    const collegeId = rawCollege.id;

    // Load college_courses
    const { data: courseData } = await supabase
      .from("college_courses")
      .select("*")
      .eq("college_id", collegeId)
      .order("course_id", { ascending: true });

    const coursesList: CollegeCourse[] = [];

    if (courseData && courseData.length > 0) {
      const courseIds = courseData.map((c: { course_id: number }) => c.course_id);

      // Load cutoffs
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
            const unitVal: CutoffUnit =
              (ct.cutoff_unit as CutoffUnit) ||
              (ct.exam === "NATA" ? "marks" : ct.exam === "MH CET Law" ? "score" : "percentile");

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
              verification_status: (ct.verification_status as VerificationStatus) || "VERIFIED",
              notes: ct.notes || undefined,
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
        canonical_program_id?: number | null;
        field?: string | null;
        sub_field?: string | null;
        degree_level?: string | null;
        degree?: string | null;
        duration_years?: string | null;
        mode?: string | null;
      }) => {
        coursesList.push({
          id: cd.id,
          course_id: cd.course_id,
          college_id: cd.college_id,
          source_college_id: cd.source_college_id,
          stream: cd.stream,
          course_name: cd.course_name,
          intake: cd.intake,
          program_url: cd.program_url || rawCollege.official_website || null,
          jee_cutoff: cd.jee_cutoff || null,
          accepted_exams: cd.accepted_exams && cd.accepted_exams.length > 0 ? cd.accepted_exams : undefined,
          admission_route: cd.admission_route || undefined,
          eligibility_criteria: cd.eligibility_criteria || undefined,
          admission_source_name: cd.admission_source_name || undefined,
          admission_source_url: cd.admission_source_url || undefined,
          admission_verification_status: (cd.admission_verification_status as VerificationStatus) || undefined,
          canonical_program_id: cd.canonical_program_id || null,
          field: cd.field || null,
          sub_field: cd.sub_field || null,
          degree_level: cd.degree_level || null,
          degree: cd.degree || null,
          duration_years: cd.duration_years || null,
          mode: cd.mode || null,
          cutoffs: cutoffsMap[cd.course_id] || [],
        });
      });
    }

    const mapped = mapDatabaseCollegeRow(rawCollege, [], coursesList);
    return { data: mapped, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load college details";
    return { data: null, error: msg };
  }
}

/**
 * 5. getCollegePrograms - Retrieves canonical programs associated with a college
 */
export async function getCollegePrograms(
  collegeId: string,
  client?: SupabaseClient
): Promise<{ data: CanonicalProgram[]; error: string | null }> {
  const supabase = client || createClient();
  const dbUuid = isUuid(collegeId) ? collegeId : itemIdToDbUuid(collegeId);

  try {
    const { data, error } = await supabase
      .from("programs")
      .select("*")
      .or(`college_id.eq.${dbUuid},college_id.eq.${collegeId}`)
      .order("official_program_name", { ascending: true });

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: (data as CanonicalProgram[]) || [], error: null };
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : "Failed to load programs" };
  }
}

/**
 * 6. getCollegeAdmissions - Retrieves admissions pipeline records for a college
 */
export async function getCollegeAdmissions(
  collegeId: string,
  client?: SupabaseClient
): Promise<{ data: CanonicalAdmission[]; error: string | null }> {
  const supabase = client || createClient();
  const dbUuid = isUuid(collegeId) ? collegeId : itemIdToDbUuid(collegeId);

  try {
    const { data, error } = await supabase
      .from("admissions")
      .select("*")
      .or(`college_id.eq.${dbUuid},college_id.eq.${collegeId}`)
      .order("entrance_exam", { ascending: true });

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: (data as CanonicalAdmission[]) || [], error: null };
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : "Failed to load admissions" };
  }
}

/**
 * 7. getCollegeCutoffs - Retrieves cutoffs from public.cutoffs & public.college_cutoffs
 */
export async function getCollegeCutoffs(
  collegeId: string,
  client?: SupabaseClient
): Promise<{ data: CanonicalCutoff[]; error: string | null }> {
  const supabase = client || createClient();
  const dbUuid = isUuid(collegeId) ? collegeId : itemIdToDbUuid(collegeId);

  try {
    const { data, error } = await supabase
      .from("cutoffs")
      .select("*")
      .or(`college_id.eq.${dbUuid},college_id.eq.${collegeId}`)
      .order("exam", { ascending: true });

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: (data as CanonicalCutoff[]) || [], error: null };
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : "Failed to load cutoffs" };
  }
}

/**
 * 8. getCollegeFees - Retrieves verified fee structures for a college
 */
export async function getCollegeFees(
  collegeId: string,
  client?: SupabaseClient
): Promise<{ data: CanonicalFee[]; error: string | null }> {
  const supabase = client || createClient();
  const dbUuid = isUuid(collegeId) ? collegeId : itemIdToDbUuid(collegeId);

  try {
    const { data, error } = await supabase
      .from("fees")
      .select("*")
      .or(`college_id.eq.${dbUuid},college_id.eq.${collegeId}`)
      .order("academic_year", { ascending: false });

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: (data as CanonicalFee[]) || [], error: null };
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : "Failed to load fees" };
  }
}

/**
 * 9. getCollegeFacilities - Retrieves verified campus facilities
 */
export async function getCollegeFacilities(
  collegeId: string,
  client?: SupabaseClient
): Promise<{ data: CanonicalFacility[]; error: string | null }> {
  const supabase = client || createClient();
  const dbUuid = isUuid(collegeId) ? collegeId : itemIdToDbUuid(collegeId);

  try {
    const { data, error } = await supabase
      .from("facilities")
      .select("*")
      .or(`college_id.eq.${dbUuid},college_id.eq.${collegeId}`)
      .order("facility_type", { ascending: true });

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: (data as CanonicalFacility[]) || [], error: null };
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : "Failed to load facilities" };
  }
}

/**
 * 10. getCollegeAccreditations - Retrieves verified accreditation approvals
 */
export async function getCollegeAccreditations(
  collegeId: string,
  client?: SupabaseClient
): Promise<{ data: CanonicalAccreditation[]; error: string | null }> {
  const supabase = client || createClient();
  const dbUuid = isUuid(collegeId) ? collegeId : itemIdToDbUuid(collegeId);

  try {
    const { data, error } = await supabase
      .from("accreditations")
      .select("*")
      .or(`college_id.eq.${dbUuid},college_id.eq.${collegeId}`)
      .order("body", { ascending: true });

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: (data as CanonicalAccreditation[]) || [], error: null };
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : "Failed to load accreditations" };
  }
}

/**
 * 11. getCollegePlacements - Retrieves placements and NIRF metrics for a college
 */
export async function getCollegePlacements(
  collegeId: string,
  client?: SupabaseClient
): Promise<{ data: Placement[]; error: string | null }> {
  const supabase = client || createClient();
  const dbUuid = isUuid(collegeId) ? collegeId : itemIdToDbUuid(collegeId);

  try {
    const { data, error } = await supabase
      .from("placements")
      .select("*")
      .or(`college_id.eq.${dbUuid},college_id.eq.${collegeId}`);

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: (data as Placement[]) || [], error: null };
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : "Failed to load placements" };
  }
}

/**
 * 12. getCollegeSources - Retrieves official source provenance for a college
 */
export async function getCollegeSources(
  collegeId: string,
  client?: SupabaseClient
): Promise<{ data: InstitutionSource[]; error: string | null }> {
  const supabase = client || createClient();
  const dbUuid = isUuid(collegeId) ? collegeId : itemIdToDbUuid(collegeId);

  try {
    const { data, error } = await supabase
      .from("institution_sources")
      .select("*, source:sources(*)")
      .or(`college_id.eq.${dbUuid},college_id.eq.${collegeId}`)
      .order("created_at", { ascending: false });

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: (data as InstitutionSource[]) || [], error: null };
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : "Failed to load sources" };
  }
}

/**
 * 13. getCollegeVerification - Retrieves data verification audit trail
 */
export async function getCollegeVerification(
  collegeId: string,
  client?: SupabaseClient
): Promise<{ data: VerificationAudit[]; error: string | null }> {
  const supabase = client || createClient();
  const dbUuid = isUuid(collegeId) ? collegeId : itemIdToDbUuid(collegeId);

  try {
    const { data, error } = await supabase
      .from("verification_audit")
      .select("*")
      .or(`entity_id.eq.${dbUuid},entity_id.eq.${collegeId}`)
      .order("audit_date", { ascending: false });

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: (data as VerificationAudit[]) || [], error: null };
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : "Failed to load audit history" };
  }
}

/**
 * 14. getUniversities - Retrieves canonical universities master registry
 */
export async function getUniversities(
  client?: SupabaseClient
): Promise<{ data: CanonicalUniversity[]; error: string | null }> {
  if (cachedUniversities && cachedUniversities.length > 0) {
    return { data: cachedUniversities, error: null };
  }

  const supabase = client || createClient();

  try {
    const { data, error } = await supabase
      .from("universities")
      .select("*")
      .order("official_name", { ascending: true });

    if (error) {
      return { data: [], error: error.message };
    }

    cachedUniversities = data as CanonicalUniversity[];
    return { data: cachedUniversities, error: null };
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : "Failed to load universities" };
  }
}

/**
 * 15. getPrograms - Retrieves canonical programs list
 */
export async function getPrograms(
  field?: string,
  degreeLevel?: string,
  client?: SupabaseClient
): Promise<{ data: CanonicalProgram[]; error: string | null }> {
  const supabase = client || createClient();

  try {
    let query = supabase.from("programs").select("*");

    if (field) query = query.ilike("field", `%${field}%`);
    if (degreeLevel) query = query.ilike("degree_level", `%${degreeLevel}%`);

    const { data, error } = await query.order("official_program_name", { ascending: true });

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: (data as CanonicalProgram[]) || [], error: null };
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : "Failed to load programs" };
  }
}

/**
 * 16. getAdmissionRoutes - Retrieves distinct admission routes
 */
export async function getAdmissionRoutes(
  client?: SupabaseClient
): Promise<{ data: string[]; error: string | null }> {
  if (cachedAdmissionRoutes) {
    return { data: cachedAdmissionRoutes, error: null };
  }

  const supabase = client || createClient();

  try {
    const { data, error } = await supabase
      .from("admissions")
      .select("admission_route");

    if (error) {
      return { data: [], error: error.message };
    }

    const set = new Set<string>();
    (data || []).forEach((r) => {
      if (r.admission_route) set.add(r.admission_route.trim());
    });

    cachedAdmissionRoutes = Array.from(set).sort();
    return { data: cachedAdmissionRoutes, error: null };
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : "Failed to load admission routes" };
  }
}

/**
 * 17. getEntranceExams - Retrieves distinct entrance exams
 */
export async function getEntranceExams(
  client?: SupabaseClient
): Promise<{ data: string[]; error: string | null }> {
  if (cachedEntranceExams) {
    return { data: cachedEntranceExams, error: null };
  }

  const supabase = client || createClient();

  try {
    const [admRes, cutRes] = await Promise.all([
      supabase.from("admissions").select("entrance_exam"),
      supabase.from("cutoffs").select("exam"),
    ]);

    const set = new Set<string>();
    (admRes.data || []).forEach((r) => {
      if (r.entrance_exam) set.add(r.entrance_exam.trim());
    });
    (cutRes.data || []).forEach((r) => {
      if (r.exam) set.add(r.exam.trim());
    });

    // Add standard exams if not found
    ["MHT CET", "JEE Main", "MAH-BCA/BBA/BMS/BBM CET", "MH CET Law", "NATA", "CAT"].forEach((e) => set.add(e));

    cachedEntranceExams = Array.from(set).sort();
    return { data: cachedEntranceExams, error: null };
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : "Failed to load entrance exams" };
  }
}

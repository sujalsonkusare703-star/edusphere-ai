import { College, CollegeCourse, CanonicalProgram } from "@/types";

export interface AcademicHierarchyItem {
  field: string;
  subField?: string;
  degreeLevel?: string;
  degree?: string;
  program: string;
  specialization?: string;
}

/**
 * Extracts distinct districts from live colleges
 */
export function getAvailableDistricts(colleges: College[]): string[] {
  const set = new Set<string>();
  colleges.forEach((c) => {
    if (c.district) set.add(c.district.trim());
    else if (c.location) set.add(c.location.trim());
  });
  return Array.from(set).filter(Boolean).sort();
}

/**
 * Extracts distinct universities from live colleges
 */
export function getAvailableUniversities(colleges: College[]): string[] {
  const set = new Set<string>();
  colleges.forEach((c) => {
    if (c.university_name) set.add(c.university_name.trim());
  });
  return Array.from(set).filter(Boolean).sort();
}

/**
 * Extracts distinct academic fields from programs/courses
 */
export function getAvailableFields(programs: (CanonicalProgram | CollegeCourse)[]): string[] {
  const set = new Set<string>();
  programs.forEach((p) => {
    if ("field" in p && p.field) {
      set.add(p.field.trim());
    } else if ("stream" in p && p.stream) {
      set.add(p.stream.trim());
    }
  });

  // Default standard fields if list is empty
  if (set.size === 0) {
    [
      "Engineering & Technology",
      "Computer Applications / Information Technology",
      "Management / Business Administration",
      "Law & Legal Studies",
      "Architecture & Design",
      "Pharmacy & Pharmaceutical Sciences",
    ].forEach((f) => set.add(f));
  }

  return Array.from(set).filter(Boolean).sort();
}

/**
 * Extracts distinct degree levels filtered by selected field
 */
export function getAvailableDegreeLevels(
  programs: (CanonicalProgram | CollegeCourse)[],
  selectedField?: string
): string[] {
  const set = new Set<string>();
  const fieldLower = selectedField?.toLowerCase().trim();

  programs.forEach((p) => {
    const pField = ("field" in p && p.field ? p.field : "stream" in p && p.stream ? p.stream : undefined)?.toLowerCase().trim();
    if (!fieldLower || pField === fieldLower || pField?.includes(fieldLower) || fieldLower.includes(pField || "")) {
      if ("degree_level" in p && p.degree_level) {
        set.add(p.degree_level.trim());
      }
    }
  });

  if (set.size === 0) {
    ["Undergraduate (UG)", "Postgraduate (PG)", "Diploma", "Doctoral (Ph.D.)"].forEach((lvl) => set.add(lvl));
  }

  return Array.from(set).filter(Boolean).sort();
}

/**
 * Extracts distinct degrees filtered by selected field and degree level
 */
export function getAvailableDegrees(
  programs: (CanonicalProgram | CollegeCourse)[],
  selectedField?: string,
  selectedDegreeLevel?: string
): string[] {
  const set = new Set<string>();
  const fieldLower = selectedField?.toLowerCase().trim();
  const levelLower = selectedDegreeLevel?.toLowerCase().trim();

  programs.forEach((p) => {
    const pField = ("field" in p && p.field ? p.field : "stream" in p && p.stream ? p.stream : undefined)?.toLowerCase().trim();
    const pLevel = ("degree_level" in p ? p.degree_level : undefined)?.toLowerCase().trim();

    const matchesField = !fieldLower || pField === fieldLower || pField?.includes(fieldLower) || fieldLower.includes(pField || "");
    const matchesLevel = !levelLower || pLevel === levelLower || pLevel?.includes(levelLower) || levelLower.includes(pLevel || "");

    if (matchesField && matchesLevel) {
      if ("degree" in p && p.degree) {
        set.add(p.degree.trim());
      }
    }
  });

  if (set.size === 0) {
    if (fieldLower?.includes("law")) {
      ["B.A. LL.B.", "B.B.A. LL.B.", "LL.B.", "LL.M."].forEach((d) => set.add(d));
    } else if (fieldLower?.includes("management") || fieldLower?.includes("business")) {
      ["BBA", "BMS", "BBM", "MBA", "PGDM"].forEach((d) => set.add(d));
    } else if (fieldLower?.includes("computer") || fieldLower?.includes("bca")) {
      ["BCA", "B.Sc. (Computer Science)", "MCA", "M.Sc. (Computer Science)"].forEach((d) => set.add(d));
    } else if (fieldLower?.includes("arch")) {
      ["B.Arch", "M.Arch"].forEach((d) => set.add(d));
    } else {
      ["B.Tech", "B.E.", "M.Tech", "M.E."].forEach((d) => set.add(d));
    }
  }

  return Array.from(set).filter(Boolean).sort();
}

/**
 * Extracts distinct programs/courses filtered by selected field and degree
 */
export function getAvailablePrograms(
  programs: (CanonicalProgram | CollegeCourse)[],
  selectedField?: string,
  selectedDegree?: string
): string[] {
  const set = new Set<string>();
  const fieldLower = selectedField?.toLowerCase().trim();
  const degreeLower = selectedDegree?.toLowerCase().trim();

  programs.forEach((p) => {
    const pField = ("field" in p && p.field ? p.field : "stream" in p && p.stream ? p.stream : undefined)?.toLowerCase().trim();
    const pDegree = ("degree" in p ? p.degree : undefined)?.toLowerCase().trim();

    const matchesField = !fieldLower || pField === fieldLower || pField?.includes(fieldLower) || fieldLower.includes(pField || "");
    const matchesDegree = !degreeLower || pDegree === degreeLower || pDegree?.includes(degreeLower) || degreeLower.includes(pDegree || "");

    if (matchesField && matchesDegree) {
      const name = "official_program_name" in p ? p.official_program_name : p.course_name;
      if (name) set.add(name.trim());
    }
  });

  return Array.from(set).filter(Boolean).sort();
}

/**
 * Extracts distinct specializations for a selected program
 */
export function getAvailableSpecializations(
  programs: (CanonicalProgram | CollegeCourse)[],
  selectedProgram?: string
): string[] {
  const set = new Set<string>();
  const progLower = selectedProgram?.toLowerCase().trim();

  programs.forEach((p) => {
    const name = ("official_program_name" in p ? p.official_program_name : p.course_name)?.toLowerCase().trim();
    if (!progLower || name === progLower || name?.includes(progLower) || progLower.includes(name || "")) {
      if ("specialization" in p && p.specialization) {
        set.add(p.specialization.trim());
      }
    }
  });

  return Array.from(set).filter(Boolean).sort();
}

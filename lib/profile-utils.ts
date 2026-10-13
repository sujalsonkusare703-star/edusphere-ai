import { Profile, StudentProfile } from "@/types";

const filled = (v: string | null | undefined) => typeof v === "string" && v.trim().length > 0;
const positive = (v: number | null | undefined) => typeof v === "number" && v > 0;

/**
 * Profile strength (0-100%): the share of these profile-page items that are filled in:
 * name, degree level, field, degree, college name, college district,
 * a score (entrance score or CGPA), career goal, and at least one skill.
 */
export function calculateProfileStrength(
  profile: Profile | null,
  studentProfile: StudentProfile | null,
  skills: string[]
): number {
  const checks = [
    filled(profile?.full_name),
    filled(studentProfile?.degree_level_code ?? studentProfile?.preferred_degree_level),
    filled(studentProfile?.field_code ?? studentProfile?.preferred_field),
    filled(studentProfile?.preferred_degree),
    filled(studentProfile?.college_name),
    filled(studentProfile?.college_district),
    positive(studentProfile?.entrance_score) || positive(studentProfile?.cgpa),
    filled(studentProfile?.career_goal),
    Array.isArray(skills) && skills.length > 0,
  ];
  const completed = checks.filter(Boolean).length;
  return Math.round((completed / checks.length) * 100);
}

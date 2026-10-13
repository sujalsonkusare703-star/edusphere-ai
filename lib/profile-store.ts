import type { User } from "@supabase/supabase-js";
import type { StudentProfile } from "@/types";
import { fieldLabel, levelLabel } from "@/lib/degree-master";

/**
 * The student's editable profile lives in ONE object in Supabase Auth
 * `user_metadata.edusphere_profile`, written with a single `auth.updateUser`
 * call, so a save either fully succeeds or changes nothing.
 *
 * `user_metadata` is user-editable by design: it must never hold anything
 * that grants access. Roles come only from `profiles.role` (server-side).
 */
export const PROFILE_META_KEY = "edusphere_profile";

export const PROFILE_LIMITS = {
  text: 120,
  careerGoal: 200,
  skill: 40,
  skills: 40,
} as const;

export interface AcademicProfile {
  degree_level: string | null; // DEGREE_LEVELS code, e.g. "UG"
  field: string | null; // FIELD_LABELS code, e.g. "ENGINEERING"
  degree: string | null; // degree name from the master list, e.g. "B.E."
  specialisation: string | null; // free text, e.g. "Computer Engineering"
  college_name: string | null; // free text
  college_district: string | null; // Maharashtra district
  preferred_district: string | null; // where the student wants to study next
  entrance_score: number | null;
  cgpa: number | null;
  career_goal: string | null;
  skills: string[];
  updated_at?: string;
}

export const EMPTY_ACADEMIC_PROFILE: AcademicProfile = {
  degree_level: null,
  field: null,
  degree: null,
  specialisation: null,
  college_name: null,
  college_district: null,
  preferred_district: null,
  entrance_score: null,
  cgpa: null,
  career_goal: null,
  skills: [],
};

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/\s+/g, " ").trim().slice(0, max);
  return trimmed ? trimmed : null;
}

function cleanNumber(value: unknown, min: number, max: number): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return Math.round(n * 100) / 100;
}

export function cleanSkills(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of value) {
    const skill = cleanText(raw, PROFILE_LIMITS.skill);
    if (!skill) continue;
    const key = skill.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(skill);
    if (out.length >= PROFILE_LIMITS.skills) break;
  }
  return out;
}

/** Normalises any input (form values or stored metadata) into a safe AcademicProfile. */
export function sanitizeAcademicProfile(input: Partial<Record<keyof AcademicProfile, unknown>>): AcademicProfile {
  return {
    degree_level: cleanText(input.degree_level, PROFILE_LIMITS.text),
    field: cleanText(input.field, PROFILE_LIMITS.text),
    degree: cleanText(input.degree, PROFILE_LIMITS.text),
    specialisation: cleanText(input.specialisation, PROFILE_LIMITS.text),
    college_name: cleanText(input.college_name, PROFILE_LIMITS.text),
    college_district: cleanText(input.college_district, PROFILE_LIMITS.text),
    preferred_district: cleanText(input.preferred_district, PROFILE_LIMITS.text),
    entrance_score: cleanNumber(input.entrance_score, 0, 1000),
    cgpa: cleanNumber(input.cgpa, 0, 10),
    career_goal: cleanText(input.career_goal, PROFILE_LIMITS.careerGoal),
    skills: cleanSkills(input.skills),
    updated_at: typeof input.updated_at === "string" ? input.updated_at : undefined,
  };
}

/** Reads the stored profile object, or null when the user has never saved one. */
export function readAcademicProfile(user: Pick<User, "user_metadata"> | null): AcademicProfile | null {
  const raw = user?.user_metadata?.[PROFILE_META_KEY];
  if (!raw || typeof raw !== "object") return null;
  return sanitizeAcademicProfile(raw as Record<string, unknown>);
}

export function readFullName(user: Pick<User, "user_metadata" | "email"> | null): string | null {
  return cleanText(user?.user_metadata?.full_name, PROFILE_LIMITS.text);
}

/**
 * Maps the stored profile onto the legacy StudentProfile shape that the
 * (currently hidden) recommendation code reads.
 */
export function toStudentProfile(
  academic: AcademicProfile,
  base: { id: string; profile_id: string; created_at?: string }
): StudentProfile {
  return {
    id: base.id,
    profile_id: base.profile_id,
    created_at: base.created_at,
    updated_at: academic.updated_at,
    preferred_branch: academic.specialisation ?? academic.degree,
    entrance_score: academic.entrance_score,
    preferred_location: academic.preferred_district,
    cgpa: academic.cgpa,
    career_goal: academic.career_goal,
    preferred_field: academic.field ? fieldLabel(academic.field) : null,
    preferred_degree_level: academic.degree_level ? levelLabel(academic.degree_level) : null,
    preferred_degree: academic.degree,
    preferred_district: academic.preferred_district,
    preferred_university: null,
    degree_level_code: academic.degree_level,
    field_code: academic.field,
    specialisation: academic.specialisation,
    college_name: academic.college_name,
    college_district: academic.college_district,
  };
}

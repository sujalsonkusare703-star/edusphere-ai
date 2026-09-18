import { Profile, StudentProfile } from "@/types";

/**
 * Calculates dynamic profile strength (0% to 100%) based on completion of 6 key fields:
 * 1. Full Name
 * 2. CGPA / Percentage
 * 3. Entrance Score
 * 4. Preferred Branch
 * 5. Preferred Location
 * 6. Skills (at least one skill)
 *
 * Pure calculation logic with zero hardcoded or fake demo data.
 */
export function calculateProfileStrength(
  profile: Profile | null,
  studentProfile: StudentProfile | null,
  skills: string[]
): number {
  let completed = 0;
  const total = 6;

  if (profile?.full_name?.trim()) completed++;
  if (studentProfile?.cgpa !== null && studentProfile?.cgpa !== undefined && studentProfile.cgpa > 0) completed++;
  if (studentProfile?.entrance_score !== null && studentProfile?.entrance_score !== undefined && studentProfile.entrance_score > 0) completed++;
  if (studentProfile?.preferred_branch?.trim()) completed++;
  if (studentProfile?.preferred_location?.trim()) completed++;
  if (skills && skills.length > 0) completed++;

  return Math.round((completed / total) * 100);
}

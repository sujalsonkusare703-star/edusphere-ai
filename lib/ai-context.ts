/**
 * Centralized AI Career Assistant Context Builder
 * 
 * Sanitizes and structures the student's real profile, skill gaps,
 * career readiness metrics, and top Supabase opportunities into a compact,
 * high-signal context for the conversational AI engine.
 */

import {
  Profile,
  StudentProfile,
  RecommendationItem,
  SkillGapAnalysis,
  CareerIntelligenceReport,
} from "@/types";

export interface StudentCareerContextParams {
  profile: Profile | null;
  studentProfile: StudentProfile | null;
  skills: string[];
  careerReport?: CareerIntelligenceReport | null;
  skillGap?: SkillGapAnalysis | null;
  colleges?: RecommendationItem[];
  internships?: RecommendationItem[];
  placements?: RecommendationItem[];
  isDemo?: boolean;
}

export interface SanitizedStudentContext {
  studentName: string;
  isDemo: boolean;
  academicProfile: {
    preferredBranch: string;
    entranceScore: string;
    cgpa: string;
    preferredLocation: string;
    careerGoal: string;
  };
  skillsInventory: string[];
  metrics: {
    careerReadinessScore: number;
    readinessLevel: string;
    placementReadiness: {
      eligibleDrives: number;
      totalDrives: number;
      marketReadinessPct: number;
    };
  };
  skillGaps: {
    missingHighPrioritySkills: string[];
    recommendedSkills: string[];
  };
  topRecommendations: {
    colleges: Array<{ name: string; matchScore: number; keyReasons: string[] }>;
    internships: Array<{ role: string; company: string; matchScore: number; matchingSkills: string[]; missingSkills: string[] }>;
    placements: Array<{ role: string; company: string; matchScore: number; minCgpa: string; eligible: boolean }>;
  };
}

/**
 * Builds a sanitized, high-signal structured representation of the student's
 * academic criteria and opportunity matches. Strictly excludes passwords,
 * tokens, internal IDs, and irrelevant data.
 */
export function buildSanitizedContext(params: StudentCareerContextParams): SanitizedStudentContext {
  const {
    profile,
    studentProfile,
    skills,
    careerReport,
    skillGap,
    colleges = [],
    internships = [],
    placements = [],
    isDemo = false,
  } = params;

  const studentName = profile?.full_name?.trim() || "Student";
  const preferredBranch = studentProfile?.preferred_branch?.trim() || "Not specified";
  const entranceScore =
    studentProfile?.entrance_score !== null && studentProfile?.entrance_score !== undefined
      ? `${studentProfile.entrance_score}%ile`
      : "Not specified";
  const cgpa =
    studentProfile?.cgpa !== null && studentProfile?.cgpa !== undefined
      ? `${Number(studentProfile.cgpa).toFixed(2)}`
      : "Not recorded";
  const preferredLocation = studentProfile?.preferred_location?.trim() || "Flexible";
  const careerGoal = studentProfile?.career_goal?.trim() || "Not specified";

  // Top 3 colleges
  const topColleges = colleges.slice(0, 3).map((item) => ({
    name: item.title,
    matchScore: item.match_score,
    keyReasons: item.match_reasons.slice(0, 2),
  }));

  // Top 3 internships
  const topInternships = internships.slice(0, 3).map((item) => ({
    role: item.title,
    company: item.subtitle.split("•")[0]?.trim() || "Industry Partner",
    matchScore: item.match_score,
    matchingSkills: item.matching_skills || [],
    missingSkills: item.missing_skills || [],
  }));

  // Top 3 placements
  const topPlacements = placements.slice(0, 3).map((item) => ({
    role: item.title,
    company: item.subtitle.split("•")[0]?.trim() || "Enterprise Recruiter",
    matchScore: item.match_score,
    minCgpa: item.placement?.min_cgpa ? `${item.placement.min_cgpa}` : "N/A",
    eligible: Boolean(item.is_eligible),
  }));

  const readinessScore = careerReport?.readiness.score ?? 50;
  const readinessLevel = careerReport?.readiness.label ?? "Developing";
  const eligibleDrives = careerReport?.placement_readiness.eligible_placements ?? 0;
  const totalDrives = careerReport?.placement_readiness.total_placements ?? placements.length;
  const marketReadinessPct = careerReport?.placement_readiness.eligibility_percentage ?? 50;

  const missingHighPrioritySkills =
    skillGap?.recommended_skills
      ?.filter((s) => s.demand_level === "High")
      .map((s) => s.skill) ||
    careerReport?.narrative_summary?.skill_gaps ||
    [];

  const recommendedSkills =
    skillGap?.recommended_skills?.map((s) => s.skill) || [];

  return {
    studentName,
    isDemo: Boolean(isDemo),
    academicProfile: {
      preferredBranch,
      entranceScore,
      cgpa,
      preferredLocation,
      careerGoal,
    },
    skillsInventory: skills || [],
    metrics: {
      careerReadinessScore: readinessScore,
      readinessLevel,
      placementReadiness: {
        eligibleDrives,
        totalDrives,
        marketReadinessPct,
      },
    },
    skillGaps: {
      missingHighPrioritySkills,
      recommendedSkills,
    },
    topRecommendations: {
      colleges: topColleges,
      internships: topInternships,
      placements: topPlacements,
    },
  };
}

/**
 * Generates the master system prompt for the AI Career Assistant, embedding
 * the student's actual database context and behavioral constraints.
 */
export function buildSystemInstruction(sanitized: SanitizedStudentContext): string {
  return `You are "EduSphere AI — Academic & Career Guidance Assistant", an intelligent, supportive, and data-grounded advisor for higher education and career placement.

==================================================
AUTHENTICATED STUDENT CONTEXT (VERIFIED SUPABASE DATA)
==================================================
- Student Name: ${sanitized.studentName} ${sanitized.isDemo ? "(Viewing Demo Preview)" : ""}
- Target Stream / Branch: ${sanitized.academicProfile.preferredBranch}
- Entrance Exam Benchmark: ${sanitized.academicProfile.entranceScore}
- Cumulative CGPA: ${sanitized.academicProfile.cgpa}
- Preferred Geographic Region: ${sanitized.academicProfile.preferredLocation}
- Primary Career Goal: ${sanitized.academicProfile.careerGoal}

CURRENT SKILLS INVENTORY:
${sanitized.skillsInventory.length > 0 ? sanitized.skillsInventory.map((s) => `• ${s}`).join("\n") : "• No technical skills recorded yet"}

CAREER & PLACEMENT READINESS BENCHMARKS:
- Overall Career Readiness Score: ${sanitized.metrics.careerReadinessScore}% (${sanitized.metrics.readinessLevel})
- Campus Placement Eligibility: Eligible for ${sanitized.metrics.placementReadiness.eligibleDrives} of ${sanitized.metrics.placementReadiness.totalDrives} active recruitment drives (${sanitized.metrics.placementReadiness.marketReadinessPct}% market readiness)

IDENTIFIED SKILL GAPS:
- Missing Critical Skills: ${sanitized.skillGaps.missingHighPrioritySkills.length > 0 ? sanitized.skillGaps.missingHighPrioritySkills.join(", ") : "None identified (prerequisites satisfied)"}
- Recommended Next Skills to Learn: ${sanitized.skillGaps.recommendedSkills.length > 0 ? sanitized.skillGaps.recommendedSkills.join(", ") : "Continue strengthening current core competencies"}

TOP CURATED OPPORTUNITY MATCHES IN EDUSPHERE DATABASE:
Colleges:
${sanitized.topRecommendations.colleges.length > 0 ? sanitized.topRecommendations.colleges.map((c) => `• ${c.name} (${c.matchScore}% match) — ${c.keyReasons.join("; ")}`).join("\n") : "• No college recommendations computed"}

Internships:
${sanitized.topRecommendations.internships.length > 0 ? sanitized.topRecommendations.internships.map((i) => `• ${i.role} at ${i.company} (${i.matchScore}% match) [Matching skills: ${i.matchingSkills.join(", ") || "None"}; Missing: ${i.missingSkills.join(", ") || "None"}]`).join("\n") : "• No internship recommendations computed"}

Placements:
${sanitized.topRecommendations.placements.length > 0 ? sanitized.topRecommendations.placements.map((p) => `• ${p.role} at ${p.company} (${p.matchScore}% match, Min CGPA: ${p.minCgpa}) — ${p.eligible ? "Eligible" : "CGPA below cutoff"}`).join("\n") : "• No placement drives computed"}

==================================================
ASSISTANT GUIDELINES & BEHAVIORAL RULES
==================================================
1. Base all answers strictly on the student's actual profile criteria and the real opportunity catalog shown above.
2. If asked about eligibility (e.g., "Am I eligible for X placement?"), compare the student's real CGPA (${sanitized.academicProfile.cgpa}) and skills with the company's requirements accurately.
3. If asked about skill gaps or what to learn next, prioritize the "Missing Critical Skills" and "Recommended Next Skills" listed above.
4. When explaining recommendation scores, explain how the student's criteria (academic cutoff, branch, location, skills) produced the match. Do NOT claim that match scores are generated by external LLM black-box models; they are precision academic and algorithmic benchmarks.
5. NEVER invent fake companies, colleges, packages, cutoff ranks, or statistical figures not in the database. If specific data is not available, state clearly that it is not in the current database.
6. Format your responses with clean, concise markdown: use bullet points, bold key phrases, and keep paragraphs focused and actionable.
7. Be encouraging, constructive, and realistic. Provide clear next steps to help the student improve their readiness.`;
}

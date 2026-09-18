import {
  College,
  Internship,
  Placement,
  Profile,
  StudentProfile,
  RecommendationItem,
  SkillGapAnalysis,
  SkillGapItem,
  CareerRoadmapStage,
  ActionPlanItem,
  AIGuidanceOverviewData,
  CareerReadinessScore,
  PlacementReadinessMetrics,
  CareerIntelligenceReport,
} from "@/types";

/**
 * Normalizes an array of skills to lower-case trimmed strings for strict matching,
 * while maintaining a map to their original clean display titles.
 */
export function normalizeSkills(skills: string[]): {
  normalized: Set<string>;
  displayMap: Map<string, string>;
} {
  const normalized = new Set<string>();
  const displayMap = new Map<string, string>();

  skills.forEach((s) => {
    const trimmed = s.trim();
    if (trimmed) {
      const lower = trimmed.toLowerCase();
      normalized.add(lower);
      if (!displayMap.has(lower)) {
        displayMap.set(lower, trimmed);
      }
    }
  });

  return { normalized, displayMap };
}

/**
 * Feature 1: Computes AI Guidance Overview metrics, greeting, and readiness score.
 */
export function computeAIGuidanceOverview(
  profile: Profile | null,
  studentProfile: StudentProfile | null,
  skills: string[],
  careerReadiness?: CareerReadinessScore
): AIGuidanceOverviewData {
  const studentName =
    profile?.full_name?.trim() ||
    "Student";

  const targetBranch = studentProfile?.preferred_branch?.trim() || "";
  const careerGoal = studentProfile?.career_goal?.trim() || "";

  let careerDirection = "Technology & Engineering";
  let hasCareerDirection = false;

  if (careerGoal) {
    careerDirection = careerGoal;
    hasCareerDirection = true;
  } else if (targetBranch) {
    if (targetBranch.toLowerCase().includes("data") || targetBranch.toLowerCase().includes("ai")) {
      careerDirection = "AI & Data Science Specialist";
    } else if (targetBranch.toLowerCase().includes("computer") || targetBranch.toLowerCase().includes("software")) {
      careerDirection = "Software Systems & Full Stack Engineering";
    } else if (targetBranch.toLowerCase().includes("electronics")) {
      careerDirection = "Embedded Systems & Hardware Engineering";
    } else {
      careerDirection = `${targetBranch} Professional Track`;
    }
    hasCareerDirection = true;
  }

  // Single Source of Truth for Career Readiness
  const readiness =
    careerReadiness ??
    computeCareerReadinessScore(profile, studentProfile, skills, 0, 0);

  const readinessScore = readiness.score;
  const readinessLabel = readiness.label;

  const summaryText =
    "Based on your current academic profile, skills, preferences and career interests, here is your personalized guidance.";

  return {
    greeting: `Welcome back, ${studentName}`,
    student_name: studentName,
    target_branch: targetBranch || "General Engineering",
    career_direction: careerDirection,
    has_career_direction: hasCareerDirection,
    readiness_score: readinessScore,
    readiness_label: readinessLabel,
    summary_text: summaryText,
    factors_analyzed: {
      cgpa: studentProfile?.cgpa ?? null,
      entrance_score: studentProfile?.entrance_score ?? null,
      branch: studentProfile?.preferred_branch ?? null,
      location: studentProfile?.preferred_location ?? null,
      skills_count: skills.length,
    },
  };
}

/**
 * Feature 2: Computes Personalized College Guidance with factor breakdowns & cutoffs.
 */
export function computeCollegeGuidance(
  studentProfile: StudentProfile | null,
  colleges: College[] = []
): RecommendationItem[] {
  const targetBranch = studentProfile?.preferred_branch?.toLowerCase().trim() || "";
  const targetLocation = studentProfile?.preferred_location?.toLowerCase().trim() || "";
  const entranceScore = studentProfile?.entrance_score ?? 0;

  return colleges.map((college) => {
    const reasons: string[] = [];
    let academicMatch = 60;
    let branchMatch = 50;
    let locationMatch = 50;

    const courseLower = college.course?.toLowerCase() || "";
    const locLower = college.location?.toLowerCase() || "";
    const stateLower = college.state?.toLowerCase() || "";

    // 1. Entrance cutoff match
    const estimatedCutoff =
      college.college_type?.includes("National") || college.name.includes("IIT") || college.name.includes("BITS")
        ? 94.0
        : college.college_type?.includes("State") || college.name.includes("COEP") || college.name.includes("IIIT")
        ? 88.0
        : 80.0;

    if (entranceScore > 0) {
      if (entranceScore >= estimatedCutoff) {
        academicMatch = 95;
        reasons.push(
          `Entrance score of ${entranceScore} satisfies the estimated admission cutoff (${estimatedCutoff}+)`
        );
      } else {
        academicMatch = Math.max(50, Math.round((entranceScore / estimatedCutoff) * 88));
        reasons.push(
          `Entrance score (${entranceScore}) is close to historical cutoff benchmark (${estimatedCutoff})`
        );
      }
    } else {
      reasons.push(`Accredited curriculum aligned with ${college.entrance_exam || "National Entrance Exams"}`);
    }

    // 2. Branch match
    if (targetBranch && (courseLower.includes(targetBranch) || targetBranch.includes(courseLower))) {
      branchMatch = 95;
      reasons.push(`Direct branch alignment with your target stream (${college.course})`);
    } else if (targetBranch && (courseLower.includes("computer") || courseLower.includes("technology"))) {
      branchMatch = 75;
      reasons.push(`Complementary technology curriculum in ${college.course}`);
    }

    // 3. Location match
    if (targetLocation && (locLower.includes(targetLocation) || stateLower.includes(targetLocation))) {
      locationMatch = 92;
      reasons.push(
        `Located in your preferred region (${college.location ? `${college.location}, ` : ""}${college.state})`
      );
    } else {
      locationMatch = 65;
    }

    // 4. Institutional placement factor
    if (college.placement_rate && college.placement_rate >= 90) {
      reasons.push(`Proven ${college.placement_rate}% campus placement track record`);
    }

    // Weighted composite match score
    const compositeScore = Math.round(
      academicMatch * 0.4 + branchMatch * 0.35 + locationMatch * 0.25
    );
    const finalScore = Math.min(Math.max(compositeScore, 60), 98);

    const relevantCutoff = `${college.entrance_exam || "Merit"} (Est. Cutoff: ${estimatedCutoff}%ile)`;

    return {
      id: college.id,
      item_type: "college" as const,
      title: college.name,
      subtitle: `${college.course || "Degree"} • ${college.location ? `${college.location}, ` : ""}${college.state || "India"}`,
      match_score: finalScore,
      match_reasons: reasons,
      college,
      is_ai_recommended: finalScore >= 85,
      factor_breakdown: {
        academic_match: academicMatch,
        branch_match: branchMatch,
        location_match: locationMatch,
        eligibility_match: entranceScore >= estimatedCutoff ? 96 : 75,
      },
      relevant_cutoff: relevantCutoff,
    };
  }).sort((a, b) => b.match_score - a.match_score);
}

/**
 * Feature 3: Computes Personalized Internship Guidance with matching & missing skills.
 */
export function computeInternshipGuidance(
  studentProfile: StudentProfile | null,
  skills: string[],
  internships: Internship[] = []
): RecommendationItem[] {
  const { normalized: studentSkillsLower } = normalizeSkills(skills);
  const targetBranch = studentProfile?.preferred_branch?.toLowerCase().trim() || "";

  return internships.map((internship) => {
    const reasons: string[] = [];
    const internshipSkills = internship.skills || [];

    const matchingSkills: string[] = [];
    const missingSkills: string[] = [];

    internshipSkills.forEach((reqSkill) => {
      if (studentSkillsLower.has(reqSkill.toLowerCase().trim())) {
        matchingSkills.push(reqSkill);
      } else {
        missingSkills.push(reqSkill);
      }
    });

    const totalReq = Math.max(internshipSkills.length, 1);
    const skillRatio = matchingSkills.length / totalReq;
    const skillMatchScore = Math.round(skillRatio * 100);

    let roleMatch = 60;
    const roleLower = internship.role.toLowerCase();

    if (
      targetBranch &&
      (roleLower.includes("developer") ||
        roleLower.includes("engineer") ||
        roleLower.includes("analyst") ||
        roleLower.includes("research"))
    ) {
      roleMatch = 90;
      reasons.push(`Role aligns with your academic domain (${studentProfile?.preferred_branch || "Technology"})`);
    }

    const locationMatch = internship.remote ? 95 : 70;
    if (internship.remote) {
      reasons.push("Remote flexibility allows balancing with college semester coursework");
    } else {
      reasons.push(`On-site placement at ${internship.location}`);
    }

    if (matchingSkills.length > 0) {
      reasons.push(`Direct skill match on: ${matchingSkills.join(", ")}`);
    }

    if (missingSkills.length > 0) {
      reasons.push(`Key skill to develop: ${missingSkills.slice(0, 2).join(", ")}`);
    }

    const compositeScore = Math.round(
      skillMatchScore * 0.5 + roleMatch * 0.3 + locationMatch * 0.2
    );
    const finalScore = Math.min(Math.max(compositeScore, 58), 96);

    return {
      id: internship.id,
      item_type: "internship" as const,
      title: internship.role,
      subtitle: `${internship.company} • ${internship.stipend || "Stipend Provided"} • ${internship.duration || "Internship"}`,
      match_score: finalScore,
      match_reasons: reasons,
      internship,
      is_ai_recommended: finalScore >= 82,
      matching_skills: matchingSkills,
      missing_skills: missingSkills,
      factor_breakdown: {
        skill_match: skillMatchScore,
        branch_match: roleMatch,
        location_match: locationMatch,
        eligibility_match: 90,
      },
    };
  }).sort((a, b) => b.match_score - a.match_score);
}

/**
 * Feature 4: Computes Personalized Placement Guidance with dynamic CGPA eligibility.
 */
export function computePlacementGuidance(
  studentProfile: StudentProfile | null,
  skills: string[],
  placements: Placement[] = []
): RecommendationItem[] {
  const { normalized: studentSkillsLower } = normalizeSkills(skills);
  const studentCgpa = studentProfile?.cgpa ?? 0;

  return placements.map((placement) => {
    const reasons: string[] = [];
    const placementSkills = placement.skills || [];
    const minCgpa = placement.min_cgpa ?? 6.0;

    const matchingSkills: string[] = [];
    const missingSkills: string[] = [];

    placementSkills.forEach((reqSkill) => {
      if (studentSkillsLower.has(reqSkill.toLowerCase().trim())) {
        matchingSkills.push(reqSkill);
      } else {
        missingSkills.push(reqSkill);
      }
    });

    const isEligible = studentCgpa > 0 ? studentCgpa >= minCgpa : false;
    let eligibilityText = "";
    let eligibilityMatch = 50;

    if (studentCgpa > 0) {
      if (isEligible) {
        eligibilityMatch = 95;
        eligibilityText = `Eligible (Your CGPA: ${studentCgpa} ≥ ${minCgpa})`;
        reasons.push(`Academic CGPA (${studentCgpa}) meets recruitment eligibility benchmark (≥ ${minCgpa})`);
      } else {
        eligibilityMatch = Math.round((studentCgpa / minCgpa) * 75);
        eligibilityText = `Minimum CGPA: ${minCgpa} (Your CGPA: ${studentCgpa})`;
        reasons.push(`Current CGPA (${studentCgpa}) is below the ${minCgpa} recruitment threshold`);
      }
    } else {
      eligibilityText = `Minimum CGPA requirement: ${minCgpa}`;
      eligibilityMatch = 70;
      reasons.push(`Requires minimum CGPA of ${minCgpa} upon degree completion`);
    }

    const totalReq = Math.max(placementSkills.length, 1);
    const skillRatio = matchingSkills.length / totalReq;
    const skillMatchScore = Math.round(skillRatio * 100);

    if (matchingSkills.length > 0) {
      reasons.push(`Target skills verified: ${matchingSkills.join(", ")}`);
    }

    if (missingSkills.length > 0) {
      reasons.push(`Recommended pre-drive preparation: ${missingSkills.slice(0, 2).join(", ")}`);
    }

    if (placement.industry) {
      reasons.push(`Industry sector: ${placement.industry}`);
    }

    const compositeScore = Math.round(
      eligibilityMatch * 0.45 + skillMatchScore * 0.4 + 10
    );
    const finalScore = Math.min(Math.max(compositeScore, 60), 97);

    return {
      id: placement.id,
      item_type: "placement" as const,
      title: placement.role,
      subtitle: `${placement.company} • ${placement.industry || "Technology"} • ${placement.location || "Pan-India"}`,
      match_score: finalScore,
      match_reasons: reasons,
      placement,
      is_ai_recommended: finalScore >= 85,
      matching_skills: matchingSkills,
      missing_skills: missingSkills,
      is_eligible: isEligible,
      eligibility_text: eligibilityText,
      factor_breakdown: {
        eligibility_match: eligibilityMatch,
        skill_match: skillMatchScore,
        academic_match: isEligible ? 95 : 65,
        branch_match: 85,
      },
    };
  }).sort((a, b) => b.match_score - a.match_score);
}

/**
 * Feature 5: Builds the Skill Gap Analysis.
 * Compares student's current skills against skills required across internships & placements.
 * Strictly avoids recommending skills already in the student's profile.
 */
export function computeSkillGapAnalysis(
  skills: string[],
  internships: Internship[] = [],
  placements: Placement[] = []
): SkillGapAnalysis {
  const { normalized: studentSkillsLower } = normalizeSkills(skills);

  // Map to collect all market skills with occurrences & referencing opportunities
  const marketSkillsMap = new Map<
    string,
    {
      display: string;
      count: number;
      roles: Set<string>;
      companies: Set<string>;
    }
  >();

  // Helper to record a market requirement
  const recordMarketSkill = (skillName: string, role: string, company: string) => {
    const trimmed = skillName.trim();
    if (!trimmed) return;
    const lower = trimmed.toLowerCase();

    const existing = marketSkillsMap.get(lower);
    if (existing) {
      existing.count += 1;
      existing.roles.add(role);
      existing.companies.add(company);
    } else {
      marketSkillsMap.set(lower, {
        display: trimmed,
        count: 1,
        roles: new Set([role]),
        companies: new Set([company]),
      });
    }
  };

  internships.forEach((item) => {
    (item.skills || []).forEach((s) => recordMarketSkill(s, item.role, item.company));
  });

  placements.forEach((item) => {
    (item.skills || []).forEach((s) => recordMarketSkill(s, item.role, item.company));
  });

  // Identify recommended missing skills (only those NOT present in studentSkillsLower)
  const recommended: SkillGapItem[] = [];
  let studentCoveredMarketCount = 0;

  marketSkillsMap.forEach((data, lowerKey) => {
    if (studentSkillsLower.has(lowerKey)) {
      studentCoveredMarketCount += 1;
    } else {
      const companiesList = Array.from(data.companies).slice(0, 2).join(" & ");
      const demandLevel: "High" | "Medium" | "Emerging" =
        data.count >= 3 ? "High" : data.count === 2 ? "Medium" : "Emerging";

      recommended.push({
        skill: data.display,
        frequency: data.count,
        demand_level: demandLevel,
        relevant_roles: Array.from(data.roles),
        reason: `Required by ${data.count} curated opportunity listings including ${companiesList}`,
      });
    }
  });

  // Sort recommended skills by frequency descending
  recommended.sort((a, b) => b.frequency - a.frequency);

  const totalMarketSkills = marketSkillsMap.size;
  const coveragePercent =
    totalMarketSkills > 0
      ? Math.round((studentCoveredMarketCount / totalMarketSkills) * 100)
      : 0;

  return {
    current_skills: skills,
    recommended_skills: recommended,
    skill_coverage_percentage: coveragePercent,
    total_market_skills: totalMarketSkills,
  };
}

/**
 * Feature 6: Builds the Dynamic 6-Stage Career Roadmap.
 * Reflects student's current stage and goals without inventing unstated career targets.
 */
export function computeCareerRoadmap(
  profile: Profile | null,
  studentProfile: StudentProfile | null,
  skills: string[]
): CareerRoadmapStage[] {
  const hasBranch = !!studentProfile?.preferred_branch?.trim();
  const hasScore = studentProfile?.entrance_score !== null && studentProfile?.entrance_score !== undefined;
  const hasCgpa = studentProfile?.cgpa !== null && studentProfile?.cgpa !== undefined && studentProfile.cgpa > 0;
  const skillCount = skills.length;
  const careerGoal = studentProfile?.career_goal?.trim() || "";

  // Determine stage progression
  const isProfileComplete = hasBranch && hasScore && (profile?.full_name?.trim() || "").length > 0;
  const isSkillStageActive = isProfileComplete && skillCount >= 3;
  const isProjectStageActive = isSkillStageActive && skillCount >= 4;
  const isInternshipStageActive = isProjectStageActive && (hasCgpa || skillCount >= 5);

  const stages: CareerRoadmapStage[] = [
    {
      stage_number: 1,
      id: "current_profile",
      title: "Academic Profile & Baseline",
      status: isProfileComplete ? "completed" : "in_progress",
      description: isProfileComplete
        ? `Academic stream (${studentProfile?.preferred_branch}) and entrance benchmark (${studentProfile?.entrance_score ?? "N/A"}) established.`
        : "Complete your basic academic stream, entrance score, and location preferences.",
      milestones: [
        "Record entrance exam benchmark",
        "Define target engineering or degree stream",
        "Benchmark eligibility against university cutoffs",
      ],
      action_cta: !isProfileComplete ? { label: "Complete Profile", href: "/profile" } : undefined,
    },
    {
      stage_number: 2,
      id: "skill_development",
      title: "Technical Skill Acquisition",
      status: skillCount >= 5 ? "completed" : isProfileComplete ? "in_progress" : "upcoming",
      description:
        skillCount >= 3
          ? `Solid foundation established with ${skillCount} verified skills (${skills.slice(0, 3).join(", ")}).`
          : "Acquire core foundational languages and technologies demanded by employers.",
      milestones: [
        "Master foundational language (Python / Java / C++)",
        "Gain hands-on proficiency in databases & SQL",
        "Expand into modern frameworks (React / Node.js)",
      ],
      action_cta: skillCount < 5 ? { label: "Add Skills in Profile", href: "/profile" } : undefined,
    },
    {
      stage_number: 3,
      id: "project_building",
      title: "Hands-on Project Building",
      status: isProjectStageActive ? "in_progress" : "upcoming",
      description:
        "Build end-to-end production applications demonstrating practical problem solving.",
      milestones: [
        "Build 2 full-stack or domain-specific capstone projects",
        "Publish codebase to GitHub with clean documentation",
        "Deploy projects to live cloud hosting environments",
      ],
    },
    {
      stage_number: 4,
      id: "internship_prep",
      title: "Internship Preparation & Experience",
      status: isInternshipStageActive ? "in_progress" : "upcoming",
      description:
        "Translate academic knowledge into real-world industry experience via competitive internships.",
      milestones: [
        "Build an ATS-optimized technical resume",
        "Apply to matched remote & on-site internships",
        "Complete technical code screenings & live interviews",
      ],
      action_cta: { label: "Explore Internships", href: "/internships" },
    },
    {
      stage_number: 5,
      id: "placement_prep",
      title: "Campus Recruitment & Placement Drives",
      status: hasCgpa && studentProfile.cgpa! >= 7.5 ? "in_progress" : "upcoming",
      description:
        "Prepare for campus placement drives with structured DSA practice and core computer science revision.",
      milestones: [
        "Maintain competitive CGPA (≥ 7.5 threshold for top tiers)",
        "Master Data Structures & Algorithms problem solving",
        "Participate in mock technical & HR interviews",
      ],
      action_cta: { label: "Review Placements", href: "/placements" },
    },
    {
      stage_number: 6,
      id: "career_target",
      title: "Career Target & Full-Time Role",
      status: "upcoming",
      description: careerGoal
        ? `Targeting high-impact ${careerGoal} opportunities with industry-leading packages.`
        : hasBranch
        ? `Targeting graduate engineering opportunities in ${studentProfile?.preferred_branch}.`
        : "Complete your target career preference in Profile Settings to unlock personalized career milestones.",
      milestones: [
        "Secure full-time graduate offer aligned with your career goal",
        "Transition successfully from academic projects to production engineering",
        "Establish continuous learning goals for early-career growth",
      ],
      action_cta: !careerGoal ? { label: "Define Career Goal", href: "/profile" } : undefined,
    },
  ];

  return stages;
}

/**
 * Feature 7: Generates a prioritized, personalized Action Plan ("Your Next Steps").
 * Generates 3 to 5 actionable steps based on actual profile gaps.
 */
export function computeActionPlan(
  profile: Profile | null,
  studentProfile: StudentProfile | null,
  skills: string[],
  savedCount: number = 0,
  recommendedSkills: SkillGapItem[] = []
): ActionPlanItem[] {
  const actions: ActionPlanItem[] = [];

  const hasBranch = !!studentProfile?.preferred_branch?.trim();
  const hasScore = studentProfile?.entrance_score !== null && studentProfile?.entrance_score !== undefined;
  const hasCgpa = studentProfile?.cgpa !== null && studentProfile?.cgpa !== undefined && studentProfile.cgpa > 0;
  const hasCareerGoal = !!studentProfile?.career_goal?.trim();

  // 1. Profile gaps
  if (!hasBranch || !hasScore) {
    actions.push({
      id: "action-complete-profile",
      title: "Complete Core Academic Profile",
      description:
        "Add your preferred branch and entrance score to enable accurate college cutoff comparisons and ranking.",
      priority: "High",
      category: "profile",
      action_link: { label: "Update Profile →", href: "/profile" },
      is_completed: false,
    });
  }

  // 2. CGPA check for placements
  if (!hasCgpa) {
    actions.push({
      id: "action-add-cgpa",
      title: "Record Academic CGPA",
      description:
        "Add your current semester CGPA to verify instant eligibility for campus placement drives and MNC hiring benchmarks.",
      priority: "High",
      category: "academics",
      action_link: { label: "Enter CGPA →", href: "/profile" },
      is_completed: false,
    });
  } else if (studentProfile.cgpa! < 7.5) {
    actions.push({
      id: "action-boost-cgpa",
      title: "Aim for 7.5+ CGPA Threshold",
      description: `Your current CGPA is ${studentProfile.cgpa}. Several top-tier recruitment drives require a minimum CGPA of 7.5 or 8.0.`,
      priority: "Medium",
      category: "academics",
      action_link: { label: "Review Cutoffs →", href: "/placements" },
      is_completed: false,
    });
  }

  // 3. Address top missing skill
  if (recommendedSkills.length > 0) {
    const topSkill = recommendedSkills[0];
    actions.push({
      id: `action-learn-${topSkill.skill.toLowerCase()}`,
      title: `Learn ${topSkill.skill} for High-Demand Listings`,
      description: `${topSkill.skill} is requested in ${topSkill.frequency} opportunity listings. Adding this skill will substantially raise your match score.`,
      priority: "High",
      category: "skills",
      action_link: { label: "View Skill Gap →", href: "/recommendations" },
      is_completed: false,
    });
  }

  // 4. Career Goal setting if missing
  if (!hasCareerGoal) {
    actions.push({
      id: "action-set-career-goal",
      title: "Define Target Career Direction",
      description:
        "Specifying a role goal (e.g., 'Full Stack AI Engineer' or 'Data Analyst') helps the engine curate exact role roadmaps.",
      priority: "Recommended",
      category: "profile",
      action_link: { label: "Set Career Goal →", href: "/profile" },
      is_completed: false,
    });
  }

  // 5. Saved opportunities tracker
  if (savedCount < 3) {
    actions.push({
      id: "action-save-opportunities",
      title: "Shortlist Target Opportunities",
      description:
        "Bookmark at least 3 colleges, internships, or placement drives to your Saved Items to build your tracking list.",
      priority: "Recommended",
      category: "internships",
      action_link: { label: "Explore Recommendations →", href: "/recommendations" },
      is_completed: false,
    });
  } else {
    actions.push({
      id: "action-review-saved",
      title: "Review Shortlisted Opportunities",
      description: `You have ${savedCount} saved opportunities. Review deadlines and eligibility requirements before application cycles.`,
      priority: "Recommended",
      category: "profile",
      action_link: { label: "View Saved Items →", href: "/saved" },
      is_completed: true,
    });
  }

  // Return up to 5 prioritized actions
  return actions.slice(0, 5);
}

/**
 * Career Intelligence: Computes placement readiness metrics comparing student CGPA and skills
 * against all placement drives.
 */
export function computePlacementReadinessMetrics(
  studentProfile: StudentProfile | null,
  skills: string[],
  placements: Placement[] = []
): PlacementReadinessMetrics {
  const { normalized: studentSkillsLower } = normalizeSkills(skills);
  const studentCgpa = studentProfile?.cgpa ?? 0;

  let eligibleCount = 0;
  let skillCompatibleCount = 0;
  let blockedByCgpaCount = 0;
  let missingSkillsCount = 0;

  const eligibleCompanies: string[] = [];
  const cgpaGapCompanies: string[] = [];

  placements.forEach((item) => {
    const minCgpa = item.min_cgpa ?? 6.0;
    const isEligible = studentCgpa > 0 && studentCgpa >= minCgpa;

    if (isEligible) {
      eligibleCount += 1;
      eligibleCompanies.push(item.company);
    } else {
      blockedByCgpaCount += 1;
      cgpaGapCompanies.push(item.company);
    }

    const reqSkills = item.skills || [];
    const hasAnySkill = reqSkills.some((s) => studentSkillsLower.has(s.toLowerCase().trim()));
    if (hasAnySkill) {
      skillCompatibleCount += 1;
    }

    const hasMissingSkill = reqSkills.some((s) => !studentSkillsLower.has(s.toLowerCase().trim()));
    if (hasMissingSkill) {
      missingSkillsCount += 1;
    }
  });

  const total = Math.max(placements.length, 1);
  const eligibilityPercentage = Math.round((eligibleCount / total) * 100);

  return {
    total_placements: placements.length,
    eligible_placements: eligibleCount,
    skill_compatible_placements: skillCompatibleCount,
    blocked_by_cgpa: blockedByCgpaCount,
    missing_skills_placements: missingSkillsCount,
    eligibility_percentage: eligibilityPercentage,
    top_eligible_companies: eligibleCompanies,
    cgpa_gap_companies: cgpaGapCompanies,
  };
}

/**
 * Career Intelligence: Computes transparent 4-factor Career Readiness Score (0 - 100).
 * Weights:
 * - Academic Profile: 25% (CGPA + Entrance score benchmark)
 * - Skills: 25% (Verified skills depth)
 * - Profile Completeness: 20% (Name, Branch, Location, Goal)
 * - Opportunity Readiness: 30% (Skill coverage + Placement eligibility)
 */
export function computeCareerReadinessScore(
  profile: Profile | null,
  studentProfile: StudentProfile | null,
  skills: string[],
  skillCoveragePercentage: number = 0,
  placementEligibilityPercentage: number = 0
): CareerReadinessScore {
  // 1. Academic Profile Factor (25% Weight)
  const cgpa = studentProfile?.cgpa ?? 0;
  let cgpaPoints = 40;
  if (cgpa >= 8.5) cgpaPoints = 100;
  else if (cgpa >= 8.0) cgpaPoints = 90;
  else if (cgpa >= 7.5) cgpaPoints = 80;
  else if (cgpa >= 7.0) cgpaPoints = 70;
  else if (cgpa >= 6.0) cgpaPoints = 55;

  const entrance = studentProfile?.entrance_score ?? 0;
  let entrancePoints = 45;
  if (entrance >= 95) entrancePoints = 100;
  else if (entrance >= 90) entrancePoints = 90;
  else if (entrance >= 80) entrancePoints = 75;
  else if (entrance >= 70) entrancePoints = 60;

  const academicProfile = Math.round(cgpaPoints * 0.6 + entrancePoints * 0.4);

  // 2. Skills Factor (25% Weight)
  const count = skills.length;
  let skillsScore = 20;
  if (count >= 5) skillsScore = 100;
  else if (count >= 4) skillsScore = 85;
  else if (count >= 3) skillsScore = 70;
  else if (count >= 2) skillsScore = 50;
  else if (count >= 1) skillsScore = 35;

  // 3. Profile Completeness Factor (20% Weight)
  let completenessScore = 0;
  if (profile?.full_name?.trim()) completenessScore += 20;
  if (studentProfile?.preferred_branch?.trim()) completenessScore += 30;
  if (studentProfile?.preferred_location?.trim()) completenessScore += 25;
  if (studentProfile?.career_goal?.trim()) completenessScore += 25;

  // 4. Opportunity Readiness Factor (30% Weight)
  const opportunityReadiness = Math.round(
    skillCoveragePercentage * 0.5 + placementEligibilityPercentage * 0.5
  );

  // Composite Weighted Score (0 - 100)
  const compositeScore = Math.round(
    academicProfile * 0.25 +
    skillsScore * 0.25 +
    completenessScore * 0.20 +
    opportunityReadiness * 0.30
  );

  const finalScore = Math.min(Math.max(compositeScore, 25), 98);

  let label = "Developing Foundations";
  let summary = "Complete remaining profile criteria and acquire key technical skills.";

  if (finalScore >= 85) {
    label = "Highly Competitive";
    summary = "Outstanding academic benchmark and strong alignment with tier-1 placement drives.";
  } else if (finalScore >= 70) {
    label = "Career Ready";
    summary = "Solid core skills and qualifying credentials across majority of campus opportunities.";
  } else if (finalScore >= 55) {
    label = "Progressing Well";
    summary = "Good foundational baseline with targeted opportunities to expand skill depth.";
  }

  return {
    score: finalScore,
    label,
    breakdown: {
      academic_profile: academicProfile,
      skills: skillsScore,
      profile_completeness: completenessScore,
      opportunity_readiness: opportunityReadiness,
    },
    summary,
  };
}

/**
 * Career Intelligence: Builds the comprehensive Student Career Intelligence report.
 */
export function computeCareerIntelligenceReport(
  profile: Profile | null,
  studentProfile: StudentProfile | null,
  skills: string[],
  colleges: College[] = [],
  internships: Internship[] = [],
  placements: Placement[] = [],
  savedCount: number = 0
): CareerIntelligenceReport {
  const placementReadiness = computePlacementReadinessMetrics(studentProfile, skills, placements);
  const skillGapAnalysis = computeSkillGapAnalysis(skills, internships, placements);

  const readinessScore = computeCareerReadinessScore(
    profile,
    studentProfile,
    skills,
    skillGapAnalysis.skill_coverage_percentage,
    placementReadiness.eligibility_percentage
  );

  const priorityActions = computeActionPlan(
    profile,
    studentProfile,
    skills,
    savedCount,
    skillGapAnalysis.recommended_skills
  );

  // Formulate concise, transparent narrative summary
  const strengths: string[] = [];
  if (studentProfile?.cgpa && studentProfile.cgpa >= 8.0) {
    strengths.push(`Strong academic standing with CGPA of ${studentProfile.cgpa} satisfying top recruitment benchmarks.`);
  } else if (studentProfile?.entrance_score && studentProfile.entrance_score >= 90) {
    strengths.push(`High entrance percentile (${studentProfile.entrance_score}) qualifying for premier institutional cutoffs.`);
  }

  if (studentProfile?.entrance_score && studentProfile.entrance_score > 0) {
    const qualifyingColleges = colleges.filter((c) => {
      const cutoff = c.name.includes("IIT") || c.name.includes("BITS") ? 94 : 85;
      return studentProfile.entrance_score! >= cutoff;
    });
    if (qualifyingColleges.length > 0) {
      strengths.push(`Entrance benchmark qualifies for ${qualifyingColleges.length} accredited university programs.`);
    }
  }

  if (skills.length >= 3) {
    strengths.push(`Core competencies established in ${skills.slice(0, 3).join(", ")}.`);
  }

  if (placementReadiness.eligible_placements > 0) {
    strengths.push(`Instantly eligible for ${placementReadiness.eligible_placements} out of ${placementReadiness.total_placements} campus placement drives.`);
  }

  const skillGaps: string[] = [];
  if (skillGapAnalysis.recommended_skills.length > 0) {
    const topGaps = skillGapAnalysis.recommended_skills.slice(0, 2);
    skillGaps.push(`${topGaps.map((g) => g.skill).join(" and ")} requested in ${topGaps.reduce((acc, curr) => acc + curr.frequency, 0)} opportunity openings.`);
  }

  const oppText = placementReadiness.eligible_placements > 0
    ? `You satisfy criteria for ${placementReadiness.eligible_placements} of ${placementReadiness.total_placements} placement drives (${placementReadiness.eligibility_percentage}%) and cover ${skillGapAnalysis.skill_coverage_percentage}% of active industry skill requirements.`
    : `Add or update your CGPA in Profile Settings to unlock instant placement eligibility verification across ${placementReadiness.total_placements} campus drives.`;

  const suggestedDirection = skillGapAnalysis.recommended_skills.length > 0
    ? `Focus on acquiring ${skillGapAnalysis.recommended_skills[0].skill} and deploying a capstone portfolio project to reach ${Math.min(readinessScore.score + 10, 98)}% readiness.`
    : "Review shortlisted internships and prepare technical problem-solving for upcoming recruitment drives.";

  return {
    readiness: readinessScore,
    placement_readiness: placementReadiness,
    skill_progress: {
      current_skills: skillGapAnalysis.current_skills,
      recommended_skills: skillGapAnalysis.recommended_skills,
      coverage_percentage: skillGapAnalysis.skill_coverage_percentage,
      total_market_skills: skillGapAnalysis.total_market_skills,
    },
    narrative_summary: {
      strengths: strengths.length > 0 ? strengths : ["Academic profile baseline established."],
      skill_gaps: skillGaps.length > 0 ? skillGaps : ["No urgent skill gaps identified in current catalog."],
      opportunity_readiness_text: oppText,
      suggested_direction: suggestedDirection,
    },
    priority_actions: priorityActions.slice(0, 3),
  };
}


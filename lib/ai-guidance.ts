import {
  College,
  CollegeCourse,
  CollegeCutoff,
  CutoffUnit,
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
 * Normalizes entrance examination names into canonical search keys.
 * Used for strict exam-to-exam matching.
 */
export function normalizeExamKey(examStr: string): string {
  if (!examStr) return "";
  const norm = examStr.toLowerCase().replace(/[-\s_]/g, "");
  if (norm.includes("mht") || norm === "cet" || norm.includes("mhtcet")) return "mht-cet";
  if (norm.includes("jeeadvanced") || norm.includes("jeeadv")) return "jee-advanced";
  if (norm.includes("jeemain") || norm === "jee") return "jee-main";
  if (norm.includes("law") || norm.includes("clat")) return "mh-cet-law";
  if (norm.includes("nata") || norm.includes("arch")) return "nata";
  return norm;
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
/**
 * Helper to determine technical skills associated with an academic discipline/course.
 */
function getDomainRelevantSkills(courseName: string, stream: string): string[] {
  const c = `${courseName} ${stream}`.toLowerCase();
  if (c.includes("computer") || c.includes("software") || c.includes("information technology") || c.includes("it") || c.includes("cse")) {
    return ["python", "java", "c++", "javascript", "typescript", "react", "sql", "data structures", "git", "docker", "cloud computing", "node.js"];
  }
  if (c.includes("ai") || c.includes("data") || c.includes("machine learning") || c.includes("artificial intelligence")) {
    return ["python", "sql", "machine learning", "data structures", "deep learning", "r", "pandas", "numpy", "statistics"];
  }
  if (c.includes("electronics") || c.includes("telecommunication") || c.includes("e&tc") || c.includes("etc") || c.includes("electrical")) {
    return ["c", "c++", "embedded systems", "iot", "matlab", "vlsi", "pcb", "microcontrollers", "circuits"];
  }
  if (c.includes("mechanical") || c.includes("automobile") || c.includes("mechatronics")) {
    return ["cad", "solidworks", "matlab", "ansys", "autocad", "thermodynamics", "manufacturing", "c++"];
  }
  if (c.includes("civil") || c.includes("structural")) {
    return ["autocad", "staad pro", "revit", "gis", "surveying", "construction management"];
  }
  if (c.includes("management") || c.includes("mba") || c.includes("bba")) {
    return ["financial analysis", "marketing", "business strategy", "excel", "leadership", "project management"];
  }
  if (c.includes("law") || c.includes("legal")) {
    return ["legal research", "constitutional law", "corporate law", "arbitration", "drafting", "advocacy"];
  }
  if (c.includes("design")) {
    return ["figma", "ui/ux", "user research", "prototyping", "adobe illustrator", "photoshop", "wireframing"];
  }
  return ["problem solving", "analytical thinking", "communication", "teamwork", "research"];
}

/**
 * Feature 2: Computes Personalized College Guidance with real Supabase cutoff matching.
 * 
 * FINAL RECOMMENDATION SCORING FORMULA:
 * -------------------------------------------------------------
 * 1. When Cutoff Data is Available and Student has Valid Score:
 *    - Cutoff Compatibility:   35% (scaled based on difference between student score and published cutoff)
 *    - Academic Alignment:     25% (NAAC grade accreditation, institutional placement track record, student CGPA)
 *    - Program/Domain Match:   20% (direct branch match: 96%, complementary/related: 85%, general: 70%)
 *    - Technical Skills Match: 10% (overlap of student's skills with the program's technical curriculum)
 *    - Location Preference:    10% (geographic alignment with student's preferred city or state)
 *    Total = 100%
 * 
 * 2. When Cutoff Data is Unavailable (Missing cutoff, missing student score, or exam mismatch):
 *    - Cutoff factor is NOT treated as a failed cutoff (score is never zeroed).
 *    - The remaining 4 factors are renormalized to sum to 100%:
 *      - Academic Alignment:     25 / 65 ≈ 38.46%
 *      - Program/Domain Match:   20 / 65 ≈ 30.77%
 *      - Technical Skills Match: 10 / 65 ≈ 15.38%
 *      - Location Preference:    10 / 65 ≈ 15.38%
 *    Total = 100%
 * -------------------------------------------------------------
 * Never creates predictive claims (e.g. "90% chance"). All guidance uses factual statuses:
 * "Cutoff compatible", "Cutoff not met", or "Cutoff unavailable".
 */
export function computeCollegeGuidance(
  studentProfile: StudentProfile | null,
  colleges: College[] = [],
  skills: string[] = []
): RecommendationItem[] {
  const targetBranch = studentProfile?.preferred_branch?.toLowerCase().trim() || "";
  const targetLocation = studentProfile?.preferred_location?.toLowerCase().trim() || "";
  const studentExam = studentProfile?.entrance_exam?.trim() || "";
  const studentExamKey = studentExam ? normalizeExamKey(studentExam) : "";
  const studentCategoryRaw = studentProfile?.category?.trim().toUpperCase() || "";

  // Normalize student score
  const studentScore =
    studentProfile?.entrance_score !== null &&
    studentProfile?.entrance_score !== undefined &&
    studentProfile.entrance_score > 0
      ? Number(studentProfile.entrance_score)
      : null;

  // Normalized skill set for skill alignment evaluation
  const { normalized: studentSkillsLower } = normalizeSkills(skills);

  return colleges.map((college) => {
    const reasons: string[] = [];
    const locLower = college.location?.toLowerCase() || "";
    const stateLower = college.state?.toLowerCase() || "";

    // -------------------------------------------------------------
    // STEP 1: Identify Best-Matching Program / Course
    // -------------------------------------------------------------
    let matchedCourseName = "";
    let matchedStream = college.primary_stream || "Technology";
    let matchedCourseIntake = 0;
    let matchedCutoffRecord: CollegeCutoff | null = null;
    let branchMatchScore = 65;
    let matchedCourseObject: CollegeCourse | null = null;

    if (college.courses && college.courses.length > 0) {
      // Find course aligning with student's preferred branch
      const rankedCourses = college.courses.map((crs) => {
        const cName = crs.course_name.toLowerCase();
        const cStream = crs.stream.toLowerCase();
        let rank = 0;

        if (targetBranch) {
          if (cName === targetBranch) {
            rank = 100;
          } else if (cName.includes(targetBranch) || targetBranch.includes(cName)) {
            rank = 90;
          } else if (
            (targetBranch.includes("computer") || targetBranch.includes("cse")) &&
            (cName.includes("computer") || cName.includes("cse") || cName.includes("information technology") || cName.includes("it"))
          ) {
            rank = 88;
          } else if (
            (targetBranch.includes("data") || targetBranch.includes("ai")) &&
            (cName.includes("ai") || cName.includes("data") || cName.includes("machine learning"))
          ) {
            rank = 86;
          } else if (
            (targetBranch.includes("electronics") || targetBranch.includes("telecom")) &&
            (cName.includes("telecommunication") || cName.includes("e&tc") || cName.includes("etc") || cName.includes("electronics"))
          ) {
            rank = 86;
          } else if (targetBranch.includes("mechanical") && cName.includes("mechanical")) {
            rank = 85;
          } else if (targetBranch.includes("electrical") && cName.includes("electrical")) {
            rank = 85;
          } else if (targetBranch.includes("chemical") && cName.includes("chemical")) {
            rank = 84;
          } else if (targetBranch.includes("civil") && cName.includes("civil")) {
            rank = 84;
          } else if (targetBranch.includes("law") && (cStream.includes("law") || cName.includes("law") || cName.includes("llb"))) {
            rank = 88;
          } else if (targetBranch.includes("design") && (cStream.includes("design") || cName.includes("design") || cName.includes("bdes"))) {
            rank = 88;
          } else if (targetBranch.includes("architecture") && (cStream.includes("architecture") || cName.includes("arch") || cName.includes("barch"))) {
            rank = 88;
          } else if (cStream === targetBranch || targetBranch.includes(cStream)) {
            rank = 75;
          }
        }

        // Prioritize courses with real cutoffs matching student's exam if rank tie
        const studentExamCutoff = studentExamKey && crs.cutoffs && crs.cutoffs.length > 0
          ? crs.cutoffs.find(c => normalizeExamKey(c.exam) === studentExamKey)
          : null;
        const hasCutoff = crs.cutoffs && crs.cutoffs.length > 0;
        return { course: crs, rank: rank + (studentExamCutoff ? 4 : hasCutoff ? 1 : 0) };
      });

      rankedCourses.sort((a, b) => b.rank - a.rank);
      const topCourse = rankedCourses[0].course;
      matchedCourseObject = topCourse;
      const topRank = rankedCourses[0].rank;

      matchedCourseName = topCourse.course_name;
      matchedStream = topCourse.stream || college.primary_stream || "Technology";
      matchedCourseIntake = topCourse.intake || 0;

      if (topRank >= 80) {
        branchMatchScore = 96;
        reasons.push(`Direct branch alignment with ${matchedCourseName}${matchedCourseIntake > 0 ? ` (${matchedCourseIntake} seats)` : ""}`);
      } else if (topRank >= 70) {
        branchMatchScore = 84;
        reasons.push(`Complementary academic curriculum in ${matchedCourseName}`);
      } else {
        branchMatchScore = 70;
        reasons.push(`Approved undergraduate degree in ${matchedCourseName}`);
      }

      if (topCourse.cutoffs && topCourse.cutoffs.length > 0) {
        const cLower = (college.name || "").toLowerCase();
        const validCutoffs = topCourse.cutoffs.filter((c) => {
          if (c.verification_status === "INVALID") return false;
          if ((cLower.includes("army institute") || cLower.includes("ait")) && c.exam.toUpperCase().includes("MHT")) return false;
          if (cLower.includes("symbiosis law") && c.exam.toUpperCase().includes("LAW")) return false;
          if (cLower.includes("bharati vidyapeeth new law") && c.exam.toUpperCase().includes("LAW")) return false;
          if ((cLower.includes("birla institute") || cLower.includes("bits")) && !c.exam.toUpperCase().includes("BITSAT")) return false;
          if ((cLower.includes("vellore institute") || cLower.includes("vit")) && !c.exam.toUpperCase().includes("VITEEE")) return false;
          if ((cLower.includes("rvce") || cLower.includes("r.v. college") || cLower.includes("rv college")) && !c.exam.toUpperCase().includes("KCET") && !c.exam.toUpperCase().includes("COMEDK")) return false;
          if ((cLower.includes("indian institute of tech") || cLower.includes("iit")) && !c.exam.toUpperCase().includes("ADVANCED")) return false;
          return true;
        });

        if (studentExamKey) {
          matchedCutoffRecord = validCutoffs.find((c) => normalizeExamKey(c.exam) === studentExamKey) || null;
        } else {
          matchedCutoffRecord = validCutoffs[0] || null;
        }
      }
    } else if (college.programs && college.programs.length > 0) {
      // Check college.programs fallback
      const matchingProg = college.programs.find(
        (p) =>
          targetBranch &&
          (p.toLowerCase().includes(targetBranch) ||
            targetBranch.includes(p.toLowerCase()) ||
            (targetBranch.includes("computer") && (p.toLowerCase() === "cse" || p.toLowerCase() === "it")))
      );
      matchedCourseName = matchingProg || college.programs[0];
      branchMatchScore = matchingProg ? 92 : 72;
      reasons.push(`Program offered: ${matchedCourseName}`);
    } else if (college.course) {
      matchedCourseName = college.course;
      branchMatchScore = targetBranch && college.course.toLowerCase().includes(targetBranch) ? 90 : 70;
      reasons.push(`Curriculum offered: ${college.course}`);
    } else {
      matchedCourseName = "Undergraduate Degree Program";
      branchMatchScore = 65;
    }

    // Career goal alignment bonus
    if (studentProfile?.career_goal) {
      const cgLower = studentProfile.career_goal.toLowerCase();
      if (
        (cgLower.includes("software") || cgLower.includes("developer") || cgLower.includes("engineer")) &&
        (matchedCourseName.toLowerCase().includes("computer") || matchedCourseName.toLowerCase().includes("it"))
      ) {
        branchMatchScore = Math.min(100, branchMatchScore + 4);
        reasons.push(`Strong career alignment with your goal: "${studentProfile.career_goal}"`);
      }
    }

    // -------------------------------------------------------------
    // STEP 2: Cutoff Matching & Exam Verification
    // -------------------------------------------------------------
    let cutoffStatus: "Cutoff compatible" | "Cutoff not met" | "Cutoff unavailable" = "Cutoff unavailable";
    let cutoffValue: number | null = null;
    let categoryEvaluated = "OPEN (default)";
    let cutoffExam = matchedCutoffRecord?.exam || (studentExam ? (studentProfile?.entrance_exam || "MHT-CET") : (college.entrance_exam || "MHT-CET"));
    let scoreDifference: number | null = null;
    let cutoffMatchScore: number | null = null;
    let relevantCutoffText = "Cutoff: Not available";
    const cutoffUnit: CutoffUnit = matchedCutoffRecord?.cutoff_unit || "percentile";

    // Strict Exam Matching & College Specifics
    const isEngineeringStream = matchedStream.toLowerCase().includes("engineering") || matchedStream.toLowerCase().includes("technology");
    const collegeNameLower = (college.name || "").toLowerCase();
    const isBITS = collegeNameLower.includes("birla institute") || collegeNameLower.includes("bits");
    const isVIT = collegeNameLower.includes("vellore institute") || collegeNameLower.includes("vit");
    const isIIITH = collegeNameLower.includes("international institute of info") || collegeNameLower.includes("iiit");
    const isDTU = collegeNameLower.includes("delhi technological") || collegeNameLower.includes("dtu");
    const isRVCE = collegeNameLower.includes("rvce") || collegeNameLower.includes("r.v. college") || collegeNameLower.includes("rv college");
    const isIIT = collegeNameLower.includes("indian institute of tech") || collegeNameLower.includes("iit bombay");
    const isAIT = collegeNameLower.includes("army institute of technology") || collegeNameLower.includes("ait");
    const isSLS = collegeNameLower.includes("symbiosis law");
    const isBVP = collegeNameLower.includes("bharati vidyapeeth new law");

    const acceptedExams: string[] = (
      (matchedCourseObject?.accepted_exams && matchedCourseObject.accepted_exams.length > 0)
        ? matchedCourseObject.accepted_exams
        : (college.accepted_exams && college.accepted_exams.length > 0)
        ? college.accepted_exams
        : isBITS ? ["BITSAT"]
        : isVIT ? ["VITEEE"]
        : isIIITH ? ["JEE Main", "UGEE"]
        : isDTU ? ["JEE Main"]
        : isRVCE ? ["KCET", "COMEDK UGET"]
        : isIIT ? ["JEE Advanced"]
        : isAIT ? ["JEE Main"]
        : isSLS ? ["SLAT"]
        : isBVP ? ["BVP CET Law"]
        : isEngineeringStream ? ["MHT-CET", "JEE Main"]
        : ["MHT-CET"]
    );
    const collegeAcceptsStudentExam = studentExamKey
      ? acceptedExams.some((e: string) => normalizeExamKey(e) === studentExamKey)
      : true;

    // Invalidate matchedCutoffRecord if marked INVALID or belongs to misattributed combination
    if (matchedCutoffRecord && (
      matchedCutoffRecord.verification_status === "INVALID" ||
      (isAIT && matchedCutoffRecord.exam.toUpperCase().includes("MHT")) ||
      (isSLS && matchedCutoffRecord.exam.toUpperCase().includes("LAW")) ||
      (isBVP && matchedCutoffRecord.exam.toUpperCase().includes("LAW")) ||
      (isBITS && !matchedCutoffRecord.exam.toUpperCase().includes("BITSAT")) ||
      (isVIT && !matchedCutoffRecord.exam.toUpperCase().includes("VITEEE")) ||
      (isRVCE && !matchedCutoffRecord.exam.toUpperCase().includes("KCET") && !matchedCutoffRecord.exam.toUpperCase().includes("COMEDK"))
    )) {
      matchedCutoffRecord = null;
    }

    if (matchedCutoffRecord) {
      const rec = matchedCutoffRecord as unknown as Record<string, unknown>;
      const valObc = rec.obc !== undefined && rec.obc !== null ? Number(rec.obc) : (rec.cutoff_obc !== undefined && rec.cutoff_obc !== null ? Number(rec.cutoff_obc) : null);
      const valSc = rec.sc !== undefined && rec.sc !== null ? Number(rec.sc) : (rec.cutoff_sc !== undefined && rec.cutoff_sc !== null ? Number(rec.cutoff_sc) : null);
      const valSt = rec.st !== undefined && rec.st !== null ? Number(rec.st) : (rec.cutoff_st !== undefined && rec.cutoff_st !== null ? Number(rec.cutoff_st) : null);
      const valOpen = rec.open !== undefined && rec.open !== null ? Number(rec.open) : (rec.cutoff_open !== undefined && rec.cutoff_open !== null ? Number(rec.cutoff_open) : null);

      // Determine applicable category cutoff
      if (studentCategoryRaw === "OBC" && valObc !== null) {
        cutoffValue = valObc;
        categoryEvaluated = "OBC";
      } else if (studentCategoryRaw === "SC" && valSc !== null) {
        cutoffValue = valSc;
        categoryEvaluated = "SC";
      } else if (studentCategoryRaw === "ST" && valSt !== null) {
        cutoffValue = valSt;
        categoryEvaluated = "ST";
      } else if (valOpen !== null) {
        cutoffValue = valOpen;
        categoryEvaluated = studentCategoryRaw === "OPEN" ? "OPEN" : "OPEN (default)";
      }

      cutoffExam = matchedCutoffRecord.exam;
    }

    // Determine 3-tier status and calculate cutoffMatchScore with unit awareness
    if (cutoffValue !== null && studentScore !== null && matchedCutoffRecord) {
      if (cutoffUnit === "rank") {
        // Lower rank is better (e.g. Rank 1200 is better than Closing Rank 2000)
        const isCompatible = studentScore <= cutoffValue;
        scoreDifference = cutoffValue - studentScore;
        relevantCutoffText = `${cutoffExam} (${categoryEvaluated}: AIR ${cutoffValue})`;

        if (isCompatible) {
          cutoffStatus = "Cutoff compatible";
          const rankSurplus = Math.max(0, cutoffValue - studentScore);
          cutoffMatchScore = Math.min(100, Math.round(92 + Math.min(rankSurplus / 200, 8)));
          reasons.push(
            `Your ${cutoffExam} rank (${studentScore}) meets published ${categoryEvaluated} closing rank (AIR ${cutoffValue}) for ${matchedCourseName}`
          );
        } else {
          cutoffStatus = "Cutoff not met";
          const rankDeficit = studentScore - cutoffValue;
          if (rankDeficit <= 500) {
            cutoffMatchScore = Math.round(82 + ((500 - rankDeficit) / 500) * 8);
            reasons.push(
              `Published ${categoryEvaluated} closing rank is AIR ${cutoffValue} (Your rank: ${studentScore}) — competitive choice`
            );
          } else if (rankDeficit <= 2000) {
            cutoffMatchScore = Math.round(68 + ((2000 - rankDeficit) / 1500) * 12);
            reasons.push(
              `Published ${categoryEvaluated} closing rank is AIR ${cutoffValue} (Your rank: ${studentScore}) — reach choice`
            );
          } else {
            cutoffMatchScore = Math.max(40, Math.round(65 - Math.min(rankDeficit / 200, 25)));
            reasons.push(
              `Published ${categoryEvaluated} closing rank is AIR ${cutoffValue} (Your rank: ${studentScore}) — ambitious reach`
            );
          }
        }
      } else {
        // Percentile / score unit (higher is better)
        const isCompatible = studentScore >= cutoffValue;
        scoreDifference = Number((studentScore - cutoffValue).toFixed(2));
        let unitSuffix = "%ile";
        if (cutoffUnit === "score" || cutoffUnit === "marks" || cutoffUnit === "marks_out_of_200" || cutoffUnit === "marks_out_of_150" || cutoffUnit === "marks_out_of_390") {
          unitSuffix = cutoffExam.toUpperCase().includes("NATA") ? " / 200 marks" : cutoffExam.toUpperCase().includes("LAW") ? " / 150 marks" : cutoffExam.toUpperCase().includes("BITSAT") ? " / 390 marks" : " marks";
        }
        relevantCutoffText = `${cutoffExam} (${categoryEvaluated}: ${cutoffValue}${unitSuffix})`;

        if (isCompatible) {
          cutoffStatus = "Cutoff compatible";
          const surplus = Math.min(scoreDifference, 5);
          cutoffMatchScore = Math.min(100, Math.round(92 + surplus * 1.6));
          reasons.push(
            `Your ${cutoffExam} score (${studentScore}${unitSuffix}) is cutoff compatible with published ${categoryEvaluated} benchmark (${cutoffValue}${unitSuffix}) for ${matchedCourseName}`
          );
        } else {
          cutoffStatus = "Cutoff not met";
          const deficit = Math.abs(scoreDifference);
          if (deficit <= 3.0) {
            cutoffMatchScore = Math.round(82 + ((3.0 - deficit) / 3.0) * 8);
            reasons.push(
              `Published ${categoryEvaluated} cutoff is ${cutoffValue}${unitSuffix} (${deficit.toFixed(1)}${unitSuffix} above your score of ${studentScore}${unitSuffix}) — competitive choice`
            );
          } else if (deficit <= 8.0) {
            cutoffMatchScore = Math.round(68 + ((8.0 - deficit) / 5.0) * 12);
            reasons.push(
              `Published ${categoryEvaluated} cutoff is ${cutoffValue}${unitSuffix} (${deficit.toFixed(1)}${unitSuffix} reach against score ${studentScore}${unitSuffix})`
            );
          } else {
            cutoffMatchScore = Math.max(40, Math.round(65 - Math.min(deficit, 25)));
            reasons.push(
              `Published ${categoryEvaluated} cutoff is ${cutoffValue}${unitSuffix} (Score: ${studentScore}${unitSuffix}) — ambitious academic reach`
            );
          }
        }
      }
    } else {
      // Cutoff Unavailable: missing cutoff in dataset, missing student score, or exam mismatch
      cutoffStatus = "Cutoff unavailable";
      cutoffMatchScore = null; // Excluded from weighted calculation and renormalized

      if (isBITS && studentExamKey && (studentExamKey.includes("mht") || studentExamKey.includes("jee"))) {
        relevantCutoffText = "MHT-CET / JEE Main not accepted (Requires BITSAT Score out of 390)";
        reasons.push(
          "BITS Pilani admits students strictly via BITS Admission Portal direct counselling based on BITSAT score (out of 390 marks); MHT-CET and JEE Main are not accepted."
        );
      } else if (isVIT && studentExamKey && (studentExamKey.includes("mht") || studentExamKey.includes("jee"))) {
        relevantCutoffText = "MHT-CET / JEE Main not accepted (Requires VITEEE Rank)";
        reasons.push(
          "Vellore Institute of Technology admits B.Tech students strictly via VIT Online Counselling based on VITEEE rank; MHT-CET and JEE Main are not accepted for regular B.Tech seats."
        );
      } else if (isIIITH && studentExamKey && studentExamKey.includes("mht")) {
        relevantCutoffText = "MHT-CET not accepted (Requires JEE Main Percentile or UGEE)";
        reasons.push(
          "IIIT Hyderabad does not participate in Maharashtra CAP or accept MHT-CET; admissions require JEE Main overall percentile or UGEE exam via IIIT-H Admissions Portal."
        );
      } else if (isDTU && studentExamKey && studentExamKey.includes("mht")) {
        relevantCutoffText = "MHT-CET not accepted (Requires JEE Main CRL Rank via JAC Delhi)";
        reasons.push(
          "Delhi Technological University does not admit students via MHT-CET; admissions are conducted strictly via JAC Delhi counselling based on JEE Main Common Rank List (CRL)."
        );
      } else if (isRVCE && studentExamKey && studentExamKey.includes("mht")) {
        relevantCutoffText = "MHT-CET not accepted (Requires KCET or COMEDK UGET Rank)";
        reasons.push(
          "RV College of Engineering does not admit students via MHT-CET; admissions are conducted via KEA KCET counselling (Karnataka domicile) or COMEDK UGET (All India quota)."
        );
      } else if (isIIT && studentExamKey && !studentExamKey.includes("advanced")) {
        relevantCutoffText = "Requires JEE Advanced AIR via JoSAA";
        reasons.push(
          "IIT Bombay admits undergraduate engineering students strictly through JoSAA counselling based on JEE Advanced All India Rank (AIR); JEE Main or MHT-CET are not accepted for final seat allocation."
        );
      } else if (isAIT && studentExamKey && studentExamKey.includes("mht")) {
        relevantCutoffText = "MHT-CET not accepted (Requires JEE Main AIR for Army wards)";
        reasons.push(
          "Army Institute of Technology does not admit students via MHT-CET; admissions are strictly via JEE Main All India Rank (AIR) for Army personnel wards."
        );
      } else if (isSLS && studentExamKey && studentExamKey.includes("law")) {
        relevantCutoffText = "MH CET Law not accepted (Admissions via SLAT)";
        reasons.push(
          "Symbiosis Law School Pune admits students via SLAT (Symbiosis Law Admission Test), not MH CET Law."
        );
      } else if (isBVP && studentExamKey && studentExamKey.includes("law")) {
        relevantCutoffText = "MH CET Law not accepted (Admissions via BVP CET Law)";
        reasons.push(
          "Bharati Vidyapeeth New Law College admits students primarily via BVP CET Law, not MH CET Law."
        );
      } else if (studentExamKey && !matchedCutoffRecord) {
        if (!collegeAcceptsStudentExam) {
          relevantCutoffText = `${studentProfile?.entrance_exam || "Exam"} (Not accepted for this program)`;
          reasons.push(
            `Program accepts ${acceptedExams.join(", ")}, which does not match your profile exam (${studentProfile?.entrance_exam}); evaluated on institutional alignment`
          );
        } else {
          relevantCutoffText = `${studentProfile?.entrance_exam || "Exam"} cutoff: Not available in verified dataset`;
          reasons.push(
            `${studentProfile?.entrance_exam || "Exam"} cutoff not available in verified dataset for ${matchedCourseName}; evaluated on academic and institutional alignment`
          );
        }
      } else if (!matchedCutoffRecord) {
        relevantCutoffText = "Cutoff: Not available in verified dataset";
        reasons.push(
          `Cutoff: Not available in verified dataset (Evaluated on academic and institutional alignment for ${matchedCourseName})`
        );
      } else if (studentScore === null) {
        let unitStr = `${cutoffValue}%ile`;
        if (cutoffUnit === "rank") unitStr = `AIR ${cutoffValue}`;
        else if (cutoffUnit === "score" || cutoffUnit === "marks") {
          unitStr = cutoffExam.toUpperCase().includes("NATA") ? `${cutoffValue} / 200 marks` : cutoffExam.toUpperCase().includes("LAW") ? `${cutoffValue} / 150 marks` : cutoffExam.toUpperCase().includes("BITSAT") ? `${cutoffValue} / 390 marks` : `${cutoffValue} marks`;
        }
        relevantCutoffText = `${cutoffExam} (${categoryEvaluated}: ${unitStr})`;
        reasons.push(
          `Published ${categoryEvaluated} cutoff benchmark: ${unitStr} (Enter entrance score to evaluate cutoff compatibility)`
        );
      } else {
        relevantCutoffText = `${cutoffExam} (${categoryEvaluated}: ${cutoffValue}%ile)`;
        reasons.push(
          `Cutoff benchmark available for ${cutoffExam}; enter corresponding score to evaluate compatibility`
        );
      }
    }

    // -------------------------------------------------------------
    // STEP 3: Academic / Institutional Alignment
    // -------------------------------------------------------------
    let academicMatchScore = 75;
    if (college.naac_grade) {
      if (college.naac_grade.includes("A++")) academicMatchScore = 96;
      else if (college.naac_grade.includes("A+")) academicMatchScore = 92;
      else if (college.naac_grade.startsWith("A")) academicMatchScore = 88;
      else academicMatchScore = 80;
      reasons.push(`Accredited institutional standard with NAAC Grade ${college.naac_grade}`);
    } else {
      academicMatchScore = 76;
    }

    if (college.placement_rate && college.placement_rate >= 85) {
      academicMatchScore = Math.min(100, academicMatchScore + 4);
      reasons.push(`Proven ${college.placement_rate}% campus placement track record`);
    }

    // -------------------------------------------------------------
    // STEP 4: Technical Skills Alignment
    // -------------------------------------------------------------
    const domainSkills = getDomainRelevantSkills(matchedCourseName, matchedStream);
    const matchedSkills: string[] = [];
    domainSkills.forEach((ds) => {
      if (studentSkillsLower.has(ds.toLowerCase())) {
        matchedSkills.push(ds);
      }
    });

    let skillMatchScore = 75;
    if (skills.length > 0) {
      if (matchedSkills.length >= 3) {
        skillMatchScore = 95;
        reasons.push(`Strong skills alignment with ${matchedCourseName} curriculum (${matchedSkills.slice(0, 3).join(", ")})`);
      } else if (matchedSkills.length >= 1) {
        skillMatchScore = 85;
        reasons.push(`Relevant core competencies in ${matchedSkills.join(", ")}`);
      } else {
        skillMatchScore = 72;
      }
    } else {
      skillMatchScore = 75; // Neutral default for students with no skills listed yet
    }

    // -------------------------------------------------------------
    // STEP 5: Location Preference
    // -------------------------------------------------------------
    let locationMatchScore = 75;
    if (targetLocation) {
      if (locLower.includes(targetLocation) || targetLocation.includes(locLower)) {
        locationMatchScore = 96;
        reasons.push(`Located in your preferred region (${college.location ? `${college.location}, ` : ""}${college.state || "Maharashtra"})`);
      } else if (stateLower.includes(targetLocation) || targetLocation.includes(stateLower)) {
        locationMatchScore = 85;
        reasons.push(`Located in ${college.state || "Maharashtra"} State`);
      } else {
        locationMatchScore = 65;
      }
    } else {
      locationMatchScore = 80; // Neutral default
    }

    // -------------------------------------------------------------
    // STEP 6: Composite Weighted Score & Renormalization
    // -------------------------------------------------------------
    let compositeScore: number;
    if (cutoffMatchScore !== null) {
      // Full 5-factor weighted formula (Cutoff available)
      compositeScore = Math.round(
        cutoffMatchScore * 0.35 +
        academicMatchScore * 0.25 +
        branchMatchScore * 0.20 +
        skillMatchScore * 0.10 +
        locationMatchScore * 0.10
      );
    } else {
      // Renormalize remaining 4 factors so missing cutoff does not unfairly penalize
      // 0.25 + 0.20 + 0.10 + 0.10 = 0.65 total weight
      compositeScore = Math.round(
        (academicMatchScore * 0.25 +
         branchMatchScore * 0.20 +
         skillMatchScore * 0.10 +
         locationMatchScore * 0.10) / 0.65
      );
    }

    const finalScore = Math.min(Math.max(compositeScore, 55), 98);

    // Provenance attribution notice
    const sourceAttribution = matchedCutoffRecord?.source_name
      ? `${matchedCutoffRecord.source_name} (EduSphere Verified Dataset)`
      : "State CET Cell Maharashtra / Official Institutional Portals (EduSphere Verified Dataset)";
    reasons.push(`Cutoff source: ${sourceAttribution}`);

    return {
      id: college.id,
      item_type: "college" as const,
      title: college.name,
      subtitle: `${matchedCourseName} • ${college.location ? `${college.location}, ` : ""}${college.state || "Maharashtra"}`,
      match_score: finalScore,
      match_reasons: reasons,
      college,
      is_ai_recommended: finalScore >= 80,
      factor_breakdown: {
        academic_match: academicMatchScore,
        branch_match: branchMatchScore,
        location_match: locationMatchScore,
        skill_match: skillMatchScore,
        cutoff_match: cutoffMatchScore !== null ? cutoffMatchScore : undefined,
        career_match: branchMatchScore,
        eligibility_match:
          cutoffStatus === "Cutoff compatible" ? 95 : cutoffStatus === "Cutoff not met" ? 65 : 75,
      },
      relevant_cutoff: relevantCutoffText,
      cutoff_status: cutoffStatus,
      target_program_name: matchedCourseName,
      cutoff_exam: cutoffExam,
      cutoff_category: categoryEvaluated,
      cutoff_value: cutoffValue,
      cutoff_unit: cutoffUnit,
      cutoff_round: matchedCutoffRecord?.round || undefined,
      student_score: studentScore,
      score_difference: scoreDifference,
      source_attribution: sourceAttribution,
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

  if (studentProfile?.entrance_score && studentProfile.entrance_score > 0 && colleges.length > 0) {
    const collegeGuidance = computeCollegeGuidance(studentProfile, colleges);
    const qualifyingColleges = collegeGuidance.filter((r) => r.cutoff_status === "Cutoff compatible");
    if (qualifyingColleges.length > 0) {
      strengths.push(`Entrance score qualifies for verified cutoff benchmarks across ${qualifyingColleges.length} accredited institutions.`);
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


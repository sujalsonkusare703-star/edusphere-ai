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

export interface EvaluatedCollegeContext {
  name: string;
  location: string;
  stream: string;
  collegeType: string;
  officialWebsite: string | null;
  targetProgram: string;
  matchScore: number;
  cutoffStatus: string;
  cutoffExam: string | null;
  cutoffCategory: string;
  cutoffValue: number | null;
  cutoffUnit?: string;
  cutoffRound?: string;
  studentScore: number | null;
  scoreDifference: number | null;
  keyReasons: string[];
  acceptedExams: string[];
  admissionRoute: string;
  eligibilityCriteria: string;
  admissionVerificationStatus?: string;
  admissionSourceName?: string;
  admissionSourceUrl?: string;
  sourceAttribution?: string;
  programs: Array<{
    name: string;
    stream: string;
    intake: number | null;
    cutoffOpen: number | null;
    cutoffObc: number | null;
    cutoffSc: number | null;
    cutoffSt: number | null;
    exam: string | null;
    unit?: string;
    round?: string | null;
    year?: number | null;
    source?: string | null;
    acceptedExams?: string[];
    admissionRoute?: string;
    eligibilityCriteria?: string;
    admissionVerificationStatus?: string;
    admissionSourceName?: string;
    admissionSourceUrl?: string;
  }>;
}

export interface SanitizedStudentContext {
  studentName: string;
  isDemo: boolean;
  academicProfile: {
    preferredBranch: string;
    entranceScore: string;
    entranceScoreNumeric: number | null;
    entranceExam: string;
    category: string;
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
    colleges: Array<{
      name: string;
      targetProgram?: string;
      matchScore: number;
      cutoffStatus?: string;
      cutoffExam?: string | null;
      cutoffCategory?: string;
      cutoffValue?: number | null;
      cutoffUnit?: string;
      studentScore?: number | null;
      keyReasons: string[];
    }>;
    internships: Array<{ role: string; company: string; matchScore: number; matchingSkills: string[]; missingSkills: string[] }>;
    placements: Array<{ role: string; company: string; matchScore: number; minCgpa: string; eligible: boolean }>;
  };
  evaluatedColleges: EvaluatedCollegeContext[];
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
  const entranceScoreNumeric =
    studentProfile?.entrance_score !== null && studentProfile?.entrance_score !== undefined
      ? Number(studentProfile.entrance_score)
      : null;
  const entranceScore =
    entranceScoreNumeric !== null
      ? `${entranceScoreNumeric}%ile`
      : "Not recorded in profile";
  const entranceExam = studentProfile?.entrance_exam?.trim() || "MHT CET";
  const category = studentProfile?.category?.trim() || "OPEN (default)";
  const cgpa =
    studentProfile?.cgpa !== null && studentProfile?.cgpa !== undefined
      ? `${Number(studentProfile.cgpa).toFixed(2)}`
      : "Not recorded";
  const preferredLocation = studentProfile?.preferred_location?.trim() || "Flexible";
  const careerGoal = studentProfile?.career_goal?.trim() || "Not specified";

  // Build structured evaluated colleges catalog across all supplied colleges
  const evaluatedColleges: EvaluatedCollegeContext[] = colleges.map((item) => {
    const col = item.college;
    const courses = col?.courses || [];

    const isEng = (col?.primary_stream || "Technology").toLowerCase().includes("tech") ||
                  (col?.primary_stream || "").toLowerCase().includes("eng");
    const isLaw = (col?.primary_stream || "").toLowerCase().includes("law");
    const isArch = (col?.primary_stream || "").toLowerCase().includes("arch");

    const acceptedExams = col?.accepted_exams && col.accepted_exams.length > 0
      ? col.accepted_exams
      : isEng ? ["MHT-CET", "JEE Main"] : isLaw ? ["MH CET Law"] : isArch ? ["NATA"] : ["MHT-CET"];

    const admissionRoute = col?.admission_route ||
      (isEng ? "MHT-CET Centralized Admission Process (CAP) / Institutional Quota" :
       isLaw ? "Maharashtra State CET Cell (CAP Law)" :
       isArch ? "Directorate of Technical Education (CAP Architecture)" :
       "Centralized Admission Process (CAP)");

    const eligibilityCriteria = col?.eligibility_criteria ||
      (isEng ? "10+2 with Physics & Mathematics (min 45% for general, 40% for reserved categories)" :
       isLaw ? "10+2 with min 45% aggregate (40% for SC/ST)" :
       isArch ? "10+2 with Physics, Chemistry & Math + Valid NATA Score" :
       "Relevant qualifying examination as per state directorate standards");

    const programs = courses.map((crs) => {
      const cutoffs = (crs.cutoffs || []).filter((c) => {
        if (c.verification_status === "INVALID") return false;
        const cLower = item.title.toLowerCase();
        if ((cLower.includes("army institute") || cLower.includes("ait")) && c.exam.toUpperCase().includes("MHT")) return false;
        if (cLower.includes("symbiosis law") && c.exam.toUpperCase().includes("LAW")) return false;
        if (cLower.includes("bharati vidyapeeth new law") && c.exam.toUpperCase().includes("LAW")) return false;
        if ((cLower.includes("birla institute") || cLower.includes("bits")) && !c.exam.toUpperCase().includes("BITSAT")) return false;
        if ((cLower.includes("vellore institute") || cLower.includes("vit")) && !c.exam.toUpperCase().includes("VITEEE")) return false;
        if ((cLower.includes("rvce") || cLower.includes("r.v. college") || cLower.includes("rv college")) && !c.exam.toUpperCase().includes("KCET") && !c.exam.toUpperCase().includes("COMEDK")) return false;
        if ((cLower.includes("indian institute of tech") || cLower.includes("iit")) && !c.exam.toUpperCase().includes("ADVANCED")) return false;
        return true;
      });
      const firstCut = cutoffs[0] || null;
      return {
        name: crs.course_name,
        stream: crs.stream || col?.primary_stream || "Technology",
        intake: crs.intake || null,
        cutoffOpen: firstCut ? (firstCut.open ?? (firstCut as unknown as { cutoff_open?: number }).cutoff_open ?? null) : null,
        cutoffObc: firstCut ? (firstCut.obc ?? (firstCut as unknown as { cutoff_obc?: number }).cutoff_obc ?? null) : null,
        cutoffSc: firstCut ? (firstCut.sc ?? (firstCut as unknown as { cutoff_sc?: number }).cutoff_sc ?? null) : null,
        cutoffSt: firstCut ? (firstCut.st ?? (firstCut as unknown as { cutoff_st?: number }).cutoff_st ?? null) : null,
        exam: firstCut?.exam || null,
        unit: firstCut?.cutoff_unit || "percentile",
        round: firstCut?.round || null,
        year: firstCut?.year || null,
        source: firstCut?.source_name || null,
        acceptedExams: crs.accepted_exams && crs.accepted_exams.length > 0 ? crs.accepted_exams : undefined,
        admissionRoute: crs.admission_route || undefined,
        eligibilityCriteria: crs.eligibility_criteria || undefined,
        admissionVerificationStatus: crs.admission_verification_status || undefined,
        admissionSourceName: crs.admission_source_name || undefined,
        admissionSourceUrl: crs.admission_source_url || undefined,
      };
    });

    return {
      name: item.title,
      location: col?.location || "Pune",
      stream: col?.primary_stream || "Engineering",
      collegeType: col?.college_type || "Autonomous",
      officialWebsite: col?.official_website || null,
      targetProgram: item.target_program_name || (programs[0]?.name || "Undergraduate Program"),
      matchScore: item.match_score,
      cutoffStatus: item.cutoff_status || "Cutoff unavailable",
      cutoffExam: item.cutoff_exam || null,
      cutoffCategory: item.cutoff_category || category,
      cutoffValue: item.cutoff_value ?? null,
      cutoffUnit: item.cutoff_unit || "percentile",
      cutoffRound: item.cutoff_round,
      studentScore: item.student_score ?? null,
      scoreDifference: item.score_difference ?? null,
      keyReasons: item.match_reasons || [],
      acceptedExams,
      admissionRoute,
      eligibilityCriteria,
      admissionVerificationStatus: col?.admission_verification_status || "DERIVED",
      admissionSourceName: col?.admission_source_name || undefined,
      admissionSourceUrl: col?.admission_source_url || undefined,
      sourceAttribution: item.source_attribution,
      programs,
    };
  });

  // Top 3 colleges
  const topColleges = evaluatedColleges.slice(0, 3).map((item) => ({
    name: item.name,
    targetProgram: item.targetProgram,
    matchScore: item.matchScore,
    cutoffStatus: item.cutoffStatus,
    cutoffExam: item.cutoffExam,
    cutoffCategory: item.cutoffCategory,
    cutoffValue: item.cutoffValue,
    cutoffUnit: item.cutoffUnit,
    studentScore: item.studentScore,
    keyReasons: item.keyReasons.slice(0, 2),
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
      entranceScoreNumeric,
      entranceExam,
      category,
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
    evaluatedColleges,
  };
}

/**
 * Generates the master system prompt for the AI Career Assistant, embedding
 * the student's actual database context and behavioral constraints.
 */
export function buildSystemInstruction(sanitized: SanitizedStudentContext): string {
  const collegesSummary = sanitized.evaluatedColleges.slice(0, 30).map((c) => {
    const progList = c.programs.length > 0
      ? c.programs.map((p) => {
          let unitStr = "%ile";
          if (p.unit === "rank") unitStr = "AIR";
          else if (p.unit === "score" || p.unit === "marks" || p.unit === "marks_out_of_200" || p.unit === "marks_out_of_150" || p.unit === "marks_out_of_390") {
            unitStr = (p.exam || "").toUpperCase().includes("NATA") ? " / 200 marks" : (p.exam || "").toUpperCase().includes("LAW") ? " / 150 marks" : (p.exam || "").toUpperCase().includes("BITSAT") ? " / 390 marks" : " marks";
          }
          const cutStr = p.cutoffOpen !== null
            ? `(${p.exam || "MHT CET"} OPEN: ${p.cutoffOpen}${unitStr}, OBC: ${p.cutoffObc ?? "N/A"})`
            : "(Cutoff: NA)";
          const intakeStr = p.intake ? `[${p.intake} seats]` : "";
          const pExamsStr = p.acceptedExams && p.acceptedExams.length > 0 ? ` [Exams: ${p.acceptedExams.join(", ")}]` : "";
          const pRouteStr = p.admissionRoute ? ` [ProgRoute: ${p.admissionRoute}]` : "";
          const pStatusStr = p.admissionVerificationStatus ? ` [ProgStatus: ${p.admissionVerificationStatus}]` : "";
          return `${p.name} ${intakeStr}${pExamsStr}${pRouteStr}${pStatusStr} ${cutStr}`;
        }).join("; ")
      : c.targetProgram;

    const colStatusStr = c.admissionVerificationStatus ? ` [Admission Status: ${c.admissionVerificationStatus}]` : "";
    return `• ${c.name} (${c.location})${colStatusStr} — Target: ${c.targetProgram} [Status: ${c.cutoffStatus}, Match: ${c.matchScore}%]\n  Accepted Exams: ${c.acceptedExams.join(", ")}\n  Admission Route: ${c.admissionRoute}\n  Eligibility: ${c.eligibilityCriteria}\n  Programs: ${progList}`;
  }).join("\n");

  return `You are "EduSphere AI — Academic & Career Guidance Assistant", an intelligent, factual, and strictly data-grounded advisor for higher education admissions and career placement.

==================================================
AUTHENTICATED STUDENT CONTEXT (VERIFIED SUPABASE DATA)
==================================================
- Student Name: ${sanitized.studentName} ${sanitized.isDemo ? "(Viewing Demo Preview)" : ""}
- Target Stream / Branch: ${sanitized.academicProfile.preferredBranch}
- Entrance Exam: ${sanitized.academicProfile.entranceExam}
- Entrance Exam Percentile / Score: ${sanitized.academicProfile.entranceScore}
- Category: ${sanitized.academicProfile.category}
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

TOP OPPORTUNITY MATCHES IN EDUSPHERE DATABASE:
Colleges:
${sanitized.topRecommendations.colleges.length > 0 ? sanitized.topRecommendations.colleges.map((c) => {
  let unitSuffix = "";
  let unitPost = "%ile";
  if (c.cutoffUnit === "rank") {
    unitSuffix = "AIR ";
    unitPost = "";
  } else if (c.cutoffUnit === "score" || c.cutoffUnit === "marks" || c.cutoffUnit === "marks_out_of_200" || c.cutoffUnit === "marks_out_of_150" || c.cutoffUnit === "marks_out_of_390") {
    unitPost = (c.cutoffExam || "").toUpperCase().includes("NATA") ? " / 200 marks" : (c.cutoffExam || "").toUpperCase().includes("LAW") ? " / 150 marks" : (c.cutoffExam || "").toUpperCase().includes("BITSAT") ? " / 390 marks" : " marks";
  }
  const cutoffDetails = c.cutoffStatus === "Cutoff compatible"
    ? `[Program: ${c.targetProgram || "General"}, Status: Cutoff compatible (${c.cutoffExam || "MHT CET"} ${c.cutoffCategory || "OPEN"} cutoff ${unitSuffix}${c.cutoffValue ?? "N/A"}${unitPost} vs your score ${c.studentScore ?? "N/A"})]`
    : c.cutoffStatus === "Cutoff not met"
    ? `[Program: ${c.targetProgram || "General"}, Status: Cutoff not met (${c.cutoffExam || "MHT CET"} ${c.cutoffCategory || "OPEN"} cutoff ${unitSuffix}${c.cutoffValue ?? "N/A"}${unitPost} vs your score ${c.studentScore ?? "N/A"})]`
    : `[Program: ${c.targetProgram || "General"}, Status: Cutoff unavailable in verified dataset]`;
  return `• ${c.name} (${c.matchScore}% match) ${cutoffDetails} — ${c.keyReasons.join("; ")}`;
}).join("\n") : "• No college recommendations computed"}

Internships:
${sanitized.topRecommendations.internships.length > 0 ? sanitized.topRecommendations.internships.map((i) => `• ${i.role} at ${i.company} (${i.matchScore}% match) [Matching skills: ${i.matchingSkills.join(", ") || "None"}; Missing: ${i.missingSkills.join(", ") || "None"}]`).join("\n") : "• No internship recommendations computed"}

Placements:
${sanitized.topRecommendations.placements.length > 0 ? sanitized.topRecommendations.placements.map((p) => `• ${p.role} at ${p.company} (${p.matchScore}% match, Min CGPA: ${p.minCgpa}) — ${p.eligible ? "Eligible" : "CGPA below cutoff"}`).join("\n") : "• No placement drives computed"}

==================================================
VERIFIED PUNE COLLEGES & PROGRAMS DIRECTORY (SUPABASE DATASET)
==================================================
${collegesSummary}

==================================================
ASSISTANT GUIDELINES & BEHAVIORAL RULES
==================================================
1. ZERO ADMISSION PREDICTIONS:
   - NEVER predict admission probabilities (e.g. NEVER say "90% chance of admission", "You will definitely get COEP", "Admission is guaranteed", "This is a safe college").
   - Always use exactly these factual 3-tier status phrases:
     • "Cutoff compatible" (Your score is above or equal to the published cutoff in the verified EduSphere dataset).
     • "Cutoff not met" (Your score is below the published cutoff in the verified EduSphere dataset).
     • "Cutoff unavailable" (No published cutoff is available in the verified EduSphere dataset for this program and exam; eligibility cannot be determined solely from cutoff data).

2. MULTI-EXAM STRICT MATCHING & CUTOFF UNITS:
   - Differentiate entrance exams clearly: MHT-CET, JEE Main, JEE Advanced, BITSAT, VITEEE, KCET, COMEDK UGET, MH CET Law, NATA, SLAT, BVP CET Law.
   - Strict exam matching: MHT-CET scores compare ONLY against MHT-CET cutoffs. JEE Main scores compare ONLY against JEE Main cutoffs. JEE Advanced compares ONLY against JEE Advanced cutoffs. BITSAT compares ONLY against BITSAT cutoffs.
   - NEVER convert percentiles or ranks between exams (do NOT convert MHT-CET to JEE Main or vice versa).
   - Support cutoff units: "percentile", "rank" (AIR), "marks" (e.g. NATA marks out of 200, MH CET Law score out of 150, BITSAT score out of 390). NEVER display marks as percentiles.
   - NATIONAL COLLEGES FACTS:
     • BITS Pilani admits strictly via BITS Admission Portal based on BITSAT score (out of 390 marks). It does NOT accept MHT-CET or JEE Main.
     • VIT Vellore admits B.Tech students strictly via VIT Online Counselling based on VITEEE rank. It does NOT accept MHT-CET or JEE Main for regular B.Tech seats.
     • IIIT Hyderabad admits via IIIT-H Admissions Portal based on JEE Main overall percentile or UGEE exam. It does NOT participate in Maharashtra CAP or accept MHT-CET.
     • Delhi Technological University (DTU) admits strictly via Joint Admission Counselling Delhi (JAC Delhi) counselling based on JEE Main CRL/Category Rank. It does NOT accept MHT-CET.
     • RV College of Engineering (RVCE) admits via KEA KCET counselling (Karnataka candidates) or COMEDK UGET (All India candidates). It does NOT accept MHT-CET.
     • IIT Bombay admits undergraduate engineering strictly via JoSAA counselling based on JEE Advanced All India Rank (AIR). It does NOT accept MHT-CET or JEE Main for final seat allocation.
   - NEVER present invalid cutoff records:
     • Army Institute of Technology (AIT Pune) admits EXCLUSIVELY via JEE Main All India Rank for Army personnel wards. AIT Pune does NOT accept MHT-CET and has no valid MHT-CET cutoffs.
     • Symbiosis Law School Pune admits via SLAT; Bharati Vidyapeeth New Law admits via BVP CET Law. Their MH CET Law cutoffs in legacy dataset are INVALID and must never be cited as valid.
   - Cutoff year and round were not specified in the original source dataset; NEVER present assumed 2024 or CAP Round 1 metadata as verified historical facts.
   - Generic admission route strings (e.g. 85% State / 15% All India) and academic eligibility minimums (e.g. 10+2 45% PCM) are derived regulatory baselines, NOT institution-verified prospectus facts.
   - When asked if an institution accepts an exam (e.g. "Does COEP accept JEE Main?"): check the accepted exams in directory.
   - If asked for a cutoff for an exam not present in the verified dataset (e.g. "What is the BITSAT cutoff for BITS Pilani?" or "What is the JEE Main cutoff for COEP?"): state explicitly: "Cutoff not available in verified dataset." Do NOT fabricate or estimate it.

3. ADMISSION ROUTES, ACADEMIC ELIGIBILITY & VERIFICATION STATUS:
   - Every college and program in the directory includes its admission verification status ([Admission Status: VERIFIED], [Admission Status: DERIVED], or [Admission Status: NOT_VERIFIED]).
   - If status is VERIFIED: State the official admission route, accepted entrance exams, and academic eligibility with confidence based on official directorate/institutional portals.
   - If status is DERIVED: Explicitly clarify that the admission route or eligibility is based on the general state regulatory framework (e.g. Maharashtra CET Cell CAP guidelines) rather than an independently verified individual institutional prospectus.
   - If a program has program-specific admission metadata (e.g. [ProgRoute: ...]), cite that program's specific route and exams; if a program has no program-specific route, cite the institutional college-level route while noting it represents the general institutional pathway.
   - Never claim unverified or derived data as verified.

4. PROGRAM-LEVEL ACCURACY:
   - When asked about branches or programs (e.g. "Which Pune colleges have Computer Engineering?"), cite the actual programs, intake seat capacity, and published cutoffs from the verified directory above.
   - Do NOT give vague generalizations or invent programs that do not exist.

5. NEUTRAL COMPARISONS:
   - When asked to compare institutions (e.g. "Compare COEP and PICT for me"):
     • Provide a neutral, objective, side-by-side comparison citing location, specific programs, accepted exams, published cutoffs, the student's cutoff compatibility status, and curriculum alignment.
     • NEVER declare one institution "best" or state that one is "guaranteed".

6. MISSING DATA TRANSPARENCY:
   - If a piece of data is missing in the dataset or profile, state clearly:
     • If cutoff is missing: "Cutoff unavailable — eligibility cannot be determined from cutoff data in the current EduSphere dataset."
     • If student's entrance score is missing: "Your entrance score is not available in your profile, so I cannot perform a cutoff comparison."
     • If student's category is missing: State that the evaluation defaults to "OPEN (default)" as recorded in the dataset.
     • Always cite: "Based on the current EduSphere Supabase dataset."

7. RECOMMENDATION EXPLANATIONS:
   - When asked "Why did you recommend this?", explain the actual multi-factor composite weights:
     • Cutoff compatibility (35%)
     • Academic alignment & accreditation (25%)
     • Program/branch relevance (20%)
     • Technical skills match (10%)
     • Location alignment (10%)
     (Or the renormalized weights over 0.65 if cutoff is unavailable).

8. PRIVACY & SECURITY:
   - You only have access to the authenticated student's own profile.
   - NEVER accept requests to view, search, or expose another student's private profile, CGPA, or data. Politely decline any such requests citing student privacy protection.

9. FORMATTING & STYLE:
   - Use clean, concise markdown: bold terms, structured bullet points, and compact comparison tables when contrasting colleges. Keep responses student-friendly, actionable, and encouraging.`;
}

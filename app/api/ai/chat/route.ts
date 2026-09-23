import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  buildSanitizedContext,
  buildSystemInstruction,
  StudentCareerContextParams,
  SanitizedStudentContext,
  EvaluatedCollegeContext,
} from "@/lib/ai-context";
import { fetchColleges, fetchInternships, fetchPlacements } from "@/lib/supabase/opportunities";
import { computeCollegeGuidance, computeInternshipGuidance, computePlacementGuidance } from "@/lib/ai-guidance";

// Lightweight in-memory rate limiter: max 20 requests per minute per identifier
interface RateLimitEntry {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitEntry>();

function checkRateLimit(identifier: string, limit = 20, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count++;
  return true;
}

const STOP_WORDS = new Set([
  "college", "colleges", "engineering", "technology", "technological",
  "institute", "institutes", "university", "pune", "maharashtra",
  "society", "trust", "shikshan", "sanstha", "vidyapeeth", "campus"
]);

function findCollegeMatch(query: string, colleges: EvaluatedCollegeContext[]): EvaluatedCollegeContext | null {
  const lower = query.toLowerCase();
  if (lower.includes("coep") || lower.includes("college of engineering pune")) {
    return colleges.find((c) => c.name.toLowerCase().includes("coep")) || null;
  }
  if (lower.includes("pict") || lower.includes("pune institute of computer")) {
    return colleges.find((c) => c.name.toLowerCase().includes("pict") || c.name.toLowerCase().includes("pune institute of computer")) || null;
  }
  if (lower.includes("viit") || lower.includes("vishwakarma institute of information")) {
    return colleges.find((c) => c.name.toLowerCase().includes("information technology") && c.name.toLowerCase().includes("vishwakarma")) || colleges.find((c) => c.name.toLowerCase().includes("viit")) || null;
  }
  if (lower.includes("vit") || lower.includes("vishwakarma institute of technology")) {
    return colleges.find((c) => c.name.toLowerCase().includes("vishwakarma institute of technology")) || colleges.find((c) => c.name.toLowerCase().includes("vit")) || null;
  }
  if (lower.includes("cummins")) {
    return colleges.find((c) => c.name.toLowerCase().includes("cummins")) || null;
  }
  if (lower.includes("pccoe") || lower.includes("pimpri chinchwad")) {
    return colleges.find((c) => c.name.toLowerCase().includes("pimpri")) || null;
  }
  if (lower.includes("d.y. patil") || lower.includes("dy patil")) {
    return colleges.find((c) => c.name.toLowerCase().includes("patil")) || null;
  }
  if (lower.includes("ils")) {
    return colleges.find((c) => c.name.toLowerCase().includes("ils")) || null;
  }
  if (lower.includes("symbiosis") || lower.includes("sit")) {
    return colleges.find((c) => c.name.toLowerCase().includes("symbiosis")) || null;
  }
  if (lower.includes("bharati") || lower.includes("bvp")) {
    return colleges.find((c) => c.name.toLowerCase().includes("bharati")) || null;
  }
  return colleges.find((c) => {
    const colWords = c.name.toLowerCase().split(/\s+/).filter((w) => w.length > 3 && !STOP_WORDS.has(w));
    return colWords.length > 0 && colWords.some((w) => lower.includes(w));
  }) || null;
}

function findActiveCollegeFromConversation(
  query: string,
  colleges: EvaluatedCollegeContext[],
  messages?: Array<{ role: string; content: string }>
): EvaluatedCollegeContext | null {
  // 1. Direct match in current user query
  const direct = findCollegeMatch(query, colleges);
  if (direct) return direct;

  // 2. Pronoun / context resolution from preceding user messages (search backward)
  if (messages && messages.length > 1) {
    for (let i = messages.length - 2; i >= 0; i--) {
      if (messages[i].role === "user") {
        const prev = messages[i].content;
        const prevCol = findCollegeMatch(prev, colleges);
        if (prevCol) return prevCol;
      }
    }
    for (let i = messages.length - 2; i >= 0; i--) {
      const prev = messages[i].content;
      const prevCol = findCollegeMatch(prev, colleges);
      if (prevCol) return prevCol;
    }
  }
  return null;
}

function detectExamInQuery(query: string): string | null {
  const q = query.toLowerCase();
  if (q.includes("jee advanced") || q.includes("jee adv") || (q.includes("advanced") && q.includes("jee"))) return "JEE Advanced";
  if (q.includes("jee main") || q.includes("jeemain") || (q.includes("jee") && !q.includes("advanced"))) return "JEE Main";
  if (q.includes("mht cet") || q.includes("mht-cet") || q.includes("cet") || q.includes("mhtcet")) return "MHT-CET";
  if (q.includes("clat") || q.includes("mh cet law") || q.includes("cet law")) return "MH CET Law";
  if (q.includes("nata")) return "NATA";
  return null;
}

function findComparisonColleges(
  query: string,
  colleges: EvaluatedCollegeContext[],
  messages?: Array<{ role: string; content: string }>
): [EvaluatedCollegeContext, EvaluatedCollegeContext] | null {
  const lower = query.toLowerCase();
  const matched: EvaluatedCollegeContext[] = [];

  const patterns = [
    { name: "coep", regex: /\bcoep\b/i },
    { name: "pict", regex: /\bpict\b|pune institute of computer/i },
    { name: "vit", regex: /\bvit\b|vishwakarma institute of technology/i },
    { name: "viit", regex: /\bviit\b/i },
    { name: "cummins", regex: /\bcummins\b/i },
    { name: "pccoe", regex: /\bpccoe\b|pimpri/i },
    { name: "dypatil", regex: /d\.?y\.?\s*patil/i },
    { name: "mit", regex: /\bmit\b/i },
    { name: "aissms", regex: /\baissms\b/i },
  ];

  for (const p of patterns) {
    if (p.regex.test(lower)) {
      const c = colleges.find((col) => p.regex.test(col.name));
      if (c && !matched.some((m) => m.name === c.name)) {
        matched.push(c);
      }
    }
  }

  // Check conversation history for comparisons across messages (e.g. "What about COEP?" -> "What about PICT?")
  if (matched.length === 1 && messages && messages.length > 1) {
    for (let i = messages.length - 2; i >= 0; i--) {
      const prev = messages[i].content.toLowerCase();
      for (const p of patterns) {
        if (p.regex.test(prev)) {
          const c = colleges.find((col) => p.regex.test(col.name));
          if (c && !matched.some((m) => m.name === c.name)) {
            matched.unshift(c);
            break;
          }
        }
      }
      if (matched.length >= 2) break;
    }
  }

  if (matched.length >= 2) {
    return [matched[0], matched[1]];
  }

  if (lower.includes("compare") && (lower.includes("coep") || lower.includes("pict"))) {
    const coep = colleges.find((c) => c.name.toLowerCase().includes("coep"));
    const pict = colleges.find((c) => c.name.toLowerCase().includes("pict"));
    if (coep && pict) return [coep, pict];
  }

  return null;
}

// Grounded intelligent responder using verified Supabase catalog when external API is not configured
function generateGroundedAssistantReply(
  userQuery: string,
  context: SanitizedStudentContext,
  messages?: Array<{ role: string; content: string }>
): string {
  const q = userQuery.toLowerCase();
  const { academicProfile, skillsInventory, metrics, skillGaps, topRecommendations, evaluatedColleges, studentName } = context;

  // 1. Security & Privacy Guard (Section K & Test 12)
  const isPrivacyAttempt =
    (q.includes("other student") ||
      q.includes("another student") ||
      q.includes("someone else") ||
      q.includes("john doe") ||
      q.includes("other user") ||
      q.includes("student profile id") ||
      /\bsp-[a-z0-9-]+\b/i.test(q)) &&
    (q.includes("cgpa") || q.includes("score") || q.includes("data") || q.includes("profile") || q.includes("show") || q.includes("what is") || q.includes("access"));

  if (isPrivacyAttempt) {
    return `### 🔒 Privacy & Access Restriction
Access denied. In accordance with EduSphere data security and student privacy policies, the AI Career Assistant is strictly restricted to accessing only your own authenticated academic profile. Information regarding other students or user profiles cannot be retrieved or disclosed.`;
  }

  // 2. College Comparison Questions (Section E & Test 7)
  const compColleges = findComparisonColleges(userQuery, evaluatedColleges, messages);
  if (compColleges && (q.includes("compare") || q.includes("vs") || q.includes("difference") || (messages && messages.length > 1 && q.includes("what about")))) {
    const [c1, c2] = compColleges;

    return `### 🏛️ College Comparison: ${c1.name} vs ${c2.name}
Based on the current EduSphere Supabase dataset, here is a neutral factual comparison grounded in your profile:

| Metric | ${c1.name} | ${c2.name} |
| :--- | :--- | :--- |
| **Location** | ${c1.location} | ${c2.location} |
| **Stream / Type** | ${c1.stream} (${c1.collegeType}) | ${c2.stream} (${c2.collegeType}) |
| **Target Program** | ${c1.targetProgram} | ${c2.targetProgram} |
| **Entrance Exam** | ${c1.cutoffExam || academicProfile.entranceExam} | ${c2.cutoffExam || academicProfile.entranceExam} |
| **Published Cutoff (${c1.cutoffCategory})** | ${c1.cutoffValue !== null ? `${c1.cutoffValue}%ile` : "Not available in current dataset"} | ${c2.cutoffValue !== null ? `${c2.cutoffValue}%ile` : "Not available in current dataset"} |
| **Your Score** | ${academicProfile.entranceScoreNumeric !== null ? `${academicProfile.entranceScoreNumeric}%ile` : "Not recorded"} | ${academicProfile.entranceScoreNumeric !== null ? `${academicProfile.entranceScoreNumeric}%ile` : "Not recorded"} |
| **Cutoff Status** | \`${c1.cutoffStatus}\` | \`${c2.cutoffStatus}\` |
| **Composite Match** | **${c1.matchScore}%** | **${c2.matchScore}%** |

### 📊 Objective Analysis:
• **${c1.name}**: ${c1.keyReasons.slice(0, 2).join("; ")}
• **${c2.name}**: ${c2.keyReasons.slice(0, 2).join("; ")}

> *Note: Based on the current EduSphere Supabase dataset. EduSphere does not declare any institution "best" or guarantee admission. Cutoff compatibility reflects historical published percentiles and does not guarantee admission.*`;
  }

  // 3. Unavailable Cutoff Data Query (Section F & Test 6)
  if (q.includes("unavailable") || q.includes("missing cutoff") || q.includes("no cutoff") || q.includes("which colleges have unavailable")) {
    const unavailColleges = evaluatedColleges.filter((c) => c.cutoffStatus === "Cutoff unavailable" || c.cutoffValue === null).slice(0, 6);

    return `### 📋 Institutions with Unavailable Cutoff Data
In the current EduSphere Supabase dataset, published cutoff records are currently unavailable for certain programs and institutions:

${unavailColleges.map((c) => `• **${c.name}** (${c.location}) — *Program:* ${c.targetProgram} [\`Cutoff unavailable\`]`).join("\n")}

### 🔍 How Missing Cutoffs Are Handled:
- **Status:** **\`Cutoff unavailable\`** — eligibility cannot be determined from cutoff data for these programs.
- **Scoring:** The cutoff weight (35%) is **not treated as zero**. The remaining 4 factors are renormalized over 0.65:
  - Academic Alignment: **~38.46%**
  - Program Relevance: **~30.77%**
  - Technical Skills Overlap: **~15.38%**
  - Geographic Alignment: **~15.38%**
- This ensures strong academic and skill alignment will still surface relevant colleges transparently.

> *Note: Based on the current EduSphere Supabase dataset.*`;
  }

  // 4. Program-Level & Branch Queries (Section D & Test 1)
  const isBranchQuery =
    (q.includes("which") || q.includes("what") || q.includes("list") || q.includes("show") || q.includes("find")) &&
    (q.includes("college") || q.includes("colleges") || q.includes("institution") || q.includes("institutes")) &&
    (q.includes("computer") || q.includes("engineering") || q.includes("branch") || q.includes("program") || q.includes("stream") || q.includes("course") || q.includes("offer"));

  if (isBranchQuery) {
    const targetBranchSearch = q.includes("computer")
      ? "computer"
      : q.includes("information") || q.includes("it")
      ? "information"
      : q.includes("mechanical")
      ? "mechanical"
      : q.includes("civil")
      ? "civil"
      : q.includes("electrical")
      ? "electrical"
      : q.includes("electronics") || q.includes("entc")
      ? "electronics"
      : q.includes("law")
      ? "law"
      : academicProfile.preferredBranch.toLowerCase();

    const matchingColleges = evaluatedColleges.filter((c) =>
      c.programs.some((p) => p.name.toLowerCase().includes(targetBranchSearch)) ||
      c.targetProgram.toLowerCase().includes(targetBranchSearch)
    );

    // Sort matching colleges to prioritize colleges with published cutoffs (e.g. COEP, PICT, VIT)
    matchingColleges.sort((a, b) => {
      const aMaxCutoff = Math.max(...a.programs.map((p) => p.cutoffOpen || 0), 0);
      const bMaxCutoff = Math.max(...b.programs.map((p) => p.cutoffOpen || 0), 0);
      if (bMaxCutoff !== aMaxCutoff) return bMaxCutoff - aMaxCutoff;
      return b.matchScore - a.matchScore;
    });

    const displayList = (matchingColleges.length > 0 ? matchingColleges : evaluatedColleges).slice(0, 8);

    return `### 🎓 Pune Colleges Offering ${targetBranchSearch ? targetBranchSearch.toUpperCase() : "Target Programs"}
Based on the current EduSphere Supabase dataset, the following accredited institutions offer verified programs in this stream:

${displayList
  .map((c) => {
    const matchingProgs = c.programs.filter((p) =>
      p.name.toLowerCase().includes(targetBranchSearch)
    );
    const progDetails = (matchingProgs.length > 0 ? matchingProgs : c.programs.slice(0, 1))
      .map((p) => {
        const cutStr = p.cutoffOpen !== null
          ? `(MHT CET OPEN Cutoff: **${p.cutoffOpen}%ile**${p.cutoffObc !== null ? ` | OBC: **${p.cutoffObc}%ile**` : ""})`
          : `*(Cutoff: Not available in current dataset)*`;
        const intakeStr = p.intake ? `• Intake: **${p.intake} seats**` : "";
        return `  - **${p.name}** ${intakeStr} ${cutStr}`;
      })
      .join("\n");

    return `• **${c.name}** (${c.location})\n  *Your Status:* \`${c.cutoffStatus}\` (Match Score: **${c.matchScore}%**)\n${progDetails}`;
  })
  .join("\n\n")}

> *Note: Based on the current EduSphere Supabase dataset. Citing published directorate entrance cutoffs and AI recommendation scores.*`;
  }

  // 5. Missing Score Handler (Section F & Test 9)
  const isCutoffOrTargetQuery =
    (q.includes("cutoff") || q.includes("target") || q.includes("chance") || q.includes("eligible")) &&
    !q.includes("placement") &&
    !q.includes("intern");

  if (isCutoffOrTargetQuery && academicProfile.entranceScoreNumeric === null && !q.includes("why was") && !q.includes("what happens") && !q.includes("unavailable")) {
    return `### ⚠️ Entrance Score Required for Cutoff Analysis
Your entrance score is not available in your profile, so I can't perform a cutoff comparison.

To benchmark your eligibility against published cutoffs:
1. Navigate to **Profile Settings**.
2. Enter your **Entrance Exam** (e.g., MHT CET) and **Entrance Score Percentile**.
3. Return here to receive instant cutoff evaluations.

In the current EduSphere dataset, institutions are presently evaluated using renormalized academic accreditation, curriculum overlap, skills matching, and location preference.`;
  }

  // 5B. Category Query / Missing Category Handler (Section F & Test 10)
  if (q.includes("category") || q.includes("caste") || q.includes("reservation") || q.includes("quota")) {
    const isDefaultOpen = academicProfile.category.includes("OPEN") || academicProfile.category.includes("default");
    return `### 🏷️ Admission Category Evaluation
In the EduSphere AI recommendation engine, your profile is evaluated under: **${academicProfile.category}**.

${
  isDefaultOpen
    ? `**Missing Category Handling:**
Your category is not explicitly recorded in your profile, so the recommendation engine defaults to **OPEN (default)** in accordance with directorate admission standards.

If you belong to a reserved category (e.g., **OBC, SC, ST, EWS**):
1. Navigate to **Profile Settings**.
2. Select your designated category.
3. Save your profile to immediately recalibrate cutoff compatibility against specific category percentiles.`
    : `Your admission compatibility is being benchmarked against verified **${academicProfile.category}** category cutoffs published in our dataset.`
}

> *Note: Based on the current EduSphere Supabase dataset. Citing official directorate reservation categories.*`;
  }

  // 6. Score Below Cutoff / Deficit Query (Section C, E & Test 5)
  if (q.includes("below the cutoff") || q.includes("below cutoff") || q.includes("what happens if my score is below")) {
    return `### 📉 Evaluation When Score is Below Cutoff
If your entrance score is below the published cutoff in the current EduSphere dataset:

1. **Status Designation:**
   Your status for that program is designated as **\`Cutoff not met\`**.
   - Your score is below the published opening/closing percentile benchmark recorded in our verified directorate dataset.

2. **How EduSphere Evaluates You:**
   - EduSphere **does not reject** or zero out the institution.
   - The engine continues to evaluate your **Academic Alignment (25%)**, **Program Match (20%)**, **Technical Skills Overlap (10%)**, and **Location Preference (10%)**.

3. **Admissions Reality & CAP Rounds:**
   - Cutoffs fluctuate across Centralized Admission Process (CAP) rounds (Round 1, Round 2, Round 3) based on student seat acceptance and seat vacancy.
   - A deficit in Round 1 cutoffs may narrow in subsequent rounds or institutional quota opportunities.

4. **Constructive Next Step:**
   We recommend maintaining strong target options alongside backup institutions where your status is **\`Cutoff compatible\`**, while actively strengthening relevant technical skills.

> *Note: Based on the current EduSphere Supabase dataset. EduSphere does not predict admission odds or guarantee admissions.*`;
  }

  // 7. Conversational College & Multi-Exam Inquiries
  const matchedCol = findActiveCollegeFromConversation(userQuery, evaluatedColleges, messages);
  const detectedExam = detectExamInQuery(userQuery);

  // 7A: Admission Route & Academic Eligibility Queries
  if (
    matchedCol &&
    (q.includes("admission route") ||
      q.includes("route") ||
      q.includes("eligibility") ||
      q.includes("criteria") ||
      q.includes("how to apply") ||
      q.includes("admission process"))
  ) {
    const matchedProg = matchedCol.programs.find(
      (p) => q.includes(p.name.toLowerCase()) || (q.includes("computer") && p.name.toLowerCase().includes("computer"))
    );

    const isProgSpecific = Boolean(matchedProg && (matchedProg.admissionRoute || matchedProg.eligibilityCriteria || matchedProg.acceptedExams));
    const verStatus = (isProgSpecific && matchedProg?.admissionVerificationStatus)
      ? matchedProg.admissionVerificationStatus
      : (matchedCol.admissionVerificationStatus || "DERIVED");

    const acceptedExamsList = matchedProg?.acceptedExams && matchedProg.acceptedExams.length > 0
      ? matchedProg.acceptedExams
      : matchedCol.acceptedExams;

    const routeText = matchedProg?.admissionRoute || matchedCol.admissionRoute;
    const eligibilityText = matchedProg?.eligibilityCriteria || matchedCol.eligibilityCriteria;

    return `### 🏛️ Admission Route & Eligibility: ${matchedCol.name}${matchedProg ? ` (${matchedProg.name})` : ""}
Based on verified admissions standards in the EduSphere dataset:

- **Institution:** **${matchedCol.name}** (${matchedCol.location})
- **College Type:** ${matchedCol.collegeType}
- **Accepted Entrance Exams:** **${acceptedExamsList.join(", ")}**
- **Admission Route:** **${routeText}**
- **Academic Eligibility Criteria:** **${eligibilityText}**
- **Admission Verification Status:** \`${verStatus}\`${verStatus === "VERIFIED" ? " *(Verified from official authority portal)*" : " *(Derived from general state regulatory framework)*"}
- **Official Institutional Portal:** ${matchedCol.officialWebsite ? `[${matchedCol.officialWebsite}](${matchedCol.officialWebsite})` : "Official institution website"}

> *Note: Based on the current EduSphere Supabase dataset. Admissions are administered by the designated state/national admission authority.*`;
  }

  // 7B: Exam Acceptance & "What if I use [Exam] instead?"
  if (
    matchedCol &&
    detectedExam &&
    (q.includes("instead") || q.includes("what if") || q.includes("switch") || q.includes("using") || q.includes("accept") || q.includes("does"))
  ) {
    const normDetected = detectedExam.toLowerCase().replace(/[-\s_]/g, "");
    const acceptsExam = matchedCol.acceptedExams.some(
      (e) => e.toLowerCase().replace(/[-\s_]/g, "") === normDetected
    );

    if (acceptsExam) {
      const examCutoff = matchedCol.programs.find(
        (p) => p.exam && p.exam.toLowerCase().replace(/[-\s_]/g, "") === normDetected && p.cutoffOpen !== null
      );

      return `### 🔄 Entrance Exam Evaluation: ${matchedCol.name} (${detectedExam})
**Exam Acceptance Status:** ✅ **Yes, ${matchedCol.name} accepts ${detectedExam}**.

1. **Admission Route:**
   - Evaluated under: **${matchedCol.admissionRoute}** (All India Candidature Seats).

2. **Published Cutoff Status:**
   - **${detectedExam} cutoff: ${examCutoff ? `${examCutoff.unit === "rank" ? `AIR ${examCutoff.cutoffOpen}` : `${examCutoff.cutoffOpen}%ile`} (${examCutoff.round || "CAP Round"})` : "Not available in verified dataset."}**
   - In the verified EduSphere dataset, official published cutoffs are currently recorded for **${matchedCol.cutoffExam || "MHT-CET"}** (e.g. ${matchedCol.targetProgram} OPEN: **${matchedCol.cutoffValue !== null ? `${matchedCol.cutoffValue}%ile` : "available in directory"}**).
   - In accordance with our strict data verification standards, EduSphere **does not fabricate or estimate** cutoff scores for ${detectedExam}.

3. **Academic Eligibility:**
   - **${matchedCol.eligibilityCriteria}**

4. **Recommendation Impact:**
   - Your profile compatibility is evaluated with **\`Cutoff unavailable\`** for ${detectedExam}, renormalizing your Academic Standards, Program Alignment, Skills Overlap, and Location factors over 0.65 to maintain an objective match score.

> *Note: Based on the current EduSphere Supabase dataset. Admissions are administered via the Maharashtra State CET Cell CAP All India quota.*`;
    } else {
      return `### ℹ️ Entrance Examination Information: ${matchedCol.name}
**Query:** Does ${matchedCol.name} accept **${detectedExam}**?

❌ **No, ${matchedCol.name} does not accept ${detectedExam}** for undergraduate ${matchedCol.stream} admissions.

- **Verified Accepted Exams:** **${matchedCol.acceptedExams.join(", ")}**
- **Admission Route:** ${matchedCol.admissionRoute}
- **Academic Eligibility:** ${matchedCol.eligibilityCriteria}
${detectedExam === "JEE Advanced" ? "\n*Note: JEE Advanced is utilized exclusively for Indian Institutes of Technology (IITs). Maharashtra state engineering institutions admit students via MHT-CET (State Quota) and JEE Main (All India Quota).*" : ""}

> *Note: Based on the current EduSphere Supabase dataset.*`;
    }
  }

  // 7C: Single College General Inquiries ("Why was X recommended?", "What is its cutoff?", "Can I target X?")
  if (matchedCol) {
    // 7C-1: "Why was X recommended?"
    if (q.includes("why") && (q.includes("recommend") || q.includes("suggest") || q.includes("match"))) {
      const unitStr = matchedCol.cutoffUnit === "rank" ? `AIR ${matchedCol.cutoffValue}` : `${matchedCol.cutoffValue}%ile`;
      const studentUnitStr = matchedCol.cutoffUnit === "rank" ? `Rank ${academicProfile.entranceScoreNumeric}` : `${academicProfile.entranceScoreNumeric}%ile`;

      return `### 💡 Recommendation Rationale: ${matchedCol.name}
**Evaluated Program:** ${matchedCol.targetProgram}
**Composite Match Score:** **${matchedCol.matchScore}%**

The EduSphere recommendation engine evaluated **${matchedCol.name}** using our 5-factor composite formula:

1. **Cutoff Compatibility (35%):**
   - Published Cutoff: **${matchedCol.cutoffValue !== null ? `${unitStr} (${matchedCol.cutoffExam || academicProfile.entranceExam}, ${matchedCol.cutoffCategory})` : "Not available in verified dataset"}**
   - Your Score: **${academicProfile.entranceScoreNumeric !== null ? studentUnitStr : "Not recorded"}**
   - Status: \`${matchedCol.cutoffStatus}\` ${matchedCol.scoreDifference !== null ? `(${matchedCol.scoreDifference >= 0 ? `+${matchedCol.scoreDifference} surplus` : `${matchedCol.scoreDifference} deficit`})` : ""}

2. **Academic Alignment (25%):**
   - Evaluated on ${matchedCol.collegeType} status, NAAC accreditation benchmarks, and proven campus placement track record.

3. **Program / Branch Match (20%):**
   - High curriculum alignment with your preferred target stream: **${academicProfile.preferredBranch}**.

4. **Technical Skills Overlap (10%):**
   - Your recorded technical skills align with core domain coursework in ${matchedCol.targetProgram}.

5. **Location Alignment (10%):**
   - Located in **${matchedCol.location}**, matching your regional preference (${academicProfile.preferredLocation}).

- **Accepted Entrance Exams:** ${matchedCol.acceptedExams.join(", ")}
- **Admission Route:** ${matchedCol.admissionRoute}

> *Note: Based on the current EduSphere Supabase dataset. Recommendation scores reflect composite alignment and do not guarantee admission.*`;
    }

    // 7C-2: "What is the published cutoff?" / "What is its cutoff?"
    if (q.includes("what is the published") || q.includes("published cutoff") || q.includes("what is the cutoff") || q.includes("cutoff for") || q.includes("its cutoff") || q.includes("the cutoff")) {
      // If student asked for a specific exam
      if (detectedExam) {
        const normDetected = detectedExam.toLowerCase().replace(/[-\s_]/g, "");
        const acceptsExam = matchedCol.acceptedExams.some(
          (e) => e.toLowerCase().replace(/[-\s_]/g, "") === normDetected
        );
        if (!acceptsExam) {
          return `### 📌 Cutoff Information: ${matchedCol.name} (${detectedExam})
**${matchedCol.name} does not accept ${detectedExam}.**

- **Verified Accepted Entrance Exams:** **${matchedCol.acceptedExams.join(", ")}**
- **Admission Route:** ${matchedCol.admissionRoute}
- **Official Institutional Portal:** ${matchedCol.officialWebsite ? `[${matchedCol.officialWebsite}](${matchedCol.officialWebsite})` : "Official website"}

> *Note: Based on the current EduSphere Supabase dataset.*`;
        }

        const hasExamCutoff = matchedCol.programs.some(
          (p) => p.exam && p.exam.toLowerCase().replace(/[-\s_]/g, "") === normDetected && p.cutoffOpen !== null
        );
        if (!hasExamCutoff) {
          return `### 📌 Cutoff Information: ${matchedCol.name} (${detectedExam})
**${detectedExam} cutoff: Not available in verified dataset.**

While **${matchedCol.name}** accepts **${detectedExam}** under the **${matchedCol.admissionRoute}**, the verified EduSphere dataset currently contains published cutoffs for **${matchedCol.cutoffExam || "MHT-CET"}** (e.g. ${matchedCol.targetProgram} OPEN: **${matchedCol.cutoffValue !== null ? `${matchedCol.cutoffValue}%ile` : "available in directory"}**).

In accordance with our strict data verification standards, EduSphere **does not fabricate or estimate** cutoff percentiles or ranks for ${detectedExam}.`;
        }
      }

      const progsWithCutoff = matchedCol.programs.filter((p) => p.cutoffOpen !== null);

      return `### 📌 Published Admissions Cutoffs for ${matchedCol.name}
Based on the current EduSphere Supabase dataset, here are the official published entrance cutoffs:

${progsWithCutoff.length > 0
  ? progsWithCutoff.map((p) => {
      const u = p.unit === "rank" ? "AIR " : "";
      const post = p.unit === "rank" ? "" : "%ile";
      return `• **${p.name}** (${p.exam || matchedCol.cutoffExam || "MHT CET"}${p.round ? ` • ${p.round}` : ""})\n  - **OPEN:** **${u}${p.cutoffOpen}${post}**\n  - **OBC:** **${p.cutoffObc !== null ? `${u}${p.cutoffObc}${post}` : "N/A"}**\n  - **SC:** **${p.cutoffSc !== null ? `${u}${p.cutoffSc}${post}` : "N/A"}**\n  - **ST:** **${p.cutoffSt !== null ? `${u}${p.cutoffSt}${post}` : "N/A"}**${p.intake ? `\n  - **Approved Intake:** ${p.intake} seats` : ""}`;
    }).join("\n\n")
  : `• **${matchedCol.targetProgram}**: Cutoff data is not available in the current dataset for this program; eligibility cannot be determined from cutoff data.`
}

**Your Profile Comparison:**
- **Your Entrance Score:** ${academicProfile.entranceScore} (${academicProfile.entranceExam})
- **Evaluated Category:** ${matchedCol.cutoffCategory}
- **Cutoff Status:** \`${matchedCol.cutoffStatus}\`
- **Accepted Exams:** ${matchedCol.acceptedExams.join(", ")}
- **Admission Route:** ${matchedCol.admissionRoute}

> *Note: Based on the current EduSphere Supabase dataset. Admissions cutoffs reflect historical opening/closing percentiles/ranks and do not guarantee admission.*`;
    }

    // 7C-3: "Can I target X?" / "What about X?"
    const targetProgramName = matchedCol.targetProgram;
    const cutoffVal = matchedCol.cutoffValue;
    const studentScoreVal = academicProfile.entranceScoreNumeric;
    const isRank = matchedCol.cutoffUnit === "rank";
    const unitStr = isRank ? `AIR ${cutoffVal}` : `${cutoffVal}%ile`;
    const studentUnitStr = isRank ? `Rank ${studentScoreVal}` : `${studentScoreVal}%ile`;

    let targetAnswer = "";
    if (cutoffVal === null) {
      targetAnswer = `No published cutoff is available in the current EduSphere dataset for **${targetProgramName}** at **${matchedCol.name}**, so eligibility cannot be determined from cutoff data. However, the institution remains a strong academic match with a composite score of **${matchedCol.matchScore}%**.`;
    } else if (studentScoreVal === null) {
      targetAnswer = `Your entrance score is not available in your profile, so I can't perform a cutoff comparison for **${targetProgramName}** at **${matchedCol.name}**. Please record your entrance percentile in Profile Settings.`;
    } else {
      const isCompatible = isRank ? studentScoreVal <= cutoffVal : studentScoreVal >= cutoffVal;
      if (isCompatible) {
        const surplus = isRank ? cutoffVal - studentScoreVal : Number((studentScoreVal - cutoffVal).toFixed(2));
        targetAnswer = `Your score of **${studentUnitStr}** meets or exceeds the published cutoff (**${unitStr}**, ${matchedCol.cutoffExam || academicProfile.entranceExam}, ${matchedCol.cutoffCategory}) in the verified EduSphere dataset.\n\n**Factual Status:** \`Cutoff compatible\` (Surplus: **+${surplus}${isRank ? " ranks" : "%ile"}**).\n\nYou have strong historical cutoff alignment to target **${targetProgramName}** at **${matchedCol.name}**.`;
      } else {
        const deficit = isRank ? studentScoreVal - cutoffVal : Number((cutoffVal - studentScoreVal).toFixed(2));
        targetAnswer = `Your score of **${studentUnitStr}** is below the published cutoff (**${unitStr}**, ${matchedCol.cutoffExam || academicProfile.entranceExam}, ${matchedCol.cutoffCategory}) in the verified EduSphere dataset.\n\n**Factual Status:** \`Cutoff not met\` (Deficit: **${deficit}${isRank ? " ranks" : "%ile"}**).\n\nWhile your score is below the historical published benchmark, EduSphere still awards a composite match of **${matchedCol.matchScore}%** based on academic and curriculum factors. Consider keeping complementary backup options.`;
      }
    }

    return `### 🎯 Targeting Analysis: ${matchedCol.name}
**Program:** ${targetProgramName}
**Institution Location:** ${matchedCol.location}
**Accepted Exams:** ${matchedCol.acceptedExams.join(", ")}
**Admission Route:** ${matchedCol.admissionRoute}

${targetAnswer}

**Evaluation Summary:**
| Metric | Value |
| :--- | :--- |
| **Published Cutoff** | ${cutoffVal !== null ? unitStr : "Not available in current dataset"} |
| **Your Score** | ${studentScoreVal !== null ? studentUnitStr : "Not recorded"} |
| **Exam & Category** | ${matchedCol.cutoffExam || academicProfile.entranceExam} (${matchedCol.cutoffCategory}) |
| **Cutoff Status** | \`${matchedCol.cutoffStatus}\` |
| **Composite Recommendation** | **${matchedCol.matchScore}%** |

> *Note: Based on the current EduSphere Supabase dataset. Cutoff compatibility indicates historical academic alignment and does not guarantee admission.*`;
  }

  // 8. Internship Matching questions (Prioritized before generic skill gap queries)
  if (q.includes("intern") || q.includes("stipend") || (q.includes("role") && !q.includes("college"))) {
    const topInt = topRecommendations.internships;
    return `### 💼 Personalized Internship Matching
Here is how your technical skills and background align with internships in our database:

${
  topInt.length > 0
    ? topInt
        .map(
          (i) =>
            `• **${i.role}** at **${i.company}** (Match Score: **${i.matchScore}%**)\n  - **Matching Skills:** ${
              i.matchingSkills.length > 0 ? i.matchingSkills.join(", ") : "None recorded yet"
            }\n  - **Skills to Acquire:** ${
              i.missingSkills.length > 0 ? i.missingSkills.join(", ") : "All prerequisites met!"
            }`
        )
        .join("\n\n")
    : "• No active internship matches currently computed."
}

### 🚀 Recommendation
Review the missing skills for your top internship choice above and add them to your weekly learning schedule.

> *Note: Based on the current EduSphere Supabase dataset.*`;
  }

  // 9. Placement Eligibility questions (Prioritized before generic skill gap queries)
  if (q.includes("placement") || q.includes("eligib") || q.includes("drive") || q.includes("cgpa")) {
    const cgpa = academicProfile.cgpa;
    const eligibleCount = metrics.placementReadiness.eligibleDrives;
    const totalCount = metrics.placementReadiness.totalDrives;
    const topPlacements = topRecommendations.placements;

    return `### 🎓 Campus Placement Eligibility Overview
**Your Recorded CGPA:** **${cgpa}**

You are currently eligible for **${eligibleCount} of ${totalCount}** active campus recruitment drives in EduSphere.

**Top Placement Drives & Your Eligibility Status:**
${
  topPlacements.length > 0
    ? topPlacements
        .map(
          (p) =>
            `• **${p.role}** at **${p.company}** (Match: **${p.matchScore}%** | Cutoff: **${p.minCgpa} CGPA**) — ${
              p.eligible
                ? "✅ **Eligible** (Your CGPA satisfies cutoff criteria)"
                : "⚠️ **Not Eligible** (Your CGPA is below the minimum requirement)"
            }`
        )
        .join("\n")
    : "• No placement drives currently listed in the database."
}

### 📈 Career Readiness Rating
- **Current Readiness Score:** **${metrics.careerReadinessScore}%** (${metrics.readinessLevel})
- **Placement Market Readiness:** **${metrics.placementReadiness.marketReadinessPct}%**

> *Note: Based on the current EduSphere Supabase dataset.*`;
  }

  // 10. Skill Gaps & Career Goal Questions
  if (q.includes("skill") || q.includes("gap") || q.includes("learn") || q.includes("improve") || q.includes("career goal")) {
    const missing = skillGaps.missingHighPrioritySkills;
    const recommended = skillGaps.recommendedSkills;
    return `Hello **${studentName}**, based on your career goal (**${academicProfile.careerGoal}**) and technical profile:

### 🎯 High-Priority Skills to Learn
Your profile currently records: **${skillsInventory.length > 0 ? skillsInventory.join(", ") : "No skills recorded yet"}**.

${
  missing.length > 0
    ? `**Critical Skills for ${academicProfile.careerGoal}:**\n${missing.map((s) => `• **${s}**: In high demand by active campus placement recruiters in our dataset.`).join("\n")}`
    : "✅ You currently meet core prerequisite skills for your top matching career pathways!"
}

${
  recommended.length > 0
    ? `\n**Recommended Next Specializations:**\n${recommended.map((s) => `• **${s}**: Highly valued for ${academicProfile.preferredBranch} roles.`).join("\n")}`
    : ""
}

### 💡 Actionable Next Step
Focus on closing your top priority skill (**${missing[0] || recommended[0] || "Data Structures & Algorithms"}**) by building an end-to-end project. Updating your skills in **Profile Settings** will dynamically raise your placement eligibility and opportunity scores.

> *Note: Based on the current EduSphere Supabase dataset.*`;
  }

  // 11. Career Roadmap / Plan questions
  if (q.includes("roadmap") || q.includes("plan") || q.includes("prepare") || q.includes("path")) {
    return `### 🗺️ Tailored Career Pathway for ${academicProfile.preferredBranch}
**Career Goal:** ${academicProfile.careerGoal}

1. **Stage 1: Core Fundamentals & Prerequisite Alignment**
   - Solidify core concepts in your branch (${academicProfile.preferredBranch})
   - Ensure cumulative CGPA remains above **7.50+** to maximize recruiter cutoffs.

2. **Stage 2: Technical Skill Expansion**
   - Acquire high-priority skills: **${skillGaps.missingHighPrioritySkills.slice(0, 3).join(", ") || "TypeScript, Node.js, SQL"}**.
   - Build 2 portfolio projects demonstrating end-to-end implementation.

3. **Stage 3: Internship Experience**
   - Apply to targeted internships matching your current competencies (${skillsInventory.slice(0, 2).join(", ") || "Foundational skills"}).

4. **Stage 4: Campus Placement Drive Preparation**
   - Practice technical assessments and system design.
   - You currently meet criteria for **${metrics.placementReadiness.eligibleDrives}** companies.

> *Note: Based on the current EduSphere Supabase dataset.*`;
  }

  // 12. Default General Overview
  return `Hello **${studentName}**! I am your **EduSphere AI Career Guidance Assistant**.

Here is your current academic and placement intelligence summary:
- **Stream / Branch:** ${academicProfile.preferredBranch}
- **Entrance Exam & Percentile:** ${academicProfile.entranceExam} — ${academicProfile.entranceScore}
- **Category:** ${academicProfile.category}
- **CGPA:** ${academicProfile.cgpa}
- **Career Readiness:** ${metrics.careerReadinessScore}% (${metrics.readinessLevel})
- **Placement Eligibility:** Eligible for **${metrics.placementReadiness.eligibleDrives} of ${metrics.placementReadiness.totalDrives}** drives

**How can I assist your career progression today?**
• Ask *"Which Pune colleges have Computer Engineering?"*
• Ask *"Can I target COEP Computer Engineering?"*
• Ask *"Compare COEP and PICT for my profile"*
• Ask *"Why was COEP recommended?"*
• Ask *"What skills should I learn for my career goal?"*

> *Note: Based on the current EduSphere Supabase dataset.*`;
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Please use POST to interact with the AI Career Assistant." },
    { status: 405 }
  );
}

export async function POST(req: NextRequest) {
  try {
    // 1. Parse Body safely
    let body: {
      messages?: Array<{ role: "user" | "assistant"; content: string }>;
      context?: StudentCareerContextParams;
      isDemo?: boolean;
    };

    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const { messages = [], context, isDemo = false } = body;
    const latestMessage = messages[messages.length - 1];

    if (!latestMessage || !latestMessage.content?.trim()) {
      return NextResponse.json({ error: "Message content cannot be empty" }, { status: 400 });
    }

    // 3. Security & Authentication Check
    const authHeader = req.headers.get("authorization");
    let token = authHeader ? authHeader.replace(/^Bearer\s+/i, "").trim() : null;
    if (token === "null" || token === "undefined" || !token) {
      token = null;
    }

    let authenticatedUserId: string | null = null;

    if (!isDemo) {
      if (!token) {
        return NextResponse.json(
          { error: "Authentication required to access the AI Career Assistant." },
          { status: 401 }
        );
      }

      const supabaseKey =
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        supabaseKey!,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        }
      );

      const { data: userData, error: authError } = await supabase.auth.getUser(token);

      if (authError) {
        const isNetworkError =
          authError.status === 0 ||
          authError.name === "AuthRetryableFetchError" ||
          authError.message?.toLowerCase().includes("fetch failed");

        if (isNetworkError) {
          console.error("[AI Chat Auth Error] Supabase Auth connection failed:", authError.message);
          return NextResponse.json(
            { error: "Unable to verify authentication session with Supabase. Please check server connectivity." },
            { status: 503 }
          );
        }

        console.warn("[AI Chat Auth Note] Invalid/expired token verification:", authError.status, authError.message);
        return NextResponse.json(
          { error: "Invalid or expired session. Please sign in again." },
          { status: 401 }
        );
      }

      if (!userData?.user) {
        return NextResponse.json(
          { error: "Invalid or expired session. Please sign in again." },
          { status: 401 }
        );
      }

      authenticatedUserId = userData.user.id;
    }

    // 4. Rate Limiting Protection (per authenticated user or demo IP)
    const rateLimitKey = authenticatedUserId || req.headers.get("x-forwarded-for") || "anon-client";
    if (!checkRateLimit(rateLimitKey, 25, 60000)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a moment before sending another message." },
        { status: 429 }
      );
    }

    // 5. Build Sanitized AI Context & Master System Prompt
    let resolvedColleges = context?.colleges || [];
    let resolvedInternships = context?.internships || [];
    let resolvedPlacements = context?.placements || [];

    if (resolvedColleges.length === 0 || resolvedInternships.length === 0 || resolvedPlacements.length === 0) {
      try {
        const serverSupabaseKey =
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        const serverSupabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serverSupabaseKey!,
          { auth: { persistSession: false, autoRefreshToken: false } }
        );

        if (resolvedColleges.length === 0) {
          const { data: dbCols } = await fetchColleges(serverSupabase);
          if (dbCols && dbCols.length > 0) {
            resolvedColleges = computeCollegeGuidance(context?.studentProfile || null, dbCols, context?.skills || []);
          }
        }

        if (resolvedInternships.length === 0) {
          const { data: dbInts } = await fetchInternships(serverSupabase, { isDemo });
          if (dbInts && dbInts.length > 0) {
            resolvedInternships = computeInternshipGuidance(context?.studentProfile || null, context?.skills || [], dbInts);
          }
        }

        if (resolvedPlacements.length === 0) {
          const { data: dbPlcs } = await fetchPlacements(serverSupabase, { isDemo });
          if (dbPlcs && dbPlcs.length > 0) {
            resolvedPlacements = computePlacementGuidance(context?.studentProfile || null, context?.skills || [], dbPlcs);
          }
        }
      } catch (colErr) {
        console.warn("Non-blocking note: could not fetch server catalog:", colErr);
      }
    }

    // Security check: If client supplied a student profile ID that does not match authenticated user, nullify it
    let safeStudentProfile = context?.studentProfile || null;
    if (authenticatedUserId && !isDemo && safeStudentProfile?.id && safeStudentProfile.id !== authenticatedUserId && !safeStudentProfile.id.startsWith("sp-demo")) {
      safeStudentProfile = null;
    }

    const sanitizedContext = buildSanitizedContext({
      profile: context?.profile || null,
      studentProfile: safeStudentProfile,
      skills: context?.skills || [],
      careerReport: context?.careerReport || null,
      skillGap: context?.skillGap || null,
      colleges: resolvedColleges,
      internships: resolvedInternships,
      placements: resolvedPlacements,
      isDemo,
    });

    const systemInstruction = buildSystemInstruction(sanitizedContext);

    // 6. Invoke AI Provider if Configured (Gemini -> OpenAI -> Grounded Fallback)
    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    const openAiKey = process.env.OPENAI_API_KEY?.trim();

    // Option A: Google Gemini
    if (geminiKey) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              system_instruction: {
                parts: [{ text: systemInstruction }],
              },
              contents: messages.map((m) => ({
                role: m.role === "user" ? "user" : "model",
                parts: [{ text: m.content }],
              })),
              generationConfig: {
                temperature: 0.35,
                maxOutputTokens: 1024,
              },
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const candidateText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidateText) {
            return NextResponse.json({
              reply: candidateText,
              provider: "gemini",
              timestamp: new Date().toISOString(),
            });
          }
        }
        console.warn("Gemini API call returned non-OK status:", geminiRes.status);
      } catch (geminiErr) {
        console.warn("Gemini provider warning, falling back to grounded responder:", geminiErr);
      }
    }

    // Option B: OpenAI
    if (openAiKey) {
      try {
        const openAiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openAiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "system", content: systemInstruction }, ...messages],
            temperature: 0.35,
            max_tokens: 1024,
          }),
        });

        if (openAiRes.ok) {
          const openAiData = await openAiRes.json();
          const replyText = openAiData?.choices?.[0]?.message?.content;
          if (replyText) {
            return NextResponse.json({
              reply: replyText,
              provider: "openai",
              timestamp: new Date().toISOString(),
            });
          }
        }
        console.warn("OpenAI API call returned non-OK status:", openAiRes.status);
      } catch (openAiErr) {
        console.warn("OpenAI provider warning, falling back to grounded responder:", openAiErr);
      }
    }

    // Option C: Precision Grounded Intelligence Responder (when external API key is pending)
    const groundedReply = generateGroundedAssistantReply(latestMessage.content, sanitizedContext, messages);

    return NextResponse.json({
      reply: groundedReply,
      provider: "edusphere-grounded-engine",
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal assistant processing error";
    console.error("AI chat route error:", msg);
    return NextResponse.json(
      { error: "An unexpected error occurred while processing your career inquiry. Please try again." },
      { status: 500 }
    );
  }
}

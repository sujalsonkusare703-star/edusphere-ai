import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildSanitizedContext, buildSystemInstruction, StudentCareerContextParams, SanitizedStudentContext } from "@/lib/ai-context";

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

// Fallback intelligent grounding engine when external LLM key is not yet configured in .env.local
function generateGroundedAssistantReply(
  userQuery: string,
  context: SanitizedStudentContext
): string {
  const q = userQuery.toLowerCase();
  const { academicProfile, skillsInventory, metrics, skillGaps, topRecommendations, studentName } = context;

  // 1. Skill Gaps / Learning Priority questions
  if (q.includes("skill") || q.includes("gap") || q.includes("learn") || q.includes("improve")) {
    const missing = skillGaps.missingHighPrioritySkills;
    const recommended = skillGaps.recommendedSkills;
    return `Hello **${studentName}**, based on your EduSphere profile and technical skills inventory:

### 🎯 Recommended Learning Priorities
Your profile currently records: **${skillsInventory.length > 0 ? skillsInventory.join(", ") : "No skills yet"}**.

${
  missing.length > 0
    ? `**High-Priority Gaps for Campus Placement & Internships:**\n${missing.map((s) => `• **${s}**: Required by multiple top recruitment drives in our database.`).join("\n")}`
    : "✅ You currently meet core prerequisite skills for your top matching opportunities!"
}

${
  recommended.length > 0
    ? `\n**Next Recommended Skills to Expand:**\n${recommended.map((s) => `• **${s}**: Highly valued in ${academicProfile.preferredBranch} roles.`).join("\n")}`
    : ""
}

### 💡 Next Action Step
Focus on closing your top missing skill (**${missing[0] || recommended[0] || "Advanced Data Structures"}**) through hands-on project work. Updating your skills in **Profile Settings** will instantly improve your match scores and placement eligibility.

> *Note: AI Career Assistant is running in data-grounded mode. Configure \`GEMINI_API_KEY\` or \`OPENAI_API_KEY\` in \`.env.local\` to activate open-ended generative conversation.*`;
  }

  // 2. Placement Eligibility questions
  if (q.includes("placement") || q.includes("eligib") || q.includes("drive") || q.includes("cgpa")) {
    const cgpa = academicProfile.cgpa;
    const eligibleCount = metrics.placementReadiness.eligibleDrives;
    const totalCount = metrics.placementReadiness.totalDrives;
    const topPlacements = topRecommendations.placements;

    return `### 🎓 Campus Placement Eligibility Overview
**Your Recorded CGPA:** **${cgpa}**

You are currently eligible for **${eligibleCount} of ${totalCount}** active campus placement recruitment drives in EduSphere.

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
    : "• No placement drives currently listed."
}

### 📈 Career Readiness Rating
- **Current Readiness Score:** **${metrics.careerReadinessScore}%** (${metrics.readinessLevel})
- **Placement Market Readiness:** **${metrics.placementReadiness.marketReadinessPct}%**

> *Note: AI Career Assistant is running in data-grounded mode. Configure \`GEMINI_API_KEY\` or \`OPENAI_API_KEY\` in \`.env.local\` to activate open-ended generative conversation.*`;
  }

  // 3. Internship Matching questions
  if (q.includes("intern") || q.includes("stipend") || q.includes("role")) {
    const topInt = topRecommendations.internships;
    return `### 💼 Personalized Internship Matching
Here is how your technical skills and background align with internships in our database:

${
  topInt.length > 0
    ? topInt
        .map(
          (i) =>
            `• **${i.role}** at **${i.company}** (Match Score: **${i.matchScore}%**)\n  - **Matching Skills:** ${
              i.matchingSkills.length > 0 ? i.matchingSkills.join(", ") : "None yet"
            }\n  - **Skills to Acquire:** ${
              i.missingSkills.length > 0 ? i.missingSkills.join(", ") : "All prerequisites met!"
            }`
        )
        .join("\n\n")
    : "• No active internship matches currently computed."
}

### 🚀 Recommendation
Review the missing skills for your top internship choice above and add them to your weekly learning schedule.

> *Note: AI Career Assistant is running in data-grounded mode. Configure \`GEMINI_API_KEY\` or \`OPENAI_API_KEY\` in \`.env.local\` to activate open-ended generative conversation.*`;
  }

  // 4. Career Roadmap / Plan questions
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

> *Note: AI Career Assistant is running in data-grounded mode. Configure \`GEMINI_API_KEY\` or \`OPENAI_API_KEY\` in \`.env.local\` to activate open-ended generative conversation.*`;
  }

  // 5. Default General Overview
  return `Hello **${studentName}**! I am your **EduSphere AI Career Guidance Assistant**.

Here is your current academic and placement intelligence summary:
- **Stream / Branch:** ${academicProfile.preferredBranch}
- **CGPA:** ${academicProfile.cgpa}
- **Career Readiness:** ${metrics.careerReadinessScore}% (${metrics.readinessLevel})
- **Placement Eligibility:** Eligible for **${metrics.placementReadiness.eligibleDrives} of ${metrics.placementReadiness.totalDrives}** drives

**How can I assist your career progression today?**
• Ask *"Why am I eligible for these placements?"*
• Ask *"What skills should I learn next?"*
• Ask *"Which internship matches my profile?"*
• Ask *"Create a career roadmap for me"*

> *Note: AI Career Assistant is running in data-grounded mode. Configure \`GEMINI_API_KEY\` or \`OPENAI_API_KEY\` in \`.env.local\` to activate open-ended generative conversation.*`;
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

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
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
    const sanitizedContext = buildSanitizedContext({
      profile: context?.profile || null,
      studentProfile: context?.studentProfile || null,
      skills: context?.skills || [],
      careerReport: context?.careerReport || null,
      skillGap: context?.skillGap || null,
      colleges: context?.colleges || [],
      internships: context?.internships || [],
      placements: context?.placements || [],
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
    const groundedReply = generateGroundedAssistantReply(latestMessage.content, sanitizedContext);

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

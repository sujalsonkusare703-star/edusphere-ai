import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { buildAssistantContext, buildAssistantInstruction, groundedReply } from "@/lib/pune/ai-context";
import { isDataLive } from "@/lib/feature-flags";
import { comingSoonResponse } from "@/lib/coming-soon";
import { rateLimit } from "@/lib/rate-limit";
import { EMPTY_ACADEMIC_PROFILE, readAcademicProfile } from "@/lib/profile-store";

// Request limits
const MAX_BODY_BYTES = 64 * 1024;
const MAX_MESSAGES = 10;
const MAX_MESSAGE_CHARS = 2000;
const RATE_LIMIT_PER_MINUTE = 20;

type ChatMessage = { role: "user" | "assistant"; content: string };

/**
 * Keeps only user/assistant messages with string content (a client cannot inject
 * a system prompt), trims each to MAX_MESSAGE_CHARS, keeps the last MAX_MESSAGES,
 * and drops leading assistant turns so the conversation starts with the user.
 */
function sanitizeMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  const cleaned: ChatMessage[] = [];
  for (const m of raw) {
    if (!m || typeof m !== "object") continue;
    const { role, content } = m as { role?: unknown; content?: unknown };
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") continue;
    const text = content.trim().slice(0, MAX_MESSAGE_CHARS);
    if (text) cleaned.push({ role, content: text });
  }
  const recent = cleaned.slice(-MAX_MESSAGES);
  while (recent.length > 0 && recent[0].role !== "user") recent.shift();
  return recent;
}

function publicSupabase(): SupabaseClient {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Please use POST to interact with the AI Career Assistant." },
    { status: 405 }
  );
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authentication: a valid Supabase session is always required.
    const authHeader = req.headers.get("authorization");
    const rawToken = authHeader?.replace(/^Bearer\s+/i, "").trim();
    const token = rawToken && rawToken !== "null" && rawToken !== "undefined" ? rawToken : null;
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required to access the AI Career Assistant." },
        { status: 401 }
      );
    }

    const supabase = publicSupabase();
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      const isNetworkError =
        authError?.status === 0 ||
        authError?.name === "AuthRetryableFetchError" ||
        authError?.message?.toLowerCase().includes("fetch failed");
      if (isNetworkError) {
        console.error("[AI Chat Auth Error] Supabase Auth connection failed:", authError?.message);
        return NextResponse.json({ error: "Unable to verify your session right now. Please try again." }, { status: 503 });
      }
      return NextResponse.json({ error: "Invalid or expired session. Please sign in again." }, { status: 401 });
    }
    const user: User = userData.user;

    // 2. While the dataset is offline, never touch college data or the AI provider.
    if (!isDataLive()) return comingSoonResponse();

    // 3. Bounded request body
    const declaredLength = Number(req.headers.get("content-length") || 0);
    if (declaredLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Request is too large." }, { status: 413 });
    }
    const rawBody = await req.text();
    if (rawBody.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Request is too large." }, { status: 413 });
    }

    let body: { messages?: unknown };
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const messages = sanitizeMessages(body.messages);
    const latestMessage = messages[messages.length - 1];
    if (!latestMessage || latestMessage.role !== "user") {
      return NextResponse.json({ error: "Message content cannot be empty" }, { status: 400 });
    }

    // 4. Shared rate limit keyed on the user id (not on spoofable headers).
    let limit;
    try {
      limit = await rateLimit(`ai-chat:${user.id}`, RATE_LIMIT_PER_MINUTE, 60);
    } catch (limitErr) {
      console.error("[AI Chat] Rate limit store error:", limitErr);
      return NextResponse.json({ error: "The AI assistant is temporarily unavailable." }, { status: 503 });
    }
    if (!limit.configured) {
      console.error("[AI Chat] No rate limit store configured (UPSTASH_REDIS_REST_URL/TOKEN); refusing AI calls.");
      return NextResponse.json({ error: "The AI assistant is temporarily unavailable." }, { status: 503 });
    }
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a moment before sending another message." },
        { status: 429, headers: { "Retry-After": String(limit.resetSeconds) } }
      );
    }

    // 5. Context is built on the server from the verified user's profile and the
    //    pune_* tables only. Nothing from the client is used except the messages.
    const academic = readAcademicProfile(user) ?? EMPTY_ACADEMIC_PROFILE;
    let context;
    try {
      context = await buildAssistantContext(
        supabase,
        messages.filter((m) => m.role === "user").map((m) => m.content),
        academic
      );
    } catch (ctxErr) {
      console.error("[AI Chat] Database lookup failed:", (ctxErr as Error).message);
      return NextResponse.json({ error: "Could not read the college database right now. Please try again." }, { status: 503 });
    }
    const systemInstruction = buildAssistantInstruction(context);

    // 6. Invoke AI provider if configured (Gemini -> OpenAI -> grounded fallback)
    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    const openAiKey = process.env.OPENAI_API_KEY?.trim();

    if (geminiKey) {
      try {
        const geminiRes = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemInstruction }] },
              contents: messages.map((m) => ({
                role: m.role === "user" ? "user" : "model",
                parts: [{ text: m.content }],
              })),
              generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const candidateText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidateText) {
            return NextResponse.json({ reply: candidateText, provider: "gemini", timestamp: new Date().toISOString() });
          }
        }
        console.warn("Gemini API call returned non-OK status:", geminiRes.status);
      } catch (geminiErr) {
        console.warn("Gemini provider warning, falling back:", geminiErr);
      }
    }

    if (openAiKey) {
      try {
        const openAiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${openAiKey}` },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "system", content: systemInstruction }, ...messages],
            temperature: 0.1,
            max_tokens: 1024,
          }),
        });

        if (openAiRes.ok) {
          const openAiData = await openAiRes.json();
          const replyText = openAiData?.choices?.[0]?.message?.content;
          if (replyText) {
            return NextResponse.json({ reply: replyText, provider: "openai", timestamp: new Date().toISOString() });
          }
        }
        console.warn("OpenAI API call returned non-OK status:", openAiRes.status);
      } catch (openAiErr) {
        console.warn("OpenAI provider warning, falling back:", openAiErr);
      }
    }

    return NextResponse.json({
      reply: groundedReply(context, latestMessage.content),
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

"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import {
  Profile,
  StudentProfile,
  RecommendationItem,
  SkillGapAnalysis,
  CareerIntelligenceReport,
} from "@/types";
import {
  Send,
  Sparkles,
  Trash2,
  AlertCircle,
  TrendingUp,
  Award,
  Briefcase,
  Zap,
  Compass,
} from "@/components/icons";
import { Logo } from "@/components/Logo";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface AICareerAssistantProps {
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

const STARTER_PROMPTS = [
  {
    icon: Award,
    title: "Placement Eligibility",
    prompt: "Why am I eligible for these placements?",
  },
  {
    icon: Zap,
    title: "Skill Priorities",
    prompt: "What skills should I learn next?",
  },
  {
    icon: TrendingUp,
    title: "Skill Gaps",
    prompt: "Explain my skill gaps",
  },
  {
    icon: Briefcase,
    title: "Placement Prep",
    prompt: "Help me prepare for placements",
  },
  {
    icon: Sparkles,
    title: "Internship Match",
    prompt: "Which internship matches my profile?",
  },
  {
    icon: Compass,
    title: "Career Roadmap",
    prompt: "Create a career roadmap for me",
  },
];

function getCurrentTimeString() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function AICareerAssistant({
  profile,
  studentProfile,
  skills,
  careerReport,
  skillGap,
  colleges = [],
  internships = [],
  placements = [],
  isDemo = false,
}: AICareerAssistantProps) {
  const { user, getAccessToken, refreshSession } = useAuth();
  const isDemoUser = isDemo || !!user?.id?.startsWith("demo-");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-msg",
      role: "assistant",
      content: "👋 Hello! I am your **EduSphere AI Career Guidance Assistant**.\n\nI have reviewed your academic profile, recorded skills, and current database opportunities. How can I assist your career progression today?\n\nSelect a starter question below or ask me anything regarding your cutoff eligibility, skill gaps, or career roadmaps.",
      timestamp: "Today",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messageCounterRef = useRef(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (customPrompt?: string) => {
    const textToSend = (customPrompt || input).trim();
    if (!textToSend || loading) return;

    setErrorMsg(null);
    setInput("");

    const userMessage: Message = {
      id: `user-${++messageCounterRef.current}`,
      role: "user",
      content: textToSend,
      timestamp: getCurrentTimeString(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      // 1. Retrieve the current access token for authenticated users
      let token: string | null = null;
      if (!isDemoUser) {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.access_token) {
          token = session.access_token;
        } else {
          token = await getAccessToken();
        }

        if (!token) {
          setErrorMsg("Please sign in to access the AI Career Assistant.");
          setLoading(false);
          return;
        }
      }

      // 2. Helper to execute the chat request
      const executeChatRequest = async (tokenToSend?: string | null) => {
        const payload = {
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          isDemo: isDemoUser,
          context: {
            profile,
            studentProfile,
            skills,
            careerReport,
            skillGap,
            colleges,
            internships,
            placements,
            isDemo: isDemoUser,
          },
        };

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (tokenToSend) {
          headers["Authorization"] = `Bearer ${tokenToSend}`;
        }

        return await fetch("/api/ai/chat", {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
      };

      // 3. Send initial request
      let res = await executeChatRequest(token);

      // 4. If server rejected with 401 (expired/invalid session), attempt token refresh & single retry
      if (res.status === 401 && !isDemoUser) {
        console.warn("[AICareerAssistant] Received 401 from /api/ai/chat. Attempting token refresh and single retry...");
        const supabase = createClient();
        const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
        const refreshedToken = refreshData?.session?.access_token || (await refreshSession())?.access_token;

        if (refreshedToken && !refreshErr) {
          token = refreshedToken;
          res = await executeChatRequest(token);
        }
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${res.status}`);
      }

      const data = await res.json();

      const assistantMessage: Message = {
        id: `ai-${++messageCounterRef.current}`,
        role: "assistant",
        content: data.reply || "I am currently unable to generate a response. Please try again.",
        timestamp: getCurrentTimeString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to communicate with the AI assistant.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    setMessages([]);
    setErrorMsg(null);
  };

  // Helper for rendering simple markdown styling (bold, bullets, linebreaks)
  const renderMessageContent = (content: string) => {
    const lines = content.split("\n");
    return (
      <div className="space-y-1.5 text-xs sm:text-sm leading-relaxed">
        {lines.map((line, idx) => {
          const trimmed = line.trim();

          // Headers
          if (trimmed.startsWith("### ")) {
            return (
              <h4 key={idx} className="font-bold text-slate-900 text-sm mt-3 mb-1">
                {trimmed.replace(/^###\s+/, "")}
              </h4>
            );
          }
          if (trimmed.startsWith("## ")) {
            return (
              <h3 key={idx} className="font-bold text-slate-950 text-base mt-3 mb-1">
                {trimmed.replace(/^##\s+/, "")}
              </h3>
            );
          }

          // Bullet point
          if (trimmed.startsWith("• ") || trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            const cleanText = trimmed.replace(/^[•\-\*]\s+/, "");
            return (
              <div key={idx} className="flex items-start gap-2 ml-1">
                <span className="text-indigo-500 font-bold">•</span>
                <span>{renderFormattedText(cleanText)}</span>
              </div>
            );
          }

          // Blockquote / Notes
          if (trimmed.startsWith("> ")) {
            return (
              <div
                key={idx}
                className="p-2.5 my-2 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 italic"
              >
                {renderFormattedText(trimmed.replace(/^>\s+/, ""))}
              </div>
            );
          }

          // Empty line
          if (!trimmed) {
            return <div key={idx} className="h-1" />;
          }

          return <p key={idx}>{renderFormattedText(line)}</p>;
        })}
      </div>
    );
  };

  // Helper to parse **bold** and `code` spans
  const renderFormattedText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-semibold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={i} className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[11px] text-indigo-700">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <div className="rounded-2xl bg-white border border-[#EAEAEA] shadow-xs overflow-hidden flex flex-col h-[700px] max-h-[80vh]">
      {/* Header Bar */}
      <div className="px-6 py-4 border-b border-[#EAEAEA] bg-slate-50/60 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-xs p-1.5 flex-shrink-0">
            <Logo variant="icon" size="sm" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">EduSphere AI Assistant</h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Engine
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Grounded in your real profile criteria and active opportunity catalog
            </p>
          </div>
        </div>

        <button
          onClick={handleClear}
          title="Clear conversation"
          className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white border border-transparent hover:border-[#EAEAEA] transition text-xs flex items-center gap-1.5"
        >
          <Trash2 className="w-4 h-4" />
          <span className="hidden sm:inline text-[11px] font-semibold">Clear</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-white/50">
        {/* Starter Prompts Carousel / Pills */}
        <div className="mb-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Suggested Career Questions:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {STARTER_PROMPTS.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleSend(item.prompt)}
                  disabled={loading}
                  className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-indigo-50/50 hover:border-indigo-200 transition text-left flex items-start gap-2.5 group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-700 group-hover:text-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold text-slate-800 block truncate group-hover:text-indigo-950">
                      {item.title}
                    </span>
                    <span className="text-[10px] text-slate-500 line-clamp-1">
                      {item.prompt}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Conversation Bubbles */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs p-1">
                <Logo variant="icon" size="xs" />
              </div>
            )}

            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 shadow-xs ${
                msg.role === "user"
                  ? "bg-slate-900 text-white rounded-br-xs"
                  : "bg-white border border-[#EAEAEA] text-slate-800 rounded-bl-xs"
              }`}
            >
              {msg.role === "user" ? (
                <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              ) : (
                renderMessageContent(msg.content)
              )}

              <span
                className={`text-[10px] block mt-2 text-right ${
                  msg.role === "user" ? "text-slate-400" : "text-slate-400"
                }`}
              >
                {msg.timestamp}
              </span>
            </div>
          </div>
        ))}

        {/* Loading / Thinking Indicator */}
        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs p-1">
              <Logo variant="icon" size="xs" />
            </div>
            <div className="p-4 rounded-2xl rounded-bl-xs bg-white border border-[#EAEAEA] shadow-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.2s]" />
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.4s]" />
              <span className="text-xs text-slate-500 font-medium ml-1">Analyzing career context...</span>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={() => handleSend()}
              className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-500 transition text-[11px]"
            >
              Retry
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form Bar */}
      <div className="p-3 sm:p-4 border-t border-[#EAEAEA] bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-end gap-2 bg-slate-50 border border-[#EAEAEA] focus-within:border-slate-400 focus-within:bg-white rounded-2xl p-2 transition shadow-xs"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Ask about placement cutoffs, skill gaps, or interview readiness..."
            disabled={loading}
            className="flex-1 bg-transparent border-0 resize-none text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden p-1.5 max-h-32 min-h-[2.5rem]"
          />

          <button
            type="submit"
            disabled={!input.trim() || loading}
            aria-label="Send message"
            className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-black text-white flex items-center justify-center flex-shrink-0 transition disabled:opacity-40 disabled:hover:bg-slate-900 shadow-xs"
          >
            <Send className="w-4 h-4 text-indigo-300" />
          </button>
        </form>
        <p className="text-[10px] text-slate-400 text-center mt-2">
          Responses are personalized using your authenticated profile and Supabase opportunity records.
        </p>
      </div>
    </div>
  );
}

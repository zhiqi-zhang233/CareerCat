"use client";

import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import cpp from "highlight.js/lib/languages/cpp";
import csharp from "highlight.js/lib/languages/csharp";
import css from "highlight.js/lib/languages/css";
import go from "highlight.js/lib/languages/go";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import python from "highlight.js/lib/languages/python";
import r from "highlight.js/lib/languages/r";
import rust from "highlight.js/lib/languages/rust";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Header from "@/components/Header";
import { fetchUserJobs, sendCoachChat } from "@/lib/api";
import type {
  AgentAssistResponse,
  CoachMessage,
  CoachMode,
  JobPost,
} from "@/lib/types";
import { useLocalUserId } from "@/lib/useLocalUserId";

type CoachSession = {
  id: string;
  title: string;
  mode: CoachMode;
  subtype?: string;
  job_id?: string;
  focus_topic?: string;
  messages: CoachMessage[];
  created_at: string;
  updated_at: string;
};

type JobsResponse = {
  jobs?: JobPost[];
};

const MODE_LABELS: Record<CoachMode, string> = {
  gap_analysis: "Resume and Job Gap",
  mock_interview: "Mock Interview",
  written_practice: "Written Assessment",
};

const CODE_LANGUAGES = [
  "bash",
  "cpp",
  "csharp",
  "css",
  "go",
  "java",
  "javascript",
  "json",
  "python",
  "r",
  "rust",
  "sql",
  "typescript",
  "xml",
  "yaml",
];

const LANGUAGE_ALIASES: Record<string, string> = {
  c: "cpp",
  "c++": "cpp",
  cs: "csharp",
  csharp: "csharp",
  html: "xml",
  js: "javascript",
  jsx: "javascript",
  py: "python",
  sh: "bash",
  shell: "bash",
  ts: "typescript",
  tsx: "typescript",
  yml: "yaml",
  zsh: "bash",
};

hljs.registerLanguage("bash", bash);
hljs.registerLanguage("cpp", cpp);
hljs.registerLanguage("csharp", csharp);
hljs.registerLanguage("css", css);
hljs.registerLanguage("go", go);
hljs.registerLanguage("java", java);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("json", json);
hljs.registerLanguage("python", python);
hljs.registerLanguage("r", r);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("yaml", yaml);

export default function CoachPage() {
  const userId = useLocalUserId();
  const [sessions, setSessions] = useState<CoachSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState("");
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [mode, setMode] = useState<CoachMode>("gap_analysis");
  const [subtype, setSubtype] = useState("technical");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [focusTopic, setFocusTopic] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) || null,
    [activeSessionId, sessions]
  );

  const storageKey = userId ? `careercat_coach_sessions_${userId}` : "";

  useEffect(() => {
    if (!userId) return;

    const raw = window.localStorage.getItem(`careercat_coach_sessions_${userId}`);
    if (!raw) {
      setSessions([]);
      setActiveSessionId("");
      return;
    }

    try {
      const parsed = JSON.parse(raw) as CoachSession[];
      setSessions(parsed);
      setActiveSessionId(parsed[0]?.id || "");
    } catch {
      window.localStorage.removeItem(`careercat_coach_sessions_${userId}`);
      setSessions([]);
      setActiveSessionId("");
    }
  }, [userId]);

  useEffect(() => {
    if (!storageKey) return;
    window.localStorage.setItem(storageKey, JSON.stringify(sessions));
  }, [sessions, storageKey]);

  useEffect(() => {
    const raw = window.localStorage.getItem("careercat_last_agent_decision");
    if (!raw) return;

    try {
      const decision = JSON.parse(raw) as AgentAssistResponse;
      if (decision.route !== "/coach") return;

      const args = decision.tool_args || {};
      if (
        args.mode === "gap_analysis" ||
        args.mode === "mock_interview" ||
        args.mode === "written_practice"
      ) {
        setMode(args.mode);
      }
      if (typeof args.subtype === "string") {
        setSubtype(args.subtype);
      }
      if (typeof args.focus_topic === "string") {
        setFocusTopic(args.focus_topic);
      }
    } catch {
      window.localStorage.removeItem("careercat_last_agent_decision");
    }
  }, []);

  const loadJobs = useCallback(async () => {
    if (!userId) return;

    try {
      const data = (await fetchUserJobs(userId)) as JobsResponse;
      const savedJobs = data.jobs || [];
      setJobs(savedJobs);
      setSelectedJobId((current) => current || savedJobs[0]?.job_id || "");
    } catch (loadError) {
      console.error(loadError);
      setError("Failed to load dashboard jobs.");
    }
  }, [userId]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const saveSession = (nextSession: CoachSession) => {
    setSessions((currentSessions) => {
      const withoutCurrent = currentSessions.filter(
        (session) => session.id !== nextSession.id
      );
      return [nextSession, ...withoutCurrent];
    });
    setActiveSessionId(nextSession.id);
  };

  const startSession = async () => {
    if (!userId) {
      setError("Local account is still loading. Please try again.");
      return;
    }

    if (mode === "gap_analysis" && !selectedJobId) {
      setError("Choose a dashboard job for gap analysis.");
      return;
    }

    if (mode !== "gap_analysis" && !focusTopic.trim()) {
      setError("Add a focus topic before starting.");
      return;
    }

    const selectedJob = jobs.find((job) => job.job_id === selectedJobId);
    const now = new Date().toISOString();
    const title =
      mode === "gap_analysis"
        ? `Gap: ${selectedJob?.title || "Selected job"}`
        : `${MODE_LABELS[mode]}: ${focusTopic}`;
    const openingMessage = buildOpeningMessage(
      mode,
      subtype,
      selectedJob,
      focusTopic
    );

    const nextSession: CoachSession = {
      id: crypto.randomUUID(),
      title,
      mode,
      subtype: mode === "mock_interview" ? subtype : undefined,
      job_id: mode === "gap_analysis" ? selectedJobId : undefined,
      focus_topic: mode === "gap_analysis" ? selectedJob?.title : focusTopic,
      messages: [{ role: "user", content: openingMessage }],
      created_at: now,
      updated_at: now,
    };

    saveSession(nextSession);
    await requestCoachReply(nextSession);
  };

  const requestCoachReply = async (session: CoachSession) => {
    if (!userId) return;

    try {
      setLoading(true);
      setError("");

      const data = await sendCoachChat({
        user_id: userId,
        mode: session.mode,
        subtype: session.subtype,
        job_id: session.job_id,
        focus_topic: session.focus_topic,
        messages: session.messages,
      });

      const updatedSession: CoachSession = {
        ...session,
        messages: [
          ...session.messages,
          { role: "assistant", content: data.reply },
        ],
        updated_at: new Date().toISOString(),
      };

      saveSession(updatedSession);
    } catch (chatError) {
      console.error(chatError);
      setError("Coach failed to respond. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!activeSession || !draft.trim()) return;

    const updatedSession: CoachSession = {
      ...activeSession,
      messages: [
        ...activeSession.messages,
        { role: "user", content: draft.trim() },
      ],
      updated_at: new Date().toISOString(),
    };

    setDraft("");
    saveSession(updatedSession);
    await requestCoachReply(updatedSession);
  };

  const deleteSession = (sessionId: string) => {
    setSessions((currentSessions) => {
      const nextSessions = currentSessions.filter(
        (session) => session.id !== sessionId
      );
      if (activeSessionId === sessionId) {
        setActiveSessionId(nextSessions[0]?.id || "");
      }
      return nextSessions;
    });
  };

  return (
    <main className="min-h-screen bg-[#011A55] text-white">
      <Header />

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-10 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[#FFB238]">Coach History</h2>
            <button
              type="button"
              onClick={() => setActiveSessionId("")}
              className="rounded-lg border border-[#FFB238]/40 px-3 py-1 text-xs text-[#FFB238] hover:bg-white/10"
            >
              New
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {sessions.length === 0 ? (
              <p className="text-sm leading-6 text-slate-400">
                Past chats will appear here on this browser.
              </p>
            ) : (
              sessions.map((session) => (
                <button
                  type="button"
                  key={session.id}
                  onClick={() => setActiveSessionId(session.id)}
                  className={`w-full rounded-lg border p-3 text-left transition ${
                    activeSessionId === session.id
                      ? "border-[#FFB238]/50 bg-[#FFB238]/10"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <p className="line-clamp-2 text-sm font-medium text-white">
                    {session.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {MODE_LABELS[session.mode]}
                  </p>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="min-h-[720px] rounded-lg border border-white/10 bg-white/5">
          {!activeSession ? (
            <div className="p-6">
              <p className="text-sm font-medium text-[#FFB238]">
                AI Career Coach
              </p>
              <h1 className="mt-3 text-4xl font-bold text-[#FFB238]">
                Start a Coaching Session
              </h1>
              <p className="mt-4 max-w-3xl text-slate-300">
                Choose your goal. CareerCat can compare your resume with a saved
                job, run technical or behavioral interview simulations, or train
                you for written assessments.
              </p>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <ModeCard
                  active={mode === "gap_analysis"}
                  title="Resume and Job Gap"
                  body="Improve resume positioning and close skill gaps for a saved job."
                  onClick={() => setMode("gap_analysis")}
                />
                <ModeCard
                  active={mode === "mock_interview"}
                  title="Mock Interview"
                  body="Practice technical or behavioral interviews one question at a time."
                  onClick={() => setMode("mock_interview")}
                />
                <ModeCard
                  active={mode === "written_practice"}
                  title="Written Assessment"
                  body="Train on skills, concepts, and written coding or analytics tasks."
                  onClick={() => setMode("written_practice")}
                />
              </div>

              <div className="mt-8 rounded-lg border border-white/10 bg-white/5 p-5">
                {mode === "gap_analysis" && (
                  <label className="text-sm text-slate-300">
                    Choose a Dashboard job
                    <select
                      className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 p-3 text-white focus:outline-none"
                      value={selectedJobId}
                      onChange={(event) => setSelectedJobId(event.target.value)}
                    >
                      {jobs.length === 0 ? (
                        <option value="">No saved jobs yet</option>
                      ) : (
                        jobs.map((job) => (
                          <option key={job.job_id} value={job.job_id}>
                            {job.title} · {job.company || "Unknown company"}
                          </option>
                        ))
                      )}
                    </select>
                  </label>
                )}

                {mode === "mock_interview" && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="text-sm text-slate-300">
                      Interview type
                      <select
                        className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 p-3 text-white focus:outline-none"
                        value={subtype}
                        onChange={(event) => setSubtype(event.target.value)}
                      >
                        <option value="technical">Technical</option>
                        <option value="behavioral">Behavioral</option>
                      </select>
                    </label>

                    <label className="text-sm text-slate-300">
                      Focus
                      <input
                        className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 p-3 text-white placeholder-slate-400 focus:outline-none"
                        placeholder="Python, SQL, ML systems, STAR stories..."
                        value={focusTopic}
                        onChange={(event) => setFocusTopic(event.target.value)}
                      />
                    </label>
                  </div>
                )}

                {mode === "written_practice" && (
                  <label className="text-sm text-slate-300">
                    Skill or topic
                    <input
                      className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 p-3 text-white placeholder-slate-400 focus:outline-none"
                      placeholder="SQL joins, pandas, statistics, algorithms..."
                      value={focusTopic}
                      onChange={(event) => setFocusTopic(event.target.value)}
                    />
                  </label>
                )}

                <button
                  type="button"
                  onClick={startSession}
                  disabled={loading}
                  className="mt-5 rounded-lg bg-[#FFB238] px-5 py-3 font-semibold text-[#011A55] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Starting..." : "Start Chat"}
                </button>
              </div>

              {error && <ErrorBox message={error} />}
            </div>
          ) : (
            <div className="flex min-h-[720px] flex-col">
              <div className="border-b border-white/10 p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs uppercase text-slate-400">
                      {MODE_LABELS[activeSession.mode]}
                    </p>
                    <h1 className="mt-1 text-2xl font-bold text-[#FFB238]">
                      {activeSession.title}
                    </h1>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteSession(activeSession.id)}
                    className="rounded-lg border border-red-300/40 px-3 py-2 text-sm text-red-100 hover:bg-red-500/10"
                  >
                    Delete Chat
                  </button>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                {activeSession.messages.map((message, index) => (
                  <MessageBubble
                    key={`${message.role}-${index}`}
                    message={message}
                  />
                ))}
                {loading && (
                  <div className="rounded-lg border border-[#FFB238]/30 bg-[#FFB238]/10 p-4 text-sm text-[#FFB238]">
                    Coach is thinking...
                  </div>
                )}
              </div>

              {error && <ErrorBox message={error} />}

              <div className="border-t border-white/10 p-5">
                <textarea
                  className="min-h-28 w-full rounded-lg border border-white/10 bg-white/10 p-4 text-white placeholder-slate-400 focus:outline-none"
                  placeholder="Answer the question, ask for a hint, or request another practice problem..."
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                />
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={sendMessage}
                    disabled={loading || !draft.trim()}
                    className="rounded-lg bg-[#FFB238] px-5 py-3 font-semibold text-[#011A55] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function buildOpeningMessage(
  mode: CoachMode,
  subtype: string,
  job?: JobPost,
  focusTopic?: string
) {
  if (mode === "gap_analysis") {
    return `Analyze my resume/profile against this saved job: ${job?.title || ""}. Please tell me how to improve my resume and which skills I need to close.`;
  }

  if (mode === "mock_interview") {
    if (subtype === "behavioral") {
      return `Start a behavioral mock interview focused on ${focusTopic}. Ask one question at a time and score my answers.`;
    }
    return `Start a technical mock interview focused on ${focusTopic}. Ask one technical question at a time, score my answer, and move to the next question when I am ready.`;
  }

  return `Start written assessment training for ${focusTopic}. Teach the key concept, give me a practice problem, and coach me through my answer.`;
}

function ModeCard({
  active,
  title,
  body,
  onClick,
}: {
  active: boolean;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border p-5 text-left transition hover:-translate-y-0.5 ${
        active
          ? "border-[#FFB238]/60 bg-[#FFB238]/10"
          : "border-white/10 bg-white/5 hover:bg-white/10"
      }`}
    >
      <h3 className="font-semibold text-[#FFB238]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
    </button>
  );
}

function MessageBubble({ message }: { message: CoachMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-3xl rounded-lg border p-4 text-sm leading-6 ${
          isUser
            ? "whitespace-pre-wrap border-[#FFB238]/40 bg-[#FFB238]/10 text-white"
            : "border-white/10 bg-white/10 text-slate-100"
        }`}
      >
        {isUser ? message.content : <CoachMarkdown content={message.content} />}
      </div>
    </div>
  );
}

type MarkdownBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "ordered"; items: string[] }
  | { type: "unordered"; items: string[] }
  | { type: "quote"; text: string }
  | { type: "rule" }
  | { type: "code"; language: string; text: string };

function CoachMarkdown({ content }: { content: string }) {
  const blocks = parseMarkdownBlocks(content);

  return (
    <div className="space-y-3">
      {blocks.map((block, blockIndex) => {
        if (block.type === "heading") {
          return (
            <HeadingTag
              key={`${block.type}-${blockIndex}`}
              level={block.level}
              className={headingClassName(block.level)}
            >
              {renderInline(block.text)}
            </HeadingTag>
          );
        }

        if (block.type === "rule") {
          return (
            <hr
              key={`${block.type}-${blockIndex}`}
              className="my-4 border-t border-white/15"
            />
          );
        }

        if (block.type === "quote") {
          return (
            <blockquote
              key={`${block.type}-${blockIndex}`}
              className="border-l-2 border-[#FFB238]/60 pl-4 text-slate-300"
            >
              {renderInline(block.text)}
            </blockquote>
          );
        }

        if (block.type === "ordered") {
          return (
            <ol
              key={`${block.type}-${blockIndex}`}
              className="list-decimal space-y-1 pl-5 text-slate-100"
            >
              {block.items.map((item, itemIndex) => (
                <li key={`${blockIndex}-${itemIndex}`}>{renderInline(item)}</li>
              ))}
            </ol>
          );
        }

        if (block.type === "unordered") {
          return (
            <ul
              key={`${block.type}-${blockIndex}`}
              className="list-disc space-y-1 pl-5 text-slate-100"
            >
              {block.items.map((item, itemIndex) => (
                <li key={`${blockIndex}-${itemIndex}`}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }

        if (block.type === "code") {
          return <CodeBlock key={`${block.type}-${blockIndex}`} block={block} />;
        }

        return (
          <p key={`${block.type}-${blockIndex}`} className="text-slate-100">
            {renderInline(block.text)}
          </p>
        );
      })}
    </div>
  );
}

function parseMarkdownBlocks(content: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const paragraphLines: string[] = [];
  let activeList: { type: "ordered" | "unordered"; items: string[] } | null =
    null;
  let activeCode: { language: string; lines: string[] } | null = null;

  const flushParagraph = () => {
    if (!paragraphLines.length) return;
    blocks.push({ type: "paragraph", text: paragraphLines.join(" ") });
    paragraphLines.length = 0;
  };

  const flushList = () => {
    if (!activeList) return;
    blocks.push(activeList);
    activeList = null;
  };

  const flushCode = () => {
    if (!activeCode) return;
    blocks.push({
      type: "code",
      language: activeCode.language,
      text: activeCode.lines.join("\n").trim(),
    });
    activeCode = null;
  };

  const pushListItem = (type: "ordered" | "unordered", item: string) => {
    flushParagraph();
    if (!activeList || activeList.type !== type) {
      flushList();
      activeList = { type, items: [] };
    }
    activeList.items.push(item);
  };

  content
    .replace(/\r\n/g, "\n")
    .split("\n")
    .forEach((rawLine) => {
      if (activeCode) {
        const closingFenceIndex = rawLine.indexOf("```");
        if (closingFenceIndex >= 0) {
          activeCode.lines.push(rawLine.slice(0, closingFenceIndex));
          flushCode();
          return;
        }

        activeCode.lines.push(rawLine);
        return;
      }

      const line = rawLine.trim();
      if (!line) {
        flushList();
        flushParagraph();
        return;
      }

      if (isHorizontalRule(line)) {
        flushList();
        flushParagraph();
        blocks.push({ type: "rule" });
        return;
      }

      const codeFenceMatch = line.match(/^```([A-Za-z0-9_-]*)\s*(.*)$/);
      if (codeFenceMatch) {
        flushList();
        flushParagraph();

        const language = codeFenceMatch[1] || "";
        const firstCodeLine = codeFenceMatch[2] || "";
        const closingFenceIndex = firstCodeLine.indexOf("```");

        if (closingFenceIndex >= 0) {
          blocks.push({
            type: "code",
            language,
            text: firstCodeLine.slice(0, closingFenceIndex).trim(),
          });
          return;
        }

        activeCode = {
          language,
          lines: firstCodeLine ? [firstCodeLine] : [],
        };
        return;
      }

      const heading = parseHeading(line);
      if (heading) {
        flushList();
        flushParagraph();
        blocks.push(heading);
        return;
      }

      const quoteMatch = line.match(/^>\s*(.*)$/);
      if (quoteMatch) {
        flushList();
        flushParagraph();
        blocks.push({ type: "quote", text: quoteMatch[1] });
        return;
      }

      const orderedMatch = line.match(/^\d+[\.)]\s+(.*)$/);
      if (orderedMatch) {
        pushListItem("ordered", orderedMatch[1]);
        return;
      }

      const unorderedMatch = line.match(/^(?:[-*+]|\u2022)\s+(.*)$/);
      if (unorderedMatch) {
        pushListItem("unordered", cleanListItem(unorderedMatch[1]));
        return;
      }

      flushList();
      paragraphLines.push(line);
    });

  flushCode();
  flushList();
  flushParagraph();

  return blocks.length ? blocks : [{ type: "paragraph", text: content }];
}

function isHorizontalRule(line: string) {
  return /^([-*_])(?:\s*\1){2,}\s*$/.test(line);
}

function parseHeading(line: string): Extract<MarkdownBlock, { type: "heading" }> | null {
  const atxHeading = line.match(/^(#{1,6})\s+(.+?)\s*#*$/);
  if (atxHeading) {
    return {
      type: "heading",
      level: atxHeading[1].length,
      text: atxHeading[2].trim(),
    };
  }

  if (/^\*\*[^*]+:?\*\*$/.test(line) && line.length <= 80) {
    return {
      type: "heading",
      level: 3,
      text: line.slice(2, -2),
    };
  }

  return null;
}

function cleanListItem(text: string) {
  return text.replace(/^\[[ xX]\]\s+/, "");
}

function HeadingTag({
  level,
  className,
  children,
}: {
  level: number;
  className: string;
  children: ReactNode;
}) {
  if (level <= 1) {
    return <h2 className={className}>{children}</h2>;
  }

  if (level === 2) {
    return <h3 className={className}>{children}</h3>;
  }

  return <h4 className={className}>{children}</h4>;
}

function headingClassName(level: number) {
  if (level <= 1) {
    return "pt-2 text-lg font-semibold text-[#FFB238]";
  }

  if (level === 2) {
    return "pt-2 text-base font-semibold text-[#FFB238]";
  }

  return "pt-1 text-sm font-semibold text-[#FFB238]";
}

function CodeBlock({
  block,
}: {
  block: Extract<MarkdownBlock, { type: "code" }>;
}) {
  const highlightedCode = highlightCode(block.text, block.language);

  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-[#06143D]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <span className="text-xs uppercase tracking-wide text-slate-400">
          {highlightedCode.label}
        </span>
        {highlightedCode.detected && (
          <span className="text-xs text-slate-500">auto-detected</span>
        )}
      </div>
      <pre className="coach-code overflow-x-auto p-4 text-xs leading-6 text-slate-100">
        <code
          className="font-mono"
          dangerouslySetInnerHTML={{ __html: highlightedCode.html }}
        />
      </pre>
    </div>
  );
}

function highlightCode(text: string, language: string) {
  const normalizedLanguage = normalizeCodeLanguage(language);

  if (normalizedLanguage && hljs.getLanguage(normalizedLanguage)) {
    try {
      return {
        html: hljs.highlight(text, {
          language: normalizedLanguage,
          ignoreIllegals: true,
        }).value,
        label: formatLanguageLabel(normalizedLanguage),
        detected: false,
      };
    } catch {
      return {
        html: escapeHtml(text),
        label: formatLanguageLabel(normalizedLanguage),
        detected: false,
      };
    }
  }

  try {
    const result = hljs.highlightAuto(text, CODE_LANGUAGES);
    return {
      html: result.value,
      label: result.language ? formatLanguageLabel(result.language) : "Code",
      detected: Boolean(result.language),
    };
  } catch {
    return {
      html: escapeHtml(text),
      label: "Code",
      detected: false,
    };
  }
}

function normalizeCodeLanguage(language: string) {
  const normalized = language
    .trim()
    .toLowerCase()
    .replace(/^language-/, "");

  return LANGUAGE_ALIASES[normalized] || normalized;
}

function formatLanguageLabel(language: string) {
  const labels: Record<string, string> = {
    bash: "Bash",
    cpp: "C++",
    csharp: "C#",
    css: "CSS",
    go: "Go",
    java: "Java",
    javascript: "JavaScript",
    json: "JSON",
    python: "Python",
    r: "R",
    rust: "Rust",
    sql: "SQL",
    typescript: "TypeScript",
    xml: "HTML/XML",
    yaml: "YAML",
  };

  return labels[language] || "Code";
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderInline(text: string) {
  const normalizedText = normalizeCoachText(text);
  const parts = normalizedText.split(
    /(`[^`\n]+`|\*\*[^*]+(?:\*\*|\*)|__[^_]+__|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g
  );

  return parts.map((part, index) => {
    if (!part) return null;

    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={`${part}-${index}`}
          className="rounded border border-white/10 bg-[#06143D] px-1.5 py-0.5 font-mono text-[0.85em] text-[#FFCF7A]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    if (part.startsWith("**")) {
      return (
        <strong key={`${part}-${index}`} className="font-semibold text-white">
          {stripStrongMarkers(part, "**")}
        </strong>
      );
    }

    if (part.startsWith("__") && part.endsWith("__")) {
      return (
        <strong key={`${part}-${index}`} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={`${part}-${index}`} className="italic text-slate-100">
          {part.slice(1, -1)}
        </em>
      );
    }

    if (part.startsWith("_") && part.endsWith("_")) {
      return (
        <em key={`${part}-${index}`} className="italic text-slate-100">
          {part.slice(1, -1)}
        </em>
      );
    }

    return <span key={`${part}-${index}`}>{cleanDanglingEmphasis(part)}</span>;
  });
}

function stripStrongMarkers(text: string, marker: "**" | "__") {
  const startLength = marker.length;
  if (text.endsWith(marker)) {
    return text.slice(startLength, -startLength);
  }

  if (marker === "**" && text.endsWith("*")) {
    return text.slice(startLength, -1);
  }

  return text.slice(startLength);
}

function cleanDanglingEmphasis(text: string) {
  return text
    .replace(/(^|\s)\*\*(?=\S)/g, "$1")
    .replace(/(?<=\S)\*\*(?=\s|$)/g, "")
    .replace(/(^|\s)__(?=\S)/g, "$1")
    .replace(/(?<=\S)__(?=\s|$)/g, "");
}

function normalizeCoachText(text: string) {
  return text
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\[/g, "[")
    .replace(/\\\]/g, "]")
    .replace(/\\_/g, "_")
    .replace(/\\alpha/g, "alpha")
    .replace(/\\beta/g, "beta")
    .replace(/\\mu/g, "mu")
    .replace(/\\sigma/g, "sigma")
    .replace(/\\leq?/g, "<=")
    .replace(/\\geq?/g, ">=");
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="m-5 rounded-lg border border-red-300/30 bg-red-500/10 p-4 text-sm text-red-100">
      {message}
    </div>
  );
}

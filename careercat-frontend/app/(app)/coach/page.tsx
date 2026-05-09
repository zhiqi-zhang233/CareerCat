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
import {
  deleteCoachSession,
  fetchCoachSessions,
  fetchUserJobs,
  saveCoachSession,
  sendCoachChat,
} from "@/lib/api";
import type {
  AgentAssistResponse,
  CoachMessage,
  CoachMode,
  CoachSession,
  JobPost,
} from "@/lib/types";
import { useT } from "@/lib/i18n/LocaleProvider";
import { useLocalUserId } from "@/lib/useLocalUserId";

type JobsResponse = {
  jobs?: JobPost[];
};

type Translate = (key: string, params?: Record<string, string | number>) => string;

function readJobs(data: JobsResponse | null | undefined): JobPost[] {
  return Array.isArray(data?.jobs) ? data.jobs : [];
}

const MODE_LABEL_KEYS: Record<CoachMode, string> = {
  gap_analysis: "app.coach.modeGap",
  mock_interview: "app.coach.modeMock",
  written_practice: "app.coach.modeWritten",
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
  const t = useT();
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
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [error, setError] = useState("");

  const activeSession = useMemo(
    () =>
      sessions.find((session) => session.session_id === activeSessionId) || null,
    [activeSessionId, sessions]
  );

  const loadCoachSessions = useCallback(async () => {
    if (!userId) return;

    try {
      setSessionsLoading(true);
      const data = await fetchCoachSessions(userId);
      let nextSessions = data.sessions || [];

      if (nextSessions.length === 0) {
        nextSessions = await migrateLocalCoachSessions(userId);
      }

      setSessions(nextSessions);
      setActiveSessionId(nextSessions[0]?.session_id || "");
    } catch {
      const localSessions = await migrateLocalCoachSessions(userId);
      setSessions(localSessions);
      setActiveSessionId(localSessions[0]?.session_id || "");
    } finally {
      setSessionsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadCoachSessions();
  }, [loadCoachSessions]);

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
      const savedJobs = readJobs(data);
      setJobs(savedJobs);
      setSelectedJobId((current) => current || savedJobs[0]?.job_id || "");
    } catch {
      setJobs([]);
      setSelectedJobId("");
    }
  }, [userId]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const saveSessionLocally = (nextSession: CoachSession) => {
    setSessions((currentSessions) => {
      const withoutCurrent = currentSessions.filter(
        (session) => session.session_id !== nextSession.session_id
      );
      return [nextSession, ...withoutCurrent];
    });
    setActiveSessionId(nextSession.session_id);
  };

  const persistSession = async (nextSession: CoachSession) => {
    try {
      await saveCoachSession(nextSession);
    } catch (saveError) {
      console.error(saveError);
      setError(t("app.coach.errHistorySave"));
    }
  };

  const startSession = async () => {
    if (!userId) {
      setError(t("app.coach.errAccountLoading"));
      return;
    }

    if (mode === "gap_analysis" && !selectedJobId) {
      setError(t("app.coach.errChooseJob"));
      return;
    }

    if (mode !== "gap_analysis" && !focusTopic.trim()) {
      setError(t("app.coach.errFocusTopic"));
      return;
    }

    const selectedJob = jobs.find((job) => job.job_id === selectedJobId);
    const now = new Date().toISOString();
    const title =
      mode === "gap_analysis"
        ? t("app.coach.gapTitle", {
            title: selectedJob?.title || t("app.coach.selectedJob"),
          })
        : t("app.coach.sessionTitle", {
            mode: modeLabel(mode, t),
            topic: focusTopic,
          });
    const openingMessage = buildOpeningMessage(
      mode,
      subtype,
      selectedJob,
      focusTopic,
      t
    );

    const nextSession: CoachSession = {
      user_id: userId,
      session_id: crypto.randomUUID(),
      title,
      mode,
      subtype: mode === "mock_interview" ? subtype : undefined,
      job_id: mode === "gap_analysis" ? selectedJobId : undefined,
      focus_topic: mode === "gap_analysis" ? selectedJob?.title : focusTopic,
      messages: [{ role: "user", content: openingMessage }],
      created_at: now,
      updated_at: now,
    };

    saveSessionLocally(nextSession);
    await persistSession(nextSession);
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

      saveSessionLocally(updatedSession);
      await persistSession(updatedSession);
    } catch (chatError) {
      console.error(chatError);
      setError(t("app.coach.errRespond"));
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
    saveSessionLocally(updatedSession);
    await persistSession(updatedSession);
    await requestCoachReply(updatedSession);
  };

  const deleteSession = async (sessionId: string) => {
    if (!userId) return;

    setSessions((currentSessions) => {
      const nextSessions = currentSessions.filter(
        (session) => session.session_id !== sessionId
      );
      if (activeSessionId === sessionId) {
        setActiveSessionId(nextSessions[0]?.session_id || "");
      }
      return nextSessions;
    });

    try {
      await deleteCoachSession(userId, sessionId);
    } catch (deleteError) {
      console.error(deleteError);
      setError(t("app.coach.errHistoryDelete"));
      loadCoachSessions();
    }
  };

  return (
    <main className="min-h-screen text-[var(--color-text-primary)]">
      <Header />

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-10 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[var(--color-text-accent)]">
              {t("app.coach.history")}
            </h2>
            <button
              type="button"
              onClick={() => setActiveSessionId("")}
              className="rounded-lg border border-[var(--color-accent)]/40 px-3 py-1 text-xs text-[var(--color-text-accent)] hover:bg-[var(--color-bg-elev-2)]"
            >
              {t("app.coach.new")}
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {sessions.length === 0 ? (
              <p className="text-sm leading-6 text-[var(--color-text-muted)]">
                {sessionsLoading
                  ? t("app.coach.loadingHistory")
                  : t("app.coach.emptyHistory")}
              </p>
            ) : (
              sessions.map((session) => (
                <button
                  type="button"
                  key={session.session_id}
                  onClick={() => setActiveSessionId(session.session_id)}
                  className={`w-full rounded-lg border p-3 text-left transition ${
                    activeSessionId === session.session_id
                      ? "border-[var(--color-accent)]/50 bg-[var(--color-accent)]/10"
                      : "border-[var(--color-border)] bg-[var(--color-bg-elev-1)] hover:bg-[var(--color-bg-elev-2)]"
                  }`}
                >
                  <p className="line-clamp-2 text-sm font-medium text-[var(--color-text-primary)]">
                    {session.title}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    {modeLabel(session.mode, t)}
                  </p>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="min-h-[720px] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-1)]">
          {!activeSession ? (
            <div className="p-6">
              <p className="text-sm font-medium text-[var(--color-text-accent)]">
                {t("app.coach.eyebrow")}
              </p>
              <h1 className="mt-3 text-4xl font-bold text-[var(--color-text-accent)]">
                {t("app.coach.title")}
              </h1>
              <p className="mt-4 max-w-3xl text-[var(--color-text-secondary)]">
                {t("app.coach.subtitle")}
              </p>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <ModeCard
                  active={mode === "gap_analysis"}
                  title={t("app.coach.modeGap")}
                  body={t("app.coach.modeGapBody")}
                  onClick={() => setMode("gap_analysis")}
                />
                <ModeCard
                  active={mode === "mock_interview"}
                  title={t("app.coach.modeMock")}
                  body={t("app.coach.modeMockBody")}
                  onClick={() => setMode("mock_interview")}
                />
                <ModeCard
                  active={mode === "written_practice"}
                  title={t("app.coach.modeWritten")}
                  body={t("app.coach.modeWrittenBody")}
                  onClick={() => setMode("written_practice")}
                />
              </div>

              <div className="mt-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-5">
                {mode === "gap_analysis" && (
                  <label className="text-sm text-[var(--color-text-secondary)]">
                    {t("app.coach.chooseJob")}
                    <select
                      className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] focus:outline-none"
                      value={selectedJobId}
                      onChange={(event) => setSelectedJobId(event.target.value)}
                    >
                      {jobs.length === 0 ? (
                        <option value="">{t("app.coach.noSavedJobs")}</option>
                      ) : (
                        jobs.map((job) => (
                          <option key={job.job_id} value={job.job_id}>
                            {job.title} · {job.company || t("app.coach.unknownCompany")}
                          </option>
                        ))
                      )}
                    </select>
                  </label>
                )}

                {mode === "mock_interview" && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="text-sm text-[var(--color-text-secondary)]">
                      {t("app.coach.interviewType")}
                      <select
                        className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] focus:outline-none"
                        value={subtype}
                        onChange={(event) => setSubtype(event.target.value)}
                      >
                        <option value="technical">{t("app.coach.technical")}</option>
                        <option value="behavioral">{t("app.coach.behavioral")}</option>
                      </select>
                    </label>

                    <label className="text-sm text-[var(--color-text-secondary)]">
                      {t("app.coach.focus")}
                      <input
                        className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
                        placeholder={t("app.coach.focusPlaceholder")}
                        value={focusTopic}
                        onChange={(event) => setFocusTopic(event.target.value)}
                      />
                    </label>
                  </div>
                )}

                {mode === "written_practice" && (
                  <label className="text-sm text-[var(--color-text-secondary)]">
                    {t("app.coach.skillTopic")}
                    <input
                      className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
                      placeholder={t("app.coach.skillPlaceholder")}
                      value={focusTopic}
                      onChange={(event) => setFocusTopic(event.target.value)}
                    />
                  </label>
                )}

                <button
                  type="button"
                  onClick={startSession}
                  disabled={loading}
                  className="mt-5 rounded-lg bg-[var(--color-accent)] px-5 py-3 font-semibold text-[#011A55] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? t("app.coach.starting") : t("app.coach.startChat")}
                </button>
              </div>

              {error && <ErrorBox message={error} />}
            </div>
          ) : (
            <div className="flex min-h-[720px] flex-col">
              <div className="border-b border-[var(--color-border)] p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs uppercase text-[var(--color-text-muted)]">
                      {modeLabel(activeSession.mode, t)}
                    </p>
                    <h1 className="mt-1 text-2xl font-bold text-[var(--color-text-accent)]">
                      {activeSession.title}
                    </h1>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteSession(activeSession.session_id)}
                    className="rounded-lg border border-[var(--color-danger-border)] px-3 py-2 text-sm text-[var(--color-danger-text)] hover:bg-[var(--color-danger-bg)]"
                  >
                    {t("app.coach.deleteChat")}
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
                  <div className="rounded-lg border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 p-4 text-sm text-[var(--color-text-accent)]">
                    {t("app.coach.thinking")}
                  </div>
                )}
              </div>

              {error && <ErrorBox message={error} />}

              <div className="border-t border-[var(--color-border)] p-5">
                <textarea
                  className="min-h-28 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-4 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
                  placeholder={t("app.coach.replyPlaceholder")}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                />
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={sendMessage}
                    disabled={loading || !draft.trim()}
                    className="rounded-lg bg-[var(--color-accent)] px-5 py-3 font-semibold text-[#011A55] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {t("app.coach.send")}
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
  focusTopic?: string,
  t?: Translate
) {
  if (mode === "gap_analysis") {
    return (t || fallbackT)("app.coach.openingGap", {
      title: job?.title || "",
    });
  }

  if (mode === "mock_interview") {
    if (subtype === "behavioral") {
      return (t || fallbackT)("app.coach.openingBehavioral", {
        topic: focusTopic || "",
      });
    }
    return (t || fallbackT)("app.coach.openingTechnical", {
      topic: focusTopic || "",
    });
  }

  return (t || fallbackT)("app.coach.openingWritten", {
    topic: focusTopic || "",
  });
}

function modeLabel(mode: CoachMode, t: Translate) {
  return t(MODE_LABEL_KEYS[mode]);
}

function fallbackT(key: string, params?: Record<string, string | number>) {
  const fallbacks: Record<string, string> = {
    "app.coach.openingGap":
      "Analyze my resume/profile against this saved job: {title}. Please tell me how to improve my resume and which skills I need to close.",
    "app.coach.openingBehavioral":
      "Start a behavioral mock interview focused on {topic}. Ask one question at a time and score my answers.",
    "app.coach.openingTechnical":
      "Start a technical mock interview focused on {topic}. Ask one technical question at a time, score my answer, and move to the next question when I am ready.",
    "app.coach.openingWritten":
      "Start written assessment training for {topic}. Teach the key concept, give me a practice problem, and coach me through my answer.",
  };
  const template = fallbacks[key] || key;
  return template.replace(/\{(\w+)\}/g, (match, name) => {
    const value = params?.[name];
    return value === undefined || value === null ? match : String(value);
  });
}

async function migrateLocalCoachSessions(userId: string) {
  const storageKey = `careercat_coach_sessions_${userId}`;
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as Array<
      Partial<CoachSession> & { id?: string }
    >;

    if (!Array.isArray(parsed)) return [];

    const sessions = parsed
      .map((session) => normalizeCoachSession(userId, session))
      .filter((session): session is CoachSession => Boolean(session));

    const migrationResults = await Promise.allSettled(
      sessions.map((session) => saveCoachSession(session))
    );
    if (migrationResults.every((result) => result.status === "fulfilled")) {
      window.localStorage.removeItem(storageKey);
    }

    return sessions.sort((first, second) =>
      (second.updated_at || second.created_at || "").localeCompare(
        first.updated_at || first.created_at || ""
      )
    );
  } catch {
    return [];
  }
}

function normalizeCoachSession(
  userId: string,
  session: Partial<CoachSession> & { id?: string }
): CoachSession | null {
  if (!session.title || !session.mode) return null;

  const now = new Date().toISOString();
  const messages = Array.isArray(session.messages)
    ? session.messages.filter(
        (message): message is CoachMessage =>
          (message.role === "user" || message.role === "assistant") &&
          typeof message.content === "string"
      )
    : [];

  return {
    user_id: userId,
    session_id: session.session_id || session.id || crypto.randomUUID(),
    title: session.title,
    mode: session.mode,
    subtype: session.subtype,
    job_id: session.job_id,
    focus_topic: session.focus_topic,
    messages,
    created_at: session.created_at || now,
    updated_at: session.updated_at || session.created_at || now,
  };
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
          ? "border-[var(--color-accent)]/60 bg-[var(--color-accent)]/10"
          : "border-[var(--color-border)] bg-[var(--color-bg-elev-1)] hover:bg-[var(--color-bg-elev-2)]"
      }`}
    >
      <h3 className="font-semibold text-[var(--color-text-accent)]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{body}</p>
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
            ? "whitespace-pre-wrap border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 text-[var(--color-text-primary)]"
            : "border-[var(--color-border)] bg-[var(--color-bg-elev-2)] text-[var(--color-text-primary)]"
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
              className="my-4 border-t border-[var(--color-border)]"
            />
          );
        }

        if (block.type === "quote") {
          return (
            <blockquote
              key={`${block.type}-${blockIndex}`}
              className="border-l-2 border-[var(--color-accent)]/60 pl-4 text-[var(--color-text-secondary)]"
            >
              {renderInline(block.text)}
            </blockquote>
          );
        }

        if (block.type === "ordered") {
          return (
            <ol
              key={`${block.type}-${blockIndex}`}
              className="list-decimal space-y-1 pl-5 text-[var(--color-text-primary)]"
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
              className="list-disc space-y-1 pl-5 text-[var(--color-text-primary)]"
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
          <p key={`${block.type}-${blockIndex}`} className="text-[var(--color-text-primary)]">
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
    return "pt-2 text-lg font-semibold text-[var(--color-text-accent)]";
  }

  if (level === 2) {
    return "pt-2 text-base font-semibold text-[var(--color-text-accent)]";
  }

  return "pt-1 text-sm font-semibold text-[var(--color-text-accent)]";
}

function CodeBlock({
  block,
}: {
  block: Extract<MarkdownBlock, { type: "code" }>;
}) {
  const t = useT();
  const highlightedCode = highlightCode(
    block.text,
    block.language,
    t("app.coach.code")
  );

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[#06143D]">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2">
        <span className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
          {highlightedCode.label}
        </span>
        {highlightedCode.detected && (
          <span className="text-xs text-[var(--color-text-muted)]">
            {t("app.coach.autoDetected")}
          </span>
        )}
      </div>
      <pre className="coach-code overflow-x-auto p-4 text-xs leading-6 text-[var(--color-text-primary)]">
        <code
          className="font-mono"
          dangerouslySetInnerHTML={{ __html: highlightedCode.html }}
        />
      </pre>
    </div>
  );
}

function highlightCode(text: string, language: string, codeLabel: string) {
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
      label: result.language ? formatLanguageLabel(result.language) : codeLabel,
      detected: Boolean(result.language),
    };
  } catch {
    return {
      html: escapeHtml(text),
      label: codeLabel,
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

  return labels[language] || language;
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
          className="rounded border border-[var(--color-border)] bg-[#06143D] px-1.5 py-0.5 font-mono text-[0.85em] text-[#FFCF7A]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    if (part.startsWith("**")) {
      return (
        <strong key={`${part}-${index}`} className="font-semibold text-[var(--color-text-primary)]">
          {stripStrongMarkers(part, "**")}
        </strong>
      );
    }

    if (part.startsWith("__") && part.endsWith("__")) {
      return (
        <strong key={`${part}-${index}`} className="font-semibold text-[var(--color-text-primary)]">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={`${part}-${index}`} className="italic text-[var(--color-text-primary)]">
          {part.slice(1, -1)}
        </em>
      );
    }

    if (part.startsWith("_") && part.endsWith("_")) {
      return (
        <em key={`${part}-${index}`} className="italic text-[var(--color-text-primary)]">
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
    <div className="m-5 rounded-lg border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-4 text-sm text-[var(--color-danger-text)]">
      {message}
    </div>
  );
}

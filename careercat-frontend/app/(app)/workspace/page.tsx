"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import {
  createProfile,
  deleteWorkflowHistory,
  fetchProfile,
  fetchWorkflowHistory,
  parseResume,
  parseResumeFile,
  sendAgentAssist,
  saveWorkflowHistory,
  updateProfile,
} from "@/lib/api";
import type {
  AgentAssistResponse,
  ParsedResumeResponse,
  UserProfile,
  WorkflowChatMessage,
  WorkflowHistoryEntry,
  WorkflowStage,
} from "@/lib/types";
import { useLocalUserId } from "@/lib/useLocalUserId";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const HOME_ROUTES = new Set(["/", "/workspace"]);
const INTERNAL_STAGE_HINTS = [
  "clarify",
  "understand",
  "choose",
  "理解",
  "明确",
  "选择",
];

type ChatMessage = WorkflowChatMessage;

export default function Workspace() {
  const { locale, t } = useLocale();
  const userId = useLocalUserId();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [plan, setPlan] = useState<AgentAssistResponse | null>(null);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [workflowHistory, setWorkflowHistory] = useState<WorkflowHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [resumeUploadMessage, setResumeUploadMessage] = useState("");
  const [profileAvailable, setProfileAvailable] = useState(false);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(
    () => new Set()
  );
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const STARTERS = useMemo(
    () => [
      t("app.workspace.starter1"),
      t("app.workspace.starter2"),
      t("app.workspace.starter3"),
      t("app.workspace.starter4"),
      t("app.workspace.starter5"),
    ],
    [t]
  );

  const hasConversation = messages.length > 0;
  const rotatingPlaceholder = hasConversation
    ? t("app.workspace.chatFollowupPlaceholder")
    : STARTERS[placeholderIndex % STARTERS.length] || t("app.workspace.goalPlaceholder");

  useEffect(() => {
    if (hasConversation) return;
    const timer = window.setInterval(() => {
      setPlaceholderIndex((index) => index + 1);
    }, 2800);
    return () => window.clearInterval(timer);
  }, [hasConversation]);

  useEffect(() => {
    if (!userId) return;
    const loadHistory = async () => {
      try {
        const data = await fetchWorkflowHistory(userId);
        setWorkflowHistory(sortWorkflowHistory(data.workflows || []));
      } catch (historyError) {
        console.error(historyError);
        setWorkflowHistory([]);
      }
    };
    loadHistory();
  }, [userId]);

  const actionableStages = useMemo(() => {
    return buildActionableStages(
      plan,
      profileAvailable,
      locale,
      completedTaskIds
    );
  }, [completedTaskIds, locale, plan, profileAvailable]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const loadProfile = async () => {
      try {
        const profile = (await fetchProfile(userId)) as UserProfile;
        if (!cancelled) setProfileAvailable(Boolean(profile.resume_text?.trim()));
      } catch {
        if (!cancelled) setProfileAvailable(false);
      }
    };
    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const currentStage = useMemo(() => {
    if (!plan) return null;
    const firstOpenAction = actionableStages.find(
      (stage) => !completedTaskIds.has(stage.id)
    );
    if (firstOpenAction) return firstOpenAction;
    return (
      actionableStages.find((stage) => stage.id === plan.current_stage_id) ||
      actionableStages.find((stage) => stage.status === "ready") ||
      actionableStages[0] ||
      null
    );
  }, [actionableStages, completedTaskIds, plan]);

  const canContinue = Boolean(
    currentStage && !HOME_ROUTES.has(currentStage.route)
  );

  const profileTask = actionableStages.find((stage) => stage.route === "/profile");
  const showResumeUploadCard = Boolean(
    profileTask && !completedTaskIds.has(profileTask.id)
  );
  const showResumeNextActions = Boolean(
    profileTask && completedTaskIds.has(profileTask.id)
  );

  const startNewWorkflow = () => {
    setMessage("");
    setMessages([]);
    setPlan(null);
    setWorkflowId(null);
    setError("");
    setNotice("");
    setResumeUploadMessage("");
    setCompletedTaskIds(new Set());
    setPlaceholderIndex(0);
  };

  const persistWorkflow = async (entry: WorkflowHistoryEntry) => {
    if (!userId) return;
    try {
      const data = await saveWorkflowHistory(entry);
      const saved = data.workflow as WorkflowHistoryEntry;
      setWorkflowHistory((items) =>
        sortWorkflowHistory([
          saved,
          ...items.filter((item) => item.workflow_id !== saved.workflow_id),
        ])
      );
    } catch (historyError) {
      console.error(historyError);
    }
  };

  const restoreWorkflow = (entry: WorkflowHistoryEntry) => {
    setWorkflowId(entry.workflow_id);
    setMessages(entry.messages);
    setPlan(entry.plan);
    setCompletedTaskIds(new Set(entry.completed_task_ids));
    setMessage("");
    setError("");
    setNotice("");
    setResumeUploadMessage("");
    storePlan(entry.plan);
  };

  const deleteWorkflow = async (entry: WorkflowHistoryEntry) => {
    if (!userId) return;
    if (!window.confirm(t("app.workspace.historyDeleteConfirm"))) return;
    try {
      await deleteWorkflowHistory(userId, entry.workflow_id);
      setWorkflowHistory((items) =>
        items.filter((item) => item.workflow_id !== entry.workflow_id)
      );
      if (workflowId === entry.workflow_id) {
        startNewWorkflow();
      }
    } catch (historyError) {
      console.error(historyError);
    }
  };

  const runPlanner = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!userId) {
      setError(t("app.workspace.errorAccountLoading"));
      return;
    }
    const prompt = message.trim();
    if (!prompt) {
      setError(t("app.workspace.errorEmptyMessage"));
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: prompt,
    };
    const baseMessages = [...messages, userMessage];
    const nextWorkflowId = workflowId || createWorkflowId();
    setWorkflowId(nextWorkflowId);
    setMessages(baseMessages);
    setMessage("");

    try {
      setLoading(true);
      setError("");
      setNotice("");
      setResumeUploadMessage("");
      setCompletedTaskIds(new Set());
      const data = (await sendAgentAssist({
        user_id: userId,
        message: prompt,
        current_page: "/workspace",
        locale,
      })) as AgentAssistResponse;
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: formatAssistantMessage(data),
        plan: data,
      };
      const nextMessages = [...baseMessages, assistantMessage];
      const nextCompleted = new Set<string>();
      setPlan(data);
      storePlan(data);
      setMessages(nextMessages);
      void persistWorkflow(
        createHistoryEntry({
          userId,
          id: nextWorkflowId,
          previous: workflowHistory.find((item) => item.workflow_id === nextWorkflowId),
          prompt,
          messages: nextMessages,
          plan: data,
          completedTaskIds: nextCompleted,
        })
      );
    } catch (agentError) {
      console.error(agentError);
      const fallbackPlan = buildLocalHarnessPlan(prompt, locale);
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: formatAssistantMessage(fallbackPlan),
        plan: fallbackPlan,
      };
      const nextMessages = [...baseMessages, assistantMessage];
      const nextCompleted = new Set<string>();
      setPlan(fallbackPlan);
      storePlan(fallbackPlan);
      setCompletedTaskIds(nextCompleted);
      setNotice(t("app.workspace.localFallbackNotice"));
      setMessages(nextMessages);
      void persistWorkflow(
        createHistoryEntry({
          userId,
          id: nextWorkflowId,
          previous: workflowHistory.find((item) => item.workflow_id === nextWorkflowId),
          prompt,
          messages: nextMessages,
          plan: fallbackPlan,
          completedTaskIds: nextCompleted,
        })
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResumeUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !userId || !profileTask) return;

    const lowerName = file.name.toLowerCase();
    const allowed = [".txt", ".pdf", ".docx"];
    if (!allowed.some((ext) => lowerName.endsWith(ext))) {
      setResumeUploadMessage(t("app.workspace.resumeUploadTypeError"));
      return;
    }

    try {
      setUploadingResume(true);
      setResumeUploadMessage("");
      const parsed = lowerName.endsWith(".txt")
        ? ((await parseResume(userId, await file.text())) as ParsedResumeResponse)
        : ((await parseResumeFile(userId, file)) as ParsedResumeResponse);
      await saveParsedProfile(userId, parsed);
      setProfileAvailable(true);
      const nextCompleted = new Set(completedTaskIds);
      nextCompleted.add(profileTask.id);
      setCompletedTaskIds(nextCompleted);
      const nextMessages = [
        ...messages,
        {
          id: `assistant-profile-${Date.now()}`,
          role: "assistant" as const,
          content: t("app.workspace.resumeParsedMessage"),
        },
      ];
      setMessages(nextMessages);
      if (plan && workflowId) {
        void persistWorkflow(
          createHistoryEntry({
            userId,
            id: workflowId,
            previous: workflowHistory.find((item) => item.workflow_id === workflowId),
            prompt: messages[0]?.content || plan.workflow_goal,
            messages: nextMessages,
            plan,
            completedTaskIds: nextCompleted,
          })
        );
      }
      setResumeUploadMessage(t("app.workspace.resumeUploadSuccess"));
    } catch (uploadError) {
      console.error(uploadError);
      setResumeUploadMessage(t("app.workspace.resumeUploadError"));
    } finally {
      setUploadingResume(false);
    }
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 lg:px-8 lg:py-10">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-accent)]">
          {t("app.workspace.eyebrow")}
        </p>
        <h1 className="mt-3 max-w-3xl text-3xl font-bold leading-tight md:text-4xl">
          {t("app.workspace.title1")}{" "}
          <span className="cc-gradient-text">
            {t("app.workspace.titleAccent")}
          </span>
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[var(--color-text-secondary)]">
          {t("app.workspace.subtitle")}
        </p>
        </div>
        {hasConversation && (
          <button
            type="button"
            onClick={startNewWorkflow}
            className="cc-btn cc-btn-secondary w-fit"
          >
            {t("app.workspace.newWorkflow")}
          </button>
        )}
      </div>

      <div className="mt-7 grid gap-5 md:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="cc-card flex min-h-[560px] flex-col overflow-hidden p-0">
          <div className="border-b border-[var(--color-border)] px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-accent)]">
              {t("app.workspace.chatEyebrow")}
            </p>
            <h2 className="mt-1 text-lg font-semibold">
              {t("app.workspace.chatTitle")}
            </h2>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {!hasConversation ? (
              <div className="flex h-full min-h-[280px] items-center justify-center">
                <div className="max-w-xl text-center">
                  <p className="text-sm font-semibold text-[var(--color-text-accent)]">
                    {t("app.workspace.emptyChatTitle")}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
                    {t("app.workspace.emptyChatBody")}
                  </p>
                </div>
              </div>
            ) : (
              messages.map((item) => (
                <ChatBubble key={item.id} message={item} />
              ))
            )}
            {loading && (
              <ChatBubble
                message={{
                  id: "assistant-loading",
                  role: "assistant",
                  content: t("app.workspace.agentThinking"),
                }}
                thinking
              />
            )}
            {showResumeUploadCard && profileTask && (
              <ResumeUploadCard
                loading={uploadingResume}
                message={resumeUploadMessage}
                onUpload={handleResumeUpload}
              />
            )}
            {showResumeNextActions && profileTask && (
              <NextActionCard
                stages={actionableStages}
                completedTaskIds={completedTaskIds}
                plan={plan}
                profileStage={profileTask}
              />
            )}
          </div>

          <form
            onSubmit={runPlanner}
            className="border-t border-[var(--color-border)] p-4"
          >
            <label className="sr-only">{t("app.workspace.goalLabel")}</label>
            <textarea
              className="cc-input min-h-24 resize-none"
              placeholder={rotatingPlaceholder}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  runPlanner();
                }
              }}
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-[var(--color-text-muted)]">
                {hasConversation
                  ? t("app.workspace.chatInputHintActive")
                  : t("app.workspace.chatInputHintNew")}
              </p>
              <div className="flex flex-wrap gap-3">
                {canContinue && currentStage && !showResumeUploadCard && (
                  <Link
                    href={currentStage.route}
                    onClick={() => plan && storePlan(plan)}
                    className="cc-btn cc-btn-secondary"
                  >
                    {t("app.workspace.continueTo", {
                      target: routeName(currentStage.route, t),
                    })}
                  </Link>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="cc-btn cc-btn-primary"
                >
                  {loading
                    ? t("app.workspace.planButtonLoading")
                    : hasConversation
                      ? t("app.workspace.sendButton")
                      : t("app.workspace.planButton")}
                </button>
              </div>
            </div>
          </form>
        </section>

        <aside className="cc-card h-fit p-5 md:sticky md:top-24">
          <TaskPanel
            stages={actionableStages}
            completedTaskIds={completedTaskIds}
          />
          {(error || notice) && (
            <div className="mt-4 space-y-3">
              {error && (
                <div className="rounded-[var(--radius-md)] border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-4 text-sm text-[var(--color-danger-text)]">
                  {error}
                </div>
              )}
              {notice && (
                <div className="rounded-[var(--radius-md)] border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-4 text-sm text-[var(--color-warning-text)]">
                  {notice}
                </div>
              )}
            </div>
          )}
          <WorkflowHistoryPanel
            activeWorkflowId={workflowId}
            items={workflowHistory}
            onDelete={deleteWorkflow}
            onSelect={restoreWorkflow}
          />
        </aside>
      </div>
    </section>
  );
}

function TaskPanel({
  stages,
  completedTaskIds,
}: {
  stages: WorkflowStage[];
  completedTaskIds: Set<string>;
}) {
  const t = useLocale().t;

  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-accent)]">
        {t("app.workspace.planEyebrow")}
      </p>

      {!stages.length ? (
        <div className="mt-6 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-5">
          <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
            {t("app.workspace.todoEmptyBody")}
          </p>
        </div>
      ) : (
        <ol className="mt-5 space-y-3">
          {stages.map((stage) => (
            <TodoItem
              key={stage.id}
              stage={stage}
              done={completedTaskIds.has(stage.id)}
            />
          ))}
        </ol>
      )}
    </>
  );
}

function TodoItem({ stage, done }: { stage: WorkflowStage; done: boolean }) {
  const t = useLocale().t;
  return (
    <li
      className={`flex gap-3 rounded-[var(--radius-md)] border p-3 ${
        done
          ? "border-[var(--color-border)] bg-[var(--color-bg-elev-1)] opacity-55"
          : "border-[var(--color-border)] bg-[var(--color-bg-elev-1)]"
      }`}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${
          done
            ? "border-[var(--color-success-border)] bg-[var(--color-success-bg)] text-[var(--color-success-text)]"
            : "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-text-accent)]"
        }`}
      >
        {done ? "✓" : ""}
      </span>
      <p
        className={`text-sm leading-6 ${
          done
            ? "text-[var(--color-text-muted)] line-through decoration-2"
            : "text-[var(--color-text-primary)]"
        }`}
      >
        {todoSentence(stage, t)}
      </p>
    </li>
  );
}

function ResumeUploadCard({
  loading,
  message,
  onUpload,
}: {
  loading: boolean;
  message: string;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const t = useLocale().t;
  return (
    <div className="mr-auto max-w-[82%] rounded-[18px] border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-4 shadow-sm">
      <p className="text-sm font-semibold">{t("app.workspace.resumeUploadTitle")}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
        {t("app.workspace.resumeUploadBody")}
      </p>
      <label className="cc-btn cc-btn-primary mt-4 w-fit cursor-pointer">
        {loading
          ? t("app.workspace.resumeUploadLoading")
          : t("app.workspace.resumeUploadButton")}
        <input
          type="file"
          accept=".txt,.pdf,.docx"
          className="hidden"
          disabled={loading}
          onChange={onUpload}
        />
      </label>
      {message && (
        <p className="mt-3 text-xs leading-5 text-[var(--color-text-secondary)]">
          {message}
        </p>
      )}
    </div>
  );
}

function NextActionCard({
  stages,
  completedTaskIds,
  plan,
  profileStage,
}: {
  stages: WorkflowStage[];
  completedTaskIds: Set<string>;
  plan: AgentAssistResponse | null;
  profileStage: WorkflowStage;
}) {
  const t = useLocale().t;
  const options = buildNextActionOptions(
    stages,
    completedTaskIds,
    profileStage,
    plan,
    t
  );

  return (
    <div className="mr-auto max-w-[82%] rounded-[18px] border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-4 shadow-sm">
      <p className="text-sm font-semibold">{t("app.workspace.afterResumeTitle")}</p>
      <div className="mt-4 grid gap-2">
        {options.map((option) => (
          <Link
            key={`${option.route}-${option.label}`}
            href={option.route}
            onClick={() => plan && storePlan(plan)}
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] px-4 py-3 text-left text-sm font-semibold text-[var(--color-text-primary)] transition hover:border-[var(--color-accent)]/60 hover:text-[var(--color-text-accent)]"
          >
            {option.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function WorkflowHistoryPanel({
  activeWorkflowId,
  items,
  onDelete,
  onSelect,
}: {
  activeWorkflowId: string | null;
  items: WorkflowHistoryEntry[];
  onDelete: (entry: WorkflowHistoryEntry) => void;
  onSelect: (entry: WorkflowHistoryEntry) => void;
}) {
  const t = useLocale().t;
  return (
    <section className="mt-6 border-t border-[var(--color-border)] pt-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-accent)]">
          {t("app.workspace.historyHeading")}
        </p>
        <span className="text-[11px] text-[var(--color-text-muted)]">
          {t("app.workspace.historyDeleteHint")}
        </span>
      </div>

      {!items.length ? (
        <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-4">
          <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
            {t("app.workspace.historyEmpty")}
          </p>
        </div>
      ) : (
        <div className="mt-4 max-h-64 overflow-y-auto pr-1">
          <ul className="space-y-2">
            {items.map((item) => {
              const active = item.workflow_id === activeWorkflowId;
              return (
                <li key={item.workflow_id}>
                  <button
                    type="button"
                    onClick={() => onSelect(item)}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      onDelete(item);
                    }}
                    title={t("app.workspace.historyItemTitle")}
                    className={`w-full rounded-[var(--radius-md)] border px-3 py-2 text-left text-sm leading-5 transition ${
                      active
                        ? "border-[var(--color-accent)]/60 bg-[var(--color-accent)]/10 text-[var(--color-text-accent)]"
                        : "border-[var(--color-border)] bg-[var(--color-bg-elev-1)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)]/50"
                    }`}
                  >
                    <span className="block truncate font-semibold">
                      {item.title}
                    </span>
                    <span className="mt-1 block text-[11px] text-[var(--color-text-muted)]">
                      {formatHistoryDate(item.updated_at || item.created_at || "")}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

function ChatBubble({
  message,
  thinking = false,
}: {
  message: ChatMessage;
  thinking?: boolean;
}) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] rounded-[18px] px-4 py-3 text-sm leading-6 shadow-sm ${
          isUser
            ? "bg-[var(--color-accent)] text-[var(--color-accent-text)]"
            : "border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] text-[var(--color-text-primary)]"
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {thinking && (
          <span className="mt-2 inline-flex gap-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:120ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:240ms]" />
          </span>
        )}
      </div>
    </div>
  );
}

function formatAssistantMessage(plan: AgentAssistResponse) {
  return [plan.reply, plan.follow_up_question].filter(Boolean).join("\n\n");
}

function buildActionableStages(
  plan: AgentAssistResponse | null,
  profileAvailable: boolean,
  locale: "en" | "zh",
  completedTaskIds: Set<string>
) {
  if (!plan) return [];
  const stages = dedupeTasksByRoute(plan.stages.filter(isPlatformTask));
  const needsProfile = shouldRequestProfile(plan);
  const alreadyHasProfileStage = stages.some((stage) => stage.route === "/profile");
  const completedSyntheticProfile = completedTaskIds.has("upload_resume_context");

  if (
    (!profileAvailable || completedSyntheticProfile) &&
    needsProfile &&
    !alreadyHasProfileStage
  ) {
    const zh = locale === "zh";
    return dedupeTasksByRoute([
      localStage(
        "upload_resume_context",
        zh ? "上传并解析简历" : "Upload and parse resume",
        "Profile Agent",
        "/profile",
        zh
          ? "上传简历，让 CareerCat 生成可用于岗位匹配的个人资料。"
          : "Upload a resume so CareerCat can build the profile used for matching.",
        [],
        "ready",
        zh ? "可复用的简历资料。" : "Reusable resume profile."
      ),
      ...stages,
    ]);
  }

  return stages;
}

function buildNextActionOptions(
  stages: WorkflowStage[],
  completedTaskIds: Set<string>,
  profileStage: WorkflowStage,
  plan: AgentAssistResponse | null,
  t: (key: string, params?: Record<string, string | number>) => string
) {
  const options = [
    {
      route: profileStage.route,
      label: t("app.workspace.nextOptionReviewProfile"),
    },
  ];

  if (plan?.suggested_actions?.length) {
    plan.suggested_actions
      .filter((action) => !HOME_ROUTES.has(action.route))
      .forEach((action) => {
        options.push({
          route: action.route,
          label: action.label,
        });
      });
    return dedupeOptionsByRoute(options);
  }

  stages
    .filter(
      (stage) =>
        stage.id !== profileStage.id &&
        !completedTaskIds.has(stage.id) &&
        !HOME_ROUTES.has(stage.route)
    )
    .forEach((stage) => {
      options.push({
        route: stage.route,
        label: nextOptionLabel(stage, t),
      });
    });

  return dedupeOptionsByRoute(options);
}

function nextOptionLabel(
  stage: WorkflowStage,
  t: (key: string, params?: Record<string, string | number>) => string
) {
  if (stage.route === "/recommendations") return t("app.workspace.nextOptionRecommendations");
  if (stage.route === "/import-jobs") return t("app.workspace.nextOptionImportJobs");
  if (stage.route === "/dashboard") return t("app.workspace.nextOptionDashboard");
  if (stage.route === "/insights") return t("app.workspace.nextOptionInsights");
  if (stage.route === "/coach") return t("app.workspace.nextOptionCoach");
  return t("app.workspace.continueTo", {
    target: routeName(stage.route, t),
  });
}

function dedupeOptionsByRoute(
  options: Array<{ route: string; label: string }>
) {
  const seen = new Set<string>();
  return options.filter((option) => {
    if (seen.has(option.route)) return false;
    seen.add(option.route);
    return true;
  });
}

function dedupeTasksByRoute(stages: WorkflowStage[]) {
  const seen = new Set<string>();
  return stages.filter((stage) => {
    const key = stage.route || stage.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isPlatformTask(stage: WorkflowStage) {
  if (HOME_ROUTES.has(stage.route)) return false;
  const haystack = `${stage.id} ${stage.title} ${stage.action} ${stage.agent}`.toLowerCase();
  return !INTERNAL_STAGE_HINTS.some((hint) => haystack.includes(hint.toLowerCase()));
}

function shouldRequestProfile(plan: AgentAssistResponse) {
  const haystack = [
    plan.workflow_goal,
    plan.reply,
    plan.intent,
    ...plan.stages.flatMap((stage) => [stage.title, stage.action, stage.output]),
  ]
    .join(" ")
    .toLowerCase();
  return hasAny(haystack, [
    "resume",
    "profile",
    "match",
    "fit",
    "rank",
    "简历",
    "个人资料",
    "匹配",
    "匹配度",
    "排序",
  ]);
}

function todoSentence(
  stage: WorkflowStage,
  t: (key: string, params?: Record<string, string | number>) => string
) {
  if (stage.route === "/profile") return t("app.workspace.todoProfile");
  if (stage.route === "/recommendations") return t("app.workspace.todoRecommendations");
  if (stage.route === "/import-jobs") return t("app.workspace.todoImportJobs");
  if (stage.route === "/dashboard") return t("app.workspace.todoDashboard");
  if (stage.route === "/insights") return t("app.workspace.todoInsights");
  if (stage.route === "/coach") return t("app.workspace.todoCoach");
  return stage.action || stage.title;
}

async function saveParsedProfile(userId: string, parsed: ParsedResumeResponse) {
  let existing: UserProfile | null = null;
  try {
    existing = (await fetchProfile(userId)) as UserProfile;
  } catch {
    existing = null;
  }

  const payload: UserProfile = {
    user_id: userId,
    basic_info: parsed.basic_info,
    resume_text: parsed.raw_text,
    education: parsed.education || [],
    experiences: parsed.experiences || [],
    projects: parsed.projects || [],
    target_roles: existing?.target_roles || [],
    preferred_locations: existing?.preferred_locations || [],
    sponsorship_need: Boolean(existing?.sponsorship_need),
    known_skills: parsed.skills || [],
  };

  if (existing) {
    await updateProfile(userId, payload);
  } else {
    await createProfile(payload);
  }
}

function createHistoryEntry({
  userId,
  id,
  previous,
  prompt,
  messages,
  plan,
  completedTaskIds,
}: {
  userId: string;
  id: string;
  previous?: WorkflowHistoryEntry;
  prompt: string;
  messages: ChatMessage[];
  plan: AgentAssistResponse;
  completedTaskIds: Set<string>;
}): WorkflowHistoryEntry {
  const now = new Date().toISOString();
  return {
    user_id: userId,
    workflow_id: id,
    title: historyTitle(plan.workflow_goal || prompt),
    messages,
    plan,
    completed_task_ids: Array.from(completedTaskIds),
    created_at: previous?.created_at || now,
    updated_at: now,
  };
}

function createWorkflowId() {
  return `workflow-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sortWorkflowHistory(items: WorkflowHistoryEntry[]) {
  return [...items]
    .filter((item) => item?.workflow_id && item?.plan && Array.isArray(item.messages))
    .sort((a, b) =>
      (b.updated_at || b.created_at || "").localeCompare(
        a.updated_at || a.created_at || ""
      )
    );
}

function historyTitle(value: string) {
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) return "Untitled workflow";
  return compact.length > 42 ? `${compact.slice(0, 42)}...` : compact;
}

function formatHistoryDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function routeName(
  route: string,
  t: (key: string, params?: Record<string, string | number>) => string
) {
  const map: Record<string, string> = {
    "/profile": t("app.routeName.profile"),
    "/recommendations": t("app.routeName.recommendations"),
    "/import-jobs": t("app.routeName.importJobs"),
    "/dashboard": t("app.routeName.dashboard"),
    "/insights": t("app.routeName.insights"),
    "/coach": t("app.routeName.coach"),
    "/workspace": t("app.routeName.workspace"),
    "/": t("app.routeName.workspace"),
  };
  return map[route] || t("app.routeName.nextStep");
}

function buildLocalHarnessPlan(
  message: string,
  locale: "en" | "zh"
): AgentAssistResponse {
  const zh = locale === "zh";
  const lower = message.toLowerCase();
  const detected = {
    profile: hasAny(lower, ["resume", "cv", "profile", "skill", "简历", "个人资料", "技能"]),
    search: hasAny(lower, ["find", "search", "recommend", "job", "role", "h1b", "visa", "sponsor", "找", "搜", "推荐", "岗位", "职位", "担保"]),
    import: hasAny(lower, ["import", "paste", "jd", "description", "post", "parse", "导入", "粘贴", "岗位描述", "解析"]),
    dashboard: hasAny(lower, ["track", "dashboard", "status", "application", "pipeline", "投递", "面板", "追踪", "状态"]),
    insights: hasAny(lower, ["insight", "analytics", "progress", "funnel", "report", "数据", "分析", "进度", "漏斗"]),
    gap: hasAny(lower, ["gap", "fit", "match", "improve", "tailor", "差距", "匹配", "优化", "改简历"]),
    interview: hasAny(lower, ["interview", "mock", "behavioral", "technical", "面试", "模拟", "行为面"]),
    written: hasAny(lower, ["assessment", "practice", "sql", "python", "coding", "test", "笔试", "练习", "代码", "测评"]),
  };

  const stages: WorkflowStage[] = [
    localStage(
      "clarify_constraints",
      zh ? "明确目标与约束" : "Clarify Goal and Constraints",
      "Harness Coordinator",
      "/workspace",
      zh ? "把复杂需求整理成目标、限制条件和完成标准。" : "Turn the complex request into scope, constraints, and acceptance criteria.",
      [],
      "complete",
      zh ? "清晰的执行说明。" : "Clear execution brief."
    ),
  ];

  const add = (
    condition: boolean,
    id: string,
    titleZh: string,
    titleEn: string,
    agent: string,
    route: string,
    actionZh: string,
    actionEn: string,
    outputZh: string,
    outputEn: string
  ) => {
    if (!condition || stages.some((stage) => stage.id === id)) return;
    stages.push(
      localStage(
        id,
        zh ? titleZh : titleEn,
        agent,
        route,
        zh ? actionZh : actionEn,
        [stages[stages.length - 1].id],
        stages.length === 1 ? "ready" : "planned",
        zh ? outputZh : outputEn
      )
    );
  };

  add(detected.profile || detected.search || detected.gap, "profile_context", "准备简历上下文", "Prepare Profile Context", "Profile Agent", "/profile", "检查简历、技能、目标岗位、地点和身份/担保需求。", "Check resume, skills, target roles, location, and sponsorship needs.", "可复用的个人资料上下文。", "Reusable profile context.");
  add(detected.import, "parse_job_post", "解析岗位描述", "Parse Job Post", "Job Parser Agent", "/import-jobs", "从岗位描述中提取结构化字段。", "Extract structured fields from the job description.", "可编辑岗位记录。", "Editable job record.");
  add(detected.search, "search_jobs", "搜索匹配岗位", "Search Matching Jobs", "Job Search Agent", "/recommendations", "根据岗位、地点、担保、薪资和发布时间筛选岗位。", "Search using role, location, sponsorship, salary, and recency constraints.", "候选岗位清单。", "Shortlisted jobs.");
  add(detected.search || detected.gap, "rank_jobs", "排序与差距判断", "Rank and Compare Fit", "Fit Agent", detected.search ? "/recommendations" : "/coach", "按匹配度、技能差距和现实约束排序。", "Rank by fit, missing skills, and practical constraints.", "优先级列表。", "Priority list.");
  add(detected.dashboard || detected.search || detected.import, "save_and_track", "保存并追踪", "Save and Track", "Tracker Agent", "/dashboard", "保存选中岗位，并把下一步动作放进投递追踪。", "Save selected jobs and create application-tracking items.", "投递 todo 管线。", "Tracked application todo pipeline.");
  add(detected.insights || detected.dashboard, "review_progress", "复盘进度", "Review Progress", "Insights Agent", "/insights", "检查投递漏斗、回复率和当前瓶颈。", "Review funnel health, response rates, and bottlenecks.", "进度快照。", "Progress snapshot.");
  add(detected.gap, "analyze_fit", "分析匹配差距", "Analyze Fit Gaps", "Fit Agent", "/coach", "对比简历与目标岗位，识别差距。", "Compare profile context against target jobs and identify gaps.", "差距分析。", "Gap analysis.");
  add(detected.interview, "mock_interview", "进行模拟面试", "Run Interview Practice", "Coach Agent", "/coach", "基于目标岗位进行技术或行为面试练习。", "Run technical or behavioral practice based on the target role.", "模拟面试练习。", "Interview practice session.");
  add(detected.written, "written_practice", "练习笔试测评", "Practice Assessment", "Coach Agent", "/coach", "生成 SQL、Python、数据分析或笔试练习。", "Create SQL, Python, analytics, or written assessment drills.", "练习题与反馈循环。", "Practice set and feedback loop.");

  if (stages.length === 1) {
    stages.push(
      localStage(
        "choose_workflow",
        zh ? "选择工作流" : "Choose Workflow",
        "Harness Coordinator",
        "/workspace",
        zh ? "选择个人资料、岗位发现、导入、追踪或训练中的一个方向。" : "Choose profile, discovery, import, tracking, or coaching as the next workflow.",
        ["clarify_constraints"],
        "ready",
        zh ? "明确下一步。" : "Clear next step."
      )
    );
  }

  const current = stages.find((stage) => stage.status === "ready") || stages[1] || stages[0];
  const selectedTool = selectedToolForRoute(current.route, detected);

  return {
    reply: zh
      ? "后端智能体暂时不可用，我已用本地 Harness 将你的目标拆成可执行 todo。"
      : "The remote agent is unavailable, so I used the local Harness to split your goal into executable todos.",
    intent: intentForRoute(current.route, detected),
    selected_tool: selectedTool,
    route: current.route,
    reason: zh
      ? "本地 harness 根据关键词和依赖关系生成了可执行计划。"
      : "The local harness generated an executable plan from keywords and dependencies.",
    needs_user_input: true,
    follow_up_question: null,
    tool_args: { source: "local_harness_fallback" },
    workflow_goal: zh
      ? "把复杂求职目标拆成可执行的多智能体 todo。"
      : "Break a complex job-search goal into executable multi-agent todos.",
    current_stage_id: current.id,
    stages,
    harness: {
      mode: "local_multi_agent_harness",
      coordinator: "Harness Coordinator",
      selected_handoff: current.agent,
      next_route: current.route,
      agents: Array.from(new Set(stages.map((stage) => stage.agent))),
      todo_count: stages.length,
      ready_count: stages.filter((stage) => stage.status === "ready").length,
      blocked_count: stages.filter((stage) => stage.status === "blocked").length,
    },
  };
}

function localStage(
  id: string,
  title: string,
  agent: string,
  route: string,
  action: string,
  depends_on: string[],
  status: WorkflowStage["status"],
  output: string
): WorkflowStage {
  return {
    id,
    title,
    agent,
    action,
    route,
    depends_on,
    status,
    needs_user_input: true,
    output,
  };
}

function hasAny(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(keyword));
}

function selectedToolForRoute(
  route: string,
  detected: Record<string, boolean>
) {
  if (route === "/coach" && detected.interview) return "start_mock_interview";
  if (route === "/coach" && detected.written) return "start_written_practice";
  if (route === "/coach") return "start_gap_analysis";
  return {
    "/profile": "go_to_profile",
    "/recommendations": "search_adzuna_jobs",
    "/import-jobs": "parse_job_post",
    "/dashboard": "view_dashboard",
    "/insights": "view_insights",
  }[route] || "offer_platform_guidance";
}

function intentForRoute(route: string, detected: Record<string, boolean>) {
  if (route === "/coach" && detected.interview) return "mock_interview";
  if (route === "/coach" && detected.written) return "written_practice";
  if (route === "/coach") return "gap_analysis";
  return {
    "/profile": "profile_setup",
    "/recommendations": "job_discovery",
    "/import-jobs": "job_import",
    "/dashboard": "dashboard_tracking",
    "/insights": "dashboard_tracking",
  }[route] || "general_guidance";
}

function storePlan(plan: AgentAssistResponse) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    "careercat_last_workflow_plan",
    JSON.stringify(plan)
  );
}

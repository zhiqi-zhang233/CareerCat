"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { sendAgentAssist } from "@/lib/api";
import type { AgentAssistResponse, WorkflowStage } from "@/lib/types";
import { useLocalUserId } from "@/lib/useLocalUserId";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const STATUS_STYLES: Record<WorkflowStage["status"], string> = {
  ready:
    "border-[var(--color-accent)]/50 bg-[var(--color-accent)]/10 text-[var(--color-text-accent)]",
  blocked:
    "border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]",
  planned:
    "border-[var(--color-border)] bg-[var(--color-bg-elev-1)] text-[var(--color-text-secondary)]",
  complete:
    "border-[var(--color-success-border)] bg-[var(--color-success-bg)] text-[var(--color-success-text)]",
};

const HOME_ROUTES = new Set(["/", "/workspace"]);

export default function Workspace() {
  const { locale, t } = useLocale();
  const userId = useLocalUserId();
  const [message, setMessage] = useState("");
  const [plan, setPlan] = useState<AgentAssistResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  const currentStage = useMemo(() => {
    if (!plan) return null;
    return (
      plan.stages.find((stage) => stage.id === plan.current_stage_id) ||
      plan.stages.find((stage) => stage.status === "ready") ||
      plan.stages[0] ||
      null
    );
  }, [plan]);

  const canContinue = Boolean(
    currentStage && !HOME_ROUTES.has(currentStage.route)
  );

  const fillStarter = (starter: string) => {
    setMessage(starter);
    setPlan(null);
    setError("");
  };

  const runPlanner = async () => {
    if (!userId) {
      setError(t("app.workspace.errorAccountLoading"));
      return;
    }
    if (!message.trim()) {
      setError(t("app.workspace.errorEmptyMessage"));
      return;
    }

    try {
      setLoading(true);
      setError("");
      const data = (await sendAgentAssist({
        user_id: userId,
        message,
        current_page: "/workspace",
        locale,
      })) as AgentAssistResponse;
      setPlan(data);
      storePlan(data);
    } catch (agentError) {
      console.error(agentError);
      setError(t("app.workspace.errorPlanFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:px-8 lg:py-10">
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

        <section className="cc-card mt-7 p-5">
          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-accent)]">
            {t("app.workspace.goalLabel")}
          </label>
          <textarea
            className="cc-input mt-3 min-h-40"
            placeholder={t("app.workspace.goalPlaceholder")}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={runPlanner}
              disabled={loading}
              className="cc-btn cc-btn-primary"
            >
              {loading
                ? t("app.workspace.planButtonLoading")
                : t("app.workspace.planButton")}
            </button>

            {canContinue && currentStage && (
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
          </div>

          {error && (
            <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-4 text-sm text-[var(--color-danger-text)]">
              {error}
            </div>
          )}
        </section>

        <section className="mt-7">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-accent)]">
            {t("app.workspace.starterHeading")}
          </h2>
          <div className="mt-3 grid gap-3">
            {STARTERS.map((starter) => (
              <button
                type="button"
                key={starter}
                onClick={() => fillStarter(starter)}
                className="cc-card group p-4 text-left text-sm leading-6 text-[var(--color-text-secondary)] transition hover:border-[var(--color-accent)]/50 hover:text-[var(--color-text-primary)]"
              >
                {starter}
              </button>
            ))}
          </div>
        </section>
      </div>

      <aside className="cc-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-accent)]">
              {t("app.workspace.planEyebrow")}
            </p>
            <h2 className="mt-2 text-xl font-bold leading-snug">
              {plan?.workflow_goal || t("app.workspace.noActive")}
            </h2>
          </div>
          {currentStage && (
            <span
              className={`rounded-[var(--radius-md)] border px-3 py-2 text-xs font-semibold ${STATUS_STYLES[currentStage.status]}`}
            >
              {t("app.workspace.next", { title: currentStage.title })}
            </span>
          )}
        </div>

        {!plan ? (
          <div className="mt-6 cc-card p-5">
            <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
              {t("app.workspace.noActiveBody")}
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            <div className="cc-card p-4">
              <p className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">
                {t("app.workspace.plannerReply")}
              </p>
              <p className="mt-2 text-sm leading-6">{plan.reply}</p>
              {plan.follow_up_question && (
                <p className="mt-3 text-sm leading-6 text-[var(--color-text-accent)]">
                  {plan.follow_up_question}
                </p>
              )}
            </div>

            <div className="grid gap-3">
              {plan.stages.map((stage, index) => (
                <StageRow
                  key={stage.id}
                  stage={stage}
                  index={index}
                  active={stage.id === plan.current_stage_id}
                />
              ))}
            </div>

            <div className="cc-card grid gap-3 p-4 md:grid-cols-2">
              <DecisionMeta
                label={t("app.workspace.metaIntent")}
                value={plan.intent}
              />
              <DecisionMeta
                label={t("app.workspace.metaAgent")}
                value={agentName(plan.selected_tool)}
              />
              <DecisionMeta
                label={t("app.workspace.metaReason")}
                value={plan.reason}
              />
              <DecisionMeta
                label={t("app.workspace.metaInputs")}
                value={
                  Object.keys(plan.tool_args || {}).length
                    ? JSON.stringify(plan.tool_args)
                    : t("app.workspace.noStructuredInputs")
                }
              />
            </div>

            {canContinue && currentStage ? (
              <Link
                href={currentStage.route}
                onClick={() => storePlan(plan)}
                className="cc-btn cc-btn-primary block w-full text-center"
              >
                {t("app.workspace.continueTo", {
                  target: routeName(currentStage.route, t),
                })}
              </Link>
            ) : (
              <div className="rounded-[var(--radius-md)] border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 p-4 text-sm leading-6">
                {t("app.workspace.addOneGoal")}
              </div>
            )}
          </div>
        )}
      </aside>
    </section>
  );
}

function StageRow({
  stage,
  index,
  active,
}: {
  stage: WorkflowStage;
  index: number;
  active: boolean;
}) {
  const t = useLocale().t;
  return (
    <div
      className={`rounded-[var(--radius-md)] border p-4 ${
        active
          ? "border-[var(--color-accent)]/50 bg-[var(--color-accent)]/10"
          : "border-[var(--color-border)] bg-[var(--color-bg-elev-1)]"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs text-[var(--color-text-muted)]">
            {t("app.workspace.stagePrefix", {
              n: index + 1,
              agent: stage.agent,
            })}
          </p>
          <h3 className="mt-1 text-base font-semibold">{stage.title}</h3>
        </div>
        <span
          className={`w-fit rounded-[var(--radius-md)] border px-3 py-1 text-xs font-semibold ${STATUS_STYLES[stage.status]}`}
        >
          {stage.status}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
        {stage.action}
      </p>
      <div className="mt-3 grid gap-2 text-xs text-[var(--color-text-secondary)] md:grid-cols-3">
        <p>
          {t("app.workspace.stageRoute", {
            name: routeName(stage.route, t),
          })}
        </p>
        <p>
          {t("app.workspace.stageDeps", {
            names: stage.depends_on.length
              ? stage.depends_on.join(", ")
              : t("app.workspace.stageNone"),
          })}
        </p>
        <p>
          {stage.needs_user_input
            ? t("app.workspace.stageNeedsInput")
            : t("app.workspace.stageFromContext")}
        </p>
      </div>
      <p className="mt-3 text-xs leading-5 text-[var(--color-text-muted)]">
        {t("app.workspace.stageOutput", { value: stage.output })}
      </p>
    </div>
  );
}

function DecisionMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">
        {label}
      </p>
      <p className="mt-1 break-words text-sm">{value}</p>
    </div>
  );
}

function agentName(tool: string) {
  return (
    {
      go_to_profile: "Profile Agent",
      search_adzuna_jobs: "Job Search Agent",
      parse_job_post: "Job Parser Agent",
      view_dashboard: "Tracker Agent",
      view_insights: "Insights Agent",
      start_gap_analysis: "Fit Agent",
      start_mock_interview: "Coach Agent",
      start_written_practice: "Coach Agent",
      offer_platform_guidance: "Goal Agent",
      ask_followup_question: "Goal Agent",
    }[tool] || "Workflow Agent"
  );
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

function storePlan(plan: AgentAssistResponse) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    "careercat_last_workflow_plan",
    JSON.stringify(plan)
  );
}

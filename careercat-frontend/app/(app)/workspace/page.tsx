"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { sendAgentAssist } from "@/lib/api";
import type { AgentAssistResponse, WorkflowStage } from "@/lib/types";
import { useLocalUserId } from "@/lib/useLocalUserId";

const STARTERS = [
  "Find jobs that match my resume, rank them, and tell me how to improve my resume for the best ones.",
  "I want to import a job post, clean up the parsed fields, save it, and prepare for the interview.",
  "Build a job search plan for data analyst roles in Chicago that sponsor visas.",
  "Review my saved jobs and help me decide what to apply to next.",
  "Prepare me for a Python and SQL technical interview based on my saved jobs.",
];

const STATUS_STYLES: Record<WorkflowStage["status"], string> = {
  ready:
    "border-[var(--color-accent)]/50 bg-[var(--color-accent)]/10 text-[var(--color-text-accent)]",
  blocked: "border-red-400/30 bg-red-500/10 text-red-200",
  planned:
    "border-[var(--color-border)] bg-[var(--color-bg-elev-1)] text-[var(--color-text-secondary)]",
  complete: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
};

const HOME_ROUTES = new Set(["/", "/workspace"]);

export default function Workspace() {
  const userId = useLocalUserId();
  const [message, setMessage] = useState("");
  const [plan, setPlan] = useState<AgentAssistResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      setError("Your account is still loading. Please try again.");
      return;
    }
    if (!message.trim()) {
      setError("Describe the job-search outcome you want.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const data = (await sendAgentAssist({
        user_id: userId,
        message,
        current_page: "/workspace",
      })) as AgentAssistResponse;
      setPlan(data);
      storePlan(data);
    } catch (agentError) {
      console.error(agentError);
      setError("CareerCat could not plan this workflow. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:px-8 lg:py-10">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-accent)]">
          Workflow Agent
        </p>
        <h1 className="mt-3 max-w-3xl text-3xl font-bold leading-tight md:text-4xl">
          Plan your next move,{" "}
          <span className="cc-gradient-text">one workflow at a time.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[var(--color-text-secondary)]">
          Describe a complex goal. CareerCat breaks it into ordered steps,
          checks dependencies, and routes you to the next page that can move
          things forward.
        </p>

        <section className="cc-card mt-7 p-5">
          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-accent)]">
            Goal
          </label>
          <textarea
            className="cc-input mt-3 min-h-40"
            placeholder="Example: Find roles that fit my resume, rank them, identify skill gaps, and help me prepare."
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
              {loading ? "Planning..." : "Plan workflow"}
            </button>

            {canContinue && currentStage && (
              <Link
                href={currentStage.route}
                onClick={() => plan && storePlan(plan)}
                className="cc-btn cc-btn-secondary"
              >
                Continue to {routeName(currentStage.route)} →
              </Link>
            )}
          </div>

          {error && (
            <div className="mt-4 rounded-[var(--radius-md)] border border-red-300/30 bg-red-500/10 p-4 text-sm text-red-100">
              {error}
            </div>
          )}
        </section>

        <section className="mt-7">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-accent)]">
            Starter goals
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
              Workflow Plan
            </p>
            <h2 className="mt-2 text-xl font-bold leading-snug">
              {plan?.workflow_goal || "No active workflow"}
            </h2>
          </div>
          {currentStage && (
            <span
              className={`rounded-[var(--radius-md)] border px-3 py-2 text-xs font-semibold ${STATUS_STYLES[currentStage.status]}`}
            >
              Next: {currentStage.title}
            </span>
          )}
        </div>

        {!plan ? (
          <div className="mt-6 cc-card p-5">
            <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
              A workflow plan will appear here with ordered stages, dependency
              checks, and the next action.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            <div className="cc-card p-4">
              <p className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">
                Planner reply
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
              <DecisionMeta label="Intent" value={plan.intent} />
              <DecisionMeta
                label="Selected agent"
                value={agentName(plan.selected_tool)}
              />
              <DecisionMeta label="Reason" value={plan.reason} />
              <DecisionMeta
                label="Extracted inputs"
                value={
                  Object.keys(plan.tool_args || {}).length
                    ? JSON.stringify(plan.tool_args)
                    : "No structured inputs yet"
                }
              />
            </div>

            {canContinue && currentStage ? (
              <Link
                href={currentStage.route}
                onClick={() => storePlan(plan)}
                className="cc-btn cc-btn-primary block w-full text-center"
              >
                Continue to {routeName(currentStage.route)} →
              </Link>
            ) : (
              <div className="rounded-[var(--radius-md)] border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 p-4 text-sm leading-6">
                Add one concrete goal or constraint to continue.
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
            Stage {index + 1} · {stage.agent}
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
        <p>Route: {routeName(stage.route)}</p>
        <p>
          Depends on:{" "}
          {stage.depends_on.length ? stage.depends_on.join(", ") : "None"}
        </p>
        <p>
          {stage.needs_user_input
            ? "Needs user input"
            : "Can run from saved context"}
        </p>
      </div>
      <p className="mt-3 text-xs leading-5 text-[var(--color-text-muted)]">
        Output: {stage.output}
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
      start_gap_analysis: "Fit Agent",
      start_mock_interview: "Coach Agent",
      start_written_practice: "Coach Agent",
      offer_platform_guidance: "Goal Agent",
      ask_followup_question: "Goal Agent",
    }[tool] || "Workflow Agent"
  );
}

function routeName(route: string) {
  return (
    {
      "/profile": "Profile",
      "/recommendations": "Recommendations",
      "/import-jobs": "Import Jobs",
      "/dashboard": "Dashboard",
      "/insights": "Insights",
      "/coach": "Coach",
      "/workspace": "Workspace",
      "/": "Workspace",
    }[route] || "Next Step"
  );
}

function storePlan(plan: AgentAssistResponse) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    "careercat_last_workflow_plan",
    JSON.stringify(plan)
  );
}

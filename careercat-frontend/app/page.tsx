"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Header from "@/components/Header";
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
  ready: "border-[#FFB238]/50 bg-[#FFB238]/10 text-[#FFB238]",
  blocked: "border-red-300/30 bg-red-500/10 text-red-100",
  planned: "border-white/10 bg-white/5 text-slate-200",
  complete: "border-green-300/30 bg-green-500/10 text-green-100",
};

export default function Home() {
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

  const canContinue = Boolean(currentStage && currentStage.route !== "/");

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
        current_page: "/",
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
    <main className="min-h-screen bg-[#011A55] text-white">
      <Header />

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div>
          <p className="text-sm font-semibold text-[#FFB238]">
            CareerCat Workflow Agents
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight text-[#FFB238] md:text-5xl">
            Plan a job search workflow.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
            Give CareerCat a complex goal. The agents will break it into ordered
            steps, check dependencies, and send you to the next page that can
            move the workflow forward.
          </p>

          <section className="mt-8 rounded-lg border border-white/10 bg-white/5 p-5">
            <label className="text-sm font-semibold text-[#FFB238]">
              Goal
            </label>
            <textarea
              className="mt-3 min-h-40 w-full rounded-lg border border-white/10 bg-white/10 p-4 text-white placeholder-slate-400 focus:outline-none"
              placeholder="Example: Find roles that fit my resume, rank them, identify skill gaps, and help me prepare."
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={runPlanner}
                disabled={loading}
                className="rounded-lg bg-[#FFB238] px-5 py-3 font-semibold text-[#011A55] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Planning..." : "Plan Workflow"}
              </button>

              {canContinue && currentStage && (
                <Link
                  href={currentStage.route}
                  onClick={() => plan && storePlan(plan)}
                  className="rounded-lg border border-[#FFB238]/40 px-5 py-3 font-semibold text-[#FFB238] transition hover:bg-white/10"
                >
                  Continue to {routeName(currentStage.route)}
                </Link>
              )}
            </div>

            {error && (
              <div className="mt-4 rounded-lg border border-red-300/30 bg-red-500/10 p-4 text-sm text-red-100">
                {error}
              </div>
            )}
          </section>

          <section className="mt-7">
            <h2 className="text-base font-semibold text-[#FFB238]">
              Starter goals
            </h2>
            <div className="mt-3 grid gap-3">
              {STARTERS.map((starter) => (
                <button
                  type="button"
                  key={starter}
                  onClick={() => fillStarter(starter)}
                  className="rounded-lg border border-white/10 bg-white/5 p-4 text-left text-sm leading-6 text-slate-200 transition hover:border-[#FFB238]/50 hover:bg-white/10"
                >
                  {starter}
                </button>
              ))}
            </div>
          </section>
        </div>

        <aside className="rounded-lg border border-white/10 bg-white/5 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#FFB238]">
                Workflow Plan
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white">
                {plan?.workflow_goal || "No active workflow"}
              </h2>
            </div>
            {currentStage && (
              <span className={`rounded-lg border px-3 py-2 text-xs font-semibold ${STATUS_STYLES[currentStage.status]}`}>
                Next: {currentStage.title}
              </span>
            )}
          </div>

          {!plan ? (
            <div className="mt-8 rounded-lg border border-white/10 bg-white/5 p-5">
              <p className="text-sm leading-6 text-slate-300">
                A workflow plan will appear here with ordered stages, dependency
                checks, and the next action.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase text-slate-400">Planner Reply</p>
                <p className="mt-2 text-sm leading-6 text-white">{plan.reply}</p>
                {plan.follow_up_question && (
                  <p className="mt-3 text-sm leading-6 text-[#FFB238]">
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

              <div className="grid gap-3 rounded-lg border border-white/10 bg-white/5 p-4 md:grid-cols-2">
                <DecisionMeta label="Intent" value={plan.intent} />
                <DecisionMeta label="Selected Agent" value={agentName(plan.selected_tool)} />
                <DecisionMeta label="Reason" value={plan.reason} />
                <DecisionMeta
                  label="Extracted Inputs"
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
                  className="block rounded-lg bg-[#FFB238] px-5 py-3 text-center font-semibold text-[#011A55] transition hover:opacity-90"
                >
                  Continue to {routeName(currentStage.route)}
                </Link>
              ) : (
                <div className="rounded-lg border border-[#FFB238]/30 bg-[#FFB238]/10 p-4 text-sm leading-6 text-slate-100">
                  Add one concrete goal or constraint to continue.
                </div>
              )}
            </div>
          )}
        </aside>
      </section>
    </main>
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
      className={`rounded-lg border p-4 ${
        active
          ? "border-[#FFB238]/50 bg-[#FFB238]/10"
          : "border-white/10 bg-white/5"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs text-slate-400">
            Stage {index + 1} · {stage.agent}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-white">{stage.title}</h3>
        </div>
        <span className={`w-fit rounded-lg border px-3 py-1 text-xs font-semibold ${STATUS_STYLES[stage.status]}`}>
          {stage.status}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-300">{stage.action}</p>
      <div className="mt-3 grid gap-2 text-xs text-slate-300 md:grid-cols-3">
        <p>Route: {routeName(stage.route)}</p>
        <p>Depends on: {stage.depends_on.length ? stage.depends_on.join(", ") : "None"}</p>
        <p>{stage.needs_user_input ? "Needs user input" : "Can run from saved context"}</p>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-400">
        Output: {stage.output}
      </p>
    </div>
  );
}

function DecisionMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs uppercase text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm text-white">{value}</p>
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
      "/coach": "Coach",
      "/": "Home",
    }[route] || "Next Step"
  );
}

function storePlan(plan: AgentAssistResponse) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("careercat_last_workflow_plan", JSON.stringify(plan));
}

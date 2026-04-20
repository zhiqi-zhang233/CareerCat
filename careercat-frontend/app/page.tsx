"use client";

import Link from "next/link";
import { useState } from "react";
import Header from "@/components/Header";
import { sendAgentAssist } from "@/lib/api";
import type { AgentAssistResponse } from "@/lib/types";
import { useLocalUserId } from "@/lib/useLocalUserId";

const STARTERS = [
  "Find me fresh Data Analyst jobs in Chicago posted this week.",
  "I have a job description and want to know if I should save it.",
  "Help me improve my resume for a saved job.",
  "Start a technical mock interview for SQL and Python.",
  "Train me for a written assessment on statistics.",
];

const TOOL_LABELS: Record<string, string> = {
  go_to_profile: "Profile Setup",
  search_adzuna_jobs: "Job Discovery",
  parse_job_post: "Job Import",
  view_dashboard: "Application Dashboard",
  start_gap_analysis: "Gap Analysis Coach",
  start_mock_interview: "Mock Interview Coach",
  start_written_practice: "Written Assessment Coach",
  offer_platform_guidance: "Platform Guidance",
  ask_followup_question: "Ask Follow-up",
};

export default function Home() {
  const userId = useLocalUserId();
  const [message, setMessage] = useState("");
  const [decision, setDecision] = useState<AgentAssistResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const canContinue = decision ? hasActionableRoute(decision) : false;

  const runAgent = async (nextMessage = message) => {
    if (!userId) {
      setError("Local account is still loading. Please try again.");
      return;
    }

    if (!nextMessage.trim()) {
      setError("Tell CareerCat what you want to do next.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = (await sendAgentAssist({
        user_id: userId,
        message: nextMessage,
        current_page: "/",
      })) as AgentAssistResponse;

      setDecision(data);
      setMessage(nextMessage);
      storeDecision(data);
    } catch (agentError) {
      console.error(agentError);
      setError("Agent Assist could not decide the next step. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#011A55] text-white">
      <Header />

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <div>
          <p className="text-sm font-semibold text-[#FFB238]">
            CareerCat Agent Assist
          </p>
          <h1 className="mt-4 max-w-4xl text-5xl font-bold leading-tight text-[#FFB238] md:text-6xl">
            Tell CareerCat what you want to do next.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            I can route your job search workflow, choose the right CareerCat
            tool, and help you move from resume setup to job discovery,
            application tracking, interview practice, or written assessment
            training.
          </p>

          <section className="mt-10 rounded-lg border border-white/10 bg-white/5 p-6">
            <label className="text-sm font-semibold text-[#FFB238]">
              What do you need?
            </label>
            <textarea
              className="mt-3 min-h-36 w-full rounded-lg border border-white/10 bg-white/10 p-4 text-white placeholder-slate-400 focus:outline-none"
              placeholder="Example: Find remote machine learning engineer jobs posted in the last 3 days."
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => runAgent()}
                disabled={loading}
                className="rounded-lg bg-[#FFB238] px-5 py-3 font-semibold text-[#011A55] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Deciding..." : "Ask Agent Assist"}
              </button>

              {decision && canContinue && (
                <Link
                  href={decision.route}
                  onClick={() => storeDecision(decision)}
                  className="rounded-lg border border-[#FFB238]/40 px-5 py-3 font-semibold text-[#FFB238] transition hover:bg-white/10"
                >
                  Continue to {routeName(decision.route)}
                </Link>
              )}
            </div>

            {error && (
              <div className="mt-4 rounded-lg border border-red-300/30 bg-red-500/10 p-4 text-sm text-red-100">
                {error}
              </div>
            )}
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-[#FFB238]">
              Try a starter request
            </h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {STARTERS.map((starter) => (
                <button
                  type="button"
                  key={starter}
                  onClick={() => runAgent(starter)}
                  className="rounded-lg border border-white/10 bg-white/5 p-4 text-left text-sm leading-6 text-slate-200 transition hover:border-[#FFB238]/50 hover:bg-white/10"
                >
                  {starter}
                </button>
              ))}
            </div>
          </section>
        </div>

        <aside className="rounded-lg border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold text-[#FFB238]">
            Agent Decision
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            This panel shows how the LLM supervisor handled the request: it may
            route to a tool, ask a follow-up, or stay here and guide the user.
          </p>

          {!decision ? (
            <div className="mt-8 rounded-lg border border-white/10 bg-white/5 p-5">
              <p className="text-sm leading-6 text-slate-300">
                Ask a question or choose a starter request. CareerCat will decide
                which workflow should handle it.
              </p>
            </div>
          ) : (
            <div className="mt-8 space-y-4">
              <DecisionRow label="Intent" value={decision.intent} />
              <DecisionRow
                label="Selected Tool"
                value={TOOL_LABELS[decision.selected_tool] || decision.selected_tool}
              />
              <DecisionRow
                label="Route"
                value={canContinue ? decision.route : "No page change"}
              />
              <DecisionRow
                label="Needs More Input"
                value={decision.needs_user_input ? "Yes" : "No"}
              />

              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase text-slate-400">Agent Reply</p>
                <p className="mt-2 text-sm leading-6 text-white">
                  {decision.reply}
                </p>
              </div>

              {decision.follow_up_question && (
                <div className="rounded-lg border border-[#FFB238]/30 bg-[#FFB238]/10 p-4">
                  <p className="text-xs uppercase text-[#FFB238]">
                    Follow-up
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white">
                    {decision.follow_up_question}
                  </p>
                </div>
              )}

              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase text-slate-400">Reason</p>
                <p className="mt-2 text-sm leading-6 text-white">
                  {decision.reason}
                </p>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase text-slate-400">
                  Extracted Tool Args
                </p>
                <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap text-xs leading-5 text-slate-200">
                  {Object.keys(decision.tool_args || {}).length
                    ? JSON.stringify(decision.tool_args, null, 2)
                    : "No tool arguments extracted."}
                </pre>
              </div>

              {canContinue ? (
                <Link
                  href={decision.route}
                  onClick={() => storeDecision(decision)}
                  className="block rounded-lg bg-[#FFB238] px-5 py-3 text-center font-semibold text-[#011A55] transition hover:opacity-90"
                >
                  Continue to {routeName(decision.route)}
                </Link>
              ) : (
                <div className="rounded-lg border border-[#FFB238]/30 bg-[#FFB238]/10 p-4">
                  <p className="text-sm font-semibold text-[#FFB238]">
                    Try asking for one concrete next step.
                  </p>
                  <div className="mt-3 grid gap-2">
                    {STARTERS.slice(0, 3).map((starter) => (
                      <button
                        type="button"
                        key={starter}
                        onClick={() => runAgent(starter)}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-xs leading-5 text-slate-200 transition hover:border-[#FFB238]/50"
                      >
                        {starter}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}

function storeDecision(decision: AgentAssistResponse) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    "careercat_last_agent_decision",
    JSON.stringify(decision)
  );
}

function DecisionRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
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
    }[route] || "Next Step"
  );
}

function hasActionableRoute(decision: AgentAssistResponse) {
  return (
    decision.route !== "/" &&
    decision.selected_tool !== "offer_platform_guidance" &&
    decision.selected_tool !== "ask_followup_question"
  );
}

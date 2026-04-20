"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import {
  fetchAgentRuns,
  fetchObservabilityMetrics,
  runSponsorshipFilterCheck,
} from "@/lib/api";
import type {
  AgentRun,
  ObservabilityMetrics,
  SponsorshipFilterCheck,
} from "@/lib/types";
import { useLocalUserId } from "@/lib/useLocalUserId";

const ACTION_LABELS: Record<string, string> = {
  agent_assist: "Agent Assist Routing",
  job_discovery: "Job Recommendation Search",
  job_import: "Job Post Import",
  save_recommendation: "Save Recommendation",
  coach_chat: "Coach Chat",
  quality_check: "Quality Check",
};

const TOOL_LABELS: Record<string, string> = {
  route_request: "Route Request",
  search_adzuna_jobs: "Adzuna Job Search",
  parse_job_post: "Job Parser",
  save_job_to_dashboard: "Dashboard Save",
  start_gap_analysis: "Gap Analysis Coach",
  start_mock_interview: "Mock Interview Coach",
  start_written_practice: "Written Practice Coach",
  offer_platform_guidance: "Platform Guidance",
  ask_followup_question: "Follow-up Question",
  sponsorship_filter_accuracy_check: "Sponsorship Filter Check",
};

export default function ObservabilityPage() {
  const userId = useLocalUserId();
  const [metrics, setMetrics] = useState<ObservabilityMetrics | null>(null);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [sponsorshipCheck, setSponsorshipCheck] =
    useState<SponsorshipFilterCheck | null>(null);
  const [sponsorshipSampleCount, setSponsorshipSampleCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [qualityLoading, setQualityLoading] = useState(false);
  const [error, setError] = useState("");
  const [qualityError, setQualityError] = useState("");

  const loadObservability = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError("");
      const [metricsData, runsData] = await Promise.all([
        fetchObservabilityMetrics(userId),
        fetchAgentRuns(userId, 50),
      ]);
      setMetrics(metricsData);
      setRuns(runsData.runs || []);
    } catch (observabilityError) {
      console.error(observabilityError);
      setError(
        "Observability data could not be loaded. Check the backend logs and the AgentRuns DynamoDB table."
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadObservability();
  }, [loadObservability]);

  const sortedRuns = useMemo(() => {
    return [...runs].sort((a, b) =>
      (b.created_at || "").localeCompare(a.created_at || "")
    );
  }, [runs]);

  const handleRunSponsorshipCheck = async () => {
    if (!userId) return;

    try {
      setQualityLoading(true);
      setQualityError("");
      const check = await runSponsorshipFilterCheck(
        userId,
        sponsorshipSampleCount
      );
      setSponsorshipCheck(check);
      await loadObservability();
    } catch (checkError) {
      console.error(checkError);
      setQualityError("The sponsorship filter check could not be completed.");
    } finally {
      setQualityLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#011A55] text-white">
      <Header />

      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#FFB238]">
              Developer Observability
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-bold leading-tight text-[#FFB238] md:text-5xl">
              See how CareerCat made each AI decision.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300">
              This page records agent routing, job search tools, job parsing,
              and coach conversations for the current local account. It helps an
              evaluator inspect inputs, decisions, tool results, errors, and
              latency without reading server logs.
            </p>
          </div>

          <button
            type="button"
            onClick={loadObservability}
            disabled={loading || !userId}
            className="w-fit rounded-lg bg-[#FFB238] px-5 py-3 font-semibold text-[#011A55] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "Refresh Data"}
          </button>
        </div>

        <div className="mt-8 rounded-lg border border-white/10 bg-white/5 p-5 text-sm leading-6 text-slate-300">
          <span className="font-semibold text-white">Current local account:</span>{" "}
          <span className="font-mono text-[#FFB238]">{userId || "loading"}</span>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-300/30 bg-red-500/10 p-4 text-sm text-red-100">
            {error}
          </div>
        )}

        <section className="mt-10">
          <h2 className="text-2xl font-semibold text-[#FFB238]">
            Evaluation Metrics
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            These metrics show whether the agentic workflows are being used,
            whether they complete successfully, and whether users may experience
            slow or unreliable responses.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {(metrics?.metric_cards || defaultMetricCards()).map((card) => (
              <article
                key={card.label}
                className="rounded-lg border border-white/10 bg-white/5 p-5"
              >
                <p className="text-sm font-semibold text-slate-300">
                  {card.label}
                </p>
                <p className="mt-3 text-3xl font-bold text-[#FFB238]">
                  {card.value}
                </p>
                <p className="mt-4 text-sm leading-6 text-slate-300">
                  {card.explanation}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <BreakdownCard
            title="Workflows Recorded"
            description="This shows which parts of the system are being exercised."
            counts={metrics?.action_counts || {}}
            labels={ACTION_LABELS}
          />
          <BreakdownCard
            title="Tools Selected"
            description="This shows which tools or agent routes were chosen by the system."
            counts={metrics?.tool_counts || {}}
            labels={TOOL_LABELS}
          />
        </section>

        <section className="mt-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-[#FFB238]">
                Quality Metric
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                This check evaluates whether CareerCat correctly protects users
                who need visa sponsorship from jobs that explicitly say
                sponsorship is not available.
              </p>
            </div>

            <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-end">
              <label className="text-sm font-semibold text-slate-300">
                Random samples
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={sponsorshipSampleCount}
                  onChange={(event) =>
                    setSponsorshipSampleCount(
                      clampSampleCount(Number(event.target.value))
                    )
                  }
                  className="mt-2 w-32 rounded-lg border border-white/10 bg-[#011A55] px-3 py-2 text-white focus:outline-none"
                />
              </label>

              <button
                type="button"
                onClick={handleRunSponsorshipCheck}
                disabled={qualityLoading || !userId}
                className="rounded-lg border border-[#FFB238]/50 px-5 py-3 font-semibold text-[#FFB238] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {qualityLoading ? "Running Check..." : "Run Check"}
              </button>
            </div>
          </div>

          {qualityError && (
            <div className="mt-5 rounded-lg border border-red-300/30 bg-red-500/10 p-4 text-sm text-red-100">
              {qualityError}
            </div>
          )}

          <SponsorshipFilterPanel check={sponsorshipCheck} />
        </section>

        <section className="mt-10">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-[#FFB238]">
                Recent Agent Runs
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                Each row is one recorded AI or tool workflow. Open failures here
                first when something behaves unexpectedly.
              </p>
            </div>
            <p className="text-sm text-slate-400">
              Showing up to 50 latest records
            </p>
          </div>

          {sortedRuns.length === 0 ? (
            <div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-6 text-sm leading-6 text-slate-300">
              No agent runs have been recorded for this local account yet. Try
              Agent Assist, import a job post, search recommendations, or chat
              with the coach, then refresh this page.
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-lg border border-white/10">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                  <thead className="bg-white/10 text-xs uppercase text-slate-300">
                    <tr>
                      <th className="px-4 py-3">Time</th>
                      <th className="px-4 py-3">Workflow</th>
                      <th className="px-4 py-3">Tool</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Latency</th>
                      <th className="px-4 py-3">Input</th>
                      <th className="px-4 py-3">Output or Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRuns.map((run) => (
                      <tr
                        key={run.run_id}
                        className="border-t border-white/10 align-top"
                      >
                        <td className="px-4 py-4 text-slate-300">
                          {formatDate(run.created_at)}
                        </td>
                        <td className="px-4 py-4 text-white">
                          {labelFor(run.action_type, ACTION_LABELS)}
                          {run.route && (
                            <p className="mt-1 text-xs text-slate-400">
                              Route: {run.route === "/" ? "No page change" : run.route}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-4 text-slate-200">
                          {labelFor(run.selected_tool, TOOL_LABELS)}
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge run={run} />
                        </td>
                        <td className="px-4 py-4 text-slate-300">
                          {run.latency_ms} ms
                        </td>
                        <td className="max-w-xs px-4 py-4 text-slate-300">
                          {run.input_summary || "No input summary"}
                        </td>
                        <td className="max-w-sm px-4 py-4 text-slate-300">
                          {run.success
                            ? run.tool_result_summary ||
                              run.model_output_summary ||
                              "Completed"
                            : run.error_message || "Failed without a message"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function SponsorshipFilterPanel({
  check,
}: {
  check: SponsorshipFilterCheck | null;
}) {
  if (!check) {
    return (
      <div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-6">
        <p className="text-sm leading-6 text-slate-300">
          Run the check to see a labeled set of sponsorship examples. The
          system will create a fresh random sample set, then show expected
          behavior, actual behavior, and whether each case passed.
        </p>
      </div>
    );
  }

  const allPassed = check.passed_cases === check.total_cases;

  return (
    <div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-6">
      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="rounded-lg border border-white/10 bg-white/5 p-5">
          <p className="text-sm font-semibold text-slate-300">
            {check.metric_name}
          </p>
          <p className="mt-3 text-4xl font-bold text-[#FFB238]">
            {check.accuracy}%
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            {check.passed_cases} of {check.total_cases} random labeled cases
            passed.
          </p>
          <div className="mt-4 h-3 overflow-hidden rounded-lg bg-white/10">
            <div
              className={`h-full ${allPassed ? "bg-green-300" : "bg-[#FFB238]"}`}
              style={{ width: `${Math.max(0, Math.min(100, check.accuracy))}%` }}
            />
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-400">
            Current account needs sponsorship:{" "}
            <span className="text-slate-200">
              {check.current_profile_requires_sponsorship ? "Yes" : "No"}
            </span>
          </p>
        </div>

        <div>
          <p className="text-sm leading-6 text-slate-300">
            {check.decision_rule}
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {check.cases.map((testCase) => (
              <article
                key={testCase.case_id}
                className="rounded-lg border border-white/10 bg-white/5 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-white">
                      {testCase.label}
                    </h3>
                    <p className="mt-2 text-xs leading-5 text-slate-400">
                      {testCase.explanation}
                    </p>
                  </div>
                  <span
                    className={`rounded-lg border px-3 py-1 text-xs font-semibold ${
                      testCase.passed
                        ? "border-green-300/30 bg-green-400/10 text-green-100"
                        : "border-red-300/30 bg-red-500/10 text-red-100"
                    }`}
                  >
                    {testCase.passed ? "Passed" : "Failed"}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 text-xs leading-5 text-slate-300">
                  <QualityRow
                    label="Expected Detection"
                    value={testCase.expected_visa_sponsorship}
                  />
                  <QualityRow
                    label="Actual Detection"
                    value={testCase.detected_visa_sponsorship}
                  />
                  <QualityRow
                    label="Expected Action"
                    value={testCase.expected_action}
                  />
                  <QualityRow
                    label="Actual Action"
                    value={testCase.actual_action}
                  />
                </div>

                <details className="mt-4">
                  <summary className="cursor-pointer text-xs font-semibold text-[#FFB238]">
                    View sample job text
                  </summary>
                  <p className="mt-3 rounded-lg border border-white/10 bg-[#011A55]/50 p-3 text-xs leading-5 text-slate-300">
                    {testCase.job_text}
                  </p>
                </details>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function QualityRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-slate-100">{value}</span>
    </div>
  );
}

function clampSampleCount(value: number) {
  if (!Number.isFinite(value)) return 5;
  return Math.max(1, Math.min(50, Math.round(value)));
}

function BreakdownCard({
  title,
  description,
  counts,
  labels,
}: {
  title: string;
  description: string;
  counts: Record<string, number>;
  labels: Record<string, string>;
}) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  return (
    <article className="rounded-lg border border-white/10 bg-white/5 p-6">
      <h3 className="text-xl font-semibold text-[#FFB238]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>

      {entries.length === 0 ? (
        <p className="mt-5 text-sm text-slate-400">No records yet.</p>
      ) : (
        <div className="mt-5 space-y-3">
          {entries.map(([key, count]) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3"
            >
              <span className="text-sm text-slate-200">
                {labelFor(key, labels)}
              </span>
              <span className="font-semibold text-[#FFB238]">{count}</span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function StatusBadge({ run }: { run: AgentRun }) {
  if (run.success) {
    return (
      <span className="rounded-lg border border-green-300/30 bg-green-400/10 px-3 py-1 text-xs font-semibold text-green-100">
        Success
      </span>
    );
  }

  return (
    <span className="rounded-lg border border-red-300/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-100">
      Failed
    </span>
  );
}

function labelFor(value: string, labels: Record<string, string>) {
  if (!value) return "None";
  return labels[value] || value.replaceAll("_", " ");
}

function formatDate(value: string) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function defaultMetricCards() {
  return [
    {
      label: "Recorded Agent Runs",
      value: "0",
      explanation:
        "How many AI or tool-driven workflows were captured for this local account.",
    },
    {
      label: "Workflow Success Rate",
      value: "0%",
      explanation:
        "The share of workflows that completed without an error.",
    },
    {
      label: "Average Latency",
      value: "0 ms",
      explanation:
        "The average time spent in AI or external-tool workflows.",
    },
    {
      label: "Failures",
      value: "0",
      explanation:
        "How many recorded workflows ended with an error.",
    },
  ];
}

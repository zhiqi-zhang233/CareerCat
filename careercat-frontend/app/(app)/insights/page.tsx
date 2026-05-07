"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchUserJobs } from "@/lib/api";
import type { JobApplicationStatus, JobPost } from "@/lib/types";
import { useLocalUserId } from "@/lib/useLocalUserId";

type JobsResponse = { jobs?: JobPost[] };

const STATUS_ORDER: JobApplicationStatus[] = [
  "not_applied",
  "applied",
  "assessment",
  "interview",
  "offer",
  "rejected",
];

const STATUS_LABEL: Record<JobApplicationStatus, string> = {
  not_applied: "Not Applied",
  applied: "Applied",
  assessment: "Assessment",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
};

const STATUS_COLOR: Record<JobApplicationStatus, string> = {
  not_applied: "var(--neutral-400)",
  applied: "#3b82f6",
  assessment: "var(--brand-honey-400)",
  interview: "#22d3ee",
  offer: "#34c171",
  rejected: "#ef4949",
};

const ACTIVE_STATUSES: JobApplicationStatus[] = [
  "applied",
  "assessment",
  "interview",
];

export default function InsightsPage() {
  const userId = useLocalUserId();
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const data = (await fetchUserJobs(userId)) as JobsResponse;
        if (!cancelled) setJobs(data.jobs || []);
      } catch (loadError) {
        console.error(loadError);
        if (!cancelled) setError("Failed to load your saved jobs.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const stats = useMemo(() => computeStats(jobs), [jobs]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 lg:px-8 lg:py-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-accent)]">
            Insights
          </p>
          <h1 className="mt-2 text-2xl font-bold leading-tight md:text-3xl">
            See where your search is leaking.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">
            All numbers come from your saved jobs. Update statuses on the
            Dashboard to keep this page accurate.
          </p>
        </div>
        <Link href="/dashboard" className="cc-btn cc-btn-secondary">
          Open dashboard →
        </Link>
      </header>

      {error && (
        <div className="mt-6 rounded-[var(--radius-md)] border border-red-300/30 bg-red-500/10 p-4 text-sm text-red-100">
          {error}
        </div>
      )}

      {loading && jobs.length === 0 ? (
        <LoadingSkeleton />
      ) : jobs.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Saved jobs"
              value={stats.totalJobs.toString()}
              hint={`${stats.activeApplications} actively applied`}
            />
            <KpiCard
              label="This week"
              value={stats.thisWeekApplied.toString()}
              hint="applications submitted"
            />
            <KpiCard
              label="Response rate"
              value={
                stats.responseRate === null
                  ? "—"
                  : `${Math.round(stats.responseRate * 100)}%`
              }
              hint={`${stats.responsesCount} of ${stats.appliedCount} replied`}
            />
            <KpiCard
              label="Avg response time"
              value={
                stats.avgResponseDays === null
                  ? "—"
                  : `${stats.avgResponseDays.toFixed(1)}d`
              }
              hint="from applied → first reply"
            />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <FunnelCard counts={stats.statusCounts} total={stats.totalJobs} />
            <SkillsCard skills={stats.skills} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <CompaniesCard companies={stats.topCompanies} />
            <PaceCard
              weekly={stats.weeklyApplied}
              maxWeekly={stats.maxWeeklyApplied}
            />
          </div>

          <div className="mt-6 cc-card p-5">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
              Suggestions
            </p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--color-text-secondary)]">
              {stats.suggestions.map((s, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}

/* ============== Components ============== */

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="cc-card p-5">
      <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{hint}</p>
    </div>
  );
}

function FunnelCard({
  counts,
  total,
}: {
  counts: Record<JobApplicationStatus, number>;
  total: number;
}) {
  const denominator = Math.max(total, 1);
  return (
    <div className="cc-card p-5">
      <h2 className="text-base font-semibold">Application funnel</h2>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
        Where every saved job currently lives.
      </p>
      <div className="mt-5 space-y-3">
        {STATUS_ORDER.map((status) => {
          const count = counts[status] ?? 0;
          const pct = (count / denominator) * 100;
          return (
            <div key={status}>
              <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                <span>{STATUS_LABEL[status]}</span>
                <span>
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    {count}
                  </span>{" "}
                  · {pct.toFixed(0)}%
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--color-bg-elev-2)]">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{
                    width: `${Math.max(pct, count > 0 ? 4 : 0)}%`,
                    background: STATUS_COLOR[status],
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SkillsCard({
  skills,
}: {
  skills: { name: string; count: number; weight: number }[];
}) {
  return (
    <div className="cc-card p-5">
      <h2 className="text-base font-semibold">Skills you keep meeting</h2>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
        Aggregated from required + preferred skills on saved jobs.
      </p>
      {skills.length === 0 ? (
        <p className="mt-5 text-sm text-[var(--color-text-secondary)]">
          No skill data yet. Save a few jobs and try again.
        </p>
      ) : (
        <div className="mt-5 flex flex-wrap gap-2">
          {skills.slice(0, 24).map((s) => (
            <span
              key={s.name}
              className="cc-chip"
              style={{
                fontSize: `${0.72 + s.weight * 0.7}rem`,
                color:
                  s.weight > 0.45
                    ? "var(--color-text-accent)"
                    : "var(--color-text-secondary)",
                borderColor:
                  s.weight > 0.45
                    ? "color-mix(in srgb, var(--color-accent) 40%, transparent)"
                    : "var(--color-border)",
              }}
            >
              {s.name}
              <span className="text-[10px] text-[var(--color-text-muted)]">
                ×{s.count}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function CompaniesCard({
  companies,
}: {
  companies: { name: string; count: number }[];
}) {
  return (
    <div className="cc-card p-5">
      <h2 className="text-base font-semibold">Top companies you&apos;re tracking</h2>
      <div className="mt-4 space-y-2 text-sm">
        {companies.length === 0 ? (
          <p className="text-[var(--color-text-secondary)]">
            No saved jobs yet.
          </p>
        ) : (
          companies.map((c) => (
            <div
              key={c.name}
              className="flex items-center justify-between rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] px-3 py-2"
            >
              <span className="truncate">{c.name}</span>
              <span className="text-xs text-[var(--color-text-muted)]">
                {c.count} {c.count === 1 ? "role" : "roles"}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function PaceCard({
  weekly,
  maxWeekly,
}: {
  weekly: { weekLabel: string; count: number }[];
  maxWeekly: number;
}) {
  const denom = Math.max(maxWeekly, 1);
  return (
    <div className="cc-card p-5">
      <h2 className="text-base font-semibold">Application pace</h2>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
        Last 8 weeks (by application date).
      </p>
      <div className="mt-5 flex h-32 items-end gap-2">
        {weekly.map((bar) => {
          const h = (bar.count / denom) * 100;
          return (
            <div
              key={bar.weekLabel}
              className="flex flex-1 flex-col items-center"
              title={`${bar.weekLabel}: ${bar.count}`}
            >
              <div
                className="w-full rounded-t-md bg-[var(--color-accent)] transition-[height] duration-500"
                style={{
                  height: `${Math.max(h, bar.count > 0 ? 6 : 2)}%`,
                  opacity: bar.count > 0 ? 1 : 0.25,
                }}
              />
              <span className="mt-2 text-[10px] text-[var(--color-text-muted)]">
                {bar.weekLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="cc-card mt-10 p-10 text-center">
      <h2 className="text-lg font-semibold">No saved jobs yet</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--color-text-secondary)]">
        Insights builds itself from the jobs you save and the statuses you
        track. Import a JD or pull recommendations to get started.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Link href="/import-jobs" className="cc-btn cc-btn-primary">
          Import a JD
        </Link>
        <Link href="/recommendations" className="cc-btn cc-btn-secondary">
          Find recommendations
        </Link>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="cc-card p-5">
          <div className="cc-skeleton h-3 w-20" />
          <div className="cc-skeleton mt-3 h-8 w-24" />
          <div className="cc-skeleton mt-3 h-3 w-32" />
        </div>
      ))}
    </div>
  );
}

/* ============== Stats ============== */

type Stats = {
  totalJobs: number;
  statusCounts: Record<JobApplicationStatus, number>;
  appliedCount: number;
  responsesCount: number;
  responseRate: number | null;
  avgResponseDays: number | null;
  thisWeekApplied: number;
  activeApplications: number;
  skills: { name: string; count: number; weight: number }[];
  topCompanies: { name: string; count: number }[];
  weeklyApplied: { weekLabel: string; count: number }[];
  maxWeeklyApplied: number;
  suggestions: string[];
};

function computeStats(jobs: JobPost[]): Stats {
  const statusCounts = STATUS_ORDER.reduce(
    (acc, s) => ({ ...acc, [s]: 0 }),
    {} as Record<JobApplicationStatus, number>
  );

  jobs.forEach((j) => {
    if (j.status && statusCounts[j.status] !== undefined) {
      statusCounts[j.status] += 1;
    }
  });

  const appliedCount =
    statusCounts.applied +
    statusCounts.assessment +
    statusCounts.interview +
    statusCounts.offer +
    statusCounts.rejected;
  const responsesCount =
    statusCounts.assessment +
    statusCounts.interview +
    statusCounts.offer +
    statusCounts.rejected;
  const responseRate = appliedCount > 0 ? responsesCount / appliedCount : null;

  // This week + 8-week pace by application_date
  const now = new Date();
  const weekStart = startOfWeek(now);
  let thisWeekApplied = 0;
  const weekBuckets: { weekLabel: string; count: number; weekStart: Date }[] =
    [];
  for (let i = 7; i >= 0; i--) {
    const w = addDays(weekStart, -i * 7);
    weekBuckets.push({
      weekLabel: i === 0 ? "Now" : `-${i}w`,
      count: 0,
      weekStart: w,
    });
  }

  jobs.forEach((j) => {
    const d = parseDate(j.application_date);
    if (!d) return;
    if (d >= weekStart) thisWeekApplied += 1;
    for (let i = weekBuckets.length - 1; i >= 0; i--) {
      if (d >= weekBuckets[i].weekStart) {
        weekBuckets[i].count += 1;
        break;
      }
    }
  });

  const maxWeeklyApplied = weekBuckets.reduce(
    (m, b) => (b.count > m ? b.count : m),
    0
  );

  // Average response time = updated_at - application_date for jobs that
  // moved beyond "applied".
  const responseTimes: number[] = [];
  jobs.forEach((j) => {
    const applied = parseDate(j.application_date);
    const updated = parseDate(j.updated_at) || parseDate(j.created_at);
    if (
      applied &&
      updated &&
      (j.status === "assessment" ||
        j.status === "interview" ||
        j.status === "offer" ||
        j.status === "rejected")
    ) {
      const days = (updated.getTime() - applied.getTime()) / (1000 * 60 * 60 * 24);
      if (days >= 0 && days < 365) responseTimes.push(days);
    }
  });
  const avgResponseDays =
    responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : null;

  // Skill aggregation
  const skillMap = new Map<string, number>();
  jobs.forEach((j) => {
    [...(j.required_skills || []), ...(j.preferred_skills || [])]
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((s) => {
        const key = s.toLowerCase();
        skillMap.set(key, (skillMap.get(key) || 0) + 1);
      });
  });
  const maxSkill = Math.max(...Array.from(skillMap.values()), 1);
  const skills = Array.from(skillMap.entries())
    .map(([name, count]) => ({
      name: capitalizeSkill(name),
      count,
      weight: count / maxSkill,
    }))
    .sort((a, b) => b.count - a.count);

  // Top companies
  const companyMap = new Map<string, number>();
  jobs.forEach((j) => {
    if (!j.company) return;
    companyMap.set(j.company, (companyMap.get(j.company) || 0) + 1);
  });
  const topCompanies = Array.from(companyMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Suggestions
  const activeApplications = ACTIVE_STATUSES.reduce(
    (sum, s) => sum + statusCounts[s],
    0
  );
  const suggestions: string[] = [];
  if (statusCounts.not_applied > 5) {
    suggestions.push(
      `You have ${statusCounts.not_applied} jobs marked Not Applied — pick the top 3 today and move them to Applied.`
    );
  }
  if (responseRate !== null && responseRate < 0.1 && appliedCount >= 5) {
    suggestions.push(
      `Response rate is ${(responseRate * 100).toFixed(0)}% — try the Coach's resume-job gap mode on jobs that ghosted to find what's off.`
    );
  }
  if (statusCounts.assessment >= 1) {
    suggestions.push(
      `${statusCounts.assessment} assessment${statusCounts.assessment === 1 ? "" : "s"} in progress — open the Coach in Written Practice mode and target the role's stack.`
    );
  }
  if (statusCounts.interview >= 1) {
    suggestions.push(
      `${statusCounts.interview} interview${statusCounts.interview === 1 ? "" : "s"} lined up — run a mock interview with the Coach to lock the loop.`
    );
  }
  if (suggestions.length === 0) {
    suggestions.push(
      "Looking healthy. Keep an eye on jobs sitting in Applied for 14+ days — that's usually time to follow up."
    );
  }

  return {
    totalJobs: jobs.length,
    statusCounts,
    appliedCount,
    responsesCount,
    responseRate,
    avgResponseDays,
    thisWeekApplied,
    activeApplications,
    skills,
    topCompanies,
    weeklyApplied: weekBuckets.map(({ weekLabel, count }) => ({
      weekLabel,
      count,
    })),
    maxWeeklyApplied,
    suggestions,
  };
}

function parseDate(value: string | undefined | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function startOfWeek(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const day = out.getDay();
  const diff = (day + 6) % 7; // Monday = 0
  out.setDate(out.getDate() - diff);
  return out;
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

function capitalizeSkill(s: string): string {
  // Keep common acronyms uppercase; otherwise title-case the first letter.
  const ACRONYMS = new Set([
    "sql",
    "nosql",
    "aws",
    "gcp",
    "css",
    "html",
    "json",
    "etl",
    "api",
    "rest",
    "ml",
    "ai",
    "ui",
    "ux",
    "ci",
    "cd",
    "k8s",
    "tcp",
    "ip",
    "tdd",
  ]);
  if (ACRONYMS.has(s)) return s.toUpperCase();
  return s
    .split(/\s+/)
    .map((w) =>
      ACRONYMS.has(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)
    )
    .join(" ");
}

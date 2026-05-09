"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchUserJobs } from "@/lib/api";
import type { JobApplicationStatus, JobPost } from "@/lib/types";
import { useLocalUserId } from "@/lib/useLocalUserId";
import { useT } from "@/lib/i18n/LocaleProvider";

type JobsResponse = { jobs?: JobPost[] };

function readJobs(data: JobsResponse | null | undefined): JobPost[] {
  return Array.isArray(data?.jobs) ? data.jobs : [];
}

const STATUS_ORDER: JobApplicationStatus[] = [
  "not_applied",
  "applied",
  "assessment",
  "interview",
  "offer",
  "rejected",
];

const STATUS_KEYS: Record<JobApplicationStatus, string> = {
  not_applied: "app.insights.statusNotApplied",
  applied: "app.insights.statusApplied",
  assessment: "app.insights.statusAssessment",
  interview: "app.insights.statusInterview",
  offer: "app.insights.statusOffer",
  rejected: "app.insights.statusRejected",
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
  const t = useT();
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
        if (!cancelled) setJobs(readJobs(data));
      } catch {
        if (!cancelled) {
          setJobs([]);
          setError("");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, t]);

  const stats = useMemo(() => computeStats(jobs, t), [jobs, t]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 lg:px-8 lg:py-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-accent)]">
            {t("app.insights.eyebrow")}
          </p>
          <h1 className="mt-2 text-2xl font-bold leading-tight md:text-3xl">
            {t("app.insights.title")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">
            {t("app.insights.subtitle")}
          </p>
        </div>
        <Link href="/dashboard" className="cc-btn cc-btn-secondary">
          {t("app.insights.openDashboard")}
        </Link>
      </header>

      {error && (
        <div className="mt-6 rounded-[var(--radius-md)] border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-4 text-sm text-[var(--color-danger-text)]">
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
              label={t("app.insights.kpiSavedJobs")}
              value={stats.totalJobs.toString()}
              hint={t("app.insights.kpiSavedJobsHint", {
                n: stats.activeApplications,
              })}
            />
            <KpiCard
              label={t("app.insights.kpiThisWeek")}
              value={stats.thisWeekApplied.toString()}
              hint={t("app.insights.kpiThisWeekHint")}
            />
            <KpiCard
              label={t("app.insights.kpiResponse")}
              value={
                stats.responseRate === null
                  ? "—"
                  : `${Math.round(stats.responseRate * 100)}%`
              }
              hint={t("app.insights.kpiResponseHint", {
                r: stats.responsesCount,
                a: stats.appliedCount,
              })}
            />
            <KpiCard
              label={t("app.insights.kpiAvgResponse")}
              value={
                stats.avgResponseDays === null
                  ? "—"
                  : `${stats.avgResponseDays.toFixed(1)}d`
              }
              hint={t("app.insights.kpiAvgResponseHint")}
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
              {t("app.insights.suggestionsTitle")}
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
  const t = useT();
  const denominator = Math.max(total, 1);
  return (
    <div className="cc-card p-5">
      <h2 className="text-base font-semibold">
        {t("app.insights.funnelTitle")}
      </h2>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
        {t("app.insights.funnelBody")}
      </p>
      <div className="mt-5 space-y-3">
        {STATUS_ORDER.map((status) => {
          const count = counts[status] ?? 0;
          const pct = (count / denominator) * 100;
          return (
            <div key={status}>
              <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                <span>{t(STATUS_KEYS[status])}</span>
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
  const t = useT();
  return (
    <div className="cc-card p-5">
      <h2 className="text-base font-semibold">
        {t("app.insights.skillsTitle")}
      </h2>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
        {t("app.insights.skillsBody")}
      </p>
      {skills.length === 0 ? (
        <p className="mt-5 text-sm text-[var(--color-text-secondary)]">
          {t("app.insights.skillsEmpty")}
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
  const t = useT();
  return (
    <div className="cc-card p-5">
      <h2 className="text-base font-semibold">
        {t("app.insights.companiesTitle")}
      </h2>
      <div className="mt-4 space-y-2 text-sm">
        {companies.length === 0 ? (
          <p className="text-[var(--color-text-secondary)]">
            {t("app.insights.companiesEmpty")}
          </p>
        ) : (
          companies.map((c) => (
            <div
              key={c.name}
              className="flex items-center justify-between rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] px-3 py-2"
            >
              <span className="truncate">{c.name}</span>
              <span className="text-xs text-[var(--color-text-muted)]">
                {c.count}{" "}
                {c.count === 1
                  ? t("app.insights.companiesRoleSingular")
                  : t("app.insights.companiesRolePlural")}
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
  const t = useT();
  const denom = Math.max(maxWeekly, 1);
  return (
    <div className="cc-card p-5">
      <h2 className="text-base font-semibold">
        {t("app.insights.paceTitle")}
      </h2>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
        {t("app.insights.paceBody")}
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
  const t = useT();
  return (
    <div className="cc-card mt-10 p-10 text-center">
      <h2 className="text-lg font-semibold">{t("app.insights.emptyTitle")}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--color-text-secondary)]">
        {t("app.insights.emptyBody")}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Link href="/import-jobs" className="cc-btn cc-btn-primary">
          {t("app.insights.emptyImport")}
        </Link>
        <Link href="/recommendations" className="cc-btn cc-btn-secondary">
          {t("app.insights.emptyRecommend")}
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

function computeStats(
  jobs: JobPost[],
  t: (key: string, params?: Record<string, string | number>) => string
): Stats {
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

  // 8-week pace by application_date
  const now = new Date();
  const weekStart = startOfWeek(now);
  let thisWeekApplied = 0;
  const weekBuckets: { weekLabel: string; count: number; weekStart: Date }[] =
    [];
  for (let i = 7; i >= 0; i--) {
    const w = addDays(weekStart, -i * 7);
    const label =
      i === 0
        ? t("app.insights.paceWeekNow")
        : t("app.insights.paceWeekAgo", { n: i });
    weekBuckets.push({
      weekLabel: label,
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
      const days =
        (updated.getTime() - applied.getTime()) / (1000 * 60 * 60 * 24);
      if (days >= 0 && days < 365) responseTimes.push(days);
    }
  });
  const avgResponseDays =
    responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : null;

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

  const companyMap = new Map<string, number>();
  jobs.forEach((j) => {
    if (!j.company) return;
    companyMap.set(j.company, (companyMap.get(j.company) || 0) + 1);
  });
  const topCompanies = Array.from(companyMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const activeApplications = ACTIVE_STATUSES.reduce(
    (sum, s) => sum + statusCounts[s],
    0
  );
  const suggestions: string[] = [];
  if (statusCounts.not_applied > 5) {
    suggestions.push(
      t("app.insights.sugNotApplied", { n: statusCounts.not_applied })
    );
  }
  if (responseRate !== null && responseRate < 0.1 && appliedCount >= 5) {
    suggestions.push(
      t("app.insights.sugLowResponse", {
        pct: Math.round(responseRate * 100),
      })
    );
  }
  if (statusCounts.assessment >= 1) {
    suggestions.push(
      t("app.insights.sugAssessment", {
        n: statusCounts.assessment,
        plural: statusCounts.assessment === 1 ? "" : "s",
      })
    );
  }
  if (statusCounts.interview >= 1) {
    suggestions.push(
      t("app.insights.sugInterview", {
        n: statusCounts.interview,
        plural: statusCounts.interview === 1 ? "" : "s",
      })
    );
  }
  if (suggestions.length === 0) {
    suggestions.push(t("app.insights.sugHealthy"));
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

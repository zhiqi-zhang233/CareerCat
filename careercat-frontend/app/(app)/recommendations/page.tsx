"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { discoverAdzunaJobs, saveJobRecommendation } from "@/lib/api";
import type { AgentAssistResponse, JobRecommendation } from "@/lib/types";
import { useLocalUserId } from "@/lib/useLocalUserId";
import { useLocale } from "@/lib/i18n/LocaleProvider";

type DiscoveryResponse = {
  recommendations: JobRecommendation[];
};

export default function RecommendationsPage() {
  const { t, locale } = useLocale();
  const userId = useLocalUserId();
  const [keywords, setKeywords] = useState("Data Analyst");
  const [location, setLocation] = useState("Chicago");
  const [postedWithinDays, setPostedWithinDays] = useState(7);
  const [resultsPerPage, setResultsPerPage] = useState(20);
  const [salaryMin, setSalaryMin] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [recommendations, setRecommendations] = useState<JobRecommendation[]>(
    []
  );
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const raw = window.localStorage.getItem("careercat_last_agent_decision");
    if (!raw) return;

    try {
      const decision = JSON.parse(raw) as AgentAssistResponse;
      if (decision.route !== "/recommendations") return;

      const args = decision.tool_args || {};
      if (typeof args.keywords === "string" && args.keywords.trim()) {
        setKeywords(args.keywords);
      }
      if (typeof args.location === "string") {
        setLocation(args.location);
      }
      if (typeof args.posted_within_days === "number") {
        setPostedWithinDays(args.posted_within_days);
      }
    } catch {
      window.localStorage.removeItem("careercat_last_agent_decision");
    }
  }, []);

  const handleFindJobs = async () => {
    if (!userId) {
      setError(t("app.recommendations.errAccountLoading"));
      return;
    }

    if (!keywords.trim()) {
      setError(t("app.recommendations.errEmptyKeywords"));
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSavedIds(new Set());

      const data = (await discoverAdzunaJobs({
        user_id: userId,
        keywords,
        location,
        country: "us",
        posted_within_days: postedWithinDays,
        results_per_page: resultsPerPage,
        remote_only: remoteOnly,
        salary_min: salaryMin ? Number(salaryMin) : undefined,
      })) as DiscoveryResponse;

      setRecommendations(data.recommendations || []);
    } catch (discoveryError) {
      console.error(discoveryError);
      setError(t("app.recommendations.errDiscovery"));
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (recommendation: JobRecommendation) => {
    if (!userId) return;

    try {
      setSavingId(recommendation.recommendation_id);
      setError("");
      await saveJobRecommendation(userId, recommendation);
      setSavedIds((currentIds) => {
        const nextIds = new Set(currentIds);
        nextIds.add(recommendation.recommendation_id);
        return nextIds;
      });
    } catch (saveError) {
      console.error(saveError);
      setError(t("app.recommendations.errSave"));
    } finally {
      setSavingId("");
    }
  };

  return (
    <main className="min-h-screen text-[var(--color-text-primary)]">
      <Header />

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--color-text-accent)]">
              {t("app.recommendations.eyebrow")}
            </p>
            <h1 className="mt-3 text-4xl font-bold text-[var(--color-text-accent)]">
              {t("app.recommendations.title")}
            </h1>
            <p className="mt-4 max-w-2xl text-[var(--color-text-secondary)]">
              {t("app.recommendations.subtitle")}
            </p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-lg border border-[var(--color-accent)]/40 px-5 py-3 text-sm font-semibold text-[var(--color-text-accent)] transition hover:bg-[var(--color-bg-elev-2)]"
          >
            {t("app.recommendations.openDashboard")}
          </Link>
        </div>

        <section className="mt-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm text-[var(--color-text-secondary)]">
              {t("app.recommendations.keywords")}
              <input
                className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
                value={keywords}
                onChange={(event) => setKeywords(event.target.value)}
                placeholder={t("app.recommendations.keywordsPh")}
              />
            </label>

            <label className="text-sm text-[var(--color-text-secondary)]">
              {t("app.recommendations.location")}
              <input
                className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder={t("app.recommendations.locationPh")}
              />
            </label>

            <label className="text-sm text-[var(--color-text-secondary)]">
              {t("app.recommendations.postedWithin")}
              <select
                className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] focus:outline-none"
                value={postedWithinDays}
                onChange={(event) =>
                  setPostedWithinDays(Number(event.target.value))
                }
              >
                <option value={1}>{t("app.recommendations.pastDay")}</option>
                <option value={3}>{t("app.recommendations.past3")}</option>
                <option value={7}>{t("app.recommendations.past7")}</option>
                <option value={14}>{t("app.recommendations.past14")}</option>
                <option value={30}>{t("app.recommendations.past30")}</option>
              </select>
            </label>

            <label className="text-sm text-[var(--color-text-secondary)]">
              {t("app.recommendations.results")}
              <select
                className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] focus:outline-none"
                value={resultsPerPage}
                onChange={(event) =>
                  setResultsPerPage(Number(event.target.value))
                }
              >
                <option value={10}>
                  {t("app.recommendations.jobsCount", { n: 10 })}
                </option>
                <option value={20}>
                  {t("app.recommendations.jobsCount", { n: 20 })}
                </option>
                <option value={30}>
                  {t("app.recommendations.jobsCount", { n: 30 })}
                </option>
                <option value={50}>
                  {t("app.recommendations.jobsCount", { n: 50 })}
                </option>
              </select>
            </label>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <label className="text-sm text-[var(--color-text-secondary)]">
              {t("app.recommendations.salary")}
              <input
                type="number"
                className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
                value={salaryMin}
                onChange={(event) => setSalaryMin(event.target.value)}
                placeholder={t("app.recommendations.salaryPh")}
              />
            </label>

            <label className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
              <input
                type="checkbox"
                checked={remoteOnly}
                onChange={(event) => setRemoteOnly(event.target.checked)}
              />
              {t("app.recommendations.remoteOnly")}
            </label>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleFindJobs}
              disabled={loading}
              className="rounded-lg bg-[var(--color-accent)] px-5 py-3 font-semibold text-[var(--color-accent-text)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? t("app.recommendations.searching")
                : t("app.recommendations.findJobs")}
            </button>

            <p className="text-sm text-[var(--color-text-muted)]">
              {t("app.recommendations.hint")}
            </p>
          </div>
        </section>

        {error && (
          <div className="mt-6 rounded-lg border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-4 text-sm text-[var(--color-danger-text)]">
            {error}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between text-sm text-[var(--color-text-secondary)]">
          <p>
            {t("app.recommendations.countFound", { n: recommendations.length })}
          </p>
        </div>

        <section className="mt-6 grid gap-5">
          {recommendations.map((job) => (
            <article
              key={job.recommendation_id}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-6"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 px-3 py-1 text-xs text-[var(--color-text-accent)]">
                      {t("app.recommendations.matchBadge", {
                        score: job.match_score,
                      })}
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {job.source.toUpperCase()} ·{" "}
                      {formatDate(job.posting_date, locale)}
                    </span>
                  </div>

                  <h2 className="mt-4 text-2xl font-bold text-[var(--color-text-primary)]">
                    {job.title}
                  </h2>
                  <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                    {job.company || t("app.recommendations.companyMissing")} ·{" "}
                    {job.location ||
                      t("app.recommendations.locationMissing")}{" "}
                    · {job.work_mode}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {job.required_skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-[var(--color-accent)]/15 px-3 py-1 text-xs text-[var(--color-text-accent)]"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => handleSave(job)}
                    disabled={
                      savingId === job.recommendation_id ||
                      savedIds.has(job.recommendation_id)
                    }
                    className="rounded-lg bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-[var(--color-accent-text)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savedIds.has(job.recommendation_id)
                      ? t("app.recommendations.saved")
                      : savingId === job.recommendation_id
                        ? t("app.recommendations.saving")
                        : t("app.recommendations.saveToDashboard")}
                  </button>

                  {job.external_url && (
                    <a
                      href={job.external_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-[var(--color-accent)]/40 px-5 py-3 text-sm font-semibold text-[var(--color-text-accent)] transition hover:bg-[var(--color-bg-elev-2)]"
                    >
                      {t("app.recommendations.viewSource")}
                    </a>
                  )}
                </div>
              </div>

              <p className="mt-5 text-sm leading-6 text-[var(--color-text-secondary)]">
                {job.summary}
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <Meta
                  label={t("app.recommendations.metaSalary")}
                  value={job.salary_range || t("app.recommendations.metaUnknown")}
                />
                <Meta
                  label={t("app.recommendations.metaType")}
                  value={job.employment_type}
                />
                <Meta
                  label={t("app.recommendations.metaMissing")}
                  value={
                    job.missing_skills.join(", ") ||
                    t("app.recommendations.none")
                  }
                />
              </div>

              <div className="mt-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-4">
                <h3 className="text-sm font-semibold text-[var(--color-text-accent)]">
                  {t("app.recommendations.whyMatched")}
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-secondary)]">
                  {job.match_reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-3">
      <p className="text-xs uppercase text-[var(--color-text-muted)]">{label}</p>
      <p className="mt-1 text-sm text-[var(--color-text-primary)]">
        {value || "—"}
      </p>
    </div>
  );
}

function formatDate(value: string, locale: string) {
  if (!value) return "—";
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return value;
  const intlLocale = locale === "zh" ? "zh-CN" : "en-US";
  return new Intl.DateTimeFormat(intlLocale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
}

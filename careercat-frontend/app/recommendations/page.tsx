"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { discoverAdzunaJobs, saveJobRecommendation } from "@/lib/api";
import type { AgentAssistResponse, JobRecommendation } from "@/lib/types";
import { useLocalUserId } from "@/lib/useLocalUserId";

type DiscoveryResponse = {
  recommendations: JobRecommendation[];
};

export default function RecommendationsPage() {
  const userId = useLocalUserId();
  const [keywords, setKeywords] = useState("Data Analyst");
  const [location, setLocation] = useState("Chicago");
  const [postedWithinDays, setPostedWithinDays] = useState(7);
  const [resultsPerPage, setResultsPerPage] = useState(20);
  const [salaryMin, setSalaryMin] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [recommendations, setRecommendations] = useState<JobRecommendation[]>([]);
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
      setError("Local account is still loading. Please try again.");
      return;
    }

    if (!keywords.trim()) {
      setError("Add at least one job keyword.");
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
      setError("Failed to fetch jobs from Adzuna.");
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
      setError("Failed to save this recommendation.");
    } finally {
      setSavingId("");
    }
  };

  return (
    <main className="min-h-screen bg-[#011A55] text-white">
      <Header />

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-[#FFB238]">
              Adzuna Job Discovery
            </p>
            <h1 className="mt-3 text-4xl font-bold text-[#FFB238]">
              Find Fresh Job Matches
            </h1>
            <p className="mt-4 max-w-2xl text-slate-300">
              Search Adzuna by keyword, location, salary, and posting window.
              CareerCat ranks the results against your saved profile and lets
              you send the best ones to Dashboard.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-lg border border-[#FFB238]/40 px-5 py-3 text-sm font-semibold text-[#FFB238] transition hover:bg-white/10"
          >
            Open Dashboard
          </Link>
        </div>

        <section className="mt-10 rounded-lg border border-white/10 bg-white/5 p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm text-slate-300">
              Keywords
              <input
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 p-3 text-white placeholder-slate-400 focus:outline-none"
                value={keywords}
                onChange={(event) => setKeywords(event.target.value)}
                placeholder="Data Analyst, ML Engineer..."
              />
            </label>

            <label className="text-sm text-slate-300">
              Location
              <input
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 p-3 text-white placeholder-slate-400 focus:outline-none"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Chicago, New York, Remote..."
              />
            </label>

            <label className="text-sm text-slate-300">
              Posted Within
              <select
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 p-3 text-white focus:outline-none"
                value={postedWithinDays}
                onChange={(event) => setPostedWithinDays(Number(event.target.value))}
              >
                <option value={1}>Past day</option>
                <option value={3}>Past 3 days</option>
                <option value={7}>Past 7 days</option>
                <option value={14}>Past 14 days</option>
                <option value={30}>Past 30 days</option>
              </select>
            </label>

            <label className="text-sm text-slate-300">
              Results
              <select
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 p-3 text-white focus:outline-none"
                value={resultsPerPage}
                onChange={(event) => setResultsPerPage(Number(event.target.value))}
              >
                <option value={10}>10 jobs</option>
                <option value={20}>20 jobs</option>
                <option value={30}>30 jobs</option>
                <option value={50}>50 jobs</option>
              </select>
            </label>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <label className="text-sm text-slate-300">
              Minimum Salary
              <input
                type="number"
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 p-3 text-white placeholder-slate-400 focus:outline-none"
                value={salaryMin}
                onChange={(event) => setSalaryMin(event.target.value)}
                placeholder="80000"
              />
            </label>

            <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={remoteOnly}
                onChange={(event) => setRemoteOnly(event.target.checked)}
              />
              Remote only
            </label>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleFindJobs}
              disabled={loading}
              className="rounded-lg bg-[#FFB238] px-5 py-3 font-semibold text-[#011A55] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Searching..." : "Find Jobs"}
            </button>

            <p className="text-sm text-slate-400">
              Results are ranked with your saved profile skills when available.
            </p>
          </div>
        </section>

        {error && (
          <div className="mt-6 rounded-lg border border-red-300/30 bg-red-500/10 p-4 text-sm text-red-100">
            {error}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between text-sm text-slate-300">
          <p>{recommendations.length} recommendations found.</p>
        </div>

        <section className="mt-6 grid gap-5">
          {recommendations.map((job) => (
            <article
              key={job.recommendation_id}
              className="rounded-lg border border-white/10 bg-white/5 p-6"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-[#FFB238]/40 bg-[#FFB238]/10 px-3 py-1 text-xs text-[#FFB238]">
                      Match {job.match_score}
                    </span>
                    <span className="text-xs text-slate-400">
                      {job.source.toUpperCase()} · {formatDate(job.posting_date)}
                    </span>
                  </div>

                  <h2 className="mt-4 text-2xl font-bold text-white">
                    {job.title}
                  </h2>
                  <p className="mt-2 text-sm text-slate-300">
                    {job.company || "Company not listed"} ·{" "}
                    {job.location || "Location unknown"} · {job.work_mode}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {job.required_skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-[#FFB238]/15 px-3 py-1 text-xs text-[#FFB238]"
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
                    className="rounded-lg bg-[#FFB238] px-5 py-3 text-sm font-semibold text-[#011A55] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savedIds.has(job.recommendation_id)
                      ? "Saved"
                      : savingId === job.recommendation_id
                        ? "Saving..."
                        : "Save to Dashboard"}
                  </button>

                  {job.external_url && (
                    <a
                      href={job.external_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-[#FFB238]/40 px-5 py-3 text-sm font-semibold text-[#FFB238] transition hover:bg-white/10"
                    >
                      View Source
                    </a>
                  )}
                </div>
              </div>

              <p className="mt-5 text-sm leading-6 text-slate-300">
                {job.summary}
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <Meta label="Salary" value={job.salary_range || "Unknown"} />
                <Meta label="Type" value={job.employment_type} />
                <Meta label="Missing Skills" value={job.missing_skills.join(", ") || "None"} />
              </div>

              <div className="mt-5 rounded-lg border border-white/10 bg-white/5 p-4">
                <h3 className="text-sm font-semibold text-[#FFB238]">
                  Why this matched
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
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
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <p className="text-xs uppercase text-slate-400">{label}</p>
      <p className="mt-1 text-sm text-white">{value || "Unknown"}</p>
    </div>
  );
}

function formatDate(value: string) {
  if (!value) return "Unknown";
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
}

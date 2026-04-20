"use client";

import Link from "next/link";
import { useState } from "react";
import Header from "@/components/Header";
import { importJobPost } from "@/lib/api";
import type { JobPost } from "@/lib/types";
import { useLocalUserId } from "@/lib/useLocalUserId";

type ImportResult = {
  message: string;
  parsed_job: JobPost;
  blocked?: boolean;
  warning?: string | null;
};

export default function ImportJobsPage() {
  const userId = useLocalUserId();
  const [jobText, setJobText] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleImportJob = async () => {
    if (!userId) {
      setError("Local account is still loading. Please try again.");
      return;
    }

    if (!jobText.trim()) {
      setError("Paste a job post before importing.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = (await importJobPost({
        user_id: userId,
        raw_job_text: jobText,
      })) as ImportResult;

      if (data.blocked) {
        const saveAnyway = window.confirm(
          `${data.warning || "This job may not match your sponsorship settings."}\n\nSave it to your dashboard anyway?`
        );

        if (!saveAnyway) {
          setResult(data);
          setError("Job was parsed but not saved because of sponsorship settings.");
          return;
        }

        const forcedData = (await importJobPost({
          user_id: userId,
          raw_job_text: jobText,
          force_save: true,
        })) as ImportResult;

        setResult(forcedData);
        return;
      }

      setResult(data);
    } catch (importError) {
      console.error(importError);
      setError("Failed to parse and save this job post.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#011A55] text-white">
      <Header />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="max-w-3xl">
          <p className="text-sm font-medium text-[#FFB238]">
            AI Job Parser
          </p>
          <h1 className="mt-3 text-4xl font-bold text-[#FFB238]">
            Import a Job Post
          </h1>
          <p className="mt-4 text-slate-300">
            Paste one job description. CareerCat will extract the role,
            location, salary, skills, sponsorship notes, and requirements, then
            save it to your dashboard.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <section className="rounded-lg border border-white/10 bg-white/5 p-6">
            <label className="text-sm font-semibold text-[#FFB238]">
              Job Description
            </label>
            <textarea
              placeholder="Paste the full job description here..."
              className="mt-4 min-h-[420px] w-full rounded-lg border border-white/10 bg-white/10 p-4 text-white placeholder-slate-400 focus:outline-none"
              value={jobText}
              onChange={(event) => setJobText(event.target.value)}
            />

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleImportJob}
                disabled={loading}
                className="rounded-lg bg-[#FFB238] px-5 py-3 font-semibold text-[#011A55] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Parsing with AI..." : "Parse and Save Job"}
              </button>

              <Link
                href="/dashboard"
                className="rounded-lg border border-[#FFB238]/40 px-5 py-3 text-sm font-medium text-[#FFB238] transition hover:bg-white/10"
              >
                Open Dashboard
              </Link>
            </div>

            {error && (
              <div className="mt-4 rounded-lg border border-red-300/30 bg-red-500/10 p-4 text-sm text-red-100">
                {error}
              </div>
            )}
          </section>

          <aside className="rounded-lg border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold text-[#FFB238]">
              Parsed Preview
            </h2>

            {!result ? (
              <p className="mt-4 text-sm leading-6 text-slate-300">
                Parsed job details will appear here after import. New jobs are
                saved with status Not Applied.
              </p>
            ) : (
              <div className="mt-5 space-y-5">
                <div>
                  <p className="text-xs uppercase text-slate-400">Role</p>
                  <h3 className="mt-1 text-xl font-semibold text-white">
                    {result.parsed_job.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-300">
                    {result.parsed_job.company || "Company not listed"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Info label="Location" value={result.parsed_job.location} />
                  <Info label="Work Mode" value={result.parsed_job.work_mode} />
                  <Info label="Salary" value={result.parsed_job.salary_range} />
                  <Info
                    label="Sponsorship"
                    value={result.parsed_job.visa_sponsorship}
                  />
                </div>

                {result.blocked && (
                  <div className="rounded-lg border border-red-300/30 bg-red-500/10 p-4 text-sm text-red-100">
                    {result.warning}
                  </div>
                )}

                <div>
                  <p className="text-xs uppercase text-slate-400">
                    Required Skills
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {result.parsed_job.required_skills.length > 0 ? (
                      result.parsed_job.required_skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full bg-[#FFB238]/15 px-3 py-1 text-xs text-[#FFB238]"
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-400">
                        No skills detected.
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-sm leading-6 text-slate-300">
                  {result.parsed_job.summary}
                </p>
              </div>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <p className="text-xs uppercase text-slate-400">{label}</p>
      <p className="mt-1 text-sm text-white">{value || "Unknown"}</p>
    </div>
  );
}

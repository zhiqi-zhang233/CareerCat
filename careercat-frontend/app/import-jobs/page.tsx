"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Header from "@/components/Header";
import { createJobPost, parseJobPost } from "@/lib/api";
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
  const [draftJob, setDraftJob] = useState<JobPost | null>(null);
  const [warning, setWarning] = useState("");
  const [error, setError] = useState("");
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");

  const skillPreview = useMemo(
    () => draftJob?.required_skills.filter(Boolean).slice(0, 12) || [],
    [draftJob]
  );

  const handleParseJob = async () => {
    if (!userId) {
      setError("Your account is still loading. Please try again.");
      return;
    }

    if (!jobText.trim()) {
      setError("Paste a job post before parsing.");
      return;
    }

    try {
      setParsing(true);
      setError("");
      setSavedMessage("");
      const data = (await parseJobPost({
        user_id: userId,
        raw_job_text: jobText,
      })) as ImportResult;
      setDraftJob(normalizeJob(data.parsed_job));
      setWarning(data.warning || "");
    } catch (parseError) {
      console.error(parseError);
      setError("Failed to parse this job post.");
      setDraftJob(null);
      setWarning("");
    } finally {
      setParsing(false);
    }
  };

  const handleSaveJob = async (forceSave = false) => {
    if (!userId || !draftJob) return;

    try {
      setSaving(true);
      setError("");
      setSavedMessage("");

      const data = (await createJobPost({
        user_id: userId,
        company: draftJob.company,
        title: draftJob.title,
        location: draftJob.location,
        work_mode: draftJob.work_mode,
        employment_type: draftJob.employment_type,
        seniority: draftJob.seniority,
        visa_sponsorship: draftJob.visa_sponsorship,
        salary_range: draftJob.salary_range,
        posting_date: draftJob.posting_date,
        required_skills: draftJob.required_skills,
        preferred_skills: draftJob.preferred_skills,
        requirements: draftJob.requirements,
        responsibilities: draftJob.responsibilities,
        summary: draftJob.summary,
        raw_job_text: draftJob.raw_job_text,
        status: draftJob.status,
        application_date: draftJob.application_date,
        notes: draftJob.notes,
        force_save: forceSave,
      })) as ImportResult;

      if (data.blocked && !forceSave) {
        const saveAnyway = window.confirm(
          `${data.warning || "This job may not match your sponsorship settings."}\n\nSave it anyway?`
        );

        if (saveAnyway) {
          await handleSaveJob(true);
        } else {
          setWarning(data.warning || "");
          setError("Review the parsed content before saving.");
        }
        return;
      }

      setDraftJob(normalizeJob(data.parsed_job));
      setWarning("");
      setSavedMessage("Job saved to your dashboard.");
    } catch (saveError) {
      console.error(saveError);
      setError("Failed to save this job.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#011A55] text-white">
      <Header />

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="max-w-3xl">
          <p className="text-sm font-medium text-[#FFB238]">AI Job Parser</p>
          <h1 className="mt-3 text-4xl font-bold text-[#FFB238]">
            Import a Job Post
          </h1>
          <p className="mt-4 text-slate-300">
            Paste one job description, let CareerCat parse it, review the
            extracted fields, edit anything that looks wrong, and then save the
            final version to your dashboard.
          </p>
        </div>

        <div className="mt-10 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
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
                onClick={handleParseJob}
                disabled={parsing}
                className="rounded-lg bg-[#FFB238] px-5 py-3 font-semibold text-[#011A55] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {parsing ? "Parsing with AI..." : "Parse Job"}
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

            {savedMessage && (
              <div className="mt-4 rounded-lg border border-green-300/30 bg-green-500/10 p-4 text-sm text-green-100">
                {savedMessage}
              </div>
            )}
          </section>

          <aside className="rounded-lg border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-[#FFB238]">
                Editable Parsed Preview
              </h2>
              {draftJob && (
                <button
                  type="button"
                  onClick={() => handleSaveJob(false)}
                  disabled={saving}
                  className="rounded-lg bg-[#FFB238] px-4 py-2 text-sm font-semibold text-[#011A55] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save to Dashboard"}
                </button>
              )}
            </div>

            {!draftJob ? (
              <p className="mt-4 text-sm leading-6 text-slate-300">
                Parsed job details will appear here after AI parsing. You can
                edit the extracted content before saving.
              </p>
            ) : (
              <div className="mt-5 space-y-5">
                {warning && (
                  <div className="rounded-lg border border-red-300/30 bg-red-500/10 p-4 text-sm text-red-100">
                    {warning}
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <TextField
                    label="Job Title"
                    value={draftJob.title}
                    onChange={(value) => setDraftJob((current) => current ? { ...current, title: value } : current)}
                  />
                  <TextField
                    label="Company"
                    value={draftJob.company}
                    onChange={(value) => setDraftJob((current) => current ? { ...current, company: value } : current)}
                  />
                  <TextField
                    label="Location"
                    value={draftJob.location}
                    onChange={(value) => setDraftJob((current) => current ? { ...current, location: value } : current)}
                  />
                  <TextField
                    label="Salary"
                    value={draftJob.salary_range}
                    onChange={(value) => setDraftJob((current) => current ? { ...current, salary_range: value } : current)}
                  />
                  <TextField
                    label="Work Mode"
                    value={draftJob.work_mode}
                    onChange={(value) => setDraftJob((current) => current ? { ...current, work_mode: value } : current)}
                  />
                  <TextField
                    label="Employment Type"
                    value={draftJob.employment_type}
                    onChange={(value) => setDraftJob((current) => current ? { ...current, employment_type: value } : current)}
                  />
                  <TextField
                    label="Seniority"
                    value={draftJob.seniority}
                    onChange={(value) => setDraftJob((current) => current ? { ...current, seniority: value } : current)}
                  />
                  <TextField
                    label="Sponsorship"
                    value={draftJob.visa_sponsorship}
                    onChange={(value) => setDraftJob((current) => current ? { ...current, visa_sponsorship: value } : current)}
                  />
                  <TextField
                    label="Posting Date"
                    value={draftJob.posting_date}
                    onChange={(value) => setDraftJob((current) => current ? { ...current, posting_date: value } : current)}
                  />
                </div>

                <ListEditor
                  label="Required Skills"
                  value={draftJob.required_skills}
                  onChange={(value) => setDraftJob((current) => current ? { ...current, required_skills: value } : current)}
                  placeholder="Python, SQL, Tableau"
                />

                <ListEditor
                  label="Preferred Skills"
                  value={draftJob.preferred_skills}
                  onChange={(value) => setDraftJob((current) => current ? { ...current, preferred_skills: value } : current)}
                  placeholder="dbt, Airflow, Snowflake"
                />

                <ListEditor
                  label="Requirements"
                  value={draftJob.requirements}
                  onChange={(value) => setDraftJob((current) => current ? { ...current, requirements: value } : current)}
                  placeholder="One requirement per line"
                  multiline
                />

                <ListEditor
                  label="Responsibilities"
                  value={draftJob.responsibilities}
                  onChange={(value) => setDraftJob((current) => current ? { ...current, responsibilities: value } : current)}
                  placeholder="One responsibility per line"
                  multiline
                />

                <TextAreaField
                  label="Summary"
                  value={draftJob.summary}
                  onChange={(value) => setDraftJob((current) => current ? { ...current, summary: value } : current)}
                  rows={5}
                />

                <details className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-[#FFB238]">
                    Raw job text
                  </summary>
                  <TextAreaField
                    label=""
                    value={draftJob.raw_job_text}
                    onChange={(value) => {
                      setDraftJob((current) =>
                        current ? { ...current, raw_job_text: value } : current
                      );
                      setJobText(value);
                    }}
                    rows={10}
                  />
                </details>

                {skillPreview.length > 0 && (
                  <div>
                    <p className="text-xs uppercase text-slate-400">
                      Quick Skill Preview
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {skillPreview.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full bg-[#FFB238]/15 px-3 py-1 text-xs text-[#FFB238]"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}

function normalizeJob(job: JobPost): JobPost {
  return {
    job_id: job.job_id || "",
    user_id: job.user_id,
    company: job.company || "",
    title: job.title || "",
    location: job.location || "",
    work_mode: job.work_mode || "Unknown",
    employment_type: job.employment_type || "Unknown",
    seniority: job.seniority || "Unknown",
    visa_sponsorship: job.visa_sponsorship || "Unknown",
    salary_range: job.salary_range || "",
    posting_date: job.posting_date || "",
    required_skills: job.required_skills || [],
    preferred_skills: job.preferred_skills || [],
    requirements: job.requirements || [],
    responsibilities: job.responsibilities || [],
    summary: job.summary || "",
    raw_job_text: job.raw_job_text || "",
    status: job.status || "not_applied",
    application_date: job.application_date || "",
    notes: job.notes || "",
    created_at: job.created_at,
    updated_at: job.updated_at,
  };
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm text-slate-300">
      {label}
      <input
        className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 p-3 text-white placeholder-slate-400 focus:outline-none"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  rows,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
}) {
  return (
    <label className="block text-sm text-slate-300">
      {label && <span>{label}</span>}
      <textarea
        className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 p-3 text-white placeholder-slate-400 focus:outline-none"
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function ListEditor({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  const serialized = multiline ? value.join("\n") : value.join(", ");

  const handleChange = (nextValue: string) => {
    const items = multiline
      ? nextValue.split("\n")
      : nextValue.split(",");

    onChange(
      items
        .map((item) => item.trim())
        .filter(Boolean)
    );
  };

  if (multiline) {
    return (
      <label className="block text-sm text-slate-300">
        {label}
        <textarea
          className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 p-3 text-white placeholder-slate-400 focus:outline-none"
          rows={5}
          value={serialized}
          placeholder={placeholder}
          onChange={(event) => handleChange(event.target.value)}
        />
      </label>
    );
  }

  return (
    <label className="block text-sm text-slate-300">
      {label}
      <input
        className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 p-3 text-white placeholder-slate-400 focus:outline-none"
        value={serialized}
        placeholder={placeholder}
        onChange={(event) => handleChange(event.target.value)}
      />
    </label>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Header from "@/components/Header";
import { createJobPost, parseJobPost } from "@/lib/api";
import type { JobPost } from "@/lib/types";
import { useLocalUserId } from "@/lib/useLocalUserId";
import { useT } from "@/lib/i18n/LocaleProvider";

type ImportResult = {
  message: string;
  parsed_job: JobPost;
  blocked?: boolean;
  warning?: string | null;
};

export default function ImportJobsPage() {
  const t = useT();
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
      setError(t("app.importJobs.errAccountLoading"));
      return;
    }

    if (!jobText.trim()) {
      setError(t("app.importJobs.errEmpty"));
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
      setError(t("app.importJobs.errParse"));
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
          `${data.warning || t("app.importJobs.defaultBlockedWarning")}\n\n${t("app.importJobs.saveAnyway")}`
        );

        if (saveAnyway) {
          await handleSaveJob(true);
        } else {
          setWarning(data.warning || "");
          setError(t("app.importJobs.reviewBeforeSaving"));
        }
        return;
      }

      setDraftJob(normalizeJob(data.parsed_job));
      setWarning("");
      setSavedMessage(t("app.importJobs.savedMessage"));
    } catch (saveError) {
      console.error(saveError);
      setError(t("app.importJobs.errSave"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen text-[var(--color-text-primary)]">
      <Header />

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="max-w-3xl">
          <p className="text-sm font-medium text-[var(--color-text-accent)]">
            {t("app.importJobs.eyebrow")}
          </p>
          <h1 className="mt-3 text-4xl font-bold text-[var(--color-text-accent)]">
            {t("app.importJobs.title")}
          </h1>
          <p className="mt-4 text-[var(--color-text-secondary)]">
            {t("app.importJobs.subtitle")}
          </p>
        </div>

        <div className="mt-10 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-6">
            <label className="text-sm font-semibold text-[var(--color-text-accent)]">
              {t("app.importJobs.jdLabel")}
            </label>
            <textarea
              placeholder={t("app.importJobs.jdPlaceholder")}
              className="mt-4 min-h-[420px] w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-4 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
              value={jobText}
              onChange={(event) => setJobText(event.target.value)}
            />

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleParseJob}
                disabled={parsing}
                className="rounded-lg bg-[var(--color-accent)] px-5 py-3 font-semibold text-[var(--color-accent-text)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {parsing
                  ? t("app.importJobs.parsingBtn")
                  : t("app.importJobs.parseBtn")}
              </button>

              <Link
                href="/dashboard"
                className="rounded-lg border border-[var(--color-accent)]/40 px-5 py-3 text-sm font-medium text-[var(--color-text-accent)] transition hover:bg-[var(--color-bg-elev-2)]"
              >
                {t("app.importJobs.openDashboard")}
              </Link>
            </div>

            {error && (
              <div className="mt-4 rounded-lg border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-4 text-sm text-[var(--color-danger-text)]">
                {error}
              </div>
            )}

            {savedMessage && (
              <div className="mt-4 rounded-lg border border-[var(--color-success-border)] bg-[var(--color-success-bg)] p-4 text-sm text-[var(--color-success-text)]">
                {savedMessage}
              </div>
            )}
          </section>

          <aside className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-[var(--color-text-accent)]">
                {t("app.importJobs.previewTitle")}
              </h2>
              {draftJob && (
                <button
                  type="button"
                  onClick={() => handleSaveJob(false)}
                  disabled={saving}
                  className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-accent-text)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? t("app.importJobs.savingBtn")
                    : t("app.importJobs.saveBtn")}
                </button>
              )}
            </div>

            {!draftJob ? (
              <p className="mt-4 text-sm leading-6 text-[var(--color-text-secondary)]">
                {t("app.importJobs.previewEmpty")}
              </p>
            ) : (
              <div className="mt-5 space-y-5">
                {warning && (
                  <div className="rounded-lg border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-4 text-sm text-[var(--color-danger-text)]">
                    {warning}
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <TextField
                    label={t("app.importJobs.fJobTitle")}
                    value={draftJob.title}
                    onChange={(value) =>
                      setDraftJob((current) =>
                        current ? { ...current, title: value } : current
                      )
                    }
                  />
                  <TextField
                    label={t("app.importJobs.fCompany")}
                    value={draftJob.company}
                    onChange={(value) =>
                      setDraftJob((current) =>
                        current ? { ...current, company: value } : current
                      )
                    }
                  />
                  <TextField
                    label={t("app.importJobs.fLocation")}
                    value={draftJob.location}
                    onChange={(value) =>
                      setDraftJob((current) =>
                        current ? { ...current, location: value } : current
                      )
                    }
                  />
                  <TextField
                    label={t("app.importJobs.fSalary")}
                    value={draftJob.salary_range}
                    onChange={(value) =>
                      setDraftJob((current) =>
                        current ? { ...current, salary_range: value } : current
                      )
                    }
                  />
                  <TextField
                    label={t("app.importJobs.fWorkMode")}
                    value={draftJob.work_mode}
                    onChange={(value) =>
                      setDraftJob((current) =>
                        current ? { ...current, work_mode: value } : current
                      )
                    }
                  />
                  <TextField
                    label={t("app.importJobs.fEmploymentType")}
                    value={draftJob.employment_type}
                    onChange={(value) =>
                      setDraftJob((current) =>
                        current
                          ? { ...current, employment_type: value }
                          : current
                      )
                    }
                  />
                  <TextField
                    label={t("app.importJobs.fSeniority")}
                    value={draftJob.seniority}
                    onChange={(value) =>
                      setDraftJob((current) =>
                        current ? { ...current, seniority: value } : current
                      )
                    }
                  />
                  <TextField
                    label={t("app.importJobs.fSponsorship")}
                    value={draftJob.visa_sponsorship}
                    onChange={(value) =>
                      setDraftJob((current) =>
                        current
                          ? { ...current, visa_sponsorship: value }
                          : current
                      )
                    }
                  />
                  <TextField
                    label={t("app.importJobs.fPostingDate")}
                    value={draftJob.posting_date}
                    onChange={(value) =>
                      setDraftJob((current) =>
                        current ? { ...current, posting_date: value } : current
                      )
                    }
                  />
                </div>

                <ListEditor
                  label={t("app.importJobs.fRequiredSkills")}
                  value={draftJob.required_skills}
                  onChange={(value) =>
                    setDraftJob((current) =>
                      current ? { ...current, required_skills: value } : current
                    )
                  }
                  placeholder={t("app.importJobs.phRequiredSkills")}
                />

                <ListEditor
                  label={t("app.importJobs.fPreferredSkills")}
                  value={draftJob.preferred_skills}
                  onChange={(value) =>
                    setDraftJob((current) =>
                      current
                        ? { ...current, preferred_skills: value }
                        : current
                    )
                  }
                  placeholder={t("app.importJobs.phPreferredSkills")}
                />

                <ListEditor
                  label={t("app.importJobs.fRequirements")}
                  value={draftJob.requirements}
                  onChange={(value) =>
                    setDraftJob((current) =>
                      current ? { ...current, requirements: value } : current
                    )
                  }
                  placeholder={t("app.importJobs.phRequirements")}
                  multiline
                />

                <ListEditor
                  label={t("app.importJobs.fResponsibilities")}
                  value={draftJob.responsibilities}
                  onChange={(value) =>
                    setDraftJob((current) =>
                      current
                        ? { ...current, responsibilities: value }
                        : current
                    )
                  }
                  placeholder={t("app.importJobs.phResponsibilities")}
                  multiline
                />

                <TextAreaField
                  label={t("app.importJobs.fSummary")}
                  value={draftJob.summary}
                  onChange={(value) =>
                    setDraftJob((current) =>
                      current ? { ...current, summary: value } : current
                    )
                  }
                  rows={5}
                />

                <details className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-[var(--color-text-accent)]">
                    {t("app.importJobs.rawHeading")}
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
                    <p className="text-xs uppercase text-[var(--color-text-muted)]">
                      {t("app.importJobs.skillPreview")}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {skillPreview.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full bg-[var(--color-accent)]/15 px-3 py-1 text-xs text-[var(--color-text-accent)]"
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
    <label className="text-sm text-[var(--color-text-secondary)]">
      {label}
      <input
        className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
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
    <label className="block text-sm text-[var(--color-text-secondary)]">
      {label && <span>{label}</span>}
      <textarea
        className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
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
    const items = multiline ? nextValue.split("\n") : nextValue.split(",");

    onChange(items.map((item) => item.trim()).filter(Boolean));
  };

  if (multiline) {
    return (
      <label className="block text-sm text-[var(--color-text-secondary)]">
        {label}
        <textarea
          className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
          rows={5}
          value={serialized}
          placeholder={placeholder}
          onChange={(event) => handleChange(event.target.value)}
        />
      </label>
    );
  }

  return (
    <label className="block text-sm text-[var(--color-text-secondary)]">
      {label}
      <input
        className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
        value={serialized}
        placeholder={placeholder}
        onChange={(event) => handleChange(event.target.value)}
      />
    </label>
  );
}

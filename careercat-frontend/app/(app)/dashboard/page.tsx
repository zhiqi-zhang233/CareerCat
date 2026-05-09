"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import { deleteJobPost, fetchUserJobs, updateJobPost } from "@/lib/api";
import type { JobApplicationStatus, JobPost, JobUpdatePayload } from "@/lib/types";
import { useLocalUserId } from "@/lib/useLocalUserId";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const STATUS_TONE: Record<JobApplicationStatus, string> = {
  not_applied:
    "border-[var(--color-border)] bg-[var(--color-bg-elev-2)] text-[var(--color-text-secondary)]",
  applied:
    "border-[var(--color-info-border)] bg-[var(--color-info-bg)] text-[var(--color-info-text)]",
  assessment:
    "border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 text-[var(--color-text-accent)]",
  interview:
    "border-[var(--color-info-border)] bg-[var(--color-info-bg)] text-[var(--color-info-text)]",
  offer:
    "border-[var(--color-success-border)] bg-[var(--color-success-bg)] text-[var(--color-success-text)]",
  rejected:
    "border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]",
};

const STATUS_KEY: Record<JobApplicationStatus, string> = {
  not_applied: "app.insights.statusNotApplied",
  applied: "app.insights.statusApplied",
  assessment: "app.insights.statusAssessment",
  interview: "app.insights.statusInterview",
  offer: "app.insights.statusOffer",
  rejected: "app.insights.statusRejected",
};

const STATUS_VALUES: JobApplicationStatus[] = [
  "not_applied",
  "applied",
  "assessment",
  "interview",
  "offer",
  "rejected",
];

type SortKey = "created_at" | "posting_date" | "application_date" | "title";
type SortDirection = "desc" | "asc";
type JobsResponse = { jobs?: JobPost[] };
type JobEditorState = Record<string, JobPost>;

type T = (key: string, params?: Record<string, string | number>) => string;

function readJobs(data: JobsResponse | null | undefined): JobPost[] {
  return Array.isArray(data?.jobs) ? data.jobs : [];
}

export default function DashboardPage() {
  const { t, locale } = useLocale();
  const userId = useLocalUserId();
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyJobId, setBusyJobId] = useState("");
  const [editingJobId, setEditingJobId] = useState("");
  const [drafts, setDrafts] = useState<JobEditorState>({});
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<JobApplicationStatus | "all">("all");
  const [locationFilter, setLocationFilter] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [salaryFilter, setSalaryFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const loadJobs = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError("");
      const data = (await fetchUserJobs(userId)) as JobsResponse;
      setJobs(readJobs(data).map(normalizeJob));
    } catch {
      setJobs([]);
      setError("");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const allSkills = useMemo(() => {
    const skillSet = new Set<string>();
    jobs.forEach((job) => {
      [...job.required_skills, ...job.preferred_skills].forEach((skill) => {
        if (skill) skillSet.add(skill);
      });
    });
    return Array.from(skillSet).sort((a, b) => a.localeCompare(b));
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();
    const locationQuery = locationFilter.trim().toLowerCase();
    const salaryQuery = salaryFilter.trim().toLowerCase();

    return jobs
      .filter((job) => {
        const searchableText = [
          job.title,
          job.company,
          job.location,
          job.summary,
          job.salary_range,
          job.work_mode,
          job.employment_type,
          job.required_skills.join(" "),
          job.preferred_skills.join(" "),
        ]
          .join(" ")
          .toLowerCase();

        const matchesSearch = !query || searchableText.includes(query);
        const matchesStatus = statusFilter === "all" || job.status === statusFilter;
        const matchesLocation =
          !locationQuery || job.location.toLowerCase().includes(locationQuery);
        const matchesSalary =
          !salaryQuery || job.salary_range.toLowerCase().includes(salaryQuery);
        const matchesSkill =
          !skillFilter ||
          [...job.required_skills, ...job.preferred_skills].some(
            (skill) => skill.toLowerCase() === skillFilter.toLowerCase()
          );

        return (
          matchesSearch &&
          matchesStatus &&
          matchesLocation &&
          matchesSalary &&
          matchesSkill
        );
      })
      .sort((a, b) => compareJobs(a, b, sortKey, sortDirection));
  }, [
    jobs,
    locationFilter,
    salaryFilter,
    search,
    skillFilter,
    sortDirection,
    sortKey,
    statusFilter,
  ]);

  const statusCounts = useMemo(() => {
    return STATUS_VALUES.reduce<Record<JobApplicationStatus, number>>(
      (counts, value) => {
        counts[value] = jobs.filter((job) => job.status === value).length;
        return counts;
      },
      {
        not_applied: 0,
        applied: 0,
        assessment: 0,
        interview: 0,
        offer: 0,
        rejected: 0,
      }
    );
  }, [jobs]);

  const handleQuickUpdate = async (job: JobPost, updates: JobUpdatePayload) => {
    if (!userId) return;

    const nextUpdates = { ...updates };
    if (
      nextUpdates.status &&
      nextUpdates.status !== "not_applied" &&
      !job.application_date &&
      !nextUpdates.application_date
    ) {
      nextUpdates.application_date = new Date().toISOString().slice(0, 10);
    }

    const optimisticJob = normalizeJob({ ...job, ...nextUpdates });
    setJobs((currentJobs) =>
      currentJobs.map((currentJob) =>
        currentJob.job_id === job.job_id ? optimisticJob : currentJob
      )
    );

    try {
      setBusyJobId(job.job_id);
      setError("");
      const data = await updateJobPost(userId, job.job_id, nextUpdates);
      setJobs((currentJobs) =>
        currentJobs.map((currentJob) =>
          currentJob.job_id === job.job_id ? normalizeJob(data.job) : currentJob
        )
      );
    } catch (updateError) {
      console.error(updateError);
      setError(t("app.dashboard.errUpdate"));
      await loadJobs();
    } finally {
      setBusyJobId("");
    }
  };

  const beginEdit = (job: JobPost) => {
    setEditingJobId(job.job_id);
    setDrafts((current) => ({
      ...current,
      [job.job_id]: normalizeJob(job),
    }));
  };

  const cancelEdit = (jobId: string) => {
    setEditingJobId("");
    setDrafts((current) => {
      const next = { ...current };
      delete next[jobId];
      return next;
    });
  };

  const updateDraft = (
    jobId: string,
    updater: (draft: JobPost) => JobPost
  ) => {
    setDrafts((current) => {
      const existing = current[jobId];
      if (!existing) return current;
      return {
        ...current,
        [jobId]: normalizeJob(updater(existing)),
      };
    });
  };

  const saveEditedJob = async (jobId: string) => {
    if (!userId) return;
    const draft = drafts[jobId];
    if (!draft) return;

    try {
      setBusyJobId(jobId);
      setError("");
      const payload: JobUpdatePayload = {
        company: draft.company,
        title: draft.title,
        location: draft.location,
        work_mode: draft.work_mode,
        employment_type: draft.employment_type,
        seniority: draft.seniority,
        visa_sponsorship: draft.visa_sponsorship,
        salary_range: draft.salary_range,
        posting_date: draft.posting_date,
        required_skills: draft.required_skills,
        preferred_skills: draft.preferred_skills,
        requirements: draft.requirements,
        responsibilities: draft.responsibilities,
        summary: draft.summary,
        raw_job_text: draft.raw_job_text,
        status: draft.status,
        application_date: draft.application_date,
        notes: draft.notes,
      };
      const data = await updateJobPost(userId, jobId, payload);
      const normalized = normalizeJob(data.job);
      setJobs((currentJobs) =>
        currentJobs.map((currentJob) =>
          currentJob.job_id === jobId ? normalized : currentJob
        )
      );
      cancelEdit(jobId);
    } catch (saveError) {
      console.error(saveError);
      setError(t("app.dashboard.errSaveEdits"));
    } finally {
      setBusyJobId("");
    }
  };

  const handleDeleteJob = async (job: JobPost) => {
    if (!userId) return;
    const confirmed = window.confirm(
      t("app.dashboard.deleteConfirm", {
        title: job.title,
        company: job.company || t("app.dashboard.thisCompany"),
      })
    );

    if (!confirmed) return;

    try {
      setBusyJobId(job.job_id);
      setError("");
      await deleteJobPost(userId, job.job_id);
      setJobs((currentJobs) =>
        currentJobs.filter((currentJob) => currentJob.job_id !== job.job_id)
      );
      if (editingJobId === job.job_id) {
        cancelEdit(job.job_id);
      }
    } catch (deleteError) {
      console.error(deleteError);
      setError(t("app.dashboard.errDelete"));
    } finally {
      setBusyJobId("");
    }
  };

  return (
    <main className="min-h-screen text-[var(--color-text-primary)]">
      <Header />

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--color-text-accent)]">
              {t("app.dashboard.eyebrow")}
            </p>
            <h1 className="mt-3 text-4xl font-bold text-[var(--color-text-accent)]">
              {t("app.dashboard.title")}
            </h1>
            <p className="mt-4 max-w-2xl text-[var(--color-text-secondary)]">
              {t("app.dashboard.subtitle")}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadJobs}
              disabled={loading}
              className="rounded-lg border border-[var(--color-accent)]/40 px-5 py-3 text-sm font-semibold text-[var(--color-text-accent)] transition hover:bg-[var(--color-bg-elev-2)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? t("app.dashboard.refreshing")
                : t("app.dashboard.refresh")}
            </button>
            <Link
              href="/import-jobs"
              className="rounded-lg bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-[var(--color-accent-text)] transition hover:opacity-90"
            >
              {t("app.dashboard.importJob")}
            </Link>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {STATUS_VALUES.map((statusValue) => (
            <button
              type="button"
              key={statusValue}
              onClick={() => setStatusFilter(statusValue)}
              className={`rounded-lg border p-4 text-left transition hover:-translate-y-0.5 ${STATUS_TONE[statusValue]}`}
            >
              <p className="text-xs uppercase opacity-80">
                {t(STATUS_KEY[statusValue])}
              </p>
              <p className="mt-2 text-3xl font-bold">
                {statusCounts[statusValue]}
              </p>
            </button>
          ))}
        </div>

        <section className="mt-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-5">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm text-[var(--color-text-secondary)]">
              {t("app.dashboard.filterSearch")}
              <input
                className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
                placeholder={t("app.dashboard.filterSearchPh")}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            <label className="text-sm text-[var(--color-text-secondary)]">
              {t("app.dashboard.filterStatus")}
              <select
                className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] focus:outline-none"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as JobApplicationStatus | "all")
                }
              >
                <option value="all">{t("app.dashboard.filterAllStatuses")}</option>
                {STATUS_VALUES.map((statusValue) => (
                  <option key={statusValue} value={statusValue}>
                    {t(STATUS_KEY[statusValue])}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-[var(--color-text-secondary)]">
              {t("app.dashboard.filterLocation")}
              <input
                className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
                placeholder={t("app.dashboard.filterLocationPh")}
                value={locationFilter}
                onChange={(event) => setLocationFilter(event.target.value)}
              />
            </label>

            <label className="text-sm text-[var(--color-text-secondary)]">
              {t("app.dashboard.filterSalary")}
              <input
                className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
                placeholder={t("app.dashboard.filterSalaryPh")}
                value={salaryFilter}
                onChange={(event) => setSalaryFilter(event.target.value)}
              />
            </label>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="text-sm text-[var(--color-text-secondary)]">
              {t("app.dashboard.filterSkill")}
              <select
                className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] focus:outline-none"
                value={skillFilter}
                onChange={(event) => setSkillFilter(event.target.value)}
              >
                <option value="">{t("app.dashboard.filterAllSkills")}</option>
                {allSkills.map((skill) => (
                  <option key={skill} value={skill}>
                    {skill}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-[var(--color-text-secondary)]">
              {t("app.dashboard.filterSort")}
              <select
                className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] focus:outline-none"
                value={sortKey}
                onChange={(event) => setSortKey(event.target.value as SortKey)}
              >
                <option value="created_at">{t("app.dashboard.sortCreated")}</option>
                <option value="posting_date">{t("app.dashboard.sortPosting")}</option>
                <option value="application_date">{t("app.dashboard.sortApplication")}</option>
                <option value="title">{t("app.dashboard.sortTitle")}</option>
              </select>
            </label>

            <label className="text-sm text-[var(--color-text-secondary)]">
              {t("app.dashboard.filterDirection")}
              <select
                className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] focus:outline-none"
                value={sortDirection}
                onChange={(event) => setSortDirection(event.target.value as SortDirection)}
              >
                <option value="desc">{t("app.dashboard.directionDesc")}</option>
                <option value="asc">{t("app.dashboard.directionAsc")}</option>
              </select>
            </label>
          </div>
        </section>

        {error && (
          <div className="mt-6 rounded-lg border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-4 text-sm text-[var(--color-danger-text)]">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between text-sm text-[var(--color-text-secondary)]">
          <p>
            {t("app.dashboard.countShowing", {
              n: filteredJobs.length,
              total: jobs.length,
            })}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
              setLocationFilter("");
              setSkillFilter("");
              setSalaryFilter("");
              setSortKey("created_at");
              setSortDirection("desc");
            }}
            className="text-[var(--color-text-accent)] hover:underline"
          >
            {t("app.dashboard.clearFilters")}
          </button>
        </div>

        {filteredJobs.length === 0 ? (
          <section className="mt-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-10 text-center">
            <h2 className="text-xl font-semibold text-[var(--color-text-accent)]">
              {t("app.dashboard.emptyTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--color-text-secondary)]">
              {t("app.dashboard.emptyBody")}
            </p>
          </section>
        ) : (
          <section className="mt-8 grid gap-5">
            {filteredJobs.map((job) => {
              const isEditing = editingJobId === job.job_id;
              const viewJob = isEditing ? drafts[job.job_id] || job : job;

              return (
                <article
                  key={job.job_id}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-6"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <StatusBadge status={viewJob.status} t={t} />
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {t("app.dashboard.importedAt", {
                            date: formatDate(viewJob.created_at, locale, t),
                          })}
                        </span>
                        {busyJobId === job.job_id && (
                          <span className="text-xs text-[var(--color-text-accent)]">
                            {t("app.dashboard.saving")}
                          </span>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <TextField
                            label={t("app.dashboard.fJobTitle")}
                            value={viewJob.title}
                            onChange={(value) =>
                              updateDraft(job.job_id, (draft) => ({ ...draft, title: value }))
                            }
                          />
                          <TextField
                            label={t("app.dashboard.fCompany")}
                            value={viewJob.company}
                            onChange={(value) =>
                              updateDraft(job.job_id, (draft) => ({ ...draft, company: value }))
                            }
                          />
                          <TextField
                            label={t("app.dashboard.fLocation")}
                            value={viewJob.location}
                            onChange={(value) =>
                              updateDraft(job.job_id, (draft) => ({ ...draft, location: value }))
                            }
                          />
                          <TextField
                            label={t("app.dashboard.fWorkMode")}
                            value={viewJob.work_mode}
                            onChange={(value) =>
                              updateDraft(job.job_id, (draft) => ({ ...draft, work_mode: value }))
                            }
                          />
                        </div>
                      ) : (
                        <>
                          <h2 className="mt-4 text-2xl font-bold text-[var(--color-text-primary)]">{viewJob.title}</h2>
                          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                            {viewJob.company || t("app.dashboard.companyMissing")} ·{" "}
                            {viewJob.location || t("app.dashboard.locationMissing")} · {viewJob.work_mode}
                          </p>
                        </>
                      )}

                      <div className="mt-4 flex flex-wrap gap-2">
                        {viewJob.required_skills.slice(0, 12).map((skill) => (
                          <span
                            key={skill}
                            className="rounded-full bg-[var(--color-accent)]/15 px-3 py-1 text-xs text-[var(--color-text-accent)]"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-[440px]">
                      <label className="text-sm text-[var(--color-text-secondary)]">
                        {t("app.dashboard.fStatus")}
                        {isEditing ? (
                          <select
                            className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] focus:outline-none"
                            value={viewJob.status}
                            onChange={(event) =>
                              updateDraft(job.job_id, (draft) => ({
                                ...draft,
                                status: event.target.value as JobApplicationStatus,
                              }))
                            }
                          >
                            {STATUS_VALUES.map((statusValue) => (
                              <option key={statusValue} value={statusValue}>
                                {t(STATUS_KEY[statusValue])}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <select
                            className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] focus:outline-none"
                            value={viewJob.status}
                            onChange={(event) =>
                              handleQuickUpdate(job, {
                                status: event.target.value as JobApplicationStatus,
                              })
                            }
                          >
                            {STATUS_VALUES.map((statusValue) => (
                              <option key={statusValue} value={statusValue}>
                                {t(STATUS_KEY[statusValue])}
                              </option>
                            ))}
                          </select>
                        )}
                      </label>

                      <label className="text-sm text-[var(--color-text-secondary)]">
                        {t("app.dashboard.fAppDate")}
                        {isEditing ? (
                          <input
                            type="date"
                            className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] focus:outline-none"
                            value={normalizeDateInput(viewJob.application_date)}
                            onChange={(event) =>
                              updateDraft(job.job_id, (draft) => ({
                                ...draft,
                                application_date: event.target.value,
                              }))
                            }
                          />
                        ) : (
                          <input
                            type="date"
                            className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] focus:outline-none"
                            value={normalizeDateInput(viewJob.application_date)}
                            onChange={(event) =>
                              handleQuickUpdate(job, {
                                application_date: event.target.value,
                              })
                            }
                          />
                        )}
                      </label>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => saveEditedJob(job.job_id)}
                          disabled={busyJobId === job.job_id}
                          className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-accent-text)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {t("app.dashboard.saveChanges")}
                        </button>
                        <button
                          type="button"
                          onClick={() => cancelEdit(job.job_id)}
                          className="rounded-lg border border-[var(--color-border-strong)] px-4 py-2 text-sm font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-bg-elev-2)]"
                        >
                          {t("app.dashboard.cancel")}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => beginEdit(job)}
                        className="rounded-lg border border-[var(--color-accent)]/40 px-4 py-2 text-sm font-semibold text-[var(--color-text-accent)] transition hover:bg-[var(--color-bg-elev-2)]"
                      >
                        {t("app.dashboard.editJob")}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteJob(job)}
                      disabled={busyJobId === job.job_id}
                      className="rounded-lg border border-[var(--color-danger-border)] px-4 py-2 text-sm font-semibold text-[var(--color-danger-text)] transition hover:bg-[var(--color-danger-bg)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {t("app.dashboard.deleteJob")}
                    </button>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-4">
                    {isEditing ? (
                      <>
                        <TextField
                          label={t("app.dashboard.fSalary")}
                          value={viewJob.salary_range}
                          onChange={(value) =>
                            updateDraft(job.job_id, (draft) => ({
                              ...draft,
                              salary_range: value,
                            }))
                          }
                        />
                        <TextField
                          label={t("app.dashboard.fPostingDate")}
                          value={viewJob.posting_date}
                          onChange={(value) =>
                            updateDraft(job.job_id, (draft) => ({
                              ...draft,
                              posting_date: value,
                            }))
                          }
                        />
                        <TextField
                          label={t("app.dashboard.fEmploymentType")}
                          value={viewJob.employment_type}
                          onChange={(value) =>
                            updateDraft(job.job_id, (draft) => ({
                              ...draft,
                              employment_type: value,
                            }))
                          }
                        />
                        <TextField
                          label={t("app.dashboard.fSponsorship")}
                          value={viewJob.visa_sponsorship}
                          onChange={(value) =>
                            updateDraft(job.job_id, (draft) => ({
                              ...draft,
                              visa_sponsorship: value,
                            }))
                          }
                        />
                      </>
                    ) : (
                      <>
                        <Meta
                          label={t("app.dashboard.fSalary")}
                          value={viewJob.salary_range || t("app.dashboard.unknown")}
                        />
                        <Meta
                          label={t("app.dashboard.fPostingDate")}
                          value={viewJob.posting_date || t("app.dashboard.unknown")}
                        />
                        <Meta
                          label={t("app.dashboard.fType")}
                          value={viewJob.employment_type}
                        />
                        <Meta
                          label={t("app.dashboard.fSponsorship")}
                          value={viewJob.visa_sponsorship}
                        />
                      </>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="mt-5 space-y-4">
                      <ListEditor
                        label={t("app.dashboard.fRequiredSkills")}
                        value={viewJob.required_skills}
                        onChange={(value) =>
                          updateDraft(job.job_id, (draft) => ({
                            ...draft,
                            required_skills: value,
                          }))
                        }
                        placeholder={t("app.dashboard.phRequiredSkills")}
                      />
                      <ListEditor
                        label={t("app.dashboard.fPreferredSkills")}
                        value={viewJob.preferred_skills}
                        onChange={(value) =>
                          updateDraft(job.job_id, (draft) => ({
                            ...draft,
                            preferred_skills: value,
                          }))
                        }
                        placeholder={t("app.dashboard.phPreferredSkills")}
                      />
                      <TextAreaField
                        label={t("app.dashboard.fSummary")}
                        value={viewJob.summary}
                        onChange={(value) =>
                          updateDraft(job.job_id, (draft) => ({
                            ...draft,
                            summary: value,
                          }))
                        }
                        rows={4}
                      />
                    </div>
                  ) : (
                    <p className="mt-5 text-sm leading-6 text-[var(--color-text-secondary)]">
                      {viewJob.summary}
                    </p>
                  )}

                  <details className="mt-5">
                    <summary className="cursor-pointer text-sm font-semibold text-[var(--color-text-accent)]">
                      {isEditing
                        ? t("app.dashboard.detailsToggleEdit")
                        : t("app.dashboard.detailsToggleView")}
                    </summary>

                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      {isEditing ? (
                        <>
                          <ListEditor
                            label={t("app.dashboard.fRequirements")}
                            value={viewJob.requirements}
                            onChange={(value) =>
                              updateDraft(job.job_id, (draft) => ({
                                ...draft,
                                requirements: value,
                              }))
                            }
                            placeholder={t("app.dashboard.phRequirements")}
                            multiline
                          />
                          <ListEditor
                            label={t("app.dashboard.fResponsibilities")}
                            value={viewJob.responsibilities}
                            onChange={(value) =>
                              updateDraft(job.job_id, (draft) => ({
                                ...draft,
                                responsibilities: value,
                              }))
                            }
                            placeholder={t("app.dashboard.phResponsibilities")}
                            multiline
                          />
                        </>
                      ) : (
                        <>
                          <ListBlock
                            title={t("app.dashboard.fRequirements")}
                            items={viewJob.requirements}
                            emptyText={t("app.dashboard.noDetailsExtracted")}
                          />
                          <ListBlock
                            title={t("app.dashboard.fResponsibilities")}
                            items={viewJob.responsibilities}
                            emptyText={t("app.dashboard.noDetailsExtracted")}
                          />
                        </>
                      )}
                    </div>

                    <label className="mt-4 block text-sm text-[var(--color-text-secondary)]">
                      {t("app.dashboard.fNotes")}
                      {isEditing ? (
                        <textarea
                          className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
                          rows={3}
                          value={viewJob.notes}
                          onChange={(event) =>
                            updateDraft(job.job_id, (draft) => ({
                              ...draft,
                              notes: event.target.value,
                            }))
                          }
                          placeholder={t("app.dashboard.fNotesPh")}
                        />
                      ) : (
                        <textarea
                          className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
                          rows={3}
                          value={viewJob.notes}
                          onChange={(event) =>
                            setJobs((currentJobs) =>
                              currentJobs.map((currentJob) =>
                                currentJob.job_id === job.job_id
                                  ? { ...currentJob, notes: event.target.value }
                                  : currentJob
                              )
                            )
                          }
                          onBlur={(event) =>
                            handleQuickUpdate(job, { notes: event.target.value })
                          }
                          placeholder={t("app.dashboard.fNotesPh")}
                        />
                      )}
                    </label>

                    {isEditing && (
                      <TextAreaField
                        label={t("app.dashboard.fRawJobText")}
                        value={viewJob.raw_job_text}
                        onChange={(value) =>
                          updateDraft(job.job_id, (draft) => ({
                            ...draft,
                            raw_job_text: value,
                          }))
                        }
                        rows={8}
                      />
                    )}
                  </details>
                </article>
              );
            })}
          </section>
        )}
      </section>
    </main>
  );
}

function normalizeJob(job: JobPost): JobPost {
  return {
    job_id: job.job_id,
    user_id: job.user_id,
    company: job.company || "",
    title: job.title || "Unknown Title",
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
    fit_score: job.fit_score,
    action_recommendation: job.action_recommendation,
  };
}

function compareJobs(
  first: JobPost,
  second: JobPost,
  sortKey: SortKey,
  direction: SortDirection
) {
  const multiplier = direction === "asc" ? 1 : -1;

  if (sortKey === "title") {
    return first.title.localeCompare(second.title) * multiplier;
  }

  const firstTime = parseDateValue(first[sortKey]);
  const secondTime = parseDateValue(second[sortKey]);
  return (firstTime - secondTime) * multiplier;
}

function parseDateValue(value?: string) {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function normalizeDateInput(value: string) {
  if (!value) return "";
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return "";
  return new Date(timestamp).toISOString().slice(0, 10);
}

function formatDate(value: string | undefined, locale: string, t: T) {
  if (!value) return t("app.dashboard.unknown");
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return value;
  const intlLocale = locale === "zh" ? "zh-CN" : "en-US";
  return new Intl.DateTimeFormat(intlLocale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
}

function StatusBadge({ status, t }: { status: JobApplicationStatus; t: T }) {
  return (
    <span className={`rounded-full border px-3 py-1 text-xs ${STATUS_TONE[status]}`}>
      {t(STATUS_KEY[status])}
    </span>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-3">
      <p className="text-xs uppercase text-[var(--color-text-muted)]">{label}</p>
      <p className="mt-1 text-sm text-[var(--color-text-primary)]">{value || "—"}</p>
    </div>
  );
}

function ListBlock({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: string[];
  emptyText: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-4">
      <h3 className="text-sm font-semibold text-[var(--color-text-accent)]">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">{emptyText}</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--color-text-secondary)]">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
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
      <span>{label}</span>
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

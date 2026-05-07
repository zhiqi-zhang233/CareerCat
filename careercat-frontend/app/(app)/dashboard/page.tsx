"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import { deleteJobPost, fetchUserJobs, updateJobPost } from "@/lib/api";
import type { JobApplicationStatus, JobPost, JobUpdatePayload } from "@/lib/types";
import { useLocalUserId } from "@/lib/useLocalUserId";

const STATUS_OPTIONS: Array<{
  value: JobApplicationStatus;
  label: string;
  tone: string;
}> = [
  {
    value: "not_applied",
    label: "Not Applied",
    tone: "border-slate-400/30 bg-slate-400/10 text-slate-200",
  },
  {
    value: "applied",
    label: "Applied",
    tone: "border-blue-300/30 bg-blue-400/10 text-blue-100",
  },
  {
    value: "assessment",
    label: "Assessment",
    tone: "border-[#FFB238]/40 bg-[#FFB238]/10 text-[#FFB238]",
  },
  {
    value: "interview",
    label: "Interview",
    tone: "border-cyan-300/30 bg-cyan-400/10 text-cyan-100",
  },
  {
    value: "offer",
    label: "Offer",
    tone: "border-green-300/30 bg-green-400/10 text-green-100",
  },
  {
    value: "rejected",
    label: "Rejected",
    tone: "border-red-300/30 bg-red-400/10 text-red-100",
  },
];

type SortKey = "created_at" | "posting_date" | "application_date" | "title";
type SortDirection = "desc" | "asc";
type JobsResponse = { jobs?: JobPost[] };
type JobEditorState = Record<string, JobPost>;

export default function DashboardPage() {
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
      setJobs((data.jobs || []).map(normalizeJob));
    } catch (loadError) {
      console.error(loadError);
      setError("Failed to load saved jobs.");
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
    return STATUS_OPTIONS.reduce<Record<JobApplicationStatus, number>>(
      (counts, option) => {
        counts[option.value] = jobs.filter((job) => job.status === option.value).length;
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
      setError("Failed to update this job. Reloading saved data.");
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
      setError("Failed to save your edits.");
    } finally {
      setBusyJobId("");
    }
  };

  const handleDeleteJob = async (job: JobPost) => {
    if (!userId) return;
    const confirmed = window.confirm(
      `Delete ${job.title} at ${job.company || "this company"} from your dashboard?`
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
      setError("Failed to delete this job.");
    } finally {
      setBusyJobId("");
    }
  };

  return (
    <main className="min-h-screen bg-[#011A55] text-white">
      <Header />

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-[#FFB238]">Application Tracker</p>
            <h1 className="mt-3 text-4xl font-bold text-[#FFB238]">
              Jobs Dashboard
            </h1>
            <p className="mt-4 max-w-2xl text-slate-300">
              Review structured job posts, update application progress, edit any
              parsed field, and delete records that should not stay in your
              account.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadJobs}
              disabled={loading}
              className="rounded-lg border border-[#FFB238]/40 px-5 py-3 text-sm font-semibold text-[#FFB238] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Loading..." : "Refresh Jobs"}
            </button>
            <Link
              href="/import-jobs"
              className="rounded-lg bg-[#FFB238] px-5 py-3 text-sm font-semibold text-[#011A55] transition hover:opacity-90"
            >
              Import Job
            </Link>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {STATUS_OPTIONS.map((option) => (
            <button
              type="button"
              key={option.value}
              onClick={() => setStatusFilter(option.value)}
              className={`rounded-lg border p-4 text-left transition hover:-translate-y-0.5 ${option.tone}`}
            >
              <p className="text-xs uppercase opacity-80">{option.label}</p>
              <p className="mt-2 text-3xl font-bold">{statusCounts[option.value]}</p>
            </button>
          ))}
        </div>

        <section className="mt-8 rounded-lg border border-white/10 bg-white/5 p-5">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm text-slate-300">
              Search
              <input
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 p-3 text-white placeholder-slate-400 focus:outline-none"
                placeholder="Title, company, keyword..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            <label className="text-sm text-slate-300">
              Status
              <select
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 p-3 text-white focus:outline-none"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as JobApplicationStatus | "all")
                }
              >
                <option value="all">All Statuses</option>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-slate-300">
              Location
              <input
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 p-3 text-white placeholder-slate-400 focus:outline-none"
                placeholder="City, state, remote..."
                value={locationFilter}
                onChange={(event) => setLocationFilter(event.target.value)}
              />
            </label>

            <label className="text-sm text-slate-300">
              Salary
              <input
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 p-3 text-white placeholder-slate-400 focus:outline-none"
                placeholder="$100k, hourly, range..."
                value={salaryFilter}
                onChange={(event) => setSalaryFilter(event.target.value)}
              />
            </label>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="text-sm text-slate-300">
              Skill
              <select
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 p-3 text-white focus:outline-none"
                value={skillFilter}
                onChange={(event) => setSkillFilter(event.target.value)}
              >
                <option value="">All Skills</option>
                {allSkills.map((skill) => (
                  <option key={skill} value={skill}>
                    {skill}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-slate-300">
              Sort By
              <select
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 p-3 text-white focus:outline-none"
                value={sortKey}
                onChange={(event) => setSortKey(event.target.value as SortKey)}
              >
                <option value="created_at">Import Date</option>
                <option value="posting_date">Posting Date</option>
                <option value="application_date">Application Date</option>
                <option value="title">Job Title</option>
              </select>
            </label>

            <label className="text-sm text-slate-300">
              Direction
              <select
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 p-3 text-white focus:outline-none"
                value={sortDirection}
                onChange={(event) => setSortDirection(event.target.value as SortDirection)}
              >
                <option value="desc">Newest / Z-A</option>
                <option value="asc">Oldest / A-Z</option>
              </select>
            </label>
          </div>
        </section>

        {error && (
          <div className="mt-6 rounded-lg border border-red-300/30 bg-red-500/10 p-4 text-sm text-red-100">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between text-sm text-slate-300">
          <p>
            Showing {filteredJobs.length} of {jobs.length} saved jobs.
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
            className="text-[#FFB238] hover:underline"
          >
            Clear filters
          </button>
        </div>

        {filteredJobs.length === 0 ? (
          <section className="mt-8 rounded-lg border border-white/10 bg-white/5 p-10 text-center">
            <h2 className="text-xl font-semibold text-[#FFB238]">No jobs found</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-300">
              Import a job post or clear your filters to see saved opportunities.
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
                  className="rounded-lg border border-white/10 bg-white/5 p-6"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <StatusBadge status={viewJob.status} />
                        <span className="text-xs text-slate-400">
                          Imported {formatDate(viewJob.created_at)}
                        </span>
                        {busyJobId === job.job_id && (
                          <span className="text-xs text-[#FFB238]">Saving...</span>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <TextField
                            label="Job Title"
                            value={viewJob.title}
                            onChange={(value) =>
                              updateDraft(job.job_id, (draft) => ({ ...draft, title: value }))
                            }
                          />
                          <TextField
                            label="Company"
                            value={viewJob.company}
                            onChange={(value) =>
                              updateDraft(job.job_id, (draft) => ({ ...draft, company: value }))
                            }
                          />
                          <TextField
                            label="Location"
                            value={viewJob.location}
                            onChange={(value) =>
                              updateDraft(job.job_id, (draft) => ({ ...draft, location: value }))
                            }
                          />
                          <TextField
                            label="Work Mode"
                            value={viewJob.work_mode}
                            onChange={(value) =>
                              updateDraft(job.job_id, (draft) => ({ ...draft, work_mode: value }))
                            }
                          />
                        </div>
                      ) : (
                        <>
                          <h2 className="mt-4 text-2xl font-bold text-white">{viewJob.title}</h2>
                          <p className="mt-2 text-sm text-slate-300">
                            {viewJob.company || "Company not listed"} ·{" "}
                            {viewJob.location || "Location unknown"} · {viewJob.work_mode}
                          </p>
                        </>
                      )}

                      <div className="mt-4 flex flex-wrap gap-2">
                        {viewJob.required_skills.slice(0, 12).map((skill) => (
                          <span
                            key={skill}
                            className="rounded-full bg-[#FFB238]/15 px-3 py-1 text-xs text-[#FFB238]"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-[440px]">
                      <label className="text-sm text-slate-300">
                        Status
                        {isEditing ? (
                          <select
                            className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 p-3 text-white focus:outline-none"
                            value={viewJob.status}
                            onChange={(event) =>
                              updateDraft(job.job_id, (draft) => ({
                                ...draft,
                                status: event.target.value as JobApplicationStatus,
                              }))
                            }
                          >
                            {STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <select
                            className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 p-3 text-white focus:outline-none"
                            value={viewJob.status}
                            onChange={(event) =>
                              handleQuickUpdate(job, {
                                status: event.target.value as JobApplicationStatus,
                              })
                            }
                          >
                            {STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </label>

                      <label className="text-sm text-slate-300">
                        Application Date
                        {isEditing ? (
                          <input
                            type="date"
                            className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 p-3 text-white focus:outline-none"
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
                            className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 p-3 text-white focus:outline-none"
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
                          className="rounded-lg bg-[#FFB238] px-4 py-2 text-sm font-semibold text-[#011A55] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Save Changes
                        </button>
                        <button
                          type="button"
                          onClick={() => cancelEdit(job.job_id)}
                          className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => beginEdit(job)}
                        className="rounded-lg border border-[#FFB238]/40 px-4 py-2 text-sm font-semibold text-[#FFB238] transition hover:bg-white/10"
                      >
                        Edit Job
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteJob(job)}
                      disabled={busyJobId === job.job_id}
                      className="rounded-lg border border-red-300/30 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Delete Job
                    </button>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-4">
                    {isEditing ? (
                      <>
                        <TextField
                          label="Salary"
                          value={viewJob.salary_range}
                          onChange={(value) =>
                            updateDraft(job.job_id, (draft) => ({
                              ...draft,
                              salary_range: value,
                            }))
                          }
                        />
                        <TextField
                          label="Posting Date"
                          value={viewJob.posting_date}
                          onChange={(value) =>
                            updateDraft(job.job_id, (draft) => ({
                              ...draft,
                              posting_date: value,
                            }))
                          }
                        />
                        <TextField
                          label="Employment Type"
                          value={viewJob.employment_type}
                          onChange={(value) =>
                            updateDraft(job.job_id, (draft) => ({
                              ...draft,
                              employment_type: value,
                            }))
                          }
                        />
                        <TextField
                          label="Sponsorship"
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
                        <Meta label="Salary" value={viewJob.salary_range || "Unknown"} />
                        <Meta label="Posting Date" value={viewJob.posting_date || "Unknown"} />
                        <Meta label="Type" value={viewJob.employment_type} />
                        <Meta label="Sponsorship" value={viewJob.visa_sponsorship} />
                      </>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="mt-5 space-y-4">
                      <ListEditor
                        label="Required Skills"
                        value={viewJob.required_skills}
                        onChange={(value) =>
                          updateDraft(job.job_id, (draft) => ({
                            ...draft,
                            required_skills: value,
                          }))
                        }
                        placeholder="Python, SQL, Tableau"
                      />
                      <ListEditor
                        label="Preferred Skills"
                        value={viewJob.preferred_skills}
                        onChange={(value) =>
                          updateDraft(job.job_id, (draft) => ({
                            ...draft,
                            preferred_skills: value,
                          }))
                        }
                        placeholder="dbt, Airflow, Snowflake"
                      />
                      <TextAreaField
                        label="Summary"
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
                    <p className="mt-5 text-sm leading-6 text-slate-300">{viewJob.summary}</p>
                  )}

                  <details className="mt-5">
                    <summary className="cursor-pointer text-sm font-semibold text-[#FFB238]">
                      {isEditing ? "Edit requirements, responsibilities, notes, and raw text" : "Requirements and notes"}
                    </summary>

                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      {isEditing ? (
                        <>
                          <ListEditor
                            label="Requirements"
                            value={viewJob.requirements}
                            onChange={(value) =>
                              updateDraft(job.job_id, (draft) => ({
                                ...draft,
                                requirements: value,
                              }))
                            }
                            placeholder="One requirement per line"
                            multiline
                          />
                          <ListEditor
                            label="Responsibilities"
                            value={viewJob.responsibilities}
                            onChange={(value) =>
                              updateDraft(job.job_id, (draft) => ({
                                ...draft,
                                responsibilities: value,
                              }))
                            }
                            placeholder="One responsibility per line"
                            multiline
                          />
                        </>
                      ) : (
                        <>
                          <ListBlock title="Requirements" items={viewJob.requirements} />
                          <ListBlock title="Responsibilities" items={viewJob.responsibilities} />
                        </>
                      )}
                    </div>

                    <label className="mt-4 block text-sm text-slate-300">
                      Notes
                      {isEditing ? (
                        <textarea
                          className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 p-3 text-white placeholder-slate-400 focus:outline-none"
                          rows={3}
                          value={viewJob.notes}
                          onChange={(event) =>
                            updateDraft(job.job_id, (draft) => ({
                              ...draft,
                              notes: event.target.value,
                            }))
                          }
                          placeholder="Add recruiter notes, links, or follow-up reminders..."
                        />
                      ) : (
                        <textarea
                          className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 p-3 text-white placeholder-slate-400 focus:outline-none"
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
                          placeholder="Add recruiter notes, links, or follow-up reminders..."
                        />
                      )}
                    </label>

                    {isEditing && (
                      <TextAreaField
                        label="Raw Job Text"
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

function formatDate(value?: string) {
  if (!value) return "Unknown";
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
}

function StatusBadge({ status }: { status: JobApplicationStatus }) {
  const option =
    STATUS_OPTIONS.find((statusOption) => statusOption.value === status) ||
    STATUS_OPTIONS[0];

  return (
    <span className={`rounded-full border px-3 py-1 text-xs ${option.tone}`}>
      {option.label}
    </span>
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

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="text-sm font-semibold text-[#FFB238]">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-400">No details extracted.</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
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
      <span>{label}</span>
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
    const items = multiline ? nextValue.split("\n") : nextValue.split(",");
    onChange(items.map((item) => item.trim()).filter(Boolean));
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

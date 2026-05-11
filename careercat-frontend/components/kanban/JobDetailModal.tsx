"use client";

import { useEffect, useRef, useState } from "react";
import type { JobPost, JobApplicationStatus, JobUpdatePayload } from "@/lib/types";

// ─── status config (mirrors dashboard colours) ────────────────────────────────

const STATUS_OPTIONS: { value: JobApplicationStatus; label: string }[] = [
  { value: "not_applied", label: "待申请" },
  { value: "applied",     label: "已申请" },
  { value: "assessment",  label: "测评"   },
  { value: "interview",   label: "面试中" },
  { value: "offer",       label: "Offer"  },
  { value: "rejected",    label: "已拒绝" },
];

const STATUS_STYLE: Record<JobApplicationStatus, string> = {
  not_applied: "border-[var(--color-border)] bg-[var(--color-bg-elev-2)] text-[var(--color-text-secondary)]",
  applied:     "border-[var(--color-info-border)] bg-[var(--color-info-bg)] text-[var(--color-info-text)]",
  assessment:  "border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 text-[var(--color-text-accent)]",
  interview:   "border-[var(--color-info-border)] bg-[var(--color-info-bg)] text-[var(--color-info-text)]",
  offer:       "border-[var(--color-success-border)] bg-[var(--color-success-bg)] text-[var(--color-success-text)]",
  rejected:    "border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]",
};

// ─── small shared sub-components ─────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
        {label}
      </p>
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/15"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function Textarea({
  value,
  onChange,
  rows = 3,
  placeholder = "",
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/15 resize-none"
      rows={rows}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

// ─── types ────────────────────────────────────────────────────────────────────

type JobDetailModalProps = {
  job: JobPost;
  busy: boolean;
  onClose: () => void;
  onSave: (payload: JobUpdatePayload) => Promise<void>;
  onDelete: () => void;
  onStatusChange: (status: JobApplicationStatus) => void;
};

// ─── main modal ───────────────────────────────────────────────────────────────

export default function JobDetailModal({
  job,
  busy,
  onClose,
  onSave,
  onDelete,
  onStatusChange,
}: JobDetailModalProps) {
  const [draft, setDraft] = useState<JobPost>({ ...job });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Sync external status changes (e.g. drag-while-modal-open)
  useEffect(() => {
    setDraft((d) => ({ ...d, status: job.status }));
  }, [job.status]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Trap focus inside modal
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  const set = <K extends keyof JobPost>(key: K, value: JobPost[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
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
      });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = (newStatus: JobApplicationStatus) => {
    set("status", newStatus);
    onStatusChange(newStatus);
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={`${job.title} 详情`}
    >
      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-[var(--radius-xl)] bg-[var(--color-bg-elev-1)] shadow-[var(--shadow-lg)] sm:rounded-[var(--radius-xl)] outline-none"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-6 py-4">
          <div className="min-w-0">
            {/* Status badge — clickable to cycle */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`inline-flex items-center rounded-[var(--radius-full)] border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[draft.status]}`}>
                {STATUS_OPTIONS.find((s) => s.value === draft.status)?.label}
              </span>
              {busy && (
                <span className="text-xs text-[var(--color-text-muted)] animate-pulse">
                  保存中…
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-[var(--color-text-primary)] leading-tight">
              {draft.title || "未知职位"}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              {[draft.company, draft.location, draft.work_mode]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mt-1 flex-shrink-0 rounded-[var(--radius-sm)] p-1.5 text-[var(--color-text-muted)] transition hover:bg-[var(--color-bg-elev-2)] hover:text-[var(--color-text-primary)]"
            aria-label="关闭"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Status + App date row */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="申请状态">
              <select
                className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none"
                value={draft.status}
                onChange={(e) => handleStatusChange(e.target.value as JobApplicationStatus)}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </Field>
            <Field label="申请日期">
              <input
                type="date"
                className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none"
                value={draft.application_date?.slice(0, 10) || ""}
                onChange={(e) => set("application_date", e.target.value)}
              />
            </Field>
          </div>

          {/* Core fields */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="职位名称">
              <Input value={draft.title} onChange={(v) => set("title", v)} />
            </Field>
            <Field label="公司">
              <Input value={draft.company} onChange={(v) => set("company", v)} />
            </Field>
            <Field label="地点">
              <Input value={draft.location} onChange={(v) => set("location", v)} />
            </Field>
            <Field label="薪资范围">
              <Input value={draft.salary_range} onChange={(v) => set("salary_range", v)} placeholder="e.g. $120k–$160k" />
            </Field>
            <Field label="工作模式">
              <Input value={draft.work_mode} onChange={(v) => set("work_mode", v)} />
            </Field>
            <Field label="雇佣类型">
              <Input value={draft.employment_type} onChange={(v) => set("employment_type", v)} />
            </Field>
          </div>

          {/* Skills */}
          <Field label="必需技能（逗号分隔）">
            <Input
              value={draft.required_skills.join(", ")}
              onChange={(v) => set("required_skills", v.split(",").map((s) => s.trim()).filter(Boolean))}
              placeholder="React, TypeScript, Node.js"
            />
          </Field>
          <Field label="加分技能（逗号分隔）">
            <Input
              value={draft.preferred_skills.join(", ")}
              onChange={(v) => set("preferred_skills", v.split(",").map((s) => s.trim()).filter(Boolean))}
              placeholder="GraphQL, Docker"
            />
          </Field>

          {/* Summary */}
          <Field label="职位摘要">
            <Textarea
              value={draft.summary}
              onChange={(v) => set("summary", v)}
              rows={4}
              placeholder="职位描述摘要…"
            />
          </Field>

          {/* Notes */}
          <Field label="我的备注">
            <Textarea
              value={draft.notes}
              onChange={(v) => set("notes", v)}
              rows={3}
              placeholder="面试感想、联系人、下一步行动…"
            />
          </Field>

          {/* fit score (read-only if present) */}
          {draft.fit_score != null && (
            <Field label="匹配评分">
              <div className="flex items-center gap-3">
                <div className="h-2 flex-1 rounded-full bg-[var(--color-bg-elev-2)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${draft.fit_score}%`,
                      background:
                        draft.fit_score >= 80
                          ? "var(--color-success-400)"
                          : draft.fit_score >= 60
                          ? "var(--color-warning-400)"
                          : "var(--color-danger-400)",
                    }}
                  />
                </div>
                <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                  {draft.fit_score}
                </span>
              </div>
              {draft.action_recommendation && (
                <p className="mt-2 text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  💡 {draft.action_recommendation}
                </p>
              )}
            </Field>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] px-6 py-4">
          {/* Delete */}
          <div>
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--color-danger-text)]">确认删除？</span>
                <button
                  type="button"
                  onClick={onDelete}
                  className="rounded-[var(--radius-sm)] bg-[var(--color-danger-bg)] border border-[var(--color-danger-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-danger-text)] transition hover:opacity-80"
                >
                  确认
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-elev-2)]"
                >
                  取消
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="rounded-[var(--radius-sm)] border border-[var(--color-danger-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-danger-text)] transition hover:bg-[var(--color-danger-bg)]"
              >
                删除
              </button>
            )}
          </div>

          {/* Save / Cancel */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[var(--radius-sm)] border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-elev-2)]"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || busy}
              className="rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-accent-text)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "保存中…" : "保存"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

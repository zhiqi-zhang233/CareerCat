"use client";

import type { JobPost } from "@/lib/types";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Pick a deterministic background colour from the company initial. */
function avatarBg(company: string): string {
  const palette = [
    "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b",
    "#10b981", "#06b6d4", "#f97316", "#6366f1",
  ];
  let hash = 0;
  for (let i = 0; i < company.length; i++) hash = company.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

/** Compact relative date: "3d ago", "just now", etc. */
function relDate(iso?: string): string {
  if (!iso) return "";
  const ms = Date.now() - Date.parse(iso);
  if (isNaN(ms) || ms < 0) return "";
  const d = Math.floor(ms / 86_400_000);
  if (d === 0) return "today";
  if (d === 1) return "1d ago";
  if (d < 30) return `${d}d ago`;
  const m = Math.floor(d / 30);
  return m === 1 ? "1mo ago" : `${m}mo ago`;
}

// ─── types ────────────────────────────────────────────────────────────────────

export type KanbanCardProps = {
  job: JobPost;
  isDragging?: boolean;
  onClick: (job: JobPost) => void;
  onDragStart: (jobId: string) => void;
};

// ─── component ────────────────────────────────────────────────────────────────

export default function KanbanCard({
  job,
  isDragging = false,
  onClick,
  onDragStart,
}: KanbanCardProps) {
  const initial = (job.company || job.title || "?").trim()[0].toUpperCase();
  const bg = avatarBg(job.company || job.title || "");
  const date = relDate(job.application_date || job.created_at);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", job.job_id);
        onDragStart(job.job_id);
      }}
      onClick={() => onClick(job)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick(job)}
      aria-label={`${job.title} at ${job.company}`}
      className={[
        "group relative cursor-grab rounded-[var(--radius-md)] border bg-[var(--color-bg-elev-1)] p-3 select-none",
        "transition-all duration-150",
        "hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-md)]",
        "active:cursor-grabbing",
        isDragging ? "opacity-40 scale-95 border-dashed" : "opacity-100 border-[var(--color-border)]",
      ].join(" ")}
    >
      {/* top row: avatar + title */}
      <div className="flex items-start gap-2">
        <span
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[11px] font-bold text-white"
          style={{ background: bg }}
          aria-hidden
        >
          {initial}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold leading-tight text-[var(--color-text-primary)]">
            {job.title}
          </p>
          <p className="truncate text-[11px] text-[var(--color-text-muted)]">
            {[job.company, job.location].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>

      {/* tags row */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {job.salary_range && (
          <span className="rounded-[var(--radius-full)] border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-text-secondary)]">
            {job.salary_range}
          </span>
        )}
        {job.fit_score != null && (
          <span
            className="rounded-[var(--radius-full)] border px-2 py-0.5 text-[10px] font-semibold"
            style={{
              background:
                job.fit_score >= 80
                  ? "var(--color-success-bg)"
                  : job.fit_score >= 60
                  ? "var(--color-warning-bg)"
                  : "var(--color-danger-bg)",
              borderColor:
                job.fit_score >= 80
                  ? "var(--color-success-border)"
                  : job.fit_score >= 60
                  ? "var(--color-warning-border)"
                  : "var(--color-danger-border)",
              color:
                job.fit_score >= 80
                  ? "var(--color-success-text)"
                  : job.fit_score >= 60
                  ? "var(--color-warning-text)"
                  : "var(--color-danger-text)",
            }}
          >
            ⭐ {job.fit_score}
          </span>
        )}
        {job.work_mode && job.work_mode !== "Unknown" && (
          <span className="rounded-[var(--radius-full)] border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-text-muted)]">
            {job.work_mode}
          </span>
        )}
      </div>

      {/* footer: date */}
      {date && (
        <p className="mt-2 text-[10px] text-[var(--color-text-muted)]">{date}</p>
      )}
    </div>
  );
}

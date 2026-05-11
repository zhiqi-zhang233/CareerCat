"use client";

import { useState } from "react";
import type { JobPost, JobApplicationStatus } from "@/lib/types";
import KanbanCard from "./KanbanCard";

// ─── column config ─────────────────────────────────────────────────────────────

export type ColumnConfig = {
  status: JobApplicationStatus;
  label: string;
  dotColor: string;
  headerBg: string;
  dropBg: string;        // background when a card hovers over this column
  dropBorder: string;    // border when dragging over
};

export const COLUMN_CONFIGS: ColumnConfig[] = [
  {
    status: "not_applied",
    label: "待申请",
    dotColor: "#94a3b8",
    headerBg: "var(--color-bg-elev-1)",
    dropBg: "rgba(148,163,184,0.08)",
    dropBorder: "rgba(148,163,184,0.4)",
  },
  {
    status: "applied",
    label: "已申请",
    dotColor: "var(--brand-blue-500, #3b82f6)",
    headerBg: "rgba(59,130,246,0.04)",
    dropBg: "rgba(59,130,246,0.06)",
    dropBorder: "rgba(59,130,246,0.35)",
  },
  {
    status: "assessment",
    label: "测评",
    dotColor: "var(--brand-honey-400, #ffb238)",
    headerBg: "rgba(255,178,56,0.06)",
    dropBg: "rgba(255,178,56,0.08)",
    dropBorder: "rgba(255,178,56,0.4)",
  },
  {
    status: "interview",
    label: "面试中",
    dotColor: "#60a5fa",
    headerBg: "rgba(96,165,250,0.05)",
    dropBg: "rgba(96,165,250,0.08)",
    dropBorder: "rgba(96,165,250,0.35)",
  },
  {
    status: "offer",
    label: "Offer",
    dotColor: "var(--color-success-400, #34c171)",
    headerBg: "rgba(52,193,113,0.05)",
    dropBg: "rgba(52,193,113,0.08)",
    dropBorder: "rgba(52,193,113,0.4)",
  },
  {
    status: "rejected",
    label: "已拒绝",
    dotColor: "var(--color-danger-400, #ef4949)",
    headerBg: "rgba(239,73,73,0.04)",
    dropBg: "rgba(239,73,73,0.06)",
    dropBorder: "rgba(239,73,73,0.3)",
  },
];

// ─── types ────────────────────────────────────────────────────────────────────

type KanbanColumnProps = {
  config: ColumnConfig;
  jobs: JobPost[];
  draggingId: string | null;
  onDragStart: (jobId: string) => void;
  onDrop: (jobId: string, targetStatus: JobApplicationStatus) => void;
  onCardClick: (job: JobPost) => void;
};

// ─── component ────────────────────────────────────────────────────────────────

export default function KanbanColumn({
  config,
  jobs,
  draggingId,
  onDragStart,
  onDrop,
  onCardClick,
}: KanbanColumnProps) {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if we're leaving the column root (not a child element)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    const jobId = e.dataTransfer.getData("text/plain");
    if (jobId) onDrop(jobId, config.status);
  };

  return (
    <div className="flex min-w-[200px] max-w-[240px] flex-shrink-0 flex-col rounded-[var(--radius-md)] border border-[var(--color-border)] overflow-hidden">
      {/* Column header */}
      <div
        className="flex items-center justify-between gap-2 px-3 py-2.5"
        style={{ background: config.headerBg }}
      >
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full flex-shrink-0"
            style={{ background: config.dotColor }}
            aria-hidden
          />
          <span className="text-[12px] font-semibold text-[var(--color-text-primary)]">
            {config.label}
          </span>
        </div>
        <span className="rounded-[var(--radius-full)] bg-[var(--color-bg-elev-2)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text-muted)]">
          {jobs.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="flex-1 overflow-y-auto p-2 transition-colors duration-150"
        style={{
          minHeight: 120,
          maxHeight: "calc(100vh - 340px)",
          background: isOver ? config.dropBg : "var(--color-bg)",
          outline: isOver ? `2px dashed ${config.dropBorder}` : "2px dashed transparent",
          outlineOffset: "-2px",
          borderRadius: "0 0 var(--radius-md) var(--radius-md)",
        }}
        aria-label={`${config.label} column, ${jobs.length} jobs`}
      >
        <div className="flex flex-col gap-2">
          {jobs.map((job) => (
            <KanbanCard
              key={job.job_id}
              job={job}
              isDragging={draggingId === job.job_id}
              onDragStart={onDragStart}
              onClick={onCardClick}
            />
          ))}

          {/* Empty state */}
          {jobs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <span className="text-2xl opacity-30" aria-hidden>
                {config.status === "offer" ? "🎉" : config.status === "rejected" ? "🚫" : "📋"}
              </span>
              <p className="mt-2 text-[11px] text-[var(--color-text-muted)]">
                拖拽卡片到此处
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import type { JobPost, JobApplicationStatus } from "@/lib/types";
import KanbanColumn, { COLUMN_CONFIGS } from "./KanbanColumn";
import JobDetailModal from "./JobDetailModal";
import type { JobUpdatePayload } from "@/lib/types";

// ─── types ────────────────────────────────────────────────────────────────────

type KanbanBoardProps = {
  jobs: JobPost[];
  busyJobId: string;
  onStatusChange: (jobId: string, newStatus: JobApplicationStatus) => void;
  onSave: (jobId: string, payload: JobUpdatePayload) => Promise<void>;
  onDelete: (job: JobPost) => void;
};

// ─── component ────────────────────────────────────────────────────────────────

export default function KanbanBoard({
  jobs,
  busyJobId,
  onStatusChange,
  onSave,
  onDelete,
}: KanbanBoardProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<JobPost | null>(null);

  // Group jobs by status for each column
  const columns = useMemo(() => {
    const map: Record<JobApplicationStatus, JobPost[]> = {
      not_applied: [],
      applied: [],
      assessment: [],
      interview: [],
      offer: [],
      rejected: [],
    };
    for (const job of jobs) {
      const key = job.status in map ? job.status : "not_applied";
      map[key].push(job);
    }
    return map;
  }, [jobs]);

  const handleDrop = (jobId: string, targetStatus: JobApplicationStatus) => {
    setDraggingId(null);
    const job = jobs.find((j) => j.job_id === jobId);
    if (!job || job.status === targetStatus) return;
    onStatusChange(jobId, targetStatus);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
  };

  return (
    <>
      {/* Board */}
      <div
        className="mt-6 overflow-x-auto pb-4"
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3" style={{ minWidth: "max-content" }}>
          {COLUMN_CONFIGS.map((config) => (
            <KanbanColumn
              key={config.status}
              config={config}
              jobs={columns[config.status]}
              draggingId={draggingId}
              onDragStart={setDraggingId}
              onDrop={handleDrop}
              onCardClick={setActiveJob}
            />
          ))}
        </div>
      </div>

      {/* Drag count hint */}
      {draggingId && (
        <div
          className="pointer-events-none fixed bottom-6 left-1/2 -translate-x-1/2 rounded-[var(--radius-full)] border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] px-4 py-2 text-sm text-[var(--color-text-secondary)] shadow-[var(--shadow-lg)]"
          aria-live="polite"
        >
          拖拽到目标列松手即可更新状态
        </div>
      )}

      {/* Detail Modal */}
      {activeJob && (
        <JobDetailModal
          job={activeJob}
          busy={busyJobId === activeJob.job_id}
          onClose={() => setActiveJob(null)}
          onSave={async (payload) => {
            await onSave(activeJob.job_id, payload);
            setActiveJob(null);
          }}
          onDelete={() => {
            onDelete(activeJob);
            setActiveJob(null);
          }}
          onStatusChange={(newStatus) => {
            onStatusChange(activeJob.job_id, newStatus);
            // keep modal open with updated job (parent will re-render)
            setActiveJob((prev) => prev ? { ...prev, status: newStatus } : prev);
          }}
        />
      )}
    </>
  );
}

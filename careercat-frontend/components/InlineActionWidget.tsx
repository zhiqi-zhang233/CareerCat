"use client";

import { ChangeEvent, useRef } from "react";
import Link from "next/link";
import type { InlineAction } from "@/lib/types";

export type InlineActionEvent =
  | { actionId: string; type: "file_upload"; file: File }
  | { actionId: string; type: "quick_select"; option: string }
  | { actionId: string; type: "navigate" }
  | { actionId: string; type: "confirm_or_continue"; choice: "view" | "continue"; continueText?: string };

interface Props {
  actions: InlineAction[];
  completedIds: Set<string>;
  uploadingId: string | null;
  onAction?: (event: InlineActionEvent) => void;
}

export default function InlineActionWidget({ actions, completedIds, uploadingId, onAction }: Props) {
  const visible = actions.filter(
    (a) => !a.depends_on || completedIds.has(a.depends_on)
  );
  if (!visible.length) return null;

  return (
    <div className="mt-3 space-y-3 border-t border-[var(--color-border)]/50 pt-3">
      {visible.map((action) => {
        const done = completedIds.has(action.id);
        switch (action.type) {
          case "file_upload":
            return (
              <FileUploadAction
                key={action.id}
                action={action}
                done={done}
                uploading={uploadingId === action.id}
                onFile={(file) =>
                  onAction?.({ actionId: action.id, type: "file_upload", file })
                }
              />
            );
          case "navigate":
            return (
              <NavigateAction
                key={action.id}
                action={action}
                done={done}
                onClick={() => onAction?.({ actionId: action.id, type: "navigate" })}
              />
            );
          case "quick_select":
            return (
              <QuickSelectAction
                key={action.id}
                action={action}
                done={done}
                onSelect={(option) =>
                  onAction?.({ actionId: action.id, type: "quick_select", option })
                }
              />
            );
          case "confirm_or_continue":
            return (
              <ConfirmOrContinueAction
                key={action.id}
                action={action}
                done={done}
                onChoice={(choice) =>
                  onAction?.({
                    actionId: action.id,
                    type: "confirm_or_continue",
                    choice,
                    continueText: action.continue_label,
                  })
                }
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

function FileUploadAction({
  action,
  done,
  uploading,
  onFile,
}: {
  action: InlineAction;
  done: boolean;
  uploading: boolean;
  onFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) onFile(file);
  };

  if (done) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-success-bg)] text-xs text-[var(--color-success-text)]">
          ✓
        </span>
        <span>{action.label}</span>
      </div>
    );
  }

  return (
    <label
      className={`inline-flex cursor-pointer items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--color-accent)]/60 bg-[var(--color-accent)]/5 px-4 py-3 text-sm font-medium text-[var(--color-text-accent)] transition hover:bg-[var(--color-accent)]/10 ${
        uploading ? "cursor-wait opacity-60" : ""
      }`}
    >
      {uploading ? (
        <>
          <span className="flex gap-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:120ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:240ms]" />
          </span>
          <span>Uploading…</span>
        </>
      ) : (
        <>
          <UploadIcon />
          <span>{action.label}</span>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={action.accept || ".pdf,.doc,.docx,.txt"}
        className="hidden"
        disabled={uploading || done}
        onChange={handleChange}
      />
    </label>
  );
}

function NavigateAction({
  action,
  done,
  onClick,
}: {
  action: InlineAction;
  done: boolean;
  onClick: () => void;
}) {
  if (!action.target) return null;
  return (
    <Link
      href={action.target}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text-primary)] transition hover:border-[var(--color-accent)]/60 hover:text-[var(--color-text-accent)] ${
        done ? "pointer-events-none opacity-60" : ""
      }`}
    >
      {action.label}
      <span aria-hidden>→</span>
    </Link>
  );
}

function QuickSelectAction({
  action,
  done,
  onSelect,
}: {
  action: InlineAction;
  done: boolean;
  onSelect: (option: string) => void;
}) {
  if (!action.options?.length) return null;
  return (
    <div className="space-y-2">
      {action.label && (
        <p className="text-xs font-medium text-[var(--color-text-secondary)]">
          {action.label}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {action.options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={done}
            onClick={() => onSelect(opt.value)}
            className="cc-chip cursor-pointer text-sm transition hover:border-[var(--color-accent)]/60 hover:text-[var(--color-text-accent)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ConfirmOrContinueAction({
  action,
  done,
  onChoice,
}: {
  action: InlineAction;
  done: boolean;
  onChoice: (choice: "view" | "continue") => void;
}) {
  return (
    <div className="space-y-2">
      {action.label && (
        <p className="text-xs font-medium text-[var(--color-text-secondary)]">
          {action.label}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {action.confirm_route && (
          <Link
            href={action.confirm_route}
            onClick={() => onChoice("view")}
            className={`cc-btn cc-btn-secondary text-sm ${done ? "pointer-events-none opacity-60" : ""}`}
          >
            {action.confirm_label || "View & edit"}
          </Link>
        )}
        <button
          type="button"
          disabled={done}
          onClick={() => onChoice("continue")}
          className="cc-btn cc-btn-primary text-sm disabled:opacity-60"
        >
          {action.continue_label || "Continue →"}
        </button>
      </div>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

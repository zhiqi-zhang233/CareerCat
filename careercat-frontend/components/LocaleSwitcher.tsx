"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { Locale } from "@/lib/i18n/dictionaries";

const OPTIONS: { value: Locale; label: string; short: string }[] = [
  { value: "en", label: "English", short: "EN" },
  { value: "zh", label: "中文", short: "中" },
];

export default function LocaleSwitcher({
  size = "default",
}: {
  size?: "default" | "compact";
}) {
  const { locale, setLocale, t } = useLocale();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  const current = OPTIONS.find((o) => o.value === locale) || OPTIONS[0];
  const compact = size === "compact";

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("locale.switcherAria")}
        className={`flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] text-[var(--color-text-secondary)] transition hover:border-[var(--color-accent)]/40 hover:text-[var(--color-text-primary)] ${
          compact ? "h-8 px-2 text-xs" : "h-9 px-3 text-sm"
        }`}
      >
        <IconGlobe />
        <span>{compact ? current.short : current.label}</span>
        <IconChevron />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-36 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] shadow-[var(--shadow-lg)]">
          {OPTIONS.map((option) => (
            <button
              type="button"
              key={option.value}
              onClick={() => {
                setLocale(option.value);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between px-3 py-2 text-sm transition ${
                option.value === locale
                  ? "bg-[var(--color-accent)]/10 text-[var(--color-text-accent)]"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elev-1)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <span>{option.label}</span>
              {option.value === locale && <IconCheck />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function IconGlobe() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}
function IconChevron() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

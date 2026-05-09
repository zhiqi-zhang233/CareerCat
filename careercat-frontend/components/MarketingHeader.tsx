"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import { useAuth } from "@/lib/AuthContext";
import { useT } from "@/lib/i18n/LocaleProvider";

export default function MarketingHeader() {
  const t = useT();
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);

  // Treat local mode users as effectively signed in (the app issues them a
  // local account on first visit). Only Cognito mode shows true signed-out
  // state.
  const isSignedIn =
    !auth.isCognito || auth.status === "authenticated";
  const accountLabel = auth.isCognito
    ? auth.email || ""
    : auth.userId
      ? auth.userId.slice(0, 12) + "…"
      : "";

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const cancelClose = () => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), 150);
  };

  const handleSignOut = () => {
    setOpen(false);
    auth.signOut();
  };

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-bg)_92%,transparent)] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
        {/* Logo (clickable, links to home) */}
        <Link
          href="/"
          aria-label="CareerCat home"
          className="flex items-center gap-2 transition hover:opacity-80"
        >
          <Image
            src="/logo.svg"
            alt="CareerCat"
            width={32}
            height={32}
            className="h-8 w-8"
          />
          <span className="text-base font-semibold tracking-tight">
            CareerCat
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <LocaleSwitcher />

          <div
            ref={wrapRef}
            className="relative"
            onMouseEnter={() => {
              cancelClose();
              setOpen(true);
            }}
            onMouseLeave={scheduleClose}
          >
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] px-3 py-1.5 text-sm font-medium text-[var(--color-text-primary)] transition hover:border-[var(--color-accent)]/50"
            >
              {isSignedIn ? (
                <>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-accent)] text-[11px] font-bold text-[var(--color-accent-text)]">
                    {accountInitial(accountLabel)}
                  </span>
                  <span className="hidden max-w-[120px] truncate sm:inline">
                    {accountLabel || t("marketing.nav.account")}
                  </span>
                </>
              ) : (
                <>
                  <IconUser />
                  <span>{t("marketing.nav.signIn")}</span>
                </>
              )}
              <IconChevron />
            </button>

            {open && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-60 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] shadow-[var(--shadow-lg)]"
                onMouseEnter={cancelClose}
                onMouseLeave={scheduleClose}
              >
                {isSignedIn ? (
                  <>
                    <div className="border-b border-[var(--color-border)] px-3 py-3">
                      <p className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">
                        {auth.isCognito
                          ? t("marketing.nav.signedInAs")
                          : t("marketing.nav.localAccount")}
                      </p>
                      <p className="mt-1 break-all text-sm font-medium">
                        {accountLabel || "—"}
                      </p>
                    </div>
                    <MenuLink href="/workspace" onClick={() => setOpen(false)}>
                      <IconSparkles />
                      {t("marketing.nav.workspace")}
                    </MenuLink>
                    <MenuLink href="/settings" onClick={() => setOpen(false)}>
                      <IconCog />
                      {t("marketing.nav.settings")}
                    </MenuLink>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2 border-t border-[var(--color-border)] px-3 py-2.5 text-left text-sm text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-elev-2)] hover:text-[var(--color-danger)]"
                    >
                      <IconSignOut />
                      {t("marketing.nav.signOut")}
                    </button>
                  </>
                ) : (
                  <>
                    <MenuLink
                      href="/workspace"
                      onClick={() => setOpen(false)}
                      primary
                    >
                      <IconSignIn />
                      {t("marketing.nav.signInItem")}
                    </MenuLink>
                    <MenuLink
                      href="/workspace?auth=signup"
                      onClick={() => setOpen(false)}
                    >
                      <IconUserPlus />
                      {t("marketing.nav.signUpItem")}
                    </MenuLink>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function MenuLink({
  href,
  onClick,
  children,
  primary = false,
}: {
  href: string;
  onClick?: () => void;
  children: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2.5 text-sm transition ${
        primary
          ? "bg-[var(--color-accent)]/10 font-semibold text-[var(--color-text-accent)] hover:bg-[var(--color-accent)]/20"
          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elev-2)] hover:text-[var(--color-text-primary)]"
      }`}
    >
      {children}
    </Link>
  );
}

function accountInitial(value: string) {
  if (!value) return "U";
  return value.trim().charAt(0).toUpperCase() || "U";
}

/* ---- Inline icons ---- */

function IconBase({ children }: { children: React.ReactNode }) {
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
      {children}
    </svg>
  );
}
function IconUser() {
  return (
    <IconBase>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </IconBase>
  );
}
function IconChevron() {
  return (
    <IconBase>
      <path d="M6 9l6 6 6-6" />
    </IconBase>
  );
}
function IconSparkles() {
  return (
    <IconBase>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
    </IconBase>
  );
}
function IconCog() {
  return (
    <IconBase>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 7 4.7l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </IconBase>
  );
}
function IconSignOut() {
  return (
    <IconBase>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </IconBase>
  );
}
function IconSignIn() {
  return (
    <IconBase>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
    </IconBase>
  );
}
function IconUserPlus() {
  return (
    <IconBase>
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <path d="M20 8v6M23 11h-6" />
    </IconBase>
  );
}

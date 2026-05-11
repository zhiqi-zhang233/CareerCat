"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CSSProperties, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useLocalUserId } from "@/lib/useLocalUserId";
import { useT } from "@/lib/i18n/LocaleProvider";
import LocaleSwitcher from "@/components/LocaleSwitcher";

// ─── Glass surface helpers ────────────────────────────────────────────────────

const NAV_PANEL_STYLE: CSSProperties = {
  left:             12,
  top:              64,
  bottom:           24,
  width:            288,
  borderRadius:     22,
  background:       "rgba(255, 255, 255, 0.88)",
  backdropFilter:   "blur(22px) saturate(140%)",
  WebkitBackdropFilter: "blur(22px) saturate(140%)",
  boxShadow:
    "0 1px 0 rgba(255,255,255,0.60) inset, " +
    "0 24px 60px -22px rgba(1,26,85,0.28), " +
    "0 4px 24px -6px rgba(1,26,85,0.13)",
  border:   "1px solid rgba(255, 255, 255, 0.65)",
  overflow: "hidden",
};

const TOPBAR_STYLE: CSSProperties = {
  background:
    "linear-gradient(to bottom, rgba(253,251,246,0.90) 0%, rgba(253,251,246,0.60) 68%, rgba(253,251,246,0) 100%)",
  backdropFilter:       "saturate(140%) blur(10px)",
  WebkitBackdropFilter: "saturate(140%) blur(10px)",
};

const DROPDOWN_STYLE: CSSProperties = {
  background:       "rgba(255, 255, 255, 0.92)",
  backdropFilter:   "blur(16px) saturate(140%)",
  WebkitBackdropFilter: "blur(16px) saturate(140%)",
  border:    "1px solid rgba(255, 255, 255, 0.65)",
  boxShadow:
    "0 1px 0 rgba(255,255,255,0.60) inset, " +
    "0 8px 24px -8px rgba(1,26,85,0.22), " +
    "0 2px 8px -2px rgba(1,26,85,0.10)",
};

const AVATAR_STYLE: CSSProperties = {
  background: "linear-gradient(135deg, #ffc358 0%, #f59f1c 100%)",
  color:      "#011a55",
};

const NAV_CLOSE_DELAY_MS = 750;
const NAV_SAFE_ZONE_PADDING = 28;

// ─── Types ────────────────────────────────────────────────────────────────────

type NavItem = {
  href:           string;
  labelKey:       string;
  descriptionKey: string;
  icon:           ReactNode;
};

const NAV: NavItem[] = [
  {
    href:           "/workspace",
    labelKey:       "app.nav.workspaceLabel",
    descriptionKey: "app.nav.workspaceDesc",
    icon:           <IconSparkles />,
  },
  {
    href:           "/profile",
    labelKey:       "app.nav.profileLabel",
    descriptionKey: "app.nav.profileDesc",
    icon:           <IconUser />,
  },
  {
    href:           "/import-jobs",
    labelKey:       "app.nav.importJobsLabel",
    descriptionKey: "app.nav.importJobsDesc",
    icon:           <IconClipboard />,
  },
  {
    href:           "/recommendations",
    labelKey:       "app.nav.recommendationsLabel",
    descriptionKey: "app.nav.recommendationsDesc",
    icon:           <IconTarget />,
  },
  {
    href:           "/dashboard",
    labelKey:       "app.nav.dashboardLabel",
    descriptionKey: "app.nav.dashboardDesc",
    icon:           <IconBoard />,
  },
  {
    href:           "/insights",
    labelKey:       "app.nav.insightsLabel",
    descriptionKey: "app.nav.insightsDesc",
    icon:           <IconChart />,
  },
  {
    href:           "/coach",
    labelKey:       "app.nav.coachLabel",
    descriptionKey: "app.nav.coachDesc",
    icon:           <IconChat />,
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function AppShell({ children }: { children: ReactNode }) {
  const t          = useT();
  const pathname   = usePathname();
  const auth       = useAuth();
  const userId     = useLocalUserId();
  const [mobileOpen,     setMobileOpen]     = useState(false);
  const [desktopNavOpen, setDesktopNavOpen] = useState(false);
  const [menuOpen,       setMenuOpen]       = useState(false);
  const navButtonRef    = useRef<HTMLButtonElement>(null);
  const desktopNavRef   = useRef<HTMLElement>(null);
  const navCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navOpenedAtRef  = useRef(0);
  const menuRef         = useRef<HTMLDivElement>(null);

  const clearDesktopNavCloseTimer = useCallback(() => {
    if (!navCloseTimerRef.current) return;
    clearTimeout(navCloseTimerRef.current);
    navCloseTimerRef.current = null;
  }, []);

  const isPointInDesktopNavSafeZone = useCallback((x: number, y: number) => {
    const buttonRect = navButtonRef.current?.getBoundingClientRect();
    const panelRect  = desktopNavRef.current?.getBoundingClientRect();

    if (!buttonRect || !panelRect) return false;

    const left   = Math.min(buttonRect.left, panelRect.left) - NAV_SAFE_ZONE_PADDING;
    const right  = Math.max(buttonRect.right, panelRect.right) + NAV_SAFE_ZONE_PADDING;
    const top    = Math.min(buttonRect.top, panelRect.top) - NAV_SAFE_ZONE_PADDING;
    const bottom = Math.max(buttonRect.bottom, panelRect.bottom) + NAV_SAFE_ZONE_PADDING;

    return x >= left && x <= right && y >= top && y <= bottom;
  }, []);

  const openDesktopNav = useCallback(() => {
    clearDesktopNavCloseTimer();
    navOpenedAtRef.current = Date.now();
    setDesktopNavOpen(true);
  }, [clearDesktopNavCloseTimer]);

  const scheduleDesktopNavClose = useCallback(() => {
    clearDesktopNavCloseTimer();
    navCloseTimerRef.current = setTimeout(() => {
      setDesktopNavOpen(false);
      navCloseTimerRef.current = null;
    }, NAV_CLOSE_DELAY_MS);
  }, [clearDesktopNavCloseTimer]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setMobileOpen(false);
    setDesktopNavOpen(false);
    setMenuOpen(false);
  }, [pathname]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  useEffect(() => {
    return () => {
      clearDesktopNavCloseTimer();
    };
  }, [clearDesktopNavCloseTimer]);

  useEffect(() => {
    if (!desktopNavOpen) return;
    const handler = (event: MouseEvent) => {
      if (Date.now() - navOpenedAtRef.current < 200) return;
      const target = event.target as Node | null;
      if (!target) return;
      if (
        navButtonRef.current?.contains(target) ||
        desktopNavRef.current?.contains(target)
      ) {
        clearDesktopNavCloseTimer();
        return;
      }
      if (isPointInDesktopNavSafeZone(event.clientX, event.clientY)) {
        clearDesktopNavCloseTimer();
        return;
      }
      if (!navCloseTimerRef.current) {
        scheduleDesktopNavClose();
      }
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, [clearDesktopNavCloseTimer, desktopNavOpen, isPointInDesktopNavSafeZone, scheduleDesktopNavClose]);

  const navItems = useMemo(
    () =>
      NAV.map((item) => ({
        ...item,
        label:       t(item.labelKey),
        description: t(item.descriptionKey),
      })),
    [t]
  );

  const activeItem =
    navItems.find((item) => pathname === item.href) ||
    navItems.find((item) => pathname?.startsWith(item.href + "/"));

  const accountId      = auth.isCognito ? auth.email || "" : userId || "";
  const accountInitial = accountId
    ? accountId.trim().charAt(0).toUpperCase() || "U"
    : "U";

  const handleNewLocalAccount = () => {
    const confirmed = window.confirm(t("app.topbar.newAccountConfirm"));
    if (!confirmed) return;
    auth.createNewLocalAccount();
  };

  const handleNavButtonClick = () => {
    clearDesktopNavCloseTimer();
    navOpenedAtRef.current = Date.now();
    setDesktopNavOpen(true);
  };

  return (
    <div className="min-h-screen bg-transparent text-[var(--color-text-primary)]">

      {/* ── Floating glass nav panel — desktop ──────────────────────────── */}
      <aside
        ref={desktopNavRef}
        onMouseEnter={openDesktopNav}
        onMouseLeave={scheduleDesktopNavClose}
        onPointerEnter={openDesktopNav}
        onPointerLeave={scheduleDesktopNavClose}
        aria-hidden={!desktopNavOpen}
        data-nav-panel="app"
        className={`fixed z-40 flex flex-col transition-all duration-[220ms] ease-out ${
          desktopNavOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-1 pointer-events-none"
        }`}
        style={NAV_PANEL_STYLE}
      >
        {/* Logo header */}
        <Link
          href="/"
          aria-label="CareerCat home"
          className="flex h-14 items-center gap-3 px-5 transition-opacity hover:opacity-80"
        >
          <Image
            src="/logo.svg"
            alt="CareerCat"
            width={36}
            height={36}
            className="h-9 w-9 object-contain"
          />
          <div>
            <p className="text-sm font-semibold" style={{ color: "#011a55" }}>
              CareerCat
            </p>
            <p className="text-[11px] text-[var(--color-text-muted)]">
              {t("app.nav.brandTagline")}
            </p>
          </div>
        </Link>

        {/* Nav items */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={Boolean(activeItem && activeItem.href === item.href)}
            />
          ))}
        </nav>

        {/* Upgrade footer */}
        <div className="p-3">
          <Link
            href="/pricing"
            className="block rounded-[14px] p-3 text-sm transition-opacity hover:opacity-80"
            style={{
              background: "rgba(1,26,85,0.06)",
              border:     "1px solid rgba(1,26,85,0.08)",
            }}
          >
            <p className="font-semibold" style={{ color: "#011a55" }}>
              {t("app.nav.upgradeTitle")}
            </p>
            <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
              {t("app.nav.upgradeBody")}
            </p>
          </Link>
        </div>
      </aside>

      {/* ── Mobile drawer ────────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <aside
            className="relative flex h-full w-72 flex-col overflow-hidden shadow-2xl"
            style={{
              background:       "rgba(255,255,255,0.92)",
              backdropFilter:   "blur(22px) saturate(140%)",
              WebkitBackdropFilter: "blur(22px) saturate(140%)",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="flex h-16 items-center justify-between px-5"
              style={{ borderBottom: "1px solid rgba(1,26,85,0.08)" }}
            >
              <Link
                href="/"
                aria-label="CareerCat home"
                className="flex items-center gap-2 transition hover:opacity-80"
              >
                <Image
                  src="/logo.svg"
                  alt="CareerCat"
                  width={28}
                  height={28}
                  className="h-7 w-7 object-contain"
                />
                <p className="text-sm font-semibold" style={{ color: "#011a55" }}>
                  CareerCat
                </p>
              </Link>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-[var(--radius-sm)] p-2 text-[var(--color-text-secondary)] transition hover:bg-black/5"
                aria-label={t("app.topbar.closeMenu")}
              >
                <IconClose />
              </button>
            </div>
            <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
              {navItems.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={Boolean(activeItem && activeItem.href === item.href)}
                />
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* ── Main column ──────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">

        {/* Top bar — gradient-fade, no hard border */}
        <header
          className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 px-4 lg:px-8"
          style={TOPBAR_STYLE}
        >
          <div className="flex min-w-0 items-center gap-3">
            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-[var(--radius-sm)] p-2 text-[var(--color-text-secondary)] transition hover:bg-black/6 md:hidden"
              aria-label={t("app.topbar.openMenu")}
            >
              <IconMenu />
            </button>

            {/* Desktop nav trigger */}
            <button
              ref={navButtonRef}
              type="button"
              onClick={handleNavButtonClick}
              onMouseEnter={openDesktopNav}
              onMouseLeave={scheduleDesktopNavClose}
              onPointerEnter={openDesktopNav}
              onPointerLeave={scheduleDesktopNavClose}
              onFocus={openDesktopNav}
              className="hidden rounded-[var(--radius-sm)] p-2 text-[var(--color-text-secondary)] transition hover:bg-black/6 md:inline-flex"
              aria-label={t("app.topbar.openMenu")}
            >
              <IconMenu />
            </button>

            {/* Logo */}
            <Link
              href="/"
              aria-label="CareerCat home"
              className="flex shrink-0 items-center rounded-[var(--radius-sm)] p-1 transition hover:opacity-80"
            >
              <Image
                src="/logo.svg"
                alt="CareerCat"
                width={28}
                height={28}
                className="h-7 w-7 object-contain"
              />
            </Link>

            {/* Page title */}
            <div className="min-w-0">
              <p className="truncate text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                {activeItem?.description || ""}
              </p>
              <h1 className="truncate text-base font-semibold sm:text-lg" style={{ color: "#011a55" }}>
                {activeItem?.label || "CareerCat"}
              </h1>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <LocaleSwitcher size="compact" />

            <Link
              href="/workspace"
              className="hidden rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition hover:bg-black/5 hover:text-[var(--color-text-accent)] sm:inline-flex"
              style={{ border: "1px solid rgba(1,26,85,0.12)" }}
            >
              {t("app.topbar.newPlan")}
            </Link>

            {/* Account pill */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="flex h-9 items-center gap-2 rounded-[var(--radius-full)] px-2 pr-3 transition hover:bg-black/5"
                style={{ border: "1px solid rgba(1,26,85,0.12)", background: "rgba(255,255,255,0.65)" }}
              >
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-full)] text-xs font-bold"
                  style={AVATAR_STYLE}
                >
                  {accountInitial}
                </span>
                <span className="hidden max-w-[160px] truncate text-xs text-[var(--color-text-secondary)] sm:inline">
                  {accountId || t("app.topbar.loading")}
                </span>
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 overflow-hidden rounded-[var(--radius-md)]"
                  style={DROPDOWN_STYLE}
                >
                  <div className="p-3" style={{ borderBottom: "1px solid rgba(1,26,85,0.08)" }}>
                    <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                      {auth.isCognito
                        ? t("app.topbar.signedIn")
                        : t("app.topbar.localAccount")}
                    </p>
                    <p className="mt-1 break-all text-sm font-medium">
                      {accountId || t("app.topbar.loading")}
                    </p>
                  </div>
                  <Link
                    href="/settings"
                    className="block px-3 py-2 text-sm text-[var(--color-text-secondary)] transition hover:bg-black/5 hover:text-[var(--color-text-primary)]"
                    onClick={() => setMenuOpen(false)}
                  >
                    {t("marketing.nav.settings")}
                  </Link>
                  <Link
                    href="/profile"
                    className="block px-3 py-2 text-sm text-[var(--color-text-secondary)] transition hover:bg-black/5 hover:text-[var(--color-text-primary)]"
                    onClick={() => setMenuOpen(false)}
                  >
                    {t("app.topbar.profileMenu")}
                  </Link>
                  <Link
                    href="/pricing"
                    className="block px-3 py-2 text-sm text-[var(--color-text-secondary)] transition hover:bg-black/5 hover:text-[var(--color-text-primary)]"
                    onClick={() => setMenuOpen(false)}
                  >
                    {t("app.topbar.pricingMenu")}
                  </Link>
                  {auth.isCognito ? (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        auth.signOut();
                      }}
                      className="block w-full px-3 py-2 text-left text-sm text-[var(--color-text-secondary)] transition hover:bg-black/5 hover:text-[var(--color-danger)]"
                      style={{ borderTop: "1px solid rgba(1,26,85,0.08)" }}
                    >
                      {t("app.topbar.signOut")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        handleNewLocalAccount();
                      }}
                      className="block w-full px-3 py-2 text-left text-sm text-[var(--color-text-secondary)] transition hover:bg-black/5 hover:text-[var(--color-text-primary)]"
                      style={{ borderTop: "1px solid rgba(1,26,85,0.08)" }}
                    >
                      {t("app.topbar.newLocalAccount")}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

// ─── NavLink ──────────────────────────────────────────────────────────────────

function NavLink({
  item,
  active,
}: {
  item: { href: string; label: string; description: string; icon: ReactNode };
  active: boolean;
}) {
  return (
    <a
      href={item.href}
      className="group flex items-center gap-3 px-3 py-2 text-sm transition-all duration-150"
      style={{
        borderRadius: 14,
        background:   active ? "rgba(1,26,85,0.94)" : "transparent",
        color:        active ? "#FFECBF" : "var(--color-text-secondary)",
      }}
      onMouseEnter={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(1,26,85,0.06)";
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      <span
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center"
        style={{
          borderRadius:     12,
          background:       active ? "rgba(255,236,191,0.15)" : "rgba(1,26,85,0.06)",
          border:           active ? "1px solid rgba(255,236,191,0.20)" : "1px solid rgba(1,26,85,0.08)",
          color:            active ? "#FFECBF" : "var(--color-text-muted)",
        }}
      >
        {item.icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-medium leading-tight truncate">{item.label}</span>
        <span
          className="block text-[11px] truncate"
          style={{ color: active ? "rgba(255,236,191,0.65)" : "var(--color-text-muted)" }}
        >
          {item.description}
        </span>
      </span>
    </a>
  );
}

// ─── Icon set ─────────────────────────────────────────────────────────────────

function IconBase({ children }: { children: ReactNode }) {
  return (
    <svg
      width="16"
      height="16"
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
function IconSparkles() {
  return (
    <IconBase>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
    </IconBase>
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
function IconClipboard() {
  return (
    <IconBase>
      <rect x="6" y="4" width="12" height="16" rx="2" />
      <path d="M9 4h6v3H9z" />
      <path d="M9 12h6M9 16h4" />
    </IconBase>
  );
}
function IconTarget() {
  return (
    <IconBase>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
    </IconBase>
  );
}
function IconBoard() {
  return (
    <IconBase>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16M15 4v16" />
    </IconBase>
  );
}
function IconChart() {
  return (
    <IconBase>
      <path d="M4 20V8M10 20v-7M16 20V4M22 20H2" />
    </IconBase>
  );
}
function IconChat() {
  return (
    <IconBase>
      <path d="M21 12a8 8 0 1 1-3.4-6.5" />
      <path d="M21 5v4h-4" />
      <path d="M8 12h.01M12 12h.01M16 12h.01" />
    </IconBase>
  );
}
function IconMenu() {
  return (
    <IconBase>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </IconBase>
  );
}
function IconClose() {
  return (
    <IconBase>
      <path d="M6 6l12 12M6 18L18 6" />
    </IconBase>
  );
}

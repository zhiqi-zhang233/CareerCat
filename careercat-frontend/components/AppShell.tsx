"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useLocalUserId } from "@/lib/useLocalUserId";
import { useT } from "@/lib/i18n/LocaleProvider";
import LocaleSwitcher from "@/components/LocaleSwitcher";

type NavItem = {
  href: string;
  labelKey: string;
  descriptionKey: string;
  icon: ReactNode;
};

const NAV: NavItem[] = [
  {
    href: "/workspace",
    labelKey: "app.nav.workspaceLabel",
    descriptionKey: "app.nav.workspaceDesc",
    icon: <IconSparkles />,
  },
  {
    href: "/profile",
    labelKey: "app.nav.profileLabel",
    descriptionKey: "app.nav.profileDesc",
    icon: <IconUser />,
  },
  {
    href: "/import-jobs",
    labelKey: "app.nav.importJobsLabel",
    descriptionKey: "app.nav.importJobsDesc",
    icon: <IconClipboard />,
  },
  {
    href: "/recommendations",
    labelKey: "app.nav.recommendationsLabel",
    descriptionKey: "app.nav.recommendationsDesc",
    icon: <IconTarget />,
  },
  {
    href: "/dashboard",
    labelKey: "app.nav.dashboardLabel",
    descriptionKey: "app.nav.dashboardDesc",
    icon: <IconBoard />,
  },
  {
    href: "/insights",
    labelKey: "app.nav.insightsLabel",
    descriptionKey: "app.nav.insightsDesc",
    icon: <IconChart />,
  },
  {
    href: "/coach",
    labelKey: "app.nav.coachLabel",
    descriptionKey: "app.nav.coachDesc",
    icon: <IconChat />,
  },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const t = useT();
  const pathname = usePathname();
  const auth = useAuth();
  const userId = useLocalUserId();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopNavOpen, setDesktopNavOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navButtonRef = useRef<HTMLButtonElement>(null);
  const desktopNavRef = useRef<HTMLElement>(null);
  const navCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navOpenedAtRef = useRef(0);
  const menuRef = useRef<HTMLDivElement>(null);

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
      if (navCloseTimerRef.current) clearTimeout(navCloseTimerRef.current);
    };
  }, []);

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
        return;
      }
      setDesktopNavOpen(false);
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, [desktopNavOpen]);

  const navItems = useMemo(
    () =>
      NAV.map((item) => ({
        ...item,
        label: t(item.labelKey),
        description: t(item.descriptionKey),
      })),
    [t]
  );

  const activeItem =
    navItems.find((item) => pathname === item.href) ||
    navItems.find((item) => pathname?.startsWith(item.href + "/"));

  const accountId = auth.isCognito ? auth.email || "" : userId || "";
  const accountInitial = accountId
    ? accountId.trim().charAt(0).toUpperCase() || "U"
    : "U";

  const handleNewLocalAccount = () => {
    const confirmed = window.confirm(t("app.topbar.newAccountConfirm"));
    if (!confirmed) return;
    auth.createNewLocalAccount();
  };

  const openDesktopNav = () => {
    if (navCloseTimerRef.current) clearTimeout(navCloseTimerRef.current);
    navOpenedAtRef.current = Date.now();
    setDesktopNavOpen(true);
  };

  const scheduleDesktopNavClose = () => {
    if (navCloseTimerRef.current) clearTimeout(navCloseTimerRef.current);
    navCloseTimerRef.current = setTimeout(() => {
      setDesktopNavOpen(false);
    }, 500);
  };

  const handleNavButtonClick = () => {
    if (navCloseTimerRef.current) clearTimeout(navCloseTimerRef.current);
    navOpenedAtRef.current = Date.now();
    setDesktopNavOpen(true);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)]">
      {/* Hover navigation — desktop */}
      <aside
        ref={desktopNavRef}
        onMouseEnter={openDesktopNav}
        onMouseLeave={scheduleDesktopNavClose}
        aria-hidden={!desktopNavOpen}
        data-nav-panel="app"
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-elev-1)] shadow-[var(--shadow-lg)] transition-transform duration-200 ease-out ${
          desktopNavOpen
            ? "pointer-events-auto translate-x-0"
            : "pointer-events-none -translate-x-full"
        }`}
      >
        <Link
          href="/"
          aria-label="CareerCat home"
          className="flex h-16 items-center gap-3 border-b border-[var(--color-border)] px-5 transition hover:bg-[var(--color-bg-elev-2)]"
        >
          <Image
            src="/logo.svg"
            alt="CareerCat"
            width={36}
            height={36}
            className="h-9 w-9 object-contain"
          />
          <div>
            <p className="text-sm font-semibold text-[var(--color-text-accent)]">
              CareerCat
            </p>
            <p className="text-[11px] text-[var(--color-text-muted)]">
              {t("app.nav.brandTagline")}
            </p>
          </div>
        </Link>
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={Boolean(activeItem && activeItem.href === item.href)}
            />
          ))}
        </nav>
        <div className="border-t border-[var(--color-border)] p-4">
          <Link
            href="/pricing"
            className="block rounded-[var(--radius-md)] border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 p-3 text-sm transition hover:bg-[var(--color-accent)]/20"
          >
            <p className="font-semibold text-[var(--color-text-accent)]">
              {t("app.nav.upgradeTitle")}
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              {t("app.nav.upgradeBody")}
            </p>
          </Link>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60" />
          <aside
            className="relative flex h-full w-72 flex-col bg-[var(--color-bg)] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex h-16 items-center justify-between border-b border-[var(--color-border)] px-5">
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
                <p className="text-sm font-semibold text-[var(--color-text-accent)]">
                  CareerCat
                </p>
              </Link>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-[var(--radius-sm)] p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elev-1)]"
                aria-label={t("app.topbar.closeMenu")}
              >
                <IconClose />
              </button>
            </div>
            <nav className="flex-1 space-y-1 p-4">
              {navItems.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={Boolean(
                    activeItem && activeItem.href === item.href
                  )}
                />
              ))}
            </nav>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 px-4 backdrop-blur lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              ref={navButtonRef}
              type="button"
              onClick={handleNavButtonClick}
              onMouseEnter={openDesktopNav}
              onMouseLeave={scheduleDesktopNavClose}
              onFocus={openDesktopNav}
              className="rounded-[var(--radius-sm)] p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elev-1)]"
              aria-label={t("app.topbar.openMenu")}
            >
              <IconMenu />
            </button>
            <Link
              href="/"
              aria-label="CareerCat home"
              className="flex shrink-0 items-center rounded-[var(--radius-sm)] p-1 transition hover:bg-[var(--color-bg-elev-1)]"
            >
              <Image
                src="/logo.svg"
                alt="CareerCat"
                width={28}
                height={28}
                className="h-7 w-7 object-contain"
              />
            </Link>
            <div className="min-w-0">
              <p className="truncate text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                {activeItem?.description || ""}
              </p>
              <h1 className="truncate text-base font-semibold sm:text-lg">
                {activeItem?.label || "CareerCat"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <LocaleSwitcher size="compact" />

            <Link
              href="/workspace"
              className="hidden rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition hover:border-[var(--color-accent)]/40 hover:text-[var(--color-text-accent)] sm:inline-flex"
            >
              {t("app.topbar.newPlan")}
            </Link>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="flex h-9 items-center gap-2 rounded-[var(--radius-full)] border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] px-2 pr-3 transition hover:border-[var(--color-accent)]/40"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-full)] bg-[var(--color-accent)] text-xs font-bold text-[var(--color-accent-text)]">
                  {accountInitial}
                </span>
                <span className="hidden max-w-[160px] truncate text-xs text-[var(--color-text-secondary)] sm:inline">
                  {accountId || t("app.topbar.loading")}
                </span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] shadow-[var(--shadow-lg)]">
                  <div className="border-b border-[var(--color-border)] p-3">
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
                    className="block px-3 py-2 text-sm text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-elev-1)] hover:text-[var(--color-text-primary)]"
                    onClick={() => setMenuOpen(false)}
                  >
                    {t("marketing.nav.settings")}
                  </Link>
                  <Link
                    href="/profile"
                    className="block px-3 py-2 text-sm text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-elev-1)] hover:text-[var(--color-text-primary)]"
                    onClick={() => setMenuOpen(false)}
                  >
                    {t("app.topbar.profileMenu")}
                  </Link>
                  <Link
                    href="/pricing"
                    className="block px-3 py-2 text-sm text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-elev-1)] hover:text-[var(--color-text-primary)]"
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
                      className="block w-full border-t border-[var(--color-border)] px-3 py-2 text-left text-sm text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-elev-1)] hover:text-[var(--color-danger)]"
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
                      className="block w-full border-t border-[var(--color-border)] px-3 py-2 text-left text-sm text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-elev-1)] hover:text-[var(--color-text-primary)]"
                    >
                      {t("app.topbar.newLocalAccount")}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

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
      className={`group flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm transition ${
        active
          ? "bg-[var(--color-accent)]/15 text-[var(--color-text-accent)]"
          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elev-1)] hover:text-[var(--color-text-primary)]"
      }`}
    >
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border ${
          active
            ? "border-[var(--color-accent)]/40 bg-[var(--color-accent)]/15 text-[var(--color-text-accent)]"
            : "border-[var(--color-border)] bg-[var(--color-bg-elev-1)] text-[var(--color-text-secondary)] group-hover:border-[var(--color-border-strong)]"
        }`}
      >
        {item.icon}
      </span>
      <span className="flex-1">
        <span className="block font-medium leading-tight">{item.label}</span>
        <span className="block text-[11px] text-[var(--color-text-muted)]">
          {item.description}
        </span>
      </span>
    </a>
  );
}

/* --------- Inline icon set --------- */

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

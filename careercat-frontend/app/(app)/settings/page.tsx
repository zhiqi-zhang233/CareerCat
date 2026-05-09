"use client";

import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { useLocalUserId } from "@/lib/useLocalUserId";
import { useT } from "@/lib/i18n/LocaleProvider";
import LocaleSwitcher from "@/components/LocaleSwitcher";

export default function SettingsPage() {
  const t = useT();
  const auth = useAuth();
  const localUserId = useLocalUserId();

  const accountId = auth.isCognito ? auth.email || "" : auth.userId || localUserId || "";
  const accountModeLabel = auth.isCognito
    ? t("app.settings.accountModeCognito")
    : t("app.settings.accountModeLocal");

  const handleSignOut = () => {
    auth.signOut();
  };

  const handleNewLocalAccount = () => {
    if (window.confirm(t("app.settings.newLocalConfirm"))) {
      auth.createNewLocalAccount();
    }
  };

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 lg:px-8 lg:py-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-accent)]">
          {t("app.settings.eyebrow")}
        </p>
        <h1 className="mt-2 text-2xl font-bold leading-tight md:text-3xl">
          {t("app.settings.title")}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">
          {t("app.settings.subtitle")}
        </p>
      </header>

      <div className="mt-8 space-y-5">
        {/* Account */}
        <SettingsSection
          title={t("app.settings.sectionAccount")}
          body={t("app.settings.sectionAccountBody")}
        >
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
              {accountModeLabel}
            </p>
            <p className="mt-1.5 break-all text-sm font-medium">
              {accountId || "—"}
            </p>
            {auth.isCognito && (
              <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                {t("app.settings.accountIdLabel")}: {auth.userId}
              </p>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {auth.isCognito ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="cc-btn cc-btn-ghost"
              >
                {t("app.settings.signOut")}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNewLocalAccount}
                className="cc-btn cc-btn-ghost"
              >
                {t("app.settings.newLocal")}
              </button>
            )}
          </div>
        </SettingsSection>

        {/* Language */}
        <SettingsSection
          title={t("app.settings.sectionLanguage")}
          body={t("app.settings.sectionLanguageBody")}
        >
          <div className="flex items-center gap-3">
            <LocaleSwitcher />
          </div>
        </SettingsSection>

        {/* Plan */}
        <SettingsSection
          title={t("app.settings.sectionPlan")}
          body={t("app.settings.sectionPlanBody")}
        >
          <Link href="/pricing" className="cc-btn cc-btn-secondary">
            {t("app.settings.planButton")}
          </Link>
        </SettingsSection>

        {/* Resume / profile shortcut */}
        <SettingsSection
          title={t("app.settings.sectionResume")}
          body={t("app.settings.sectionResumeBody")}
        >
          <Link href="/profile" className="cc-btn cc-btn-secondary">
            {t("app.settings.resumeButton")}
          </Link>
        </SettingsSection>
      </div>
    </section>
  );
}

function SettingsSection({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <section className="cc-card p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">
        {body}
      </p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

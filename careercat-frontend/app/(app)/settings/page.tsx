"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useT } from "@/lib/i18n/LocaleProvider";
import { requestAccountDeletion, deleteAccount } from "@/lib/api";
import LocaleSwitcher from "@/components/LocaleSwitcher";

type DeleteStep = "idle" | "warning" | "code_sent" | "done";

export default function SettingsPage() {
  const t = useT();
  const auth = useAuth();

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
          {auth.isCognito && auth.email && (
            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                {t("app.settings.emailLabel")}
              </p>
              <p className="mt-1.5 text-sm font-medium">{auth.email}</p>
            </div>
          )}
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

        {/* Danger zone — Cognito only */}
        {auth.isCognito && (
          <DangerZone email={auth.email} onDeleted={handleSignOut} />
        )}
      </div>
    </section>
  );
}

function DangerZone({ email, onDeleted }: { email: string; onDeleted: () => void }) {
  const t = useT();
  const [step, setStep] = useState<DeleteStep>("idle");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  const handleSendCode = async () => {
    setError("");
    setWorking(true);
    try {
      await requestAccountDeletion(email);
      setStep("code_sent");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setWorking(false);
    }
  };

  const handleConfirmDelete = async () => {
    setError("");
    setWorking(true);
    try {
      await deleteAccount(email, code.trim());
      setStep("done");
      setTimeout(onDeleted, 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setWorking(false);
    }
  };

  const handleReset = () => {
    setStep("idle");
    setCode("");
    setError("");
  };

  return (
    <section className="cc-card p-5 border-red-200 dark:border-red-900">
      <h2 className="text-base font-semibold text-red-600 dark:text-red-400">
        {t("app.settings.sectionDanger")}
      </h2>
      <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">
        {t("app.settings.sectionDangerBody")}
      </p>

      <div className="mt-4">
        {step === "idle" && (
          <>
            <button
              type="button"
              onClick={() => setStep("warning")}
              className="cc-btn cc-btn-ghost text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-950"
            >
              {t("app.settings.deleteAccount")}
            </button>
            {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          </>
        )}

        {step === "warning" && (
          <div className="rounded-[var(--radius-md)] border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-4 space-y-3">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              {t("app.settings.deleteWarningTitle")}
            </p>
            <p className="text-sm text-red-600 dark:text-red-300">
              {t("app.settings.deleteWarningBody")}
            </p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {t("app.settings.deleteStep1")}
            </p>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={handleSendCode}
                disabled={working}
                className="cc-btn cc-btn-primary bg-red-600 hover:bg-red-700 focus-visible:ring-red-500 disabled:opacity-50"
              >
                {working ? t("app.settings.deleteConfirmWorking") : t("app.settings.deleteSendCode")}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="cc-btn cc-btn-ghost"
              >
                {t("app.settings.cancel")}
              </button>
            </div>
          </div>
        )}

        {step === "code_sent" && (
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-4 space-y-4">
            <p className="text-sm text-[var(--color-text-secondary)]">
              {t("app.settings.deleteCodeSentInfo")}
            </p>
            <div>
              <label className="block text-xs font-medium mb-1 text-[var(--color-text-secondary)]">
                {t("app.settings.deleteCodeLabel")}
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder={t("app.settings.deleteCodePlaceholder")}
                className="cc-input w-full max-w-xs"
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={working || code.length < 6}
                className="cc-btn cc-btn-primary bg-red-600 hover:bg-red-700 focus-visible:ring-red-500 disabled:opacity-50"
              >
                {working ? t("app.settings.deleteConfirmWorking") : t("app.settings.deleteConfirmButton")}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="cc-btn cc-btn-ghost"
              >
                {t("app.settings.cancel")}
              </button>
            </div>
          </div>
        )}

        {step === "done" && (
          <p className="text-sm text-green-600 dark:text-green-400 font-medium">
            {t("app.settings.deleteSuccess")}
          </p>
        )}
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

"use client";

import { useSearchParams } from "next/navigation";
import { FormEvent, ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useT } from "@/lib/i18n/LocaleProvider";

type AuthView = "sign_in" | "sign_up" | "verify" | "forgot_password" | "reset_password";

function CheckIcon() {
  return (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  );
}

// Light-theme CSS variable overrides matching the marketing homepage.
const lightThemeVars = {
  "--color-bg": "var(--brand-cream-50)",
  "--color-bg-elev-1": "#ffffff",
  "--color-bg-elev-2": "var(--neutral-50)",
  "--color-border": "var(--neutral-200)",
  "--color-border-strong": "var(--neutral-300)",
  "--color-text-primary": "var(--neutral-900)",
  "--color-text-secondary": "var(--neutral-700)",
  "--color-text-muted": "var(--neutral-500)",
  "--color-text-accent": "var(--brand-honey-600)",
  "--color-accent": "var(--brand-honey-400)",
  "--color-accent-hover": "var(--brand-honey-500)",
  "--color-accent-text": "var(--brand-ink-700)",
} as React.CSSProperties;

export default function AuthGate({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const t = useT();
  const searchParams = useSearchParams();

  const initialView: AuthView =
    searchParams?.get("auth") === "signup" ? "sign_up" : "sign_in";

  const [view, setView] = useState<AuthView>(initialView);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const next = searchParams?.get("auth");
    if (next === "signup") setView("sign_up");
    else if (next === "signin") setView("sign_in");
  }, [searchParams]);

  if (!auth.isCognito) return <>{children}</>;

  if (auth.status === "loading") return null;

  if (auth.status === "authenticated") return <>{children}</>;

  const clearMessages = () => { setError(""); setMessage(""); };

  const navigate = (nextView: AuthView) => {
    clearMessages();
    setShowPassword(false);
    setView(nextView);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearMessages();

    if (view === "sign_up" && password !== confirmPassword) {
      setError(t("auth.errPasswordMismatch"));
      return;
    }

    setSubmitting(true);
    try {
      if (view === "sign_in") {
        await auth.signIn(email.trim(), password);
        return;
      }

      if (view === "sign_up") {
        const result = await auth.signUp(email.trim(), password);
        if (result.needsConfirmation) {
          setView("verify");
          setMessage(t("auth.msgCheckEmail"));
        } else {
          await auth.signIn(email.trim(), password);
        }
        return;
      }

      if (view === "verify") {
        await auth.confirmSignUp(email.trim(), code.trim());
        setView("sign_in");
        setMessage(t("auth.msgConfirmed"));
        setCode("");
        return;
      }

      if (view === "forgot_password") {
        await auth.forgotPassword(email.trim());
        setView("reset_password");
        setMessage(t("auth.msgCheckEmail"));
        return;
      }

      if (view === "reset_password") {
        if (password !== confirmPassword) {
          setError(t("auth.errPasswordMismatch"));
          return;
        }
        await auth.confirmForgotPassword(email.trim(), code.trim(), password);
        setView("sign_in");
        setMessage(t("auth.msgPasswordReset"));
        setCode("");
        setPassword("");
        setConfirmPassword("");
        return;
      }
    } catch (authError) {
      setError(resolveError(authError, t));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (!email.trim()) { setError(t("auth.errEmailFirst")); return; }
    try {
      setSubmitting(true);
      clearMessages();
      await auth.resendConfirmationCode(email.trim());
      setMessage(t("auth.msgCodeSent"));
    } catch (authError) {
      setError(resolveError(authError, t));
    } finally {
      setSubmitting(false);
    }
  };

  const formTitle = getTitle(view, t);
  const formSubtitle = getSubtitle(view, t, email);

  return (
    <main
      className="relative min-h-screen overflow-hidden px-4 py-12 sm:px-6 lg:px-8"
      style={{ background: "var(--brand-cream-50)", ...lightThemeVars }}
    >
      {/* Radial glow — matches homepage hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[900px] -translate-x-1/2 rounded-full opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 50%, rgba(255,178,56,0.30) 0%, rgba(255,178,56,0) 70%)",
        }}
      />

      <div className="relative mx-auto grid max-w-5xl gap-12 lg:grid-cols-[1fr_420px] lg:items-center">
        {/* ── Left: Brand panel (desktop only) ── */}
        <div className="hidden lg:block">
          <span className="cc-chip border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 text-[var(--color-text-accent)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
            {t("auth.eyebrow")}
          </span>

          <h1 className="mt-6 text-5xl font-bold leading-tight tracking-tight text-[var(--color-text-primary)]">
            {t("auth.brandHeadline")}{" "}
            <span
              style={{
                background: "linear-gradient(100deg, var(--brand-honey-600) 0%, var(--brand-honey-400) 55%, var(--brand-honey-600) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {t("auth.brandHeadlineAccent")}
            </span>
          </h1>
          <p className="mt-5 text-lg leading-8 text-[var(--color-text-secondary)]">
            {t("auth.brandSubtitle")}
          </p>

          <ul className="mt-8 space-y-3">
            {[
              t("auth.brandFeature1"),
              t("auth.brandFeature2"),
              t("auth.brandFeature3"),
            ].map((feat) => (
              <li key={feat} className="flex items-center gap-3 text-[var(--color-text-secondary)]">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)]/20 text-[var(--color-accent)]">
                  <CheckIcon />
                </span>
                {feat}
              </li>
            ))}
          </ul>
        </div>

        {/* ── Right: Form card ── */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-7 shadow-2xl backdrop-blur-sm">

          {/* Dynamic header */}
          <div className={view === "verify" ? "text-center" : ""}>
            {view === "verify" && (
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-accent)]/15 text-[var(--color-accent)]">
                <MailIcon />
              </div>
            )}
            <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
              {formTitle}
            </h2>
            {formSubtitle && (
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                {formSubtitle}
              </p>
            )}
          </div>

          {/* Cognito config warning */}
          {!auth.isConfigured && (
            <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--color-danger-400)]/30 bg-[var(--color-danger-400)]/10 p-4 text-sm text-[var(--color-danger-400)]">
              {t("auth.cognitoNotConfigured")}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {/* Email field — hidden only on reset_password view */}
            {view !== "reset_password" && view !== "verify" && (
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
                  {t("auth.email")}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="cc-input mt-1.5"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>
            )}

            {/* Verification code — verify + reset_password views */}
            {(view === "verify" || view === "reset_password") && (
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
                  {t("auth.confirmationCode")}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="cc-input mt-1.5 text-center text-xl tracking-[0.4em] font-mono"
                  placeholder="------"
                  maxLength={6}
                  autoComplete="one-time-code"
                  required
                />
              </div>
            )}

            {/* Password — sign_in, sign_up, reset_password */}
            {(view === "sign_in" || view === "sign_up" || view === "reset_password") && (
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
                  {view === "reset_password" ? t("auth.newPassword") : t("auth.password")}
                </label>
                <div className="relative mt-1.5">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="cc-input pr-16"
                    autoComplete={view === "sign_in" ? "current-password" : "new-password"}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-accent)] transition-colors"
                  >
                    {showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                  </button>
                </div>
                {(view === "sign_up" || view === "reset_password") && (
                  <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">
                    {t("auth.passwordHint")}
                  </p>
                )}
              </div>
            )}

            {/* Confirm password — sign_up, reset_password */}
            {(view === "sign_up" || view === "reset_password") && (
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
                  {t("auth.confirmPassword")}
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="cc-input mt-1.5"
                  autoComplete="new-password"
                  required
                />
              </div>
            )}

            {/* Forgot password link — sign_in only */}
            {view === "sign_in" && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => navigate("forgot_password")}
                  className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-accent)] transition-colors"
                >
                  {t("auth.forgotPassword")}
                </button>
              </div>
            )}

            {/* Status messages */}
            {message && (
              <div className="rounded-[var(--radius-md)] border border-[var(--color-success-400)]/30 bg-[var(--color-success-400)]/10 px-4 py-3 text-sm text-[var(--color-success-400)]">
                {message}
              </div>
            )}
            {error && (
              <div className="rounded-[var(--radius-md)] border border-[var(--color-danger-400)]/30 bg-[var(--color-danger-400)]/10 px-4 py-3 text-sm text-[var(--color-danger-400)]">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !auth.isConfigured}
              className="cc-btn cc-btn-primary mt-2 w-full"
            >
              {submitting ? t("auth.working") : getSubmitLabel(view, t)}
            </button>
          </form>

          {/* Navigation links */}
          <div className="mt-5 space-y-2 border-t border-[var(--color-border)] pt-5 text-sm">
            {view === "verify" && (
              <div className="flex flex-col gap-2 text-center">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={submitting}
                  className="text-[var(--color-text-accent)] hover:underline disabled:opacity-50"
                >
                  {t("auth.resendCode")}
                </button>
                <button
                  type="button"
                  onClick={() => navigate("sign_in")}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                >
                  {t("auth.backToSignIn")}
                </button>
              </div>
            )}

            {(view === "forgot_password" || view === "reset_password") && (
              <button
                type="button"
                onClick={() => navigate("sign_in")}
                className="block w-full text-center text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
              >
                {t("auth.backToSignIn")}
              </button>
            )}

            {view === "sign_in" && (
              <button
                type="button"
                onClick={() => navigate("sign_up")}
                className="block w-full text-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-accent)]"
              >
                {t("auth.createNewAccount")}
              </button>
            )}

            {view === "sign_up" && (
              <button
                type="button"
                onClick={() => navigate("sign_in")}
                className="block w-full text-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-accent)]"
              >
                {t("auth.haveAccount")}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function getTitle(view: AuthView, t: (k: string) => string): string {
  switch (view) {
    case "sign_in": return t("auth.signIn");
    case "sign_up": return t("auth.createAccount");
    case "verify": return t("auth.verifyEmailTitle");
    case "forgot_password": return t("auth.forgotPasswordTitle");
    case "reset_password": return t("auth.resetPasswordTitle");
  }
}

function getSubtitle(view: AuthView, t: (k: string) => string, email: string): string {
  switch (view) {
    case "verify": return `${t("auth.verifyEmailSubtitle")} ${email || "your email"}.`;
    case "forgot_password": return t("auth.forgotPasswordSubtitle");
    case "reset_password": return t("auth.resetPasswordSubtitle");
    default: return "";
  }
}

function getSubmitLabel(view: AuthView, t: (k: string) => string): string {
  switch (view) {
    case "sign_in": return t("auth.signIn");
    case "sign_up": return t("auth.createAccount");
    case "verify": return t("auth.verifyEmailAction");
    case "forgot_password": return t("auth.sendResetCode");
    case "reset_password": return t("auth.resetPassword");
  }
}

function resolveError(error: unknown, t: (k: string) => string): string {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: string }).message);
  }
  return t("auth.errAuthFailed");
}

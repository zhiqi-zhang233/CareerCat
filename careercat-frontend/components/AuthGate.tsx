"use client";

import { useSearchParams } from "next/navigation";
import { FormEvent, ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useT } from "@/lib/i18n/LocaleProvider";

type AuthView = "sign_in" | "sign_up" | "confirm";

export default function AuthGate({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const t = useT();
  const searchParams = useSearchParams();
  const initialView: AuthView =
    searchParams?.get("auth") === "signup" ? "sign_up" : "sign_in";
  const [view, setView] = useState<AuthView>(initialView);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // If the URL changes (e.g. user clicks Sign up while the gate is mounted)
  // sync the view to the new query param.
  useEffect(() => {
    const next = searchParams?.get("auth");
    if (next === "signup") setView("sign_up");
    else if (next === "signin") setView("sign_in");
  }, [searchParams]);

  if (!auth.isCognito) return <>{children}</>;

  if (auth.status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#011A55] px-6 text-white">
        <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-slate-300">
          {t("auth.loadingAccount")}
        </div>
      </main>
    );
  }

  if (auth.status === "authenticated") return <>{children}</>;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      if (view === "sign_in") {
        await auth.signIn(email.trim(), password);
        return;
      }

      if (view === "sign_up") {
        const result = await auth.signUp(email.trim(), password);
        if (result.needsConfirmation) {
          setView("confirm");
          setMessage(t("auth.msgCheckEmail"));
        } else {
          await auth.signIn(email.trim(), password);
        }
        return;
      }

      await auth.confirmSignUp(email.trim(), code.trim());
      setView("sign_in");
      setMessage(t("auth.msgConfirmed"));
    } catch (authError) {
      setError(errorMessage(authError, t));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (!email.trim()) {
      setError(t("auth.errEmailFirst"));
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setMessage("");
      await auth.resendConfirmationCode(email.trim());
      setMessage(t("auth.msgCodeSent"));
    } catch (authError) {
      setError(errorMessage(authError, t));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#011A55] px-6 py-16 text-white">
      <section className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
        <div>
          <p className="text-sm font-semibold text-[#FFB238]">
            {t("auth.eyebrow")}
          </p>
          <h1 className="mt-4 text-5xl font-bold leading-tight text-[#FFB238]">
            {t("auth.title")}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            {t("auth.subtitle")}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-white/10 bg-white/5 p-6"
        >
          <h2 className="text-2xl font-semibold text-[#FFB238]">
            {view === "sign_in" && t("auth.signIn")}
            {view === "sign_up" && t("auth.createAccount")}
            {view === "confirm" && t("auth.confirmEmail")}
          </h2>

          {!auth.isConfigured && (
            <div className="mt-4 rounded-lg border border-red-300/30 bg-red-500/10 p-4 text-sm text-red-100">
              {t("auth.cognitoNotConfigured")}
            </div>
          )}

          <label className="mt-5 block text-sm font-semibold text-slate-300">
            {t("auth.email")}
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white focus:outline-none"
              required
            />
          </label>

          {view !== "confirm" && (
            <label className="mt-4 block text-sm font-semibold text-slate-300">
              {t("auth.password")}
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white focus:outline-none"
                required
              />
            </label>
          )}

          {view === "confirm" && (
            <label className="mt-4 block text-sm font-semibold text-slate-300">
              {t("auth.confirmationCode")}
              <input
                type="text"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white focus:outline-none"
                required
              />
            </label>
          )}

          {message && (
            <div className="mt-4 rounded-lg border border-green-300/30 bg-green-400/10 p-4 text-sm text-green-100">
              {message}
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-red-300/30 bg-red-500/10 p-4 text-sm text-red-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !auth.isConfigured}
            className="mt-6 w-full rounded-lg bg-[#FFB238] px-5 py-3 font-semibold text-[#011A55] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? t("auth.working") : submitLabel(view, t)}
          </button>

          <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-300">
            {view !== "sign_in" && (
              <button
                type="button"
                onClick={() => setView("sign_in")}
                className="text-[#FFB238] hover:underline"
              >
                {t("auth.haveAccount")}
              </button>
            )}
            {view !== "sign_up" && (
              <button
                type="button"
                onClick={() => setView("sign_up")}
                className="text-[#FFB238] hover:underline"
              >
                {t("auth.createNewAccount")}
              </button>
            )}
            {view !== "confirm" && (
              <button
                type="button"
                onClick={() => setView("confirm")}
                className="text-[#FFB238] hover:underline"
              >
                {t("auth.haveCode")}
              </button>
            )}
            {view === "confirm" && (
              <button
                type="button"
                onClick={handleResendCode}
                disabled={submitting}
                className="text-[#FFB238] hover:underline disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t("auth.resendCode")}
              </button>
            )}
          </div>
        </form>
      </section>
    </main>
  );
}

function submitLabel(view: AuthView, t: (key: string) => string) {
  if (view === "sign_up") return t("auth.createAccount");
  if (view === "confirm") return t("auth.confirmEmail");
  return t("auth.signIn");
}

function errorMessage(error: unknown, t: (key: string) => string) {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: string }).message);
  }

  return t("auth.errAuthFailed");
}

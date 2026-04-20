"use client";

import { FormEvent, ReactNode, useState } from "react";
import { useAuth } from "@/lib/AuthContext";

type AuthView = "sign_in" | "sign_up" | "confirm";

export default function AuthGate({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [view, setView] = useState<AuthView>("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!auth.isCognito) return <>{children}</>;

  if (auth.status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#011A55] px-6 text-white">
        <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-slate-300">
          Loading your CareerCat account...
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
          setMessage("Check your email for a confirmation code.");
        } else {
          await auth.signIn(email.trim(), password);
        }
        return;
      }

      await auth.confirmSignUp(email.trim(), code.trim());
      setView("sign_in");
      setMessage("Account confirmed. You can sign in now.");
    } catch (authError) {
      setError(errorMessage(authError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (!email.trim()) {
      setError("Enter your email first.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setMessage("");
      await auth.resendConfirmationCode(email.trim());
      setMessage("A new confirmation code has been sent.");
    } catch (authError) {
      setError(errorMessage(authError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#011A55] px-6 py-16 text-white">
      <section className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
        <div>
          <p className="text-sm font-semibold text-[#FFB238]">
            CareerCat Account
          </p>
          <h1 className="mt-4 text-5xl font-bold leading-tight text-[#FFB238]">
            Sign in to keep your job search workspace private.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Your resume profile, saved jobs, application status, coach sessions,
            and evaluation records are stored under your own account.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-white/10 bg-white/5 p-6"
        >
          <h2 className="text-2xl font-semibold text-[#FFB238]">
            {view === "sign_in" && "Sign In"}
            {view === "sign_up" && "Create Account"}
            {view === "confirm" && "Confirm Email"}
          </h2>

          {!auth.isConfigured && (
            <div className="mt-4 rounded-lg border border-red-300/30 bg-red-500/10 p-4 text-sm text-red-100">
              Cognito is not configured. Add the Cognito environment variables
              before using production authentication.
            </div>
          )}

          <label className="mt-5 block text-sm font-semibold text-slate-300">
            Email
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
              Password
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
              Confirmation Code
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
            {submitting ? "Working..." : submitLabel(view)}
          </button>

          <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-300">
            {view !== "sign_in" && (
              <button
                type="button"
                onClick={() => setView("sign_in")}
                className="text-[#FFB238] hover:underline"
              >
                I already have an account
              </button>
            )}
            {view !== "sign_up" && (
              <button
                type="button"
                onClick={() => setView("sign_up")}
                className="text-[#FFB238] hover:underline"
              >
                Create a new account
              </button>
            )}
            {view !== "confirm" && (
              <button
                type="button"
                onClick={() => setView("confirm")}
                className="text-[#FFB238] hover:underline"
              >
                I have a confirmation code
              </button>
            )}
            {view === "confirm" && (
              <button
                type="button"
                onClick={handleResendCode}
                disabled={submitting}
                className="text-[#FFB238] hover:underline disabled:cursor-not-allowed disabled:opacity-60"
              >
                Resend code
              </button>
            )}
          </div>
        </form>
      </section>
    </main>
  );
}

function submitLabel(view: AuthView) {
  if (view === "sign_up") return "Create Account";
  if (view === "confirm") return "Confirm Email";
  return "Sign In";
}

function errorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: string }).message);
  }

  return "Authentication failed. Please try again.";
}

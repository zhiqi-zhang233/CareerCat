"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { useT } from "@/lib/i18n/LocaleProvider";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <SocialProof />
      <HowItWorks />
      <PricingPreview />
      <BottomCTA />
    </>
  );
}

/* ================= Hero ================= */

function Hero() {
  const t = useT();
  const router = useRouter();

  const handleWorkspaceClick = (event: MouseEvent<HTMLAnchorElement>) => {
    navigateToWorkspace(event, router.push);
  };

  const handleHowItWorksClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();

    const target = document.getElementById("how-it-works");
    if (!target) return;

    window.history.replaceState(null, "", "#how-it-works");
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 50%, rgba(255,178,56,0.35) 0%, rgba(255,178,56,0) 70%)",
        }}
      />
      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-20 lg:px-8 lg:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <span className="cc-chip border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 text-[var(--color-text-accent)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
            {t("marketing.hero.badge")}
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-5xl md:text-6xl">
            {t("marketing.hero.titleLine1Prefix")}{" "}
            <span className="cc-gradient-text">
              {t("marketing.hero.titleAccent")}
            </span>{" "}
            {t("marketing.hero.titleLine1Suffix")}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[var(--color-text-secondary)]">
            {t("marketing.hero.subtitle")}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/workspace"
              onClick={handleWorkspaceClick}
              className="cc-btn cc-btn-primary h-12 px-6 text-base"
            >
              {t("marketing.hero.ctaPrimary")}
            </Link>
            <Link
              href="#how-it-works"
              onClick={handleHowItWorksClick}
              className="cc-btn cc-btn-ghost h-12 px-6 text-base"
            >
              {t("marketing.hero.ctaSecondary")}
            </Link>
          </div>
          <p className="mt-3 text-xs text-[var(--color-text-muted)]">
            {t("marketing.hero.noCard")}
          </p>
        </div>

        <div className="relative mx-auto mt-16 max-w-5xl">
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-2 shadow-[var(--shadow-lg)]">
            <div className="rounded-[calc(var(--radius-lg)-4px)] bg-[var(--brand-ink-700)] p-6 text-white">
              <div className="flex items-center gap-2 border-b border-white/10 pb-4">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
                <p className="ml-3 text-xs text-slate-400">
                  app.careercat.ai / workspace
                </p>
              </div>
              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-honey-400)]">
                    {t("marketing.hero.mockGoalLabel")}
                  </p>
                  <div className="mt-2 rounded-[var(--radius-md)] border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-200">
                    {t("marketing.hero.mockGoal")}
                  </div>
                  <button className="cc-btn cc-btn-primary mt-4 h-10 px-4 text-sm">
                    {t("marketing.hero.mockButton")}
                  </button>
                </div>
                <div className="space-y-2 text-xs">
                  <MockStage
                    label={`${t("marketing.hero.stagePrefix")} 1`}
                    fallbackLabel="Stage 1"
                    title={t("marketing.hero.mockStage1")}
                    status="ready"
                  />
                  <MockStage
                    label={`${t("marketing.hero.stagePrefix")} 2`}
                    fallbackLabel="Stage 2"
                    title={t("marketing.hero.mockStage2")}
                    status="planned"
                  />
                  <MockStage
                    label={`${t("marketing.hero.stagePrefix")} 3`}
                    fallbackLabel="Stage 3"
                    title={t("marketing.hero.mockStage3")}
                    status="planned"
                  />
                  <MockStage
                    label={`${t("marketing.hero.stagePrefix")} 4`}
                    fallbackLabel="Stage 4"
                    title={t("marketing.hero.mockStage4")}
                    status="planned"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MockStage({
  label,
  fallbackLabel,
  title,
  status,
}: {
  label?: string;
  fallbackLabel: string;
  title: string;
  status: "ready" | "planned";
}) {
  const t = useT();
  const styles =
    status === "ready"
      ? "border-[var(--brand-honey-400)]/50 bg-[var(--brand-honey-400)]/10 text-[var(--brand-honey-200)]"
      : "border-white/10 bg-white/5 text-slate-300";
  const statusLabel =
    status === "ready"
      ? t("marketing.hero.stageReady")
      : t("marketing.hero.stagePlanned");
  return (
    <div
      className={`flex items-center justify-between rounded-md border px-3 py-2 ${styles}`}
    >
      <div>
        <p className="text-[10px] uppercase tracking-wide text-slate-400">
          {label || fallbackLabel}
        </p>
        <p className="text-sm font-medium text-white">{title}</p>
      </div>
      <span className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide">
        {statusLabel}
      </span>
    </div>
  );
}

/* ================= Social proof ================= */

function SocialProof() {
  const t = useT();
  const items = [
    {
      value: t("marketing.socialProof.stat1Value"),
      label: t("marketing.socialProof.stat1Label"),
    },
    {
      value: t("marketing.socialProof.stat2Value"),
      label: t("marketing.socialProof.stat2Label"),
    },
    {
      value: t("marketing.socialProof.stat3Value"),
      label: t("marketing.socialProof.stat3Label"),
    },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 pb-12 lg:px-8">
      <div className="grid gap-6 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-6 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="text-center sm:text-left">
            <p className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
              {item.value}
            </p>
            <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeatureGrid() {
  const t = useT();
  const features = [
    { title: t("marketing.features.f1Title"), body: t("marketing.features.f1Body") },
    { title: t("marketing.features.f2Title"), body: t("marketing.features.f2Body") },
    { title: t("marketing.features.f3Title"), body: t("marketing.features.f3Body") },
    { title: t("marketing.features.f4Title"), body: t("marketing.features.f4Body") },
    { title: t("marketing.features.f5Title"), body: t("marketing.features.f5Body") },
    { title: t("marketing.features.f6Title"), body: t("marketing.features.f6Body") },
  ];
  return (
    <div className="mt-14 border-t border-[var(--color-border)] pt-12">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-accent)]">
          {t("marketing.features.eyebrow")}
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          {t("marketing.features.title")}
        </h2>
        <p className="mt-3 text-[var(--color-text-secondary)]">
          {t("marketing.features.body")}
        </p>
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-6 transition hover:border-[var(--color-accent)]/40 hover:shadow-[var(--shadow-md)]"
          >
            <h3 className="text-lg font-semibold">{feature.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
              {feature.body}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= How it works ================= */

function HowItWorks() {
  const t = useT();
  const steps = [
    { n: "01", title: t("marketing.howItWorks.s1Title"), body: t("marketing.howItWorks.s1Body") },
    { n: "02", title: t("marketing.howItWorks.s2Title"), body: t("marketing.howItWorks.s2Body") },
    { n: "03", title: t("marketing.howItWorks.s3Title"), body: t("marketing.howItWorks.s3Body") },
  ];
  return (
    <section
      id="how-it-works"
      className="scroll-mt-20 bg-[var(--color-bg-elev-2)]"
    >
      <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-accent)]">
            {t("marketing.howItWorks.eyebrow")}
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            {t("marketing.howItWorks.title")}
          </h2>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.n}
              className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-6"
            >
              <p className="font-mono text-sm text-[var(--color-text-accent)]">
                {step.n}
              </p>
              <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                {step.body}
              </p>
            </div>
          ))}
        </div>
        <FeatureGrid />
      </div>
    </section>
  );
}

/* ================= Pricing preview ================= */

function PricingPreview() {
  const t = useT();
  const router = useRouter();
  const tiers = [
    {
      name: t("pricing.free.name"),
      price: "$0",
      cadence: t("pricing.free.cadence"),
      tagline: t("pricing.free.tagline"),
      features: [
        t("pricing.free.f1"),
        t("pricing.free.f2"),
        t("pricing.free.f3"),
        t("pricing.free.f4"),
      ],
      cta: t("pricing.free.cta"),
      highlight: false,
      href: "/workspace",
    },
    {
      name: t("pricing.pro.name"),
      price: "$14.9",
      cadence: t("pricing.pro.cadence"),
      tagline: t("pricing.pro.tagline"),
      features: [
        t("pricing.pro.f1"),
        t("pricing.pro.f2"),
        t("pricing.pro.f3"),
        t("pricing.pro.f4"),
        t("pricing.pro.f5"),
      ],
      cta: t("pricing.pro.cta"),
      highlight: true,
      href: "/workspace",
    },
    {
      name: t("pricing.careerPlus.name"),
      price: "$29.9",
      cadence: t("pricing.careerPlus.cadence"),
      tagline: t("pricing.careerPlus.tagline"),
      features: [
        t("pricing.careerPlus.f1"),
        t("pricing.careerPlus.f2"),
        t("pricing.careerPlus.f3"),
        t("pricing.careerPlus.f4"),
        t("pricing.careerPlus.f5"),
      ],
      cta: t("pricing.careerPlus.cta"),
      highlight: false,
      href: "/pricing",
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-accent)]">
          {t("marketing.pricingPreview.eyebrow")}
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          {t("marketing.pricingPreview.title")}
        </h2>
        <p className="mt-3 text-[var(--color-text-secondary)]">
          {t("marketing.pricingPreview.body")}
        </p>
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={`flex flex-col rounded-[var(--radius-lg)] border p-6 ${
              tier.highlight
                ? "border-[var(--color-accent)]/50 bg-[var(--color-accent)]/10"
                : "border-[var(--color-border)] bg-[var(--color-bg-elev-1)]"
            }`}
          >
            <p className="text-sm font-semibold">{tier.name}</p>
            <p className="mt-3">
              <span className="text-3xl font-bold">{tier.price}</span>
              <span className="text-sm text-[var(--color-text-muted)]">
                {" "}
                {tier.cadence}
              </span>
            </p>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              {tier.tagline}
            </p>
            <ul className="mt-5 space-y-2 text-sm text-[var(--color-text-secondary)]">
              {tier.features.map((feat) => (
                <li key={feat} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
            <Link
              href={tier.href}
              onClick={(event) => {
                if (tier.href === "/workspace") {
                  navigateToWorkspace(event, router.push);
                }
              }}
              className={`cc-btn mt-6 w-full ${
                tier.highlight ? "cc-btn-primary" : "cc-btn-secondary"
              }`}
            >
              {tier.cta}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ================= Bottom CTA ================= */

function BottomCTA() {
  const t = useT();
  const router = useRouter();
  return (
    <section className="mx-auto max-w-7xl px-4 pb-16 lg:px-8">
      <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--brand-ink-700)] p-10 text-center text-white">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {t("marketing.bottomCta.title")}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-slate-300">
          {t("marketing.bottomCta.body")}
        </p>
        <Link
          href="/workspace"
          onClick={(event) => navigateToWorkspace(event, router.push)}
          className="cc-btn mt-6 inline-flex h-12 px-6 text-base"
          style={{
            background: "var(--brand-honey-400)",
            color: "var(--brand-ink-700)",
          }}
        >
          {t("marketing.bottomCta.cta")}
        </Link>
      </div>
    </section>
  );
}

function navigateToWorkspace(
  event: MouseEvent<HTMLAnchorElement>,
  push: (href: string) => void
) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }

  event.preventDefault();
  push("/workspace");
  window.setTimeout(() => {
    if (window.location.pathname !== "/workspace") {
      window.location.assign("/workspace");
    }
  }, 700);
}

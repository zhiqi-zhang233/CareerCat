"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/LocaleProvider";

export default function PricingPage() {
  const t = useT();

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
        t("pricing.free.f5"),
      ],
      cta: { label: t("pricing.free.cta"), href: "/workspace" },
      highlight: false,
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
        t("pricing.pro.f6"),
      ],
      cta: { label: t("pricing.pro.cta"), href: "/workspace?upgrade=pro" },
      highlight: true,
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
        t("pricing.careerPlus.f6"),
      ],
      cta: { label: t("pricing.careerPlus.cta"), href: "mailto:hello@careercat.ai" },
      highlight: false,
    },
  ];

  const faq = [
    { q: t("pricing.faq.q1"), a: t("pricing.faq.a1") },
    { q: t("pricing.faq.q2"), a: t("pricing.faq.a2") },
    { q: t("pricing.faq.q3"), a: t("pricing.faq.a3") },
    { q: t("pricing.faq.q4"), a: t("pricing.faq.a4") },
  ];

  return (
    <>
      <section className="mx-auto max-w-4xl px-4 pt-16 text-center lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-accent)]">
          {t("pricing.page.eyebrow")}
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
          {t("pricing.page.title")}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-[var(--color-text-secondary)]">
          {t("pricing.page.body")}
        </p>
      </section>

      <section className="mx-auto mt-12 max-w-7xl px-4 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`flex flex-col rounded-[var(--radius-lg)] border p-7 transition ${
                tier.highlight
                  ? "border-[var(--color-accent)]/60 bg-[var(--color-accent)]/10 shadow-[var(--shadow-md)]"
                  : "border-[var(--color-border)] bg-[var(--color-bg-elev-1)]"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{tier.name}</p>
                {tier.highlight && (
                  <span className="cc-chip border-[var(--color-accent)]/40 bg-[var(--color-accent)]/15 text-[var(--color-text-accent)]">
                    {t("pricing.page.mostPopular")}
                  </span>
                )}
              </div>
              <p className="mt-4">
                <span className="text-4xl font-bold">{tier.price}</span>
                <span className="ml-1 text-sm text-[var(--color-text-muted)]">
                  {tier.cadence}
                </span>
              </p>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                {tier.tagline}
              </p>
              <ul className="mt-5 space-y-2.5 text-sm text-[var(--color-text-secondary)]">
                {tier.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2.5">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-7">
                <Link
                  href={tier.cta.href}
                  className={`cc-btn w-full ${
                    tier.highlight ? "cc-btn-primary" : "cc-btn-secondary"
                  }`}
                >
                  {tier.cta.label}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-4xl px-4 lg:px-8">
        <h2 className="text-2xl font-bold tracking-tight">
          {t("pricing.faq.heading")}
        </h2>
        <dl className="mt-8 divide-y divide-[var(--color-border)] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elev-1)]">
          {faq.map((item) => (
            <div
              key={item.q}
              className="grid gap-2 px-5 py-5 md:grid-cols-[200px_1fr] md:gap-6"
            >
              <dt className="font-semibold">{item.q}</dt>
              <dd className="text-sm leading-6 text-[var(--color-text-secondary)]">
                {item.a}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}

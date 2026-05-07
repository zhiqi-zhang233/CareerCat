import Link from "next/link";

const TIERS = [
  {
    name: "Free",
    price: "$0",
    cadence: "forever",
    tagline: "Test the workflow at your own pace.",
    features: [
      "5 AI resume / JD parses per month",
      "50 saved jobs",
      "Workflow agent + application dashboard",
      "3 coach sessions per week",
      "Sponsorship-aware recommendations",
    ],
    cta: { label: "Start free", href: "/workspace" },
    highlight: false,
  },
  {
    name: "Pro",
    price: "$14.9",
    cadence: "per month",
    tagline: "For active job seekers in motion.",
    features: [
      "Unlimited AI parsing",
      "Multiple resume versions per role",
      "Unlimited coach sessions",
      "Insights dashboard with funnel & response time",
      "In-app follow-up reminders",
      "Saved-job export to CSV",
    ],
    cta: { label: "Go Pro", href: "/workspace?upgrade=pro" },
    highlight: true,
  },
  {
    name: "Career+",
    price: "$29.9",
    cadence: "per month",
    tagline: "Power tools for power searches.",
    features: [
      "Everything in Pro",
      "Chrome extension for one-click JD import",
      "Email follow-up reminders",
      "Multi-resume A/B response analytics",
      "1 mentor review per month",
      "Priority support",
    ],
    cta: { label: "Contact us", href: "mailto:hello@careercat.ai" },
    highlight: false,
  },
];

const FAQ = [
  {
    q: "Can I cancel anytime?",
    a: "Yes. Subscriptions are month-to-month. You'll keep paid access until the end of the current period.",
  },
  {
    q: "Do you store my resume?",
    a: "Your parsed resume is stored under your CareerCat account so you can edit it across devices. You can wipe it from Profile at any time.",
  },
  {
    q: "Is the AI good enough on the free plan?",
    a: "Yes — every plan uses the same models. The free plan caps how many AI parses you can run per month and how often you can use the coach.",
  },
  {
    q: "Do you offer student or non-profit discounts?",
    a: "Yes. Email us from your school address and we'll set you up.",
  },
];

export default function PricingPage() {
  return (
    <>
      <section className="mx-auto max-w-4xl px-4 pt-16 text-center lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-accent)]">
          Pricing
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
          Pay only when CareerCat is doing the heavy lifting.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-[var(--color-text-secondary)]">
          Start free. Upgrade once you&apos;re juggling more than 50 saved jobs or
          actively prepping for interviews every week.
        </p>
      </section>

      <section className="mx-auto mt-12 max-w-7xl px-4 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {TIERS.map((tier) => (
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
                    Most popular
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
        <h2 className="text-2xl font-bold tracking-tight">Frequently asked</h2>
        <dl className="mt-8 divide-y divide-[var(--color-border)] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elev-1)]">
          {FAQ.map((item) => (
            <div key={item.q} className="grid gap-2 px-5 py-5 md:grid-cols-[200px_1fr] md:gap-6">
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

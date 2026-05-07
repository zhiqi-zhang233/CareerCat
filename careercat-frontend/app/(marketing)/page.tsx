import Link from "next/link";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <SocialProof />
      <Features />
      <HowItWorks />
      <PricingPreview />
      <BottomCTA />
    </>
  );
}

/* ================= Hero ================= */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Decorative gradient blob */}
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
            New · Workflow-aware AI agents
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-5xl md:text-6xl">
            Your job search,{" "}
            <span className="cc-gradient-text">finally</span> in one place.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[var(--color-text-secondary)]">
            CareerCat parses your resume, tracks every application, prepares
            you for interviews, and uses an AI agent to plan your next step —
            so you stop juggling tabs, spreadsheets, and chat windows.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/workspace"
              className="cc-btn cc-btn-primary h-12 px-6 text-base"
            >
              Start free
            </Link>
            <Link
              href="#how-it-works"
              className="cc-btn cc-btn-ghost h-12 px-6 text-base"
            >
              See how it works
            </Link>
          </div>
          <p className="mt-3 text-xs text-[var(--color-text-muted)]">
            No credit card · 5 free AI parses every month
          </p>
        </div>

        {/* Mock product preview */}
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
                    Goal
                  </p>
                  <div className="mt-2 rounded-[var(--radius-md)] border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-200">
                    Find data analyst jobs in Chicago that sponsor visas, rank
                    them by fit, and prep me for interviews on the top 3.
                  </div>
                  <button className="cc-btn cc-btn-primary mt-4 h-10 px-4 text-sm">
                    Plan workflow
                  </button>
                </div>
                <div className="space-y-2 text-xs">
                  <MockStage
                    label="Stage 1"
                    title="Search Adzuna"
                    status="ready"
                  />
                  <MockStage
                    label="Stage 2"
                    title="Filter sponsorship"
                    status="planned"
                  />
                  <MockStage
                    label="Stage 3"
                    title="Rank by resume fit"
                    status="planned"
                  />
                  <MockStage
                    label="Stage 4"
                    title="Generate interview prep"
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
  title,
  status,
}: {
  label: string;
  title: string;
  status: "ready" | "planned";
}) {
  const styles =
    status === "ready"
      ? "border-[var(--brand-honey-400)]/50 bg-[var(--brand-honey-400)]/10 text-[var(--brand-honey-200)]"
      : "border-white/10 bg-white/5 text-slate-300";
  return (
    <div className={`flex items-center justify-between rounded-md border px-3 py-2 ${styles}`}>
      <div>
        <p className="text-[10px] uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="text-sm font-medium text-white">{title}</p>
      </div>
      <span className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide">
        {status}
      </span>
    </div>
  );
}

/* ================= Social proof ================= */

function SocialProof() {
  const items = [
    { value: "70%", label: "less time spent on application bookkeeping" },
    { value: "3×", label: "more interview prep cycles per week" },
    { value: "1 place", label: "for resumes, JDs, status, and coach notes" },
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

/* ================= Features ================= */

function Features() {
  const features = [
    {
      title: "Workflow-aware planning",
      body:
        "Tell the agent your messy goal. It splits work into stages, checks dependencies, and routes you to the next page that can actually move things forward.",
    },
    {
      title: "Resume + JD parsing",
      body:
        "Upload a resume or paste any job description. CareerCat extracts structured fields you can edit, save, and reuse across the rest of the app.",
    },
    {
      title: "Application tracker",
      body:
        "Every saved job lives on a kanban-style dashboard with statuses, application dates, notes, and skill tags. Filter and sort by anything.",
    },
    {
      title: "AI Career Coach",
      body:
        "Resume-job gap analysis, mock interviews (technical or behavioral), and written assessment practice — with code highlighting that actually works.",
    },
    {
      title: "Sponsorship-aware search",
      body:
        "Tell us once whether you need visa sponsorship. Recommendations and warnings respect that across imports, search, and saved jobs.",
    },
    {
      title: "Insights dashboard",
      body:
        "See where your search is leaking — applications stuck in assessment, average response time, skills you keep encountering. Coming soon.",
    },
  ];
  return (
    <section id="features" className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-accent)]">
          Features
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Everything a serious job seeker needs.
        </h2>
        <p className="mt-3 text-[var(--color-text-secondary)]">
          Stop pasting JDs into ChatGPT and tracking applications in
          spreadsheets. CareerCat is purpose-built for the full hiring loop.
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
    </section>
  );
}

/* ================= How it works ================= */

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Drop in your resume",
      body:
        "AI extracts your skills, education, projects, and experiences. You correct anything that's off, and it's saved to your profile.",
    },
    {
      n: "02",
      title: "Bring jobs to the workspace",
      body:
        "Paste a JD, search Adzuna by role and city, or let the agent find sponsor-friendly roles for you. Save what's worth tracking.",
    },
    {
      n: "03",
      title: "Apply, track, prep — in one loop",
      body:
        "Move jobs through statuses on the dashboard. Use the coach for resume-gap analysis and interviews. Watch your search progress on Insights.",
    },
  ];
  return (
    <section id="how-it-works" className="bg-[var(--color-bg-elev-2)]">
      <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-accent)]">
            How it works
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Three steps, one workspace.
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
      </div>
    </section>
  );
}

/* ================= Pricing preview ================= */

function PricingPreview() {
  const tiers = [
    {
      name: "Free",
      price: "$0",
      cadence: "forever",
      tagline: "Everything you need to test the workflow.",
      features: [
        "5 AI resume / JD parses per month",
        "50 saved jobs",
        "Workflow agent + dashboard",
        "Basic coach (3 sessions / week)",
      ],
      cta: "Start free",
      highlight: false,
    },
    {
      name: "Pro",
      price: "$14.9",
      cadence: "/ month",
      tagline: "For active job seekers in motion.",
      features: [
        "Unlimited AI parsing",
        "Multiple resume versions",
        "Unlimited coach sessions",
        "Insights dashboard",
        "Application reminders",
      ],
      cta: "Go Pro",
      highlight: true,
    },
    {
      name: "Career+",
      price: "$29.9",
      cadence: "/ month",
      tagline: "Power tools for power searches.",
      features: [
        "Everything in Pro",
        "Browser extension",
        "Email follow-up reminders",
        "Multi-resume A/B insights",
        "1 mentor review / month",
      ],
      cta: "Talk to us",
      highlight: false,
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-accent)]">
          Pricing
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Simple plans, honest limits.
        </h2>
        <p className="mt-3 text-[var(--color-text-secondary)]">
          Start free, upgrade when your job search heats up. Cancel anytime.
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
              href={tier.name === "Career+" ? "/pricing" : "/workspace"}
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
  return (
    <section className="mx-auto max-w-7xl px-4 pb-16 lg:px-8">
      <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--brand-ink-700)] p-10 text-center text-white">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Ready to make this job hunt your last one?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-slate-300">
          Spend less time copy-pasting. More time learning, applying, and
          interviewing.
        </p>
        <Link
          href="/workspace"
          className="cc-btn mt-6 inline-flex h-12 px-6 text-base"
          style={{
            background: "var(--brand-honey-400)",
            color: "var(--brand-ink-700)",
          }}
        >
          Start your free workspace →
        </Link>
      </div>
    </section>
  );
}

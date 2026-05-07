import Link from "next/link";
import Image from "next/image";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-surface="light" className="flex min-h-screen flex-col bg-[var(--color-bg)] text-[var(--color-text-primary)]">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}

function MarketingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-bg)_90%,transparent)] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo.svg"
            alt="CareerCat"
            width={32}
            height={32}
            className="h-8 w-8"
          />
          <span className="text-base font-semibold tracking-tight">
            CareerCat
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-[var(--color-text-secondary)] md:flex">
          <Link href="/#features" className="transition hover:text-[var(--color-text-primary)]">
            Features
          </Link>
          <Link href="/#how-it-works" className="transition hover:text-[var(--color-text-primary)]">
            How it works
          </Link>
          <Link href="/pricing" className="transition hover:text-[var(--color-text-primary)]">
            Pricing
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/workspace"
            className="hidden rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium text-[var(--color-text-secondary)] transition hover:text-[var(--color-text-primary)] sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/workspace"
            className="cc-btn cc-btn-primary h-10 px-4 text-sm"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}

function MarketingFooter() {
  return (
    <footer className="mt-24 border-t border-[var(--color-border)]">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-[var(--color-text-muted)] sm:flex-row lg:px-8">
        <p>© {new Date().getFullYear()} CareerCat · Built with care for job hunters.</p>
        <div className="flex items-center gap-5">
          <Link href="/pricing" className="hover:text-[var(--color-text-primary)]">
            Pricing
          </Link>
          <Link href="/workspace" className="hover:text-[var(--color-text-primary)]">
            App
          </Link>
          <a
            href="https://github.com/zhiqi-zhang233/CareerCat"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[var(--color-text-primary)]"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}

"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/LocaleProvider";

export default function MarketingFooter() {
  const t = useT();
  return (
    <footer className="mt-24 border-t border-[var(--color-border)]">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-[var(--color-text-muted)] sm:flex-row lg:px-8">
        <p>
          © {new Date().getFullYear()} CareerCat · {t("marketing.footer.tagline")}
        </p>
        <div className="flex items-center gap-5">
          <Link
            href="/pricing"
            className="hover:text-[var(--color-text-primary)]"
          >
            {t("marketing.footer.pricing")}
          </Link>
          <Link
            href="/workspace"
            className="hover:text-[var(--color-text-primary)]"
          >
            {t("marketing.footer.app")}
          </Link>
          <a
            href="https://github.com/zhiqi-zhang233/CareerCat"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[var(--color-text-primary)]"
          >
            {t("marketing.footer.github")}
          </a>
        </div>
      </div>
    </footer>
  );
}

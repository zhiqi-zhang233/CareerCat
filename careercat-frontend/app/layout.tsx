import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies, headers } from "next/headers";
import { AuthProvider } from "@/lib/AuthContext";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import type { Locale } from "@/lib/i18n/dictionaries";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CareerCat — Your AI Job Search Copilot",
  description:
    "CareerCat turns the chaotic job hunt into a structured workspace. Parse resumes, track applications, prep for interviews, and let an AI agent plan your next step.",
};

async function detectInitialLocale(): Promise<Locale> {
  // 1) Cookie wins — set by the LocaleSwitcher.
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get("cc_locale")?.value;
  if (cookieValue === "zh" || cookieValue === "en") return cookieValue;

  // 2) Fall back to Accept-Language header.
  const acceptLanguage = (await headers()).get("accept-language") || "";
  const first = acceptLanguage.split(",")[0]?.trim().toLowerCase() || "";
  if (first.startsWith("zh")) return "zh";
  return "en";
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialLocale = await detectInitialLocale();
  return (
    <html
      lang={initialLocale === "zh" ? "zh-CN" : "en"}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LocaleProvider initialLocale={initialLocale}>
          <AuthProvider>{children}</AuthProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}

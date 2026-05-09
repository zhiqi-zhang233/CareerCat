"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { en, zh, type Locale } from "./dictionaries";

const COOKIE_NAME = "cc_locale";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /**
   * Translate a dotted key path. Falls back to English, then to the key
   * itself, so missing translations never crash the UI. Supports {param}
   * interpolation.
   */
  t: (key: string, params?: Record<string, string | number>) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  const part = document.cookie
    .split("; ")
    .find((row) => row.startsWith(prefix));
  return part ? decodeURIComponent(part.slice(prefix.length)) : null;
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

function detectClientLocale(): Locale {
  const cookie = readCookie(COOKIE_NAME);
  if (cookie === "zh" || cookie === "en") return cookie;
  if (typeof navigator !== "undefined") {
    const langs = navigator.languages?.length
      ? navigator.languages
      : [navigator.language];
    for (const lang of langs || []) {
      if (lang?.toLowerCase().startsWith("zh")) return "zh";
    }
  }
  return "en";
}

/**
 * Walk a dotted key path through a dictionary object. Returns the string
 * value if found, or undefined.
 */
function lookup(dict: unknown, key: string): string | undefined {
  const parts = key.split(".");
  let cursor: unknown = dict;
  for (const part of parts) {
    if (cursor && typeof cursor === "object" && part in (cursor as object)) {
      cursor = (cursor as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof cursor === "string" ? cursor : undefined;
}

function interpolate(template: string, params?: Record<string, string | number>) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) => {
    const value = params[name];
    return value === undefined || value === null ? match : String(value);
  });
}

export function LocaleProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale ?? "en");

  // After hydration, refine to the user's actual preference. This is a no-op
  // when the SSR layout already injected the right cookie-based locale.
  useEffect(() => {
    const detected = detectClientLocale();
    if (detected !== locale) setLocaleState(detected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep <html lang> in sync.
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute(
        "lang",
        locale === "zh" ? "zh-CN" : "en"
      );
    }
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    writeCookie(COOKIE_NAME, next);
    setLocaleState(next);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const dict = locale === "zh" ? zh : en;
      const localized = lookup(dict, key);
      if (localized !== undefined) return interpolate(localized, params);
      const fallback = lookup(en, key);
      if (fallback !== undefined) return interpolate(fallback, params);
      return key;
    },
    [locale]
  );

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t]
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    // Safe defaults for components rendered before the provider mounts (or in
    // tests). Always English; setLocale is a no-op.
    return {
      locale: "en" as Locale,
      setLocale: () => {},
      t: (key: string, params?: Record<string, string | number>) => {
        const fallback = lookup(en, key);
        return fallback !== undefined ? interpolate(fallback, params) : key;
      },
    };
  }
  return ctx;
}

/** Convenience hook when only the t function is needed. */
export function useT() {
  return useLocale().t;
}

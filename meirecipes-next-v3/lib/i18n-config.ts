// Locale config.
//
// English-only for the v1 launch. The full multilingual scaffolding (Chinese,
// Bahasa Melayu) remains in messages/*.json files but is not exposed via
// routes, middleware, or UI. To re-enable, change `locales` below to
// `ALL_LOCALES`, restore the LocaleSwitcher in SiteHeader, and add the locales
// to middleware.ts. See MULTILINGUAL.md for the full runbook.

/** Locales currently exposed in routing. */
export const locales = ["en", "zh", "ms"] as const;

/** All locales the site is *capable* of supporting (kept for forward compatibility). */
export const ALL_LOCALES = ["en", "zh", "ms"] as const;

export type Locale = (typeof locales)[number];
export type AnyLocale = (typeof ALL_LOCALES)[number];

export const defaultLocale: Locale = "en";

export const localeNames: Record<AnyLocale, string> = {
  en: "English",
  zh: "中文",
  ms: "Bahasa Melayu",
};

export const localeShortNames: Record<AnyLocale, string> = {
  en: "EN",
  zh: "中",
  ms: "BM",
};

// HTML lang attribute values.
export const htmlLangs: Record<AnyLocale, string> = {
  en: "en",
  zh: "zh-Hans",
  ms: "ms",
};

export function isLocale(s: string): s is Locale {
  return (locales as readonly string[]).includes(s);
}

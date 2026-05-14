# Re-enabling Chinese and Bahasa Melayu locales

The v1 launch is English-only. The Chinese (zh) and Malay (ms) message files and
underlying i18n infrastructure are preserved but disabled. This document is the
runbook to re-enable them when you're ready.

## Why disabled

The locale switcher exhibited an intermittent bug where the EN button would
become unresponsive after switching to ZH or BM. Multiple fix attempts didn't
resolve it without a longer debug session that wasn't feasible against the
launch timeline. The decision was: ship English-only now, revisit when:

1. The Chinese and Malay UI strings have been native-speaker reviewed
2. There's translation budget for the recipe corpus
3. There's time to diagnose the switcher bug properly (likely with the help of
   browser DevTools output to see what's actually happening client-side)

## What's preserved

- `messages/zh.json` and `messages/ms.json` — full UI string translations
- `lib/i18n-config.ts` — `ALL_LOCALES` constant lists all three locales
- `app/[locale]/` directory structure — works for any locale once routing is enabled
- Component-level i18n via `useTranslations()` — already works for any locale
- `htmlLangs`, `localeNames`, `localeShortNames` records — all three locales present

## What's actively disabled

- `middleware.ts` — `locales: ["en"]` only
- `lib/i18n-config.ts` — `locales: ["en"]` exported (vs `ALL_LOCALES`)
- `components/SiteHeader.tsx` — no LocaleSwitcher rendered
- `components/LocaleSwitcher.tsx` — file deleted
- `lib/navigation.ts` — file deleted (was the next-intl typed-navigation wrapper)
- Layout `alternates.languages` — only EN listed

## To re-enable

Five files to change:

### 1. `lib/i18n-config.ts`

Change `export const locales = ["en"] as const;` to:

```ts
export const locales = ALL_LOCALES;
```

### 2. `middleware.ts`

Change the `createMiddleware` call:

```ts
import { defaultLocale, locales } from "./lib/i18n-config";

export default createMiddleware({
  locales: [...locales],   // was: ["en"]
  defaultLocale,
  localePrefix: "as-needed",
  localeDetection: false,  // keep this — URL is single source of truth
});
```

### 3. Restore `lib/navigation.ts`

Recreate this file with the next-intl wrappers:

```ts
import { createNavigation } from "next-intl/navigation";
import { locales, defaultLocale } from "./i18n-config";

export const { Link, redirect, usePathname, useRouter } = createNavigation({
  locales: [...locales],
  defaultLocale,
  localePrefix: "as-needed",
});
```

### 4. Restore `components/LocaleSwitcher.tsx`

**Important**: before adding the switcher back, diagnose the original bug.

Reproduction steps:
1. Run dev server
2. Start at `/`, click ZH — works, URL becomes `/zh`
3. Click EN — appears dead

Recommended diagnostic approach (skipped during v1):
- Open browser DevTools Console
- Click EN
- Check for: JS errors, Service Worker interference, stale cookie behaviour,
  preventDefault calls, event-delegation issues

Once the bug is understood, recreate the switcher. The last attempted version
(deleted) used `window.location.assign` for hard navigation; it worked for
some clicks but not consistently. Possible causes to investigate:
- HMR desyncing React state in dev mode (try `next build && next start`)
- `useLocale()` returning stale value after navigation
- Next.js App Router caching of `[locale]` segment

### 5. Restore alternates in `app/[locale]/layout.tsx`

```ts
alternates: {
  languages: { en: "/", zh: "/zh", ms: "/ms" },
},
```

### 6. Add the switcher back to `components/SiteHeader.tsx`

```tsx
import { LocaleSwitcher } from "./LocaleSwitcher";
// ...
<LocaleSwitcher />
```

## Other prerequisites before re-enabling

1. **Native-speaker review** of every string in `messages/zh.json` and `messages/ms.json` — mine are competent but not native, and a fluent reader will spot non-native phrasing within a few sentences.

2. **Recipe content translation strategy** — the UI being trilingual is hollow if every recipe is English-only. Decide whether to translate selected high-value recipes, use machine translation with disclaimers, or surface translations only for posts where they exist.

3. **Per-post translation fields** — the mu-plugin already registers `title_zh`, `title_ms`, `excerpt_zh`, `excerpt_ms`, `content_zh`, `content_ms` meta fields. Translated content shows automatically when these fields are populated.

## Testing checklist (when re-enabling)

- [ ] Build green: `npx tsc --noEmit && npm run build`
- [ ] Dev server: `npm run dev`, switch EN → ZH → BM → EN multiple times
- [ ] Production build test: `npm run build && npm run start`, repeat above
- [ ] DevTools console clean (no errors) during switching
- [ ] Direct URL access works: visit `/zh`, `/ms`, `/zh/book`, `/ms/about`
- [ ] Sitemap includes locale variants
- [ ] hreflang tags emit in `<head>` for each locale

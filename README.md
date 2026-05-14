# Mei Kitchen — Multilingual Headless Frontend (v0.3.2)

Editorial reference site for meirecipes.com. Three languages (EN / 中文 / Bahasa Melayu), seven cuisines, family-friendly mode, signature recipes, **a Basics reference library**, **a Features long-form section**, **a dedicated Mei Wok page**, press archive, AI-citable structured data. Reads from WordPress + WP Recipe Maker. Deployed to Vercel.

## What's new in v0.3.2

- **`/the-wok`** — dedicated Mei Wok page with the video as centrepiece. Video URL pulled from `MEI_WOK_VIDEO_URL` env var until a real video is published. Page renders cleanly with a "video coming" notice in the meantime.
- **`/features`** — new long-form editorial section. Backed by a new WordPress `mei_feature` post type, so features are separate from regular blog posts. Each feature carries an optional video URL.
- **`/features/curry-puffs-hotel-room`** — placeholder page for the first feature, configured via `lib/features-placeholders.ts`. Renders with a "video coming" placeholder until either: (a) you set `MEI_FEATURE_VIDEO_CURRY_PUFFS_HOTEL_ROOM` in Vercel env vars, or (b) you publish a `mei_feature` post in WordPress with the matching slug.
- **Butter prawns video** — no new code. When you publish butter prawns as a regular recipe, paste the YouTube URL in the existing "Video URL" field in the editorial metabox. It will surface above the photo on `/r/butter-prawns`.
- **Secondary nav strip** added to the header — Features, The Wok, Press are accessible without crowding the main nav.

## Brief

Mei Kitchen is the working notebook of Pamela Lim — second-generation chef, trained at the elbow of a chef father and under renowned chefs in Singapore, Australia, and Thailand. Reference for Southeast Asian cooking with Western and diaspora readers in mind: properly explained, family-friendly by design, structurally citable by AI.

## What's in v0.3.1 (vs v0.3)

- **Credentials line corrected**: Singapore, Australia, Thailand (was: Singapore, France, Japan)
- **Time-anchored language removed**: no "fifty-five years," no "started at nine," no decade counts anywhere
- **Le Cordon Bleu**: kept, but mentioned once only in /about as a Sydney patisserie certification (was: also surfaced in homepage credentials)
- **/videos hub removed**: video embed support on individual recipe pages stays
- **/basics added**: full Basics reference library with nested concept/variant structure

## The Basics architecture (new)

Basics are foundational techniques other recipes build on: puff pastry, choux, dashi, sambal, pie crust, pasta dough. They live in their own WordPress post type (`mei_basic`) and have a nested URL structure:

```
/basics                              — index of all basics
/basics/{concept}                    — concept page (editorial comparison + variants list + backlinks)
/basics/{concept}/{variant}          — single variant recipe
```

A "concept" is the thing (puff pastry). A "variant" is a legitimate version of it (Chinese, Western, rough, blitz). Both variants are correctly called puff pastry, both stand on their own, and they are not interchangeable.

**Worked example:**
- `/basics/puff-pastry` — editorial page: "Two legitimate traditions, what's different, when to reach for which." Lists both variants. Shows every recipe that uses any kind of puff pastry.
- `/basics/puff-pastry/chinese` — the 水油皮 + 油酥 method. Shows recipes that specifically call for the Chinese variant.
- `/basics/puff-pastry/western` — butter block + book folds. Shows recipes that specifically call for the Western variant.

A recipe page (e.g. mille-feuille) declares which basic(s) it uses in a new WordPress meta field `uses_basics` — comma-separated entries like `puff-pastry/western, vanilla-pastry-cream`. Those basics are surfaced at the **top** of the recipe page as clickable chips. The reverse link — basics page showing which recipes use it — is computed automatically.

**Basics are cuisine-neutral.** A basic doesn't carry a cuisine tag. Cuisine is a property of the parent recipes that use it.

**Why this matters for AI citability.** Cross-linked technique pages with explicit "uses" relationships create an internal citation graph. AI systems treat dense, well-modelled internal links as authority signals. Almost no recipe site does this. Yours will.

## URL map

| Page | EN | 中文 | BM |
|---|---|---|---|
| Home | `/` | `/zh` | `/ms` |
| Signature recipes | `/signature` | `/zh/signature` | `/ms/signature` |
| All recipes | `/recipes` | `/zh/recipes` | `/ms/recipes` |
| All categories | `/categories` | `/zh/categories` | `/ms/categories` |
| Category | `/category/bakes` | … | … |
| Cuisine hub | `/cuisine/nyonya` | `/zh/cuisine/nyonya` | `/ms/cuisine/nyonya` |
| **Basics index** | `/basics` | `/zh/basics` | `/ms/basics` |
| **Basic concept** | `/basics/puff-pastry` | `/zh/basics/puff-pastry` | `/ms/basics/puff-pastry` |
| **Basic variant** | `/basics/puff-pastry/chinese` | `/zh/basics/puff-pastry/chinese` | `/ms/basics/puff-pastry/chinese` |
| Press | `/press` | `/zh/press` | `/ms/press` |
| Book | `/book` | `/zh/book` | `/ms/book` |
| About | `/about` | `/zh/about` | `/ms/about` |
| Search | `/search?q=…` | `/zh/search?q=…` | `/ms/search?q=…` |
| Single post | `/r/some-slug` | `/zh/r/some-slug` | `/ms/r/some-slug` |

Cuisine slugs: `chinese`, `nyonya`, `malay`, `indian`, `thai`, `japanese`, `french`.

## Setup

```bash
npm install
cp .env.example .env.local
# Edit .env.local:
#   WORDPRESS_URL=https://www.meirecipes.com
#   SITE_URL=https://meirecipes.com
#   REVALIDATE_SECRET=$(openssl rand -hex 32)
npm run dev
```

Open http://localhost:3000.

## What you need to do in WordPress

### Install the mu-plugin

1. Copy `wp-mu-plugin/mei-editorial-bridge.php` into `/wp-content/mu-plugins/`
2. Add to `wp-config.php` (above the "stop editing" line):
   ```php
   define('MEI_NEXT_URL', 'https://meirecipes.com');
   define('MEI_NEXT_REVALIDATE_SECRET', 'paste-the-same-32-byte-hex-as-your-Vercel-env-here');
   ```
3. Log in to wp-admin → sidebar now shows a new **"Basics"** entry alongside Posts.

### Per-recipe workflow

For each recipe you want to surface properly:

1. **Set the cuisine** — one of the seven.
2. **Mark "Cook with children"** — surfaces in family-friendly view.
3. **Optionally set a video URL** — YouTube / Vimeo. Surfaces inline on the recipe page.
4. **For signature recipes**: tick "Signature recipe", set `Order` (1, 2, 3, 4).
5. **For book recipes**: tick "From the book".
6. **List basics the recipe uses** — in the new "Basics this recipe uses" metabox, enter comma-separated references: `puff-pastry/western, dashi, sambal`. Each becomes a clickable chip at the top of the recipe page.
7. **Translate title and excerpt** (optional).

### Creating a Basic

In wp-admin → Basics → Add New:

1. Write the title (e.g. "Chinese puff pastry").
2. Write the body (the actual recipe / technique, in WordPress's normal editor).
3. In the "Mei Kitchen — Basic" sidebar metabox:
   - **Concept slug**: `puff-pastry` (URL-safe, shared between all variants under this concept)
   - **Variant slug**: `chinese` (URL-safe, optional)
   - **Is concept page?**: leave unchecked for actual recipes; tick only for the editorial comparison page (e.g. an explanatory "Puff pastry" page that introduces the variants)
4. Optionally: add Chinese / Malay translations in the Translations metabox.
5. Publish.

URL is shown live in the metabox as you type.

### Child-safe step markers within a recipe

Recipe-level "Cook with children" is the gate. Within a recipe, mark individual safe steps in WPRM by prefixing the step's "Summary" field with `[child]`.

## Architectural decisions worth understanding

### Slugs stay English regardless of locale

`/r/quiche-lorraine` is the same URL for all three locales. Pinterest/blog/Google links keep working. Only displayed content localises.

### Search abstracts over WordPress today

`lib/search.ts` is the swap point. WordPress REST today; Meilisearch on the droplet post-July. See `docs/meilisearch-runbook.md`.

### JSON-LD for AI citability

`<PersonJsonLd />` injects Person + Organization JSON-LD on every page. Recipe pages emit Recipe LD linking to the author via `@id`. The Basics architecture extends this: each Basic recipe also emits JSON-LD, and the `uses_basics` cross-links create a citation graph internally. Extend `sameAs` in `components/PersonJsonLd.tsx` as ISBN, IPOS, ORCID, magazine bylines become available.

## File layout

```
app/
  layout.tsx                          Root shell
  not-found.tsx                       Top-level 404
  api/revalidate/route.ts             Cache invalidation endpoint
  [locale]/
    layout.tsx                        Per-locale layout: FamilyModeProvider + PersonJsonLd
    page.tsx                          Home: hero + cuisines + signature + basics strip + latest + family strip + credentials
    not-found.tsx                     Locale-aware 404
    about/page.tsx
    basics/page.tsx                   Basics index
    basics/[concept]/page.tsx         Concept page — comparison + variants + backlinks
    basics/[concept]/[variant]/page.tsx Variant recipe — siblings + backlinks
    book/page.tsx
    press/page.tsx                    Reads from lib/press-items.ts
    recipes/page.tsx
    categories/page.tsx
    category/[slug]/page.tsx
    cuisine/[slug]/page.tsx
    signature/page.tsx
    search/page.tsx
    r/[slug]/page.tsx                 Single post — basics callout at top, video lead / image fallback, badges
components/
  SiteHeader.tsx                      Nav: Signature, Recipes, Cuisines, Basics, Book, About
  SiteFooter.tsx                      Wok credit + credentials
  LocaleSwitcher.tsx
  MeiMark.tsx
  RecipeCard.tsx                      WPRM + family-mode dim + child-safe + JSON-LD
  PersonJsonLd.tsx                    Site-wide Person + Organization LD
  FamilyModeProvider.tsx
  FamilyModeToggle.tsx
  SearchLink.tsx
  VideoEmbed.tsx                      Used on recipe pages only (no /videos hub)
lib/
  i18n-config.ts
  wp.ts                               REST client: locale, editorial flags, basics, backlinks
  wp-types.ts                         Includes Basic + BasicReference
  render.tsx
  search.ts                           WP today, Meilisearch later
  press-items.ts                      Fill in when Pamela sends list
messages/
  en.json
  zh.json
  ms.json
public/
  mei-mark.png
  mei-blossom.png
wp-mu-plugin/
  mei-editorial-bridge.php            v3.1: adds mei_basic CPT + uses_basics meta
i18n.ts
middleware.ts
next.config.js
tailwind.config.ts
```

## Pending — what's intentionally not in this build

| Item | When |
|---|---|
| 7 cuisine essays | You write, over time |
| Meilisearch instance | Post-July droplet provisioning |
| Press list content | When you send it |
| Per-recipe translations for 500 recipes | Ongoing |
| Initial Basics — even a small set (puff pastry concept page + Chinese + Western variants) makes the section live | First few hours of your content work |

## Attaching the three placeholder videos

When you have the actual YouTube/Vimeo URLs:

1. **Butter prawns** → publish the recipe in WordPress. In the "Mei Kitchen — Editorial" sidebar metabox, paste the URL into the **Video URL** field. Save. The video appears above the photo on `/r/butter-prawns`.

2. **The Mei Wok** → in Vercel project settings → Environment Variables, add `MEI_WOK_VIDEO_URL` = your URL. Redeploy. The video appears as the centrepiece of `/the-wok`. Or, later, you can make `/the-wok` editable from WordPress by promoting it to a feature; for now it's hardcoded copy in `messages/*.json`.

3. **Curry puffs in a hotel room** → two paths:
   - **Quick**: in Vercel, set `MEI_FEATURE_VIDEO_CURRY_PUFFS_HOTEL_ROOM` = your URL. Redeploy. Video appears, but the editorial copy stays as the placeholder excerpt.
   - **Full**: in WordPress, go to Features → Add New, give it the slug `curry-puffs-hotel-room`, write the body, paste the video URL in the Feature sidebar metabox. Publish. The WordPress version automatically replaces the placeholder.

To add more placeholder features later: edit `lib/features-placeholders.ts` and add a new entry. The placeholder pattern is `MEI_FEATURE_VIDEO_<UPPERCASE_SLUG_WITH_UNDERSCORES>` for env vars.

## Caveats

- **Native-speaker review** for Chinese and Malay UI strings before launch.
- **Le Cordon Bleu mention** is now in /about only. If you want it removed entirely, edit messages/*.json about.p1 and remove the second sentence.
- **JSON-LD `sameAs`** is sparse — add ISBN, IPOS, ORCID, magazine articles as available.
- **Basics with no variants** are fine — just leave the variant slug empty when creating the WP post. URL becomes `/basics/your-concept-slug`.
- **The basics callout on a recipe page** depends on you filling the `uses_basics` field. The site doesn't try to auto-detect basics from ingredient lists — too error-prone.
- **The Wok page** copy lives in `messages/*.json` under `wok`. To edit, edit the JSON files. To make it WordPress-editable, the cleanest migration is to make it a `mei_feature` post with slug `the-wok` and route `/the-wok` to it instead of the hardcoded page — small refactor.
- **Feature placeholder slugs** need to match exactly between `lib/features-placeholders.ts` and the WordPress `mei_feature` post slug. Mismatches mean the WP post creates a parallel page and the placeholder stays.

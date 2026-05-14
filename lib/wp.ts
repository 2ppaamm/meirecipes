// WordPress + WPRM REST client.
// Surfaces translation overrides, editorial flags (signature, family-friendly),
// and prepares child-step markers from WPRM instruction summaries.

import {
  Basic,
  BasicReference,
  CategoryWithChildren,
  WPCategory,
  WPMedia,
  WPPost,
  WPRendered,
  WPRMIngredientGroup,
  WPRMInstructionItem,
  WPRMRecipe,
} from "./wp-types";
import type { Locale } from "./i18n-config";
import { BOOK } from "./book";

const BASE = (process.env.WORDPRESS_URL ?? "https://www.meirecipes.com").replace(/\/$/, "");
const REVALIDATE = Number(process.env.WP_REVALIDATE_SECONDS ?? "600");

type FetchOpts = { revalidate?: number; tags?: string[] };

async function wpFetch<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const res = await fetch(url, {
    next: { revalidate: opts.revalidate ?? REVALIDATE, tags: opts.tags },
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`WP fetch ${res.status} for ${url}`);
  return (await res.json()) as T;
}

async function wpFetchPaged<T>(path: string, opts: FetchOpts = {}): Promise<T[]> {
  const first = path.includes("?") ? `${path}&per_page=100&page=1` : `${path}?per_page=100&page=1`;
  const url = first.startsWith("http") ? first : `${BASE}${first}`;
  const res = await fetch(url, {
    next: { revalidate: opts.revalidate ?? REVALIDATE, tags: opts.tags },
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`WP fetch ${res.status} for ${url}`);
  const total = Number(res.headers.get("X-WP-TotalPages") ?? "1");
  const data = (await res.json()) as T[];
  if (total <= 1) return data;
  const rest = await Promise.all(
    Array.from({ length: total - 1 }, (_, i) => i + 2).map(async (page) => {
      const u = url.replace(/page=\d+/, `page=${page}`);
      const r = await fetch(u, {
        next: { revalidate: opts.revalidate ?? REVALIDATE, tags: opts.tags },
        headers: { Accept: "application/json" },
      });
      if (!r.ok) throw new Error(`WP fetch ${r.status} for ${u}`);
      return (await r.json()) as T[];
    })
  );
  return [...data, ...rest.flat()];
}

/* ---------------- Localisation helpers ---------------- */

function localiseString(post: WPPost, key: "title" | "excerpt" | "content", locale: Locale): string {
  if (locale === "en") return post[key].rendered;
  const metaKey = `${key}_${locale}` as keyof NonNullable<WPPost["meta"]>;
  const override = post.meta?.[metaKey];
  if (typeof override === "string" && override.trim() !== "") return override;
  return post[key].rendered;
}

export function localisedTitle(post: WPPost, locale: Locale): string {
  return localiseString(post, "title", locale);
}
export function localisedExcerpt(post: WPPost, locale: Locale): string {
  return localiseString(post, "excerpt", locale);
}
export function localisedContent(post: WPPost, locale: Locale): string {
  return localiseString(post, "content", locale);
}
export function localisedCategoryName(cat: WPCategory, locale: Locale): string {
  if (locale === "en") return cat.name;
  const k = `name_${locale}` as const;
  const v = cat.meta?.[k];
  return typeof v === "string" && v.trim() !== "" ? v : cat.name;
}

/* ---------------- Editorial flag helpers ---------------- */

/**
 * "From the book" is driven by membership in the dedicated WordPress category
 * (slug `lick-spoon`, ID 4854 in the live site). One source of truth — tag a
 * post with this category in wp-admin and it surfaces as a book recipe on
 * /book and gets the "From the book" badge on its recipe page.
 *
 * We resolve membership two ways:
 *   1. Embedded `wp:term` from `_embed` — most efficient (no extra fetch).
 *   2. Numeric `categories` array — falls back when not embedded.
 *
 * The category-ID resolution is done lazily by name match against `getCategories()`
 * if we have neither slug nor name on the post.
 */
export function isFromTheBook(post: WPPost): boolean {
  const slug = BOOK.bookCategorySlug;
  // Check embedded terms first — this is what `_embed=wp:term` returns
  const termGroups = post._embedded?.["wp:term"] ?? [];
  for (const group of termGroups) {
    if (Array.isArray(group)) {
      for (const term of group) {
        if ((term as WPCategory).slug === slug && (term as WPCategory).taxonomy === "category") {
          return true;
        }
      }
    }
  }
  return false;
}

export function isSignature(post: WPPost): boolean {
  return Boolean(post.meta?.is_signature);
}

export function signatureOrder(post: WPPost): number {
  const v = post.meta?.signature_order;
  if (v == null || v === "") return 999;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? n : 999;
}

export function postCookWithChildren(post: WPPost): boolean {
  return Boolean(post.meta?.cook_with_children);
}

export function postVideoUrl(post: WPPost): string | undefined {
  const v = post.meta?.video_url;
  return typeof v === "string" && v.trim() !== "" ? v : undefined;
}

/**
 * Parse a recipe's `uses_basics` meta string into a list of references.
 * Stored as comma-separated entries. Each entry is either:
 *   - "concept-slug"            (link to concept page)
 *   - "concept-slug/variant"    (link to specific variant)
 */
export function postUsesBasics(post: WPPost): import("./wp-types").BasicReference[] {
  const raw = post.meta?.uses_basics;
  if (typeof raw !== "string" || raw.trim() === "") return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const [concept, variant] = entry.split("/").map((p) => p.trim()).filter(Boolean);
      return { conceptSlug: concept, variantSlug: variant };
    })
    .filter((r) => r.conceptSlug);
}

/* ---------------- Posts ---------------- */

export async function getPosts(args: {
  perPage?: number;
  page?: number;
  categorySlug?: string;
  tagSlug?: string;
  search?: string;
  familyOnly?: boolean;
  order?: "asc" | "desc";
} = {}): Promise<{ posts: WPPost[]; totalPages: number; total: number }> {
  const params = new URLSearchParams({
    _embed: "wp:featuredmedia,wp:term,author",
    per_page: String(args.perPage ?? 12),
    page: String(args.page ?? 1),
    orderby: "date",
    order: args.order ?? "desc",
  });
  if (args.search) params.set("search", args.search);
  if (args.categorySlug) {
    const cats = await getCategories();
    const cat = cats.find((c) => c.slug === args.categorySlug);
    if (cat) params.set("categories", String(cat.id));
  }
  if (args.tagSlug) {
    const tags = await getTags();
    const tag = tags.find((t) => t.slug === args.tagSlug);
    if (tag) params.set("tags", String(tag.id));
  }
  if (args.familyOnly) {
    params.set("meta_key", "cook_with_children");
    params.set("meta_value", "1");
  }

  const url = `${BASE}/wp-json/wp/v2/posts?${params.toString()}`;
  const res = await fetch(url, {
    next: { revalidate: REVALIDATE, tags: ["posts"] },
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`WP fetch ${res.status} for ${url}`);
  const posts = (await res.json()) as WPPost[];
  return {
    posts,
    totalPages: Number(res.headers.get("X-WP-TotalPages") ?? "1"),
    total: Number(res.headers.get("X-WP-Total") ?? posts.length),
  };
}

export async function getPostBySlug(slug: string): Promise<WPPost | null> {
  const data = await wpFetch<WPPost[]>(
    `/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&_embed=wp:featuredmedia,wp:term,author`,
    { tags: [`post:${slug}`] }
  );
  return data[0] ?? null;
}

/**
 * Hero image for a category — picks the most recent post in the category
 * that has a featured image. Returns the image URL, or null if no candidate.
 * Used by the basics index to give each section a representative photo.
 */
export async function getCategoryHeroImage(slug: string): Promise<{
  src: string;
  alt: string;
} | null> {
  try {
    const cats = await getCategories();
    const cat = cats.find((c) => c.slug === slug);
    if (!cat) return null;
    const params = new URLSearchParams({
      _embed: "wp:featuredmedia",
      _fields: "id,_links,_embedded",
      per_page: "6",
      categories: String(cat.id),
      orderby: "date",
      order: "desc",
    });
    const res = await fetch(`${BASE}/wp-json/wp/v2/posts?${params}`, {
      next: { revalidate: REVALIDATE, tags: [`category-hero:${slug}`, "posts"] },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const posts = (await res.json()) as WPPost[];
    for (const p of posts) {
      const media = p._embedded?.["wp:featuredmedia"]?.[0];
      if (media?.source_url) {
        return { src: media.source_url, alt: media.alt_text || cat.name };
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function getAllPostSlugs(): Promise<string[]> {
  const data = await wpFetchPaged<{ id: number; slug: string }>(
    `/wp-json/wp/v2/posts?_fields=id,slug&status=publish`,
    { tags: ["all-slugs"] }
  );
  return data.map((p) => p.slug);
}

/**
 * Signature recipes — driven by membership in the `signature` WordPress category
 * (same pattern as lick-spoon for "from the book"). Order is reverse-chronological
 * unless the optional `signature_order` meta is set, in which case it sorts by that.
 *
 * Tag a post with the "Signature" category in wp-admin to surface it here.
 */
export async function getSignaturePosts(): Promise<WPPost[]> {
  try {
    const cats = await getCategories();
    const sigCat = cats.find((c) => c.slug === "signature");
    if (!sigCat) return [];
    const params = new URLSearchParams({
      _embed: "wp:featuredmedia,wp:term,author",
      per_page: "30",
      categories: String(sigCat.id),
      orderby: "date",
      order: "desc",
    });
    const res = await fetch(`${BASE}/wp-json/wp/v2/posts?${params}`, {
      next: { revalidate: REVALIDATE, tags: ["signature-posts", "posts"] },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const posts = (await res.json()) as WPPost[];
    // Honour signature_order meta when set; otherwise leave reverse-chronological.
    return posts.sort((a, b) => {
      const oa = signatureOrder(a);
      const ob = signatureOrder(b);
      if (oa === 0 && ob === 0) return 0;
      if (oa === 0) return 1;
      if (ob === 0) return -1;
      return oa - ob;
    });
  } catch {
    return [];
  }
}

/**
 * Fetch all recipes tagged as "from the book" — i.e. members of the lick-spoon
 * WordPress category. Listed in reverse chronological order so the newest book
 * recipes appear first.
 */
export async function getBookRecipes(perPage = 24): Promise<WPPost[]> {
  try {
    const cats = await getCategories();
    const bookCat = cats.find((c) => c.slug === BOOK.bookCategorySlug);
    if (!bookCat) return [];
    const params = new URLSearchParams({
      _embed: "wp:featuredmedia,wp:term,author",
      per_page: String(perPage),
      categories: String(bookCat.id),
      orderby: "date",
      order: "desc",
    });
    const res = await fetch(`${BASE}/wp-json/wp/v2/posts?${params}`, {
      next: { revalidate: REVALIDATE, tags: ["book-recipes", "posts"] },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    return (await res.json()) as WPPost[];
  } catch {
    return [];
  }
}

/* ---------------- Categories ---------------- */

export async function getCategories(): Promise<WPCategory[]> {
  return wpFetchPaged<WPCategory>(`/wp-json/wp/v2/categories?hide_empty=true`, {
    tags: ["categories"],
  });
}

export async function getTags(): Promise<import("./wp-types").WPTag[]> {
  return wpFetchPaged<import("./wp-types").WPTag>(
    `/wp-json/wp/v2/tags?hide_empty=true&orderby=count&order=desc`,
    { tags: ["tags"] }
  );
}

export async function getCategoryTree(): Promise<CategoryWithChildren[]> {
  const flat = await getCategories();
  const byId = new Map<number, CategoryWithChildren>();
  flat.forEach((c) => byId.set(c.id, { ...c, children: [] }));
  const roots: CategoryWithChildren[] = [];
  for (const c of byId.values()) {
    if (c.parent && byId.has(c.parent)) byId.get(c.parent)!.children.push(c);
    else roots.push(c);
  }
  const sortRec = (arr: CategoryWithChildren[]) => {
    arr.sort((a, b) => a.name.localeCompare(b.name));
    arr.forEach((x) => sortRec(x.children));
  };
  sortRec(roots);
  return roots;
}

export async function getCategoryBySlug(slug: string): Promise<WPCategory | null> {
  const data = await wpFetch<WPCategory[]>(`/wp-json/wp/v2/categories?slug=${encodeURIComponent(slug)}`);
  return data[0] ?? null;
}

/* ---------------- WPRM Recipes ---------------- */

interface WPRMRecipePost {
  id: number;
  slug: string;
  title: { rendered: string };
  status: string;
  recipe?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

export async function getRecipeById(id: number): Promise<WPRMRecipe | null> {
  try {
    const data = await wpFetch<WPRMRecipePost>(`/wp-json/wp/v2/wprm_recipe/${id}`, {
      tags: [`recipe:${id}`],
    });
    return normaliseRecipe(data);
  } catch {
    return null;
  }
}

function normaliseRecipe(data: WPRMRecipePost): WPRMRecipe | null {
  const raw = (data.recipe ?? data.meta ?? {}) as Record<string, unknown>;
  const read = <T>(key: string, fallback?: T): T => {
    if (key in raw) return raw[key] as T;
    if (`wprm_${key}` in raw) return raw[`wprm_${key}`] as T;
    return fallback as T;
  };
  return {
    id: data.id,
    slug: data.slug,
    name: read<string>("name") ?? stripTags(data.title?.rendered ?? ""),
    summary: read<string>("summary"),
    servings: numOrUndef(read<unknown>("servings")),
    servings_unit: read<string>("servings_unit"),
    prep_time: numOrUndef(read<unknown>("prep_time")),
    cook_time: numOrUndef(read<unknown>("cook_time")),
    total_time: numOrUndef(read<unknown>("total_time")),
    custom_time: numOrUndef(read<unknown>("custom_time")),
    custom_time_label: read<string>("custom_time_label"),
    image_url: read<string>("image_url"),
    notes: read<string>("notes"),
    parent_post_id: numOrUndef(read<unknown>("parent_post_id")),
    ingredients: parseIngredients(read<unknown>("ingredients")),
    instructions: parseInstructions(read<unknown>("instructions")),
    raw,
  };
}

function parseIngredients(v: unknown): WPRMIngredientGroup[] {
  if (!Array.isArray(v) || v.length === 0) return [];
  const first = v[0] as Record<string, unknown>;
  if ("ingredients" in first && Array.isArray(first.ingredients)) {
    return v.map((g) => {
      const grp = g as { name?: string; ingredients: unknown[] };
      return {
        name: grp.name,
        ingredients: (grp.ingredients as Record<string, unknown>[]).map(toIngredient),
      };
    });
  }
  return [{ name: undefined, ingredients: (v as Record<string, unknown>[]).map(toIngredient) }];
}

function toIngredient(r: Record<string, unknown>) {
  return {
    uid: numOrUndef(r.uid),
    amount: (r.amount as string | number | undefined) ?? undefined,
    unit: (r.unit as string | undefined) ?? undefined,
    name: (r.name as string | undefined) ?? "",
    notes: (r.notes as string | undefined) ?? undefined,
  };
}

function parseInstructions(v: unknown): WPRMInstructionItem[] {
  if (!Array.isArray(v) || v.length === 0) return [];
  const first = v[0] as Record<string, unknown>;
  // Nested-group shape
  if ("instructions" in first && Array.isArray(first.instructions)) {
    const out: WPRMInstructionItem[] = [];
    for (const g of v as Array<{ name?: string; instructions: Record<string, unknown>[] }>) {
      if (g.name) out.push({ type: "group", name: g.name });
      for (const step of g.instructions) {
        out.push(toInstructionItem(step));
      }
    }
    return out;
  }
  return (v as Array<Record<string, unknown>>).map((s) => {
    if (s.type === "group") return { type: "group", name: (s.name as string) ?? "" };
    return toInstructionItem(s);
  });
}

function toInstructionItem(s: Record<string, unknown>): WPRMInstructionItem {
  // Convention: WPRM allows a step summary in `name`. If it starts with "[child]"
  // (case-insensitive), we treat the step as child-safe. The summary text after
  // the marker is otherwise unused.
  const name = (s.name as string | undefined)?.trim();
  const childSafe = !!name && /^\[child\]/i.test(name);
  return {
    type: "instruction",
    text: (s.text as string) ?? "",
    name,
    childSafe,
  };
}

function numOrUndef(v: unknown): number | undefined {
  if (v == null || v === "") return undefined;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : undefined;
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "").trim();
}

export function extractRecipeIdsFromPost(post: WPPost): number[] {
  const re = /data-recipe-id\s*=\s*["'](\d+)["']/g;
  const ids = new Set<number>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(post.content.rendered)) !== null) ids.add(Number(m[1]));
  const shortcodeRe = /\[wprm-recipe[^\]]*id=["'](\d+)["']/g;
  while ((m = shortcodeRe.exec(post.content.rendered)) !== null) ids.add(Number(m[1]));
  return Array.from(ids);
}

/* ---------------- Basics ---------------- */

/**
 * Basics are stored in WordPress as a separate post type `mei_basic`.
 * Each basic carries two meta fields:
 *   - basic_concept   (slug, e.g. "puff-pastry")
 *   - basic_variant   (slug, optional, e.g. "chinese"; empty means this is a single-variant basic or the concept page)
 *   - basic_is_concept_page (boolean — true if this is the editorial comparison/intro page)
 *
 * The post slug itself follows the pattern {concept} or {concept}-{variant} for
 * WordPress-side simplicity; the URL routing on Next.js maps them back to /basics/{concept}[/{variant}].
 */
interface WPBasicPost {
  id: number;
  date: string;
  slug: string;
  title: WPRendered;
  content: WPRendered;
  excerpt: WPRendered;
  featured_media: number;
  meta?: {
    basic_concept?: string;
    basic_variant?: string;
    basic_is_concept_page?: boolean | string;
    title_zh?: string;
    title_ms?: string;
    excerpt_zh?: string;
    excerpt_ms?: string;
    content_zh?: string;
    content_ms?: string;
  };
  _embedded?: { "wp:featuredmedia"?: WPMedia[] };
}

function basicLocaliseString(
  post: WPBasicPost,
  key: "title" | "excerpt" | "content",
  locale: Locale
): string {
  if (locale === "en") return post[key].rendered;
  const metaKey = `${key}_${locale}` as keyof NonNullable<WPBasicPost["meta"]>;
  const override = post.meta?.[metaKey];
  if (typeof override === "string" && override.trim() !== "") return override;
  return post[key].rendered;
}

function basicFromPost(p: WPBasicPost, locale: Locale): Basic {
  const concept = (p.meta?.basic_concept ?? "").trim() || p.slug;
  const variant = (p.meta?.basic_variant ?? "").trim() || undefined;
  const isConceptPage = !!p.meta?.basic_is_concept_page;
  return {
    id: p.id,
    slug: concept,
    variant,
    title: basicLocaliseString(p, "title", locale).replace(/<[^>]+>/g, ""),
    excerpt: basicLocaliseString(p, "excerpt", locale).replace(/<[^>]+>/g, "").trim(),
    content: basicLocaliseString(p, "content", locale),
    imageUrl: p._embedded?.["wp:featuredmedia"]?.[0]?.source_url,
    isConceptPage,
  };
}

/** Fetch every basic, grouped by concept. */
export async function getBasicsGrouped(locale: Locale): Promise<Map<string, Basic[]>> {
  try {
    const all = await wpFetchPaged<WPBasicPost>(
      `/wp-json/wp/v2/mei_basic?_embed=wp:featuredmedia&status=publish&orderby=title&order=asc`,
      { tags: ["basics"] }
    );
    const grouped = new Map<string, Basic[]>();
    for (const p of all) {
      const b = basicFromPost(p, locale);
      const arr = grouped.get(b.slug) ?? [];
      arr.push(b);
      grouped.set(b.slug, arr);
    }
    // Sort each group: concept page first (if exists), then variants alphabetically.
    for (const [, arr] of grouped) {
      arr.sort((a, b) => {
        if (a.isConceptPage && !b.isConceptPage) return -1;
        if (!a.isConceptPage && b.isConceptPage) return 1;
        return (a.variant ?? "").localeCompare(b.variant ?? "");
      });
    }
    return grouped;
  } catch (e) {
    console.error("Failed to fetch basics:", e);
    return new Map();
  }
}

/** Get a single concept (possibly with multiple variants). */
export async function getBasicConcept(
  conceptSlug: string,
  locale: Locale
): Promise<Basic | null> {
  const grouped = await getBasicsGrouped(locale);
  const arr = grouped.get(conceptSlug);
  if (!arr || arr.length === 0) return null;

  // If there's an explicit concept page, use it as the root with variants attached.
  const conceptPage = arr.find((b) => b.isConceptPage);
  const variants = arr.filter((b) => !b.isConceptPage && b.variant);

  if (conceptPage) {
    return { ...conceptPage, variants };
  }

  // No concept page. If only one variant, treat it as the concept root.
  if (variants.length === 1) {
    return { ...variants[0], variants: [] };
  }

  // Multiple variants but no concept page — synthesise a minimal concept root.
  return {
    id: -1,
    slug: conceptSlug,
    title: variants[0].title.replace(/\s*\(.+\)\s*$/, "") || conceptSlug,
    excerpt: "",
    content: "",
    isConceptPage: false,
    variants,
  };
}

/** Get a specific variant under a concept. */
export async function getBasicVariant(
  conceptSlug: string,
  variantSlug: string,
  locale: Locale
): Promise<Basic | null> {
  const grouped = await getBasicsGrouped(locale);
  const arr = grouped.get(conceptSlug);
  if (!arr) return null;
  return arr.find((b) => b.variant === variantSlug) ?? null;
}

/**
 * Backlinks: find every recipe whose `uses_basics` references this concept,
 * optionally narrowing to a specific variant.
 */
export async function getRecipesUsingBasic(
  conceptSlug: string,
  variantSlug: string | undefined,
  locale: Locale
): Promise<WPPost[]> {
  try {
    // We can't filter on a meta substring via the REST endpoint without a custom
    // filter — but the mu-plugin exposes `uses_basics` to the meta_query whitelist.
    // We do a pragmatic broad fetch then filter in Node, since on small sites
    // this is fast and avoids meta_query LIKE complexity.
    const { posts } = await getPosts({ perPage: 100 });
    return posts.filter((p) => {
      const refs = postUsesBasics(p);
      if (refs.length === 0) return false;
      // Match if any ref is for this concept (and variant if specified).
      return refs.some((r) => {
        if (r.conceptSlug !== conceptSlug) return false;
        if (!variantSlug) return true;
        // If recipe didn't specify a variant, the recipe uses the concept generally —
        // we surface it on every variant page.
        if (!r.variantSlug) return true;
        return r.variantSlug === variantSlug;
      });
    });
  } catch (e) {
    console.error("Failed to fetch recipes using basic:", e);
    return [];
  }
}

/** List all concept slugs (for nav/breadcrumb generation). */
export async function getAllBasicConcepts(): Promise<string[]> {
  const grouped = await getBasicsGrouped("en");
  return Array.from(grouped.keys());
}


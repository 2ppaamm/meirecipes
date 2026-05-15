/**
 * Search abstraction. Today, queries WordPress REST `?search=`.
 * After Meilisearch is deployed on the droplet (post-July), swap the implementation
 * in `meilisearchSearch()` and switch `searchRecipes()` to call it.
 *
 * The Meilisearch indexer should run as a small Node script on the droplet that
 * iterates WP posts via REST, builds documents like:
 *   { id, slug, title_en, title_zh, title_ms, excerpt_*, ingredients (flat),
 *     category, difficulty, total_time, in_book_category, cook_with_children }
 * and pushes them into a Meilisearch index. Recipe content updates trigger a re-index
 * via the existing /api/revalidate webhook (extend with a re-index call).
 */

import { getPosts, isFromTheBook, localisedExcerpt, localisedTitle } from "./wp";
import type { Locale } from "./i18n-config";
import type { WPPost } from "./wp-types";

export interface SearchResult {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  imageUrl?: string;
  fromTheBook?: boolean;
}

export interface SearchOptions {
  query: string;
  locale: Locale;
  categorySlug?: string;
  familyOnly?: boolean;
  underMinutes?: number;
  perPage?: number;
  page?: number;
}

/** Today's implementation: WP REST. */
async function wpRestSearch(opts: SearchOptions): Promise<{ results: SearchResult[]; total: number }> {
  if (!opts.query.trim()) return { results: [], total: 0 };
  try {
    const { posts, total } = await getPosts({
      search: opts.query,
      perPage: opts.perPage ?? 24,
      page: opts.page ?? 1,
      categorySlug: opts.categorySlug,
      familyOnly: opts.familyOnly,
    });
    return {
      results: posts.map((p) => toResult(p, opts.locale)),
      total,
    };
  } catch (e) {
    console.error("WP search error:", e);
    return { results: [], total: 0 };
  }
}

function toResult(p: WPPost, locale: Locale): SearchResult {
  const media = p._embedded?.["wp:featuredmedia"]?.[0];
  return {
    id: p.id,
    slug: p.slug,
    title: localisedTitle(p, locale).replace(/<[^>]+>/g, ""),
    excerpt: localisedExcerpt(p, locale).replace(/<[^>]+>/g, "").trim(),
    imageUrl: media?.source_url,
    fromTheBook: isFromTheBook(p),
  };
}

// Placeholder for the future Meilisearch swap.
// async function meilisearchSearch(opts: SearchOptions) { ... }

export async function searchRecipes(opts: SearchOptions) {
  return wpRestSearch(opts);
}

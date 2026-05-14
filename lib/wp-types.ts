// WordPress + WPRM types. Extended for Mei Kitchen v0.3.1:
//  - Basics: a nested concept→variant structure (e.g. puff-pastry → chinese, western).
//  - Parent recipes link to basics via a `uses_basics` slug array on post meta.
//  - Backlinks (which recipes use a basic) are computed at fetch time by querying
//    posts whose `uses_basics` contains the basic's slug.

export type WPRendered = { rendered: string; protected?: boolean };

export interface WPMedia {
  id: number;
  source_url: string;
  alt_text: string;
  media_details?: {
    width?: number;
    height?: number;
    sizes?: Record<string, { source_url: string; width: number; height: number }>;
  };
}

export interface WPCategory {
  id: number;
  count: number;
  description: string;
  name: string;
  slug: string;
  parent: number;
  taxonomy: "category";
  meta?: Record<string, string>;
}

export interface WPTag {
  id: number;
  name: string;
  slug: string;
  taxonomy: "post_tag";
  count?: number;
}

export interface WPPostEmbedded {
  "wp:featuredmedia"?: WPMedia[];
  "wp:term"?: Array<WPCategory[] | WPTag[]>;
  author?: Array<{ id: number; name: string; slug: string }>;
}

export interface WPPost {
  id: number;
  date: string;
  date_gmt: string;
  modified: string;
  slug: string;
  status: string;
  type: string;
  link: string;
  title: WPRendered;
  content: WPRendered;
  excerpt: WPRendered;
  author: number;
  featured_media: number;
  categories: number[];
  tags: number[];
  meta?: {
    // Translation overrides
    title_zh?: string;
    title_ms?: string;
    excerpt_zh?: string;
    excerpt_ms?: string;
    content_zh?: string;
    content_ms?: string;
    // Editorial flags
    is_signature?: boolean | string;
    signature_order?: number | string;
    difficulty?: string;
    video_url?: string; // optional, surfaces above the image when present — no /videos hub anymore
    cook_with_children?: boolean | string;
    /**
     * Slugs of basics this recipe uses. Each entry is either a concept slug
     * ("puff-pastry") or a fully-qualified variant slug ("puff-pastry/chinese").
     * Stored as a comma-separated string in WP meta, parsed at read time.
     */
    uses_basics?: string;
    // Provenance
    original_publish_date?: string;
    provenance_note?: string;
  };
  _embedded?: WPPostEmbedded;
}

export interface WPRMIngredient {
  uid?: number;
  amount?: string | number;
  unit?: string;
  name: string;
  notes?: string;
}

export interface WPRMIngredientGroup {
  name?: string;
  ingredients: WPRMIngredient[];
}

export interface WPRMInstructionItem {
  type: "group" | "instruction";
  text?: string;
  name?: string;
  image?: number;
  childSafe?: boolean;
}

export interface WPRMRecipe {
  id: number;
  slug: string;
  parent_post_id?: number;
  name: string;
  summary?: string;
  servings?: number;
  servings_unit?: string;
  prep_time?: number;
  cook_time?: number;
  total_time?: number;
  custom_time?: number;
  custom_time_label?: string;
  image_url?: string;
  notes?: string;
  ingredients: WPRMIngredientGroup[];
  instructions: WPRMInstructionItem[];
  raw?: Record<string, unknown>;
}

export interface CategoryWithChildren extends WPCategory {
  children: CategoryWithChildren[];
}

/* ---------------- Press / publications ---------------- */

export interface PressItem {
  id: string;
  publication: string;
  title: string;
  date: string;
  url?: string;
  coverImageUrl?: string;
  type: "magazine" | "newspaper" | "book-review" | "tv" | "interview" | "other";
  language: "en" | "zh" | "ms";
  excerpt?: string;
}

/* ---------------- Basics ---------------- */

/**
 * A "basic" is a foundational technique (puff pastry, dashi, sambal, choux).
 * Basics live at:
 *   /basics                              all basics index
 *   /basics/{concept}                    concept page — editorial comparison if multiple variants
 *   /basics/{concept}/{variant}          recipe page for the variant
 *
 * A basic with no variants is treated as a single recipe at /basics/{concept}
 * with no `variant` segment. Concept and variant are stored as separate fields
 * on the WordPress `mei_basic` post type for clean filtering.
 *
 * Basics carry no category taxonomy of their own — they are foundational
 * techniques. The categorisation comes from the parent recipes that use them.
 */
export interface Basic {
  id: number;
  slug: string;              // concept slug, e.g. "puff-pastry"
  variant?: string;          // optional variant slug, e.g. "chinese"
  title: string;             // human title, e.g. "Chinese puff pastry"
  conceptTitle?: string;     // concept-level title shown on the concept page, e.g. "Puff pastry"
  excerpt: string;
  content: string;
  imageUrl?: string;
  // Whether this is the "concept" page (variant === undefined) describing
  // multiple variants, vs an actual recipe page (variant present).
  isConceptPage: boolean;
  // For concept pages: the variants under this concept (computed at fetch time).
  variants?: Basic[];
  // The WPRM recipe embedded in this basic, if any.
  recipeIds?: number[];
}

/**
 * A reference from a parent recipe to a basic it uses.
 * - conceptSlug: required (e.g. "puff-pastry")
 * - variantSlug: optional (e.g. "chinese" — if the recipe specifically uses Chinese puff)
 * If variantSlug is omitted, the link goes to the concept page (helpful when the
 * recipe genuinely works with either variant).
 */
export interface BasicReference {
  conceptSlug: string;
  variantSlug?: string;
}

import type { PressItem } from "./wp-types";

/**
 * Magazine bylines, book reviews, media appearances.
 * Replace these placeholders with the real list when Pamela sends it.
 *
 * Field reference:
 *   - date: ISO 8601 (YYYY-MM-DD or YYYY-MM or just YYYY)
 *   - type: 'magazine' | 'newspaper' | 'book-review' | 'tv' | 'interview' | 'other'
 *   - language: 'en' | 'zh' | 'ms'
 *   - coverImageUrl: optional; can be a Pinterest, WordPress, or any HTTPS URL — make sure
 *     to add the hostname to next.config.js images.remotePatterns if you do.
 */
export const PRESS_ITEMS: PressItem[] = [
  // Example shape — leave empty array if no items yet.
  //
  // {
  //   id: "publication-2024-feature",
  //   publication: "Wine & Dine Singapore",
  //   title: "The wok-maker who writes",
  //   date: "2024-08",
  //   type: "magazine",
  //   language: "en",
  //   url: "https://example.com/article",
  //   coverImageUrl: "https://www.meirecipes.com/wp-content/uploads/press/wine-dine.jpg",
  //   excerpt: "Profile of Pamela Lim, second-generation chef and designer of the Mei Wok.",
  // },
];

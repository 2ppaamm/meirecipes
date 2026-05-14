/**
 * Canonical bibliographic data for "Can I Lick the Spoon, Mum?"
 *
 * Source: World Scientific Publishing Co Pte Ltd (publisher), Singapore Book
 * Publishers Association (Singapore Book Awards 2025 finalist listing).
 *
 * Single source of truth — referenced by the book page, JSON-LD, and any
 * "From the book" surfaces.
 */
export const BOOK = {
  title: "Can I Lick the Spoon, Mum?",
  subtitle:
    "A Comics-Style Cookbook for Creating Asian Bakes and Family Memories in the Kitchen",
  author: "Pamela Lim",
  authorAltName: "廖秀梅",
  illustrators: ["Japher Lim", "Eliz Ong"],
  publisher: "World Scientific Publishing Co Pte Ltd",
  publisherImprint: "WS Education",
  publisherUrl: "https://www.worldscientific.com/worldscibooks/10.1142/12261",
  publicationDate: "2024-08-21",
  pages: 116,
  language: "en",
  isbn10: "981123700X",
  isbn13Paperback: "9789811237003",
  isbn13Hardcover: "9789811236419",
  award: "Finalist, Singapore Book Awards 2025",
  /**
   * WordPress category slug holding the recipes that are also in the book.
   * Tag a recipe with this category in wp-admin and it appears on /category/lick-spoon
   * and is badged "From the book" on its recipe page.
   * Category ID 4854 in the live WordPress (informational; the slug is what matters).
   */
  bookCategorySlug: "lick-spoon",
  /**
   * Official award page (Singapore Book Publishers Association).
   * Pam's book is listed under "THE JULIET DAVID BEST FOOD BOOK" → "FINALISTS".
   * Verified existing as of 2026-05-14.
   */
  awardUrl: "https://singaporebookpublishers.sg/singapore-book-awards/",
  retailLinks: [
    {
      label: "Amazon (Singapore)",
      url: "https://www.amazon.sg/Can-Lick-Spoon-Mum-Comics-Style/dp/981123700X",
    },
    {
      label: "Shopee (Singapore)",
      url: "https://shopee.sg/WS-E-Can-I-Lick-the-Spoon-Mum-A-Comics-Style-Cookbook-for-Creating-Asian-Bakes-and-Family-Memories-in-the-Kitchen-i.672652729.26502015822",
    },
    {
      label: "World Scientific",
      url: "https://www.worldscientific.com/worldscibooks/10.1142/12261",
    },
  ],
  /**
   * Local path for the cover image, relative to /public.
   * Recommended: drop the file as `public/book-cover.jpg` so the asset ships with
   * the Next.js bundle and never depends on the WordPress origin.
   */
  coverImagePath: "/book-cover.jpg",
  /**
   * Fallback: if the local file doesn't exist, the book page uses this remote URL.
   * Hosted on the WordPress side, so the asset is reachable even before the
   * local file is dropped in.
   */
  remoteCoverImageUrl:
    "https://www.meirecipes.com/wp-content/uploads/2026/05/Screenshot-2026-05-14-143036.png",
} as const;

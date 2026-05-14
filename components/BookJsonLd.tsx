import { BOOK } from "@/lib/book";
import type { Locale } from "@/lib/i18n-config";

/**
 * Schema.org Book structured data for "Can I Lick the Spoon, Mum?"
 *
 * Cross-references the site-wide Person LD (id={siteUrl}/#author) so that
 * the book and the author share canonical identity across the site.
 *
 * Two ISBN strings are surfaced as a workIsbn list — schema.org/Book accepts a
 * single isbn property; for distinct formats we use the workExample pattern
 * (one Book per ISBN), which is the recommended pattern per the spec.
 */
export function BookJsonLd({ locale }: { locale: Locale }) {
  const siteUrl = process.env.SITE_URL ?? "https://meirecipes.com";
  const bookId = `${siteUrl}/#book-can-i-lick-the-spoon-mum`;

  const author = {
    "@type": "Person",
    "@id": `${siteUrl}/#author`,
    name: BOOK.author,
    alternateName: BOOK.authorAltName,
  };

  const illustrators = BOOK.illustrators.map((name) => ({
    "@type": "Person",
    name,
  }));

  const publisher = {
    "@type": "Organization",
    name: BOOK.publisher,
    alternateName: BOOK.publisherImprint,
    url: BOOK.publisherUrl,
  };

  // Conceptual work — the Book itself — with formats as workExamples
  const work = {
    "@context": "https://schema.org",
    "@type": "Book",
    "@id": bookId,
    name: BOOK.title,
    alternativeHeadline: BOOK.subtitle,
    author,
    illustrator: illustrators,
    publisher,
    datePublished: BOOK.publicationDate,
    numberOfPages: BOOK.pages,
    inLanguage: BOOK.language,
    bookFormat: "https://schema.org/Paperback",
    workExample: [
      {
        "@type": "Book",
        "@id": `${bookId}/paperback`,
        isbn: BOOK.isbn13Paperback,
        bookFormat: "https://schema.org/Paperback",
        inLanguage: BOOK.language,
        potentialAction: BOOK.retailLinks.map((r) => ({
          "@type": "BuyAction",
          target: r.url,
          seller: { "@type": "Organization", name: r.label },
        })),
      },
      {
        "@type": "Book",
        "@id": `${bookId}/hardcover`,
        isbn: BOOK.isbn13Hardcover,
        bookFormat: "https://schema.org/Hardcover",
        inLanguage: BOOK.language,
      },
    ],
    award: BOOK.award,
    sameAs: [BOOK.publisherUrl, BOOK.retailLinks[0]?.url, BOOK.awardUrl].filter(Boolean),
    description:
      "A comics-style cookbook for parents and children to use together. 22 base recipes and 20 variations, from butter cookies and matcha bakes to pineapple tarts and other Asian bakes. Finalist, Singapore Book Awards 2025.",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(work) }}
    />
  );
}

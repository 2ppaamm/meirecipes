import Link from "next/link";
import Image from "next/image";
import { existsSync } from "fs";
import path from "path";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { isLocale, Locale } from "@/lib/i18n-config";
import { notFound } from "next/navigation";
import { MeiMark } from "@/components/MeiMark";
import { BOOK } from "@/lib/book";
import { BookJsonLd } from "@/components/BookJsonLd";
import { getBookRecipes, localisedTitle } from "@/lib/wp";
import { decodeEntities } from "@/lib/render";

export const revalidate = 3600;

// Resolve which cover image source to render:
//   1. Local file in /public (recommended — ships with the Next bundle)
//   2. Remote WordPress-hosted URL (fallback — works immediately, no manual copy)
//   3. Typographic 梅 hero (only if both above are absent)
const LOCAL_COVER_EXISTS = (() => {
  try {
    return existsSync(path.join(process.cwd(), "public", "book-cover.jpg"));
  } catch {
    return false;
  }
})();
const COVER_SRC: string | null = LOCAL_COVER_EXISTS
  ? BOOK.coverImagePath
  : BOOK.remoteCoverImageUrl ?? null;

export async function generateMetadata({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) return {};
  const t = await getTranslations({ locale: params.locale, namespace: "book" });
  return {
    title: t("fullTitle"),
    description: `${t("fullSubtitle")} — ${t("byline")}.`,
    openGraph: {
      type: "book",
      title: t("fullTitle"),
      description: t("fullSubtitle"),
      images: COVER_SRC ? [COVER_SRC] : undefined,
    },
  };
}

export default async function BookPage({
  params,
}: {
  params: { locale: string };
}) {
  if (!isLocale(params.locale)) notFound();
  unstable_setRequestLocale(params.locale);
  const locale = params.locale as Locale;
  const t = await getTranslations();
  const localePrefix = locale === "en" ? "" : `/${locale}`;
  const link = (path: string) => `${localePrefix}${path}` || "/";

  // Pull the most recent recipes tagged with the lick-spoon category.
  // Empty when the category is empty or unreachable — the page still renders.
  let bookRecipes: Awaited<ReturnType<typeof getBookRecipes>> = [];
  try {
    bookRecipes = await getBookRecipes(8);
  } catch {
    /* graceful */
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
      <BookJsonLd locale={locale} />

      <div className="grid grid-cols-12 gap-8 sm:gap-12">
        {/* Cover column */}
        <div className="col-span-12 md:col-span-5 rise rise-1">
          <div className="sticky top-8">
            {COVER_SRC ? (
              <Image
                src={COVER_SRC}
                alt={`Cover of ${BOOK.title}`}
                width={520}
                height={680}
                className="w-full h-auto shadow-xl border rule"
                priority
              />
            ) : (
              <div className="aspect-[3/4] bg-rose flex items-center justify-center shadow-xl">
                <MeiMark size={200} variant="outline" className="text-paper opacity-90" />
              </div>
            )}
            <div className="smallcaps text-xs text-rose mt-6 text-center">
              <a
                href={BOOK.awardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-rose-deep underline-offset-2 hover:underline"
              >
                {t("home.creds.bookSubtitle")}
              </a>
            </div>
          </div>
        </div>

        {/* Text column */}
        <div className="col-span-12 md:col-span-7 rise rise-2">
          <div className="smallcaps text-xs text-rose mb-4">{t("book.kicker")}</div>
          <h1 className="font-display text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.05] tracking-tightish">
            {t("book.fullTitle")}
          </h1>
          <p className="font-display italic text-xl text-rose-deep mt-3 leading-tight">
            {t("book.fullSubtitle")}
          </p>
          <p className="smallcaps text-xs text-plum/70 mt-4 leading-relaxed">
            {t("book.byline")}
          </p>
          <p className="smallcaps text-[10px] text-plum/50 mt-1">
            {t("book.publisher")}
          </p>

          <div className="post-prose mt-10">
            <p className="lede">{t("book.ledeP1")}</p>
            <p>{t("book.ledeP2")}</p>
            <p className="italic text-plum/70 border-l-2 border-rose-soft pl-4 my-6">
              {t("book.originStory")}
            </p>
          </div>

          <div className="flex flex-wrap gap-3 mt-8">
            {BOOK.retailLinks.map((r) => (
              <a
                key={r.url}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="smallcaps text-xs bg-rose text-paper px-4 py-2 hover:bg-rose-deep transition-colors inline-flex items-center gap-2"
              >
                {r.label} →
              </a>
            ))}
          </div>

          <p className="smallcaps text-xs text-plum/60 mt-6">
            {t("book.buyLine")}
          </p>
        </div>
      </div>

      <hr className="rule my-16" />

      {/* Specs block */}
      <section className="rise rise-3">
        <div className="smallcaps text-xs text-rose mb-6">{t("book.specsHeading")}</div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-4 max-w-3xl">
          <SpecRow label={t("book.specPublisher").split("(")[0].trim()} value="WS Education" />
          <SpecRow label="Imprint of" value={BOOK.publisher} />
          <SpecRow label="Publication date" value="21 August 2024" />
          <SpecRow label="Format" value={t("book.specFormat")} />
          <SpecRow label="Pages" value={`${BOOK.pages}`} />
          <SpecRow label="Language" value="English" />
          <SpecRow label="ISBN (paperback)" value={`978-981-123-7003`} />
          <SpecRow label="ISBN (hardcover)" value={`978-981-123-6419`} />
          <SpecRow label={t("home.creds.bookSubtitle").split(",")[0]} value={t("home.creds.bookSubtitle")} />
        </dl>
      </section>

      <hr className="rule my-16" />

      <section className="rise rise-4">
        <div className="grid grid-cols-12 gap-8 mb-10">
          <div className="col-span-12 md:col-span-5">
            <div className="smallcaps text-xs text-rose mb-3">{t("book.kicker")}</div>
            <h2 className="font-display text-3xl tracking-tightish">
              {t("book.recipesHeading")}
            </h2>
          </div>
          <div className="col-span-12 md:col-span-7 post-prose">
            <p className="lede">{t("book.recipesLede")}</p>
          </div>
        </div>

        {bookRecipes.length === 0 ? (
          <div className="border rule bg-cream px-6 py-8 text-plum/60 italic text-sm">
            {t("book.recipesEmpty")}
          </div>
        ) : (
          <>
            <ul className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
              {bookRecipes.map((p) => {
                const featured = p._embedded?.["wp:featuredmedia"]?.[0];
                const title = decodeEntities(localisedTitle(p, locale)).replace(/<[^>]+>/g, "");
                return (
                  <li key={p.id}>
                    <Link href={link(`/r/${p.slug}`)} className="group block">
                      <div className="aspect-[4/5] mb-3 overflow-hidden bg-rule/30">
                        {featured?.source_url ? (
                          <Image
                            src={featured.source_url}
                            alt={featured.alt_text || title}
                            width={600}
                            height={750}
                            className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700"
                            sizes="(max-width: 768px) 100vw, 25vw"
                          />
                        ) : (
                          <div className="w-full h-full bg-rose-soft/40 flex items-center justify-center">
                            <MeiMark size={48} variant="outline" className="text-rose/40" />
                          </div>
                        )}
                      </div>
                      <h3 className="font-display text-lg leading-tight tracking-tightish group-hover:text-rose transition-colors">
                        {title}
                      </h3>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-10 text-center">
              <Link
                href={link(`/category/${BOOK.bookCategorySlug}`)}
                className="smallcaps text-xs bg-rose text-paper px-5 py-3 hover:bg-rose-deep transition-colors inline-block"
              >
                {t("book.recipesAll")} →
              </Link>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b rule pb-3">
      <dt className="smallcaps text-[10px] text-plum/50">{label}</dt>
      <dd className="font-display text-base text-plum">{value}</dd>
    </div>
  );
}

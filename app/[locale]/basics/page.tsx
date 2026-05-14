import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import {
  getCategories,
  getPostBySlug,
  getCategoryHeroImage,
} from "@/lib/wp";
import { isLocale, Locale } from "@/lib/i18n-config";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { MeiMark } from "@/components/MeiMark";

export const revalidate = 600;

/**
 * Basics index.
 *
 * Six curated sections — five WordPress categories and one specific post.
 * Each card shows a hero image pulled from the first available recipe in
 * that category (or the featured image of the post). Falls back to a 梅 mark
 * when no image is available.
 */
const BASICS_SECTIONS = [
  { kind: "category" as const, slug: "breads", titleKey: "breads" },
  { kind: "category" as const, slug: "cake", titleKey: "cakes" },
  { kind: "category" as const, slug: "filings", titleKey: "fillings" },
  { kind: "category" as const, slug: "noodles", titleKey: "noodlesAndPastas" },
  { kind: "category" as const, slug: "pastry", titleKey: "pastry" },
  { kind: "post" as const, slug: "stir-fry-anything-in-six-steps", titleKey: "stirFrySixSteps" },
];

export async function generateMetadata({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) return {};
  const t = await getTranslations({ locale: params.locale, namespace: "basics" });
  return { title: t("title"), description: t("lede") };
}

export default async function BasicsIndexPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  unstable_setRequestLocale(params.locale);
  const locale = params.locale as Locale;
  const t = await getTranslations();
  const localePrefix = locale === "en" ? "" : `/${locale}`;
  const link = (path: string) => `${localePrefix}${path}` || "/";

  const cats = await getCategories().catch(() => []);
  const sections = await Promise.all(
    BASICS_SECTIONS.map(async (section) => {
      if (section.kind === "category") {
        const cat = cats.find((c) => c.slug === section.slug);
        const hero = await getCategoryHeroImage(section.slug).catch(() => null);
        return {
          ...section,
          href: link(`/category/${section.slug}`),
          count: cat?.count ?? 0,
          available: !!cat,
          hero,
        };
      }
      const post = await getPostBySlug(section.slug).catch(() => null);
      const media = post?._embedded?.["wp:featuredmedia"]?.[0];
      return {
        ...section,
        href: link(`/r/${section.slug}`),
        count: 0,
        available: !!post,
        hero: media?.source_url
          ? { src: media.source_url, alt: media.alt_text || section.slug }
          : null,
      };
    })
  );

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="rise rise-1">
        <div className="smallcaps text-xs text-rose mb-4">{t("basics.kicker")}</div>
        <h1 className="font-display text-5xl sm:text-6xl tracking-tightish">
          {t("basics.title")}
        </h1>
        <p className="lede mt-6 text-lg text-plum/80 max-w-2xl">{t("basics.lede")}</p>
      </div>

      <hr className="rule my-12" />

      <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-10 rise rise-2">
        {sections.map((section) => (
          <li key={section.slug}>
            <Link
              href={section.href}
              className="group block border rule hover:border-rose transition-colors h-full overflow-hidden"
            >
              <div className="aspect-[3/2] bg-rose-soft/30 relative overflow-hidden">
                {section.hero ? (
                  <Image
                    src={section.hero.src}
                    alt={section.hero.alt}
                    fill
                    className="object-cover group-hover:scale-[1.04] transition-transform duration-700"
                    sizes="(max-width: 640px) 100vw, 50vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <MeiMark
                      size={64}
                      variant="outline"
                      className="text-rose/30 group-hover:text-rose/60 transition-colors"
                    />
                  </div>
                )}
              </div>

              <div className="p-6">
                <div className="flex items-baseline justify-between gap-4 mb-2">
                  <h2 className="font-display text-2xl tracking-tightish group-hover:text-rose transition-colors">
                    {t(`basics.sections.${section.titleKey}`)}
                  </h2>
                  {section.count > 0 && (
                    <span className="smallcaps text-[10px] text-plum/40 shrink-0">
                      {section.count} {t("basics.itemsLabel")}
                    </span>
                  )}
                </div>
                <p className="text-sm text-plum/70 leading-snug">
                  {t(`basics.sectionsLede.${section.titleKey}`)}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import {
  getCategoryBySlug,
  getCategories,
  getPosts,
  localisedCategoryName,
  localisedTitle,
} from "@/lib/wp";
import { decodeEntities } from "@/lib/render";
import { isLocale, Locale } from "@/lib/i18n-config";

export const revalidate = 600;

export async function generateStaticParams() {
  try {
    const cats = await getCategories();
    return cats.map((c) => ({ slug: c.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string; locale: string };
}): Promise<Metadata> {
  if (!isLocale(params.locale)) return {};
  const cat = await getCategoryBySlug(params.slug);
  if (!cat) return { title: "Not found" };
  const name = decodeEntities(localisedCategoryName(cat, params.locale as Locale));
  return { title: name, description: cat.description || name };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: { slug: string; locale: string };
  searchParams: { page?: string };
}) {
  if (!isLocale(params.locale)) notFound();
  unstable_setRequestLocale(params.locale);
  const locale = params.locale as Locale;
  const t = await getTranslations();
  const localePrefix = locale === "en" ? "" : `/${locale}`;
  const link = (path: string) => `${localePrefix}${path}` || "/";

  const cat = await getCategoryBySlug(params.slug);
  if (!cat) notFound();

  const page = Math.max(1, Number(searchParams.page ?? "1"));
  const { posts, totalPages, total } = await getPosts({
    perPage: 24,
    page,
    categorySlug: params.slug,
  });

  const name = decodeEntities(localisedCategoryName(cat, locale));

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="rise rise-1">
        <Link
          href={link("/categories")}
          className="smallcaps text-xs text-rose hover:underline"
        >
          ← {t("categories.back")}
        </Link>
        <h1 className="font-display text-6xl italic mt-4 tracking-tightish">{name}</h1>
        {cat.description && (
          <p className="lede mt-6 text-lg text-plum/80 max-w-2xl">{cat.description}</p>
        )}
        <p className="text-plum/60 mt-4 smallcaps text-xs">
          {t("recipes.indexCount", { total, page, totalPages })}
        </p>
      </div>

      <hr className="rule my-10" />

      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12 rise rise-2">
        {posts.map((p) => {
          const featured = p._embedded?.["wp:featuredmedia"]?.[0];
          const title = decodeEntities(localisedTitle(p, locale));
          return (
            <li key={p.id}>
              <Link href={link(`/r/${p.slug}`)} className="group block">
                <div className="aspect-[4/3] mb-3 overflow-hidden bg-rule/30">
                  {featured?.source_url ? (
                    <Image
                      src={featured.source_url}
                      alt={featured.alt_text || title}
                      width={featured.media_details?.width ?? 800}
                      height={featured.media_details?.height ?? 600}
                      className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  ) : (
                    <div className="w-full h-full bg-cream" />
                  )}
                </div>
                <h2 className="font-display text-xl tracking-tightish leading-tight group-hover:text-rose transition-colors">
                  {title}
                </h2>
              </Link>
            </li>
          );
        })}
      </ul>

      {totalPages > 1 && (
        <nav className="mt-16 flex items-center justify-between smallcaps text-xs">
          {page > 1 ? (
            <Link
              href={link(`/category/${params.slug}?page=${page - 1}`)}
              className="text-rose hover:underline"
            >
              ← {t("recipes.newer")}
            </Link>
          ) : <span />}
          <span className="text-plum/50">{t("recipes.page", { page, totalPages })}</span>
          {page < totalPages ? (
            <Link
              href={link(`/category/${params.slug}?page=${page + 1}`)}
              className="text-rose hover:underline"
            >
              {t("recipes.older")} →
            </Link>
          ) : <span />}
        </nav>
      )}
    </div>
  );
}

import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { isLocale, Locale } from "@/lib/i18n-config";
import { searchRecipes } from "@/lib/search";
import { getCategories, localisedCategoryName } from "@/lib/wp";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { decodeEntities } from "@/lib/render";

export const revalidate = 0; // dynamic — search is per-request

export async function generateMetadata({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) return {};
  const t = await getTranslations({ locale: params.locale, namespace: "search" });
  return { title: t("title") };
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { q?: string; category?: string; family?: string };
}) {
  if (!isLocale(params.locale)) notFound();
  unstable_setRequestLocale(params.locale);
  const locale = params.locale as Locale;
  const t = await getTranslations();
  const localePrefix = locale === "en" ? "" : `/${locale}`;
  const link = (path: string) => `${localePrefix}${path}` || "/";

  const q = searchParams.q?.trim() ?? "";
  const categorySlug = searchParams.category;
  const familyOnly = searchParams.family === "1";

  // Pull categories for the filter dropdown
  let categories: Awaited<ReturnType<typeof getCategories>> = [];
  try { categories = await getCategories(); } catch { /* graceful empty */ }

  const { results, total } = q
    ? await searchRecipes({
        query: q,
        locale,
        categorySlug,
        familyOnly,
        perPage: 30,
      })
    : { results: [], total: 0 };

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="rise rise-1">
        <div className="smallcaps text-xs text-rose mb-4">{t("search.title")}</div>
        <h1 className="font-display text-5xl tracking-tightish">{t("search.title")}</h1>
      </div>

      <form method="get" className="mt-10 rise rise-2 space-y-4">
        <div className="flex gap-3 items-stretch">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder={t("search.placeholder")}
            className="flex-1 border rule px-4 py-3 bg-paper text-plum text-lg focus:outline-none focus:border-rose"
            autoFocus
          />
          <button
            type="submit"
            className="bg-rose text-paper px-6 py-3 smallcaps text-xs font-semibold hover:bg-rose-deep transition-colors"
          >
            {t("search.title")}
          </button>
        </div>
        <div className="flex flex-wrap gap-4 smallcaps text-xs items-center">
          <span className="text-plum/50">{t("search.filters")}</span>
          <select name="category" defaultValue={categorySlug ?? ""} className="border rule px-3 py-1.5 bg-paper">
            <option value="">{t("search.anyCategory")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {decodeEntities(localisedCategoryName(c, locale))}
              </option>
            ))}
          </select>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="family" value="1" defaultChecked={familyOnly} className="accent-rose" />
            {t("recipes.showFamilyOnly")}
          </label>
        </div>
      </form>

      <hr className="rule my-10" />

      {!q ? (
        <p className="text-plum/60 italic">{t("search.noQuery")}</p>
      ) : results.length === 0 ? (
        <p className="text-plum/60 italic">{t("search.noResults", { query: q })}</p>
      ) : (
        <>
          <p className="smallcaps text-xs text-plum/60 mb-6">
            {t("search.resultsFor", { query: q })} · {total}
          </p>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12 rise rise-3">
            {results.map((r) => (
              <li key={r.id}>
                <Link href={link(`/r/${r.slug}`)} className="group block">
                  <div className="aspect-[4/3] mb-3 overflow-hidden bg-rule/30">
                    {r.imageUrl ? (
                      <Image
                        src={r.imageUrl}
                        alt={r.title}
                        width={800}
                        height={600}
                        className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full bg-cream" />
                    )}
                  </div>
                  <h2 className="font-display text-xl tracking-tightish leading-tight group-hover:text-rose transition-colors">
                    {r.title}
                  </h2>
                  {r.excerpt && (
                    <p className="text-plum/70 mt-2 text-sm leading-relaxed line-clamp-2">{r.excerpt}</p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

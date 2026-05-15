import Link from "next/link";
import Image from "next/image";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import {
  getPosts,
  getCategories,
  getTags,
  localisedTitle,
  localisedCategoryName,
} from "@/lib/wp";
import { decodeEntities } from "@/lib/render";
import { isLocale, Locale } from "@/lib/i18n-config";
import { notFound } from "next/navigation";

export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}) {
  if (!isLocale(params.locale)) return {};
  const t = await getTranslations({ locale: params.locale, namespace: "recipes" });
  return { title: t("title") };
}

export default async function RecipesPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { page?: string; q?: string; cat?: string; tag?: string; order?: string };
}) {
  if (!isLocale(params.locale)) notFound();
  unstable_setRequestLocale(params.locale);
  const locale = params.locale as Locale;
  const t = await getTranslations();
  const localePrefix = locale === "en" ? "" : `/${locale}`;
  const link = (path: string) => `${localePrefix}${path}` || "/";

  const page = Math.max(1, Number(searchParams.page ?? "1"));
  const q = searchParams.q?.trim() || undefined;
  const cat = searchParams.cat?.trim() || undefined;
  const tag = searchParams.tag?.trim() || undefined;
  const order = (searchParams.order === "asc" ? "asc" : "desc") as "asc" | "desc";

  // Fetch in parallel
  const [allCategories, allTags, postsResult] = await Promise.all([
    getCategories().catch(() => []),
    getTags().catch(() => []),
    getPosts({
      perPage: 24,
      page,
      search: q,
      categorySlug: cat,
      tagSlug: tag,
      order,
    }).catch((e) => {
      console.error("Failed to fetch posts:", e);
      return { posts: [], totalPages: 1, total: 0 };
    }),
  ]);

  const { posts, totalPages, total } = postsResult;

  // Keep the category list manageable — show top-30 by post count, alphabetised.
  const topCategories = [...allCategories]
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
    .slice(0, 30)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Tags can be numerous — show top-30 by post count.
  const topTags = allTags.slice(0, 30);

  // Build a base href for pagination links (preserves filters)
  const buildHref = (overrides: Record<string, string | undefined> = {}) => {
    const sp = new URLSearchParams();
    const merged = { page: undefined, q, cat, tag, order, ...overrides } as Record<string, string | undefined>;
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== "desc") sp.set(k, v);
    }
    const qs = sp.toString();
    return link(`/recipes${qs ? `?${qs}` : ""}`);
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="rise rise-1">
        <div className="smallcaps text-xs text-rose mb-4">{t("nav.recipes")}</div>
        <h1 className="font-display text-5xl sm:text-6xl tracking-tightish">
          {t("recipes.title")} <span className="italic">{t("recipes.subtitle")}</span>
        </h1>
        <p className="text-plum/60 mt-4 smallcaps text-xs">
          {t("recipes.indexCount", { total, page, totalPages })}
        </p>
      </div>

      <hr className="rule my-10" />

      {/* Filters — plain GET form. No client JS, works with back/forward, friendly to bookmarks. */}
      <form
        method="get"
        action={link("/recipes")}
        className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-10 rise rise-2"
      >
        <label className="flex flex-col gap-1.5">
          <span className="smallcaps text-[10px] text-plum/60">
            {t("recipes.filterSearch")}
          </span>
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder={t("recipes.filterSearchPlaceholder")}
            className="border rule bg-paper px-3 py-2 text-sm focus:outline-none focus:border-rose"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="smallcaps text-[10px] text-plum/60">
            {t("recipes.filterCategory")}
          </span>
          <select
            name="cat"
            defaultValue={cat ?? ""}
            className="border rule bg-paper px-3 py-2 text-sm focus:outline-none focus:border-rose"
          >
            <option value="">{t("recipes.filterAll")}</option>
            {topCategories.map((c) => (
              <option key={c.id} value={c.slug}>
                {decodeEntities(localisedCategoryName(c, locale))}
                {c.count ? ` (${c.count})` : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="smallcaps text-[10px] text-plum/60">
            {t("recipes.filterTag")}
          </span>
          <select
            name="tag"
            defaultValue={tag ?? ""}
            className="border rule bg-paper px-3 py-2 text-sm focus:outline-none focus:border-rose"
          >
            <option value="">{t("recipes.filterAll")}</option>
            {topTags.map((tg) => (
              <option key={tg.id} value={tg.slug}>
                {decodeEntities(tg.name)}
                {tg.count ? ` (${tg.count})` : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="smallcaps text-[10px] text-plum/60">
            {t("recipes.filterOrder")}
          </span>
          <select
            name="order"
            defaultValue={order}
            className="border rule bg-paper px-3 py-2 text-sm focus:outline-none focus:border-rose"
          >
            <option value="desc">{t("recipes.orderNewest")}</option>
            <option value="asc">{t("recipes.orderOldest")}</option>
          </select>
        </label>

        <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-4">
          <button
            type="submit"
            className="smallcaps text-xs bg-rose text-paper px-5 py-2.5 hover:bg-rose-deep transition-colors"
          >
            {t("recipes.filterApply")}
          </button>
          {(q || cat || tag || order === "asc") && (
            <Link href={link("/recipes")} className="smallcaps text-xs text-plum/60 hover:text-rose">
              {t("recipes.filterClear")}
            </Link>
          )}
        </div>
      </form>

      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12 rise rise-3">
        {posts.map((p) => {
          const featured = p._embedded?.["wp:featuredmedia"]?.[0];
          const title = decodeEntities(localisedTitle(p, locale));
          const firstCat = p._embedded?.["wp:term"]?.[0]?.[0];
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
                {firstCat && (
                  <div className="smallcaps text-[10px] text-rose mb-1">
                    {decodeEntities(firstCat.name)}
                  </div>
                )}
                <h2 className="font-display text-xl tracking-tightish leading-tight group-hover:text-rose transition-colors">
                  {title}
                </h2>
              </Link>
            </li>
          );
        })}
      </ul>

      {posts.length === 0 && (
        <p className="text-plum/60 italic">{t("recipes.noResults")}</p>
      )}

      {totalPages > 1 && (
        <nav className="mt-16 flex items-center justify-between smallcaps text-xs">
          {page > 1 ? (
            <Link
              href={buildHref({ page: String(page - 1) })}
              className="text-rose hover:underline"
            >
              ← {t("recipes.newer")}
            </Link>
          ) : <span />}
          <span className="text-plum/50">{t("recipes.page", { page, totalPages })}</span>
          {page < totalPages ? (
            <Link
              href={buildHref({ page: String(page + 1) })}
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

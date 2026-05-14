import Link from "next/link";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { getCategoryTree, localisedCategoryName } from "@/lib/wp";
import { CategoryWithChildren } from "@/lib/wp-types";
import { decodeEntities } from "@/lib/render";
import { isLocale, Locale } from "@/lib/i18n-config";
import { notFound } from "next/navigation";

export const revalidate = 600;

export async function generateMetadata({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) return {};
  const t = await getTranslations({ locale: params.locale, namespace: "categories" });
  return { title: t("title") };
}

export default async function CategoriesPage({
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

  let tree: Awaited<ReturnType<typeof getCategoryTree>> = [];
  try {
    tree = await getCategoryTree();
  } catch (e) {
    console.error("Failed to fetch categories:", e);
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="rise rise-1">
        <div className="smallcaps text-xs text-rose mb-4">{t("nav.categories")}</div>
        <h1 className="font-display text-5xl tracking-tightish">{t("categories.title")}</h1>
        <p className="text-plum/60 mt-4">{t("categories.lede")}</p>
      </div>

      <hr className="rule my-12" />

      <ul className="space-y-10 rise rise-2">
        {tree.map((c) => (
          <li key={c.id}>
            <CategoryNode node={c} depth={0} link={link} locale={locale} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function CategoryNode({
  node,
  depth,
  link,
  locale,
}: {
  node: CategoryWithChildren;
  depth: number;
  link: (p: string) => string;
  locale: Locale;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-3">
        <Link
          href={link(`/category/${node.slug}`)}
          className="group inline-flex items-baseline gap-3"
        >
          <span
            className={
              depth === 0
                ? "font-display text-3xl italic group-hover:text-rose transition-colors"
                : "font-display text-xl group-hover:text-rose transition-colors"
            }
          >
            {decodeEntities(localisedCategoryName(node, locale))}
          </span>
          <span className="smallcaps text-[10px] text-plum/40">{node.count}</span>
        </Link>
      </div>
      {node.children.length > 0 && (
        <ul className="mt-3 pl-6 border-l rule space-y-2">
          {node.children.map((child) => (
            <li key={child.id}>
              <CategoryNode node={child} depth={depth + 1} link={link} locale={locale} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import {
  extractRecipeIdsFromPost,
  getAllPostSlugs,
  getBasicConcept,
  getPostBySlug,
  getRecipeById,
  isFromTheBook,
  isSignature,
  localisedContent,
  localisedTitle,
  postCookWithChildren,
  postUsesBasics,
  postVideoUrl,
} from "@/lib/wp";
import { decodeEntities, renderPostContent, stripHtml } from "@/lib/render";
import { RecipeCard } from "@/components/RecipeCard";
import { VideoEmbed } from "@/components/VideoEmbed";
import { isLocale, Locale } from "@/lib/i18n-config";

export const revalidate = 600;

export async function generateStaticParams() {
  try {
    const slugs = await getAllPostSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string; locale: string };
}): Promise<Metadata> {
  if (!isLocale(params.locale)) return { title: "Not found" };
  const post = await getPostBySlug(params.slug);
  if (!post) return { title: "Not found" };
  const title = decodeEntities(localisedTitle(post, params.locale)).replace(/<[^>]+>/g, "");
  const description = stripHtml(post.excerpt.rendered).slice(0, 160);
  const og = post._embedded?.["wp:featuredmedia"]?.[0]?.source_url;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: og ? [og] : undefined,
      type: "article",
      publishedTime: post.date_gmt,
      modifiedTime: post.modified,
      authors: ["Pamela Lim"],
    },
  };
}

export default async function PostPage({
  params,
}: {
  params: { slug: string; locale: string };
}) {
  if (!isLocale(params.locale)) notFound();
  unstable_setRequestLocale(params.locale);
  const locale = params.locale as Locale;
  const t = await getTranslations();
  const localePrefix = locale === "en" ? "" : `/${locale}`;
  const link = (path: string) => `${localePrefix}${path}` || "/";

  const post = await getPostBySlug(params.slug);
  if (!post) notFound();

  const recipeIds = extractRecipeIdsFromPost(post);
  const recipes = (await Promise.all(recipeIds.map((id) => getRecipeById(id)))).filter(
    (r): r is NonNullable<typeof r> => r !== null
  );

  const featured = post._embedded?.["wp:featuredmedia"]?.[0];
  const cats = (post._embedded?.["wp:term"]?.[0] ?? []) as Array<{
    id: number;
    slug: string;
    name: string;
  }>;
  const title = decodeEntities(localisedTitle(post, locale)).replace(/<[^>]+>/g, "");
  const author = post._embedded?.author?.[0]?.name;

  const fromBook = isFromTheBook(post);
  const signature = isSignature(post);
  const family = postCookWithChildren(post);
  const video = postVideoUrl(post);

  // Resolve basics callout: for each reference, fetch enough to render a chip.
  const basicRefs = postUsesBasics(post);
  const usedBasics = (
    await Promise.all(
      basicRefs.map(async (ref) => {
        const concept = await getBasicConcept(ref.conceptSlug, locale);
        if (!concept) return null;
        const variant = ref.variantSlug
          ? concept.variants?.find((v) => v.variant === ref.variantSlug)
          : undefined;
        return {
          conceptSlug: ref.conceptSlug,
          variantSlug: ref.variantSlug,
          label: variant?.title ?? concept.title.replace(/\s*\(.+\)\s*$/, ""),
          href: variant
            ? `/basics/${ref.conceptSlug}/${ref.variantSlug}`
            : `/basics/${ref.conceptSlug}`,
        };
      })
    )
  ).filter((b): b is NonNullable<typeof b> => b !== null);

  return (
    <article className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <nav className="smallcaps text-xs text-plum/50 mb-8 rise rise-1 flex flex-wrap gap-x-2 items-center">
        <Link href={link("/")} className="hover:text-rose">{t("site.name")}</Link>
        {cats[0] && (
          <>
            <span>·</span>
            <Link href={link(`/category/${cats[0].slug}`)} className="hover:text-rose">
              {decodeEntities(cats[0].name)}
            </Link>
          </>
        )}
      </nav>

      <header className="rise rise-2 mb-10">
        <div className="flex flex-wrap gap-2 mb-4">
          {signature && (
            <span className="smallcaps text-xs bg-rose text-paper px-3 py-1">{t("signature.kicker")}</span>
          )}
          {fromBook && (
            <span className="smallcaps text-xs bg-rose-soft/40 text-rose-deep px-3 py-1">{t("post.fromTheBook")}</span>
          )}
          {family && (
            <span className="smallcaps text-xs bg-rose-soft/40 text-rose-deep px-3 py-1">{t("post.cookWithChildren")}</span>
          )}
        </div>
        <h1 className="font-display text-[clamp(2.2rem,5.5vw,4.5rem)] leading-[1] tracking-tightish">
          {title}
        </h1>
        <div className="smallcaps text-xs text-plum/50 mt-6 flex flex-wrap gap-x-6 gap-y-2">
          <time dateTime={post.date_gmt}>
            {new Date(post.date_gmt).toLocaleDateString("en-AU", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
          {author && <span>{author}</span>}
        </div>
      </header>

      {/* Basics this recipe uses — surfaced prominently at the top */}
      {usedBasics.length > 0 && (
        <aside className="rise rise-3 mb-10 border rule bg-rose-soft/15 px-5 py-4">
          <div className="smallcaps text-[11px] text-rose-deep mb-2">{t("basics.usesHeading")}</div>
          <ul className="flex flex-wrap gap-2">
            {usedBasics.map((b, i) => (
              <li key={`${b.conceptSlug}-${b.variantSlug ?? ""}-${i}`}>
                <Link
                  href={link(b.href)}
                  className="smallcaps text-xs px-3 py-1.5 bg-paper border rule text-rose hover:bg-rose hover:text-paper transition-colors inline-block"
                >
                  {b.label}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      )}

      {/* Video takes the lead position when present; falls back to image */}
      {video ? (
        <div className="rise rise-3 mb-10">
          <VideoEmbed url={video} title={title} />
          {featured?.source_url && (
            <p className="smallcaps text-[10px] text-plum/40 mt-2 text-right">
              <Link href={link(`/r/${params.slug}#image`)} className="hover:text-rose">
                Photo also available
              </Link>
            </p>
          )}
        </div>
      ) : featured?.source_url ? (
        <div id="image" className="rise rise-3 mb-10">
          <Image
            src={featured.source_url}
            alt={featured.alt_text || title}
            width={featured.media_details?.width ?? 1600}
            height={featured.media_details?.height ?? 1000}
            className="w-full h-auto"
            sizes="(max-width: 768px) 100vw, 768px"
            priority
          />
        </div>
      ) : null}

      <div className="post-prose rise rise-3">
        {renderPostContent(localisedContent(post, locale), localePrefix)}
      </div>

      {recipes.length > 0 && (
        <div className="rise rise-4">
          {recipes.map((r) => (
            <RecipeCard key={r.id} recipe={r} />
          ))}
        </div>
      )}

      {cats.length > 0 && (
        <div className="mt-12 pt-8 border-t rule flex flex-wrap gap-2">
          {cats.map((c) => (
            <Link
              key={c.id}
              href={link(`/category/${c.slug}`)}
              className="smallcaps text-xs px-3 py-1 border rule text-plum/60 hover:text-rose hover:border-rose transition-colors"
            >
              {decodeEntities(c.name)}
            </Link>
          ))}
        </div>
      )}
    </article>
  );
}

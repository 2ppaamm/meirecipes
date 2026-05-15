import Link from "next/link";
import Image from "next/image";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { getSignaturePosts, localisedTitle, localisedExcerpt } from "@/lib/wp";
import { decodeEntities, stripHtml } from "@/lib/render";
import { isLocale, Locale } from "@/lib/i18n-config";
import { notFound } from "next/navigation";

export const revalidate = 600;

export async function generateMetadata({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) return {};
  const t = await getTranslations({ locale: params.locale, namespace: "signature" });
  return { title: t("title"), description: t("lede") };
}

export default async function SignaturePage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  unstable_setRequestLocale(params.locale);
  const locale = params.locale as Locale;
  const t = await getTranslations();
  const localePrefix = locale === "en" ? "" : `/${locale}`;
  const link = (path: string) => `${localePrefix}${path}` || "/";

  let posts: Awaited<ReturnType<typeof getSignaturePosts>> = [];
  try { posts = await getSignaturePosts(); } catch (e) { console.error(e); }

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="rise rise-1">
        <div className="smallcaps text-xs text-rose mb-4">{t("signature.kicker")}</div>
        <h1 className="font-display text-5xl sm:text-6xl tracking-tightish">{t("signature.title")}</h1>
        <p className="lede mt-6 text-lg text-plum/80 max-w-2xl">{t("signature.lede")}</p>
      </div>

      <hr className="rule my-12" />

      <ul className="space-y-20 rise rise-2">
        {posts.map((p, i) => {
          const featured = p._embedded?.["wp:featuredmedia"]?.[0];
          const title = decodeEntities(localisedTitle(p, locale));
          const excerpt = stripHtml(localisedExcerpt(p, locale));
          const flip = i % 2 === 1;
          return (
            <li key={p.id} className="grid grid-cols-12 gap-8 items-center">
              <div className={`col-span-12 md:col-span-7 ${flip ? "md:order-2" : ""}`}>
                <Link href={link(`/r/${p.slug}`)} className="group block">
                  <div className="aspect-[4/3] overflow-hidden bg-rule/30">
                    {featured?.source_url ? (
                      <Image
                        src={featured.source_url}
                        alt={featured.alt_text || title}
                        width={featured.media_details?.width ?? 1200}
                        height={featured.media_details?.height ?? 900}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                        sizes="(max-width: 768px) 100vw, 60vw"
                      />
                    ) : (
                      <div className="w-full h-full bg-rose-soft/30" />
                    )}
                  </div>
                </Link>
              </div>
              <div className={`col-span-12 md:col-span-5 ${flip ? "md:order-1" : ""}`}>
                <div className="smallcaps text-xs text-rose mb-2">
                  № {String(i + 1).padStart(2, "0")} · {t("signature.kicker")}
                </div>
                <h2 className="font-display text-3xl sm:text-4xl tracking-tightish mb-4">
                  <Link href={link(`/r/${p.slug}`)} className="hover:text-rose transition-colors">
                    {title}
                  </Link>
                </h2>
                {excerpt && (
                  <p className="text-plum/80 leading-relaxed max-w-prose">{excerpt}</p>
                )}
                <Link
                  href={link(`/r/${p.slug}`)}
                  className="inline-flex items-center gap-2 mt-6 smallcaps text-xs border-b border-rose pb-1 text-rose hover:gap-3 transition-all"
                >
                  {t("nav.recipes")} →
                </Link>
              </div>
            </li>
          );
        })}
      </ul>

      {posts.length === 0 && (
        <div className="py-20 text-center">
          <p className="text-plum/60 italic">
            Tag posts with the "Signature" category in WordPress to surface them here.
          </p>
        </div>
      )}
    </div>
  );
}

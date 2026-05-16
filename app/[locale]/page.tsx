import Link from "next/link";
import Image from "next/image";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import {
  getPosts,
  getSignaturePosts,
  localisedTitle,
  localisedExcerpt,
  isFromTheBook,
  postCookWithChildren,
} from "@/lib/wp";
import { decodeEntities, stripHtml } from "@/lib/render";
import { isLocale, Locale } from "@/lib/i18n-config";
import { BOOK } from "@/lib/book";
import { FamilyModeToggle } from "@/components/FamilyModeToggle";
import { YouTubeLite } from "@/components/YouTubeLite";
import { notFound } from "next/navigation";

export const revalidate = 600;
// Photos hosted on the WordPress media library, served via blog.meirecipes.com.
const FAMILY_KITCHEN_URL =
  "https://blog.meirecipes.com/wp-content/uploads/2026/05/20200926_211658-scaled.jpg";
const MOM_URL =
  "https://blog.meirecipes.com/wp-content/uploads/2026/05/mom.jpg";

export default async function Home({ params: { locale } }: { params: { locale: string } }) {
  if (!isLocale(locale)) notFound();
  unstable_setRequestLocale(locale);
  const t = await getTranslations();
  const localePrefix = locale === "en" ? "" : `/${locale}`;
  const link = (path: string) => `${localePrefix}${path}` || "/";

  let posts: Awaited<ReturnType<typeof getPosts>>["posts"] = [];
  let total = 0;
  let signature: Awaited<ReturnType<typeof getSignaturePosts>> = [];

  try {
    const result = await getPosts({ perPage: 6 });
    posts = result.posts;
    total = result.total;
  } catch (e) {
    console.error("Failed to fetch posts:", e);
  }
  try {
    signature = await getSignaturePosts();
  } catch (e) {
    console.error("Failed to fetch signature posts:", e);
  }

  return (
    <div className="mx-auto max-w-6xl px-6">
      {/* Hero */}
      <section className="pt-16 sm:pt-24 pb-16 grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-8 rise rise-1">
          <div className="smallcaps text-xs text-rose mb-6">
            {t("home.kicker")} · {total.toLocaleString()} {t("home.kickerSuffix")}
          </div>
          <h1 className="font-display text-[clamp(2.6rem,7vw,5.5rem)] leading-[0.98] tracking-tightish">
            {t("home.heroLine1")}<br />
            <span className="italic text-rose">{t("home.heroLine2")}</span><br />
            {t("home.heroLine3")}
          </h1>
        </div>
        <aside className="col-span-12 md:col-span-4 md:pt-6 rise rise-2">
          <p className="lede text-plum/80 leading-relaxed">{t("home.lede")}</p>
          <Link
            href={link("/recipes")}
            className="inline-flex items-center gap-2 mt-6 smallcaps text-xs border-b border-rose pb-1 text-rose hover:gap-3 transition-all"
          >
            {t("home.browseAll")} →
          </Link>
        </aside>
      </section>

      <hr className="rule" />

      {/* Signature strip */}
      {signature.length > 0 && (
        <section className="py-14 rise rise-3">
          <div className="flex items-baseline justify-between mb-8">
            <div>
              <div className="smallcaps text-xs text-rose mb-2">{t("home.signatureHeading")}</div>
              <p className="text-plum/70 max-w-2xl">{t("home.signatureLede")}</p>
            </div>
            <Link href={link("/signature")} className="smallcaps text-xs text-rose hover:underline shrink-0">
              {t("home.viewAll")} →
            </Link>
          </div>

          <div className="grid grid-cols-12 gap-6">
            {signature.slice(0, 4).map((p) => {
              const featured = p._embedded?.["wp:featuredmedia"]?.[0];
              const title = decodeEntities(localisedTitle(p, locale as Locale));
              return (
                <article key={p.id} className="col-span-12 sm:col-span-6 lg:col-span-3">
                  <Link href={link(`/r/${p.slug}`)} className="group block">
                    <div className="aspect-[4/5] overflow-hidden bg-rule/30 mb-3 relative">
                      {featured?.source_url ? (
                        <Image
                          src={featured.source_url}
                          alt={featured.alt_text || title}
                          width={featured.media_details?.width ?? 600}
                          height={featured.media_details?.height ?? 800}
                          className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700"
                          sizes="(max-width: 768px) 100vw, 25vw"
                        />
                      ) : (
                        <div className="w-full h-full bg-rose-soft/40" />
                      )}
                      <div className="absolute top-3 left-3 bg-rose text-paper smallcaps text-[10px] px-2 py-1">
                        Signature
                      </div>
                    </div>
                    <h3 className="font-display text-xl tracking-tightish leading-tight group-hover:text-rose transition-colors">
                      {title}
                    </h3>
                  </Link>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <hr className="rule" />

      {/* Watch — three video shorts and clips */}
      <section className="py-14 rise rise-3">
        <div className="flex items-baseline justify-between mb-8">
          <div>
            <div className="smallcaps text-xs text-rose mb-2">{t("home.watchHeading")}</div>
            <p className="text-plum/70 max-w-2xl">{t("home.watchLede")}</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-6">
          <YouTubeLite
            url="https://youtube.com/shorts/sgRahfRKjyw"
            title={t("home.watchVideo1")}
            forceAspect="portrait"
          />
          <YouTubeLite
            url="https://youtu.be/qEfXirHW1J0"
            title={t("home.watchVideo2")}
            forceAspect="portrait"
          />
          <YouTubeLite
            url="https://youtu.be/czHuMvloqis"
            title={t("home.watchVideo3")}
            forceAspect="portrait"
          />
        </div>
      </section>

      <hr className="rule" />

      {/* Basics strip — simple chips linking to the basics index sections */}
      <section className="py-12 rise rise-3">
        <div className="flex items-baseline justify-between mb-6">
          <div>
            <div className="smallcaps text-xs text-rose mb-2">{t("home.basicsHeading")}</div>
            <p className="text-plum/70 max-w-2xl">{t("home.basicsLede")}</p>
          </div>
          <Link href={link("/basics")} className="smallcaps text-xs text-rose hover:underline shrink-0">
            {t("home.viewAll")} →
          </Link>
        </div>
        <ul className="flex flex-wrap gap-2">
          {[
            { href: "/category/breads", labelKey: "breads" },
            { href: "/category/cake", labelKey: "cakes" },
            { href: "/category/filings", labelKey: "fillings" },
            { href: "/category/noodles", labelKey: "noodlesAndPastas" },
            { href: "/category/pastry", labelKey: "pastry" },
            { href: "/r/stir-fry-anything-in-six-steps", labelKey: "stirFrySixSteps" },
          ].map((item) => (
            <li key={item.href}>
              <Link
                href={link(item.href)}
                className="smallcaps text-xs px-3 py-2 border rule text-plum/80 hover:text-rose hover:border-rose transition-colors"
              >
                {t(`basics.sections.${item.labelKey}`)}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <hr className="rule" />

      {/* Latest entries — asymmetric */}
      <section className="py-16">
        <div className="flex items-baseline justify-between mb-10 rise rise-3">
          <h2 className="font-display text-3xl tracking-tightish">{t("home.latestHeading")}</h2>
          <Link href={link("/recipes")} className="smallcaps text-xs text-rose hover:underline">
            {t("home.viewAll")}
          </Link>
        </div>

        <div className="grid grid-cols-12 gap-x-8 gap-y-14 rise rise-4">
          {posts.map((p, i) => {
            const layouts = [
              "col-span-12 md:col-span-7",
              "col-span-12 md:col-span-5 md:pt-12",
              "col-span-12 md:col-span-5",
              "col-span-12 md:col-span-7 md:pt-8",
              "col-span-12 md:col-span-6",
              "col-span-12 md:col-span-6 md:pt-10",
            ];
            const featured = p._embedded?.["wp:featuredmedia"]?.[0];
            const title = decodeEntities(localisedTitle(p, locale as Locale));
            const excerpt = stripHtml(localisedExcerpt(p, locale as Locale));
            const catRaw = p._embedded?.["wp:term"]?.[0]?.[0];
            const catName = catRaw ? decodeEntities(catRaw.name) : null;
            const fromBook = isFromTheBook(p);
            const family = postCookWithChildren(p);

            return (
              <article key={p.id} className={layouts[i % layouts.length]}>
                <Link href={link(`/r/${p.slug}`)} className="group block">
                  {featured?.source_url && (
                    <div className="mb-4 overflow-hidden bg-rule/30">
                      <Image
                        src={featured.source_url}
                        alt={featured.alt_text || title}
                        width={featured.media_details?.width ?? 1200}
                        height={featured.media_details?.height ?? 800}
                        className="w-full h-auto group-hover:scale-[1.02] transition-transform duration-700"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    </div>
                  )}
                  <div className="flex items-baseline gap-3 mb-3 flex-wrap">
                    <span className="num-marker text-rose text-xl">
                      № {String(i + 1).padStart(2, "0")}
                    </span>
                    {catName && (
                      <span className="smallcaps text-xs text-plum/50">{catName}</span>
                    )}
                    {fromBook && (
                      <span className="smallcaps text-[10px] text-rose-deep bg-rose-soft/40 px-2 py-0.5">
                        {t("post.fromTheBook")}
                      </span>
                    )}
                    {family && (
                      <span className="smallcaps text-[10px] text-rose-deep bg-rose-soft/40 px-2 py-0.5">
                        {t("post.cookWithChildren")}
                      </span>
                    )}
                  </div>
                  <h3 className="font-display text-3xl sm:text-4xl leading-[1.05] tracking-tightish group-hover:text-rose transition-colors">
                    {title}
                  </h3>
                  {excerpt && (
                    <p className="text-plum/70 mt-4 leading-relaxed max-w-prose line-clamp-3">
                      {excerpt}
                    </p>
                  )}
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      <hr className="rule" />

      {/* Family kitchen strip */}
      <section className="py-20 rise rise-4">
        <div className="grid grid-cols-12 gap-8 items-center">
          <div className="col-span-12 md:col-span-7">
            <div className="smallcaps text-xs text-rose mb-3">{t("home.familyKitchen.kicker")}</div>
            <h2 className="font-display text-4xl tracking-tightish mb-5">
              {t("home.familyKitchen.title")}
            </h2>
            <p className="text-plum/80 leading-relaxed max-w-prose">{t("home.familyKitchen.body")}</p>
            <div className="mt-6">
              <FamilyModeToggle />
            </div>
          </div>
          <div className="col-span-12 md:col-span-5 flex justify-center">
            <Image
              src={MOM_URL}
              alt={t("home.familyKitchen.kicker")}
              width={1200}
              height={900}
              className="w-full h-auto object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>

      <hr className="rule" />

      {/* Credentials / book strip */}
      <section className="py-20 rise rise-4">
        <div className="grid grid-cols-12 gap-8 items-center">
          <div className="col-span-12 md:col-span-4 flex justify-center">
            <Image
              src={FAMILY_KITCHEN_URL}
              alt={t("home.creds.title")}
              width={1200}
              height={900}
              className="w-full h-auto object-cover"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          </div>
          <div className="col-span-12 md:col-span-8">
            <div className="smallcaps text-xs text-rose mb-3">{t("home.creds.title")}</div>
            <p className="font-display italic text-2xl text-rose-deep mb-6">
              {t("home.creds.lede")}
            </p>
            <h2 className="font-display text-4xl tracking-tightish mb-3">
              <Link href={link("/book")} className="hover:text-rose transition-colors">
                {t("home.creds.bookTitle")}
              </Link>
            </h2>
            <p className="text-rose-deep italic mb-6">
              <a
                href={BOOK.awardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline underline-offset-2"
              >
                {t("home.creds.bookSubtitle")}
              </a>
            </p>
            <ul className="space-y-2 text-plum/80">
              <li className="flex gap-3"><span className="text-rose">·</span><span>{t("home.creds.training")}</span></li>
              <li className="flex gap-3"><span className="text-rose">·</span><span>{t("home.creds.writing")}</span></li>
              <li className="flex gap-3"><span className="text-rose">·</span><span>{t("home.creds.wok")}</span></li>
            </ul>
            <Link
              href={link("/book")}
              className="inline-flex items-center gap-2 mt-6 smallcaps text-xs border-b border-rose pb-1 text-rose hover:gap-3 transition-all"
            >
              {t("nav.book")} →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

import Image from "next/image";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n-config";
import { BOOK } from "@/lib/book";
import { notFound } from "next/navigation";

export const revalidate = 3600;

// Photos hosted on the WordPress media library. The Next image domain whitelist
// in next.config.js already permits meirecipes.com/wp-content/uploads/.
const PORTRAIT_URL =
  "https://www.meirecipes.com/wp-content/uploads/2026/05/half-3-by-2.jpg";
const FAMILY_KITCHEN_URL =
  "https://www.meirecipes.com/wp-content/uploads/2026/05/20200926_211658-scaled.jpg";
const LCB_URL =
  "https://www.meirecipes.com/wp-content/uploads/2026/05/20230329_191216-scaled.jpg";

export async function generateMetadata({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) return {};
  const t = await getTranslations({ locale: params.locale, namespace: "about" });
  return {
    title: t("title"),
    openGraph: {
      type: "profile",
      title: t("title"),
      images: [PORTRAIT_URL],
    },
  };
}

export default async function AboutPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  unstable_setRequestLocale(params.locale);
  const t = await getTranslations();

  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <div className="rise rise-1">
        <div className="smallcaps text-xs text-rose mb-4">{t("about.kicker")}</div>
        <h1 className="font-display text-6xl tracking-tightish">{t("about.title")}</h1>
      </div>

      {/* Portrait — paired with the second-generation chef intro */}
      <figure className="mt-12 rise rise-2">
        <div className="aspect-[3/2] overflow-hidden bg-rule/30">
          <Image
            src={PORTRAIT_URL}
            alt={t("about.portraitAlt")}
            width={1200}
            height={800}
            className="w-full h-full object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
            priority
          />
        </div>
      </figure>

      <div className="post-prose mt-12 rise rise-2">
        <p className="lede">{t("about.intro")}</p>
        <p>{t("about.p1")}</p>
      </div>

      {/* Le Cordon Bleu — paired with the training/credentials paragraph */}
      <figure className="my-12 rise rise-2">
        <div className="aspect-[4/3] overflow-hidden bg-rule/30 max-w-xl mx-auto">
          <Image
            src={LCB_URL}
            alt={t("about.lcbAlt")}
            width={1200}
            height={900}
            className="w-full h-full object-cover"
            sizes="(max-width: 768px) 100vw, 576px"
          />
        </div>
        <figcaption className="mt-3 smallcaps text-[11px] text-plum/50 text-center">
          {t("about.lcbCaption")}
        </figcaption>
      </figure>

      {/* Family kitchen — paired with the "working kitchen notebook" paragraph */}
      <figure className="my-14 rise rise-3">
        <div className="aspect-[4/3] overflow-hidden bg-rule/30">
          <Image
            src={FAMILY_KITCHEN_URL}
            alt={t("about.kitchenAlt")}
            width={1200}
            height={900}
            className="w-full h-full object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
          />
        </div>
        <figcaption className="mt-3 smallcaps text-[11px] text-plum/50 text-center">
          {t("about.kitchenCaption")}
        </figcaption>
      </figure>

      <div className="post-prose rise rise-3">
        <p>{t("about.p2")}</p>
        <p>{t("about.p3")}</p>
        <p>
          {t.rich("about.p4", {
            award: (chunks) => (
              <a
                href={BOOK.awardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-rose hover:text-rose-deep underline underline-offset-2"
              >
                {chunks}
              </a>
            ),
          })}
        </p>
        <p className="font-display italic text-xl text-rose-deep">{t("about.signoff")}</p>
      </div>
    </div>
  );
}

import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { isLocale, Locale } from "@/lib/i18n-config";
import { notFound } from "next/navigation";
import { VideoEmbed } from "@/components/VideoEmbed";
import { MeiMark } from "@/components/MeiMark";

export const revalidate = 3600;

/**
 * The Mei Wok page.
 *
 * To attach the video: set MEI_WOK_VIDEO_URL in Vercel env vars
 * (YouTube watch / shorts / youtu.be, or Vimeo). The page detects the URL and
 * renders the video as the centrepiece. Until then, a "video pending" notice shows.
 */
const VIDEO_URL = process.env.MEI_WOK_VIDEO_URL?.trim() || "";

export async function generateMetadata({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) return {};
  const t = await getTranslations({ locale: params.locale, namespace: "wok" });
  return { title: t("title"), description: t("subtitle") };
}

export default async function WokPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  unstable_setRequestLocale(params.locale);
  const _locale = params.locale as Locale;
  const t = await getTranslations();

  return (
    <article className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
      <header className="rise rise-1 mb-12 text-center">
        <div className="smallcaps text-xs text-rose mb-4">{t("wok.kicker")}</div>
        <h1 className="font-display text-[clamp(2.6rem,6vw,5rem)] leading-[1] tracking-tightish">
          {t("wok.title")}
        </h1>
        <p className="font-display italic text-2xl text-rose-deep mt-4">
          {t("wok.subtitle")}
        </p>
      </header>

      {/* Video — or placeholder */}
      <section className="rise rise-2 mb-16">
        {VIDEO_URL ? (
          <VideoEmbed url={VIDEO_URL} title={t("wok.title")} />
        ) : (
          <div className="aspect-video w-full bg-cream border rule flex flex-col items-center justify-center gap-3 text-plum/50">
            <MeiMark size={80} variant="outline" className="opacity-60" />
            <p className="smallcaps text-xs">{t("wok.videoPending")}</p>
          </div>
        )}
      </section>

      <div className="post-prose rise rise-3 max-w-2xl mx-auto">
        <p className="lede">{t("wok.lede")}</p>
      </div>

      <hr className="rule my-16" />

      <section className="rise rise-4 grid grid-cols-12 gap-8">
        <div className="col-span-12 md:col-span-6">
          <div className="smallcaps text-xs text-rose mb-3">{t("wok.designHeading")}</div>
          <p className="text-plum/80 leading-relaxed">{t("wok.designLede")}</p>
        </div>
        <div className="col-span-12 md:col-span-6">
          <div className="smallcaps text-xs text-rose mb-3">{t("wok.buyHeading")}</div>
          <p className="text-plum/80 leading-relaxed">{t("wok.buyLede")}</p>
        </div>
      </section>
    </article>
  );
}

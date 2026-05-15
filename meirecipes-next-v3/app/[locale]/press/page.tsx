import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { isLocale, Locale } from "@/lib/i18n-config";
import { notFound } from "next/navigation";
import Image from "next/image";
import type { PressItem } from "@/lib/wp-types";
import { PRESS_ITEMS } from "@/lib/press-items";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) return {};
  const t = await getTranslations({ locale: params.locale, namespace: "press" });
  return { title: t("title"), description: t("lede") };
}

export default async function PressPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  unstable_setRequestLocale(params.locale);
  const _locale = params.locale as Locale;
  const t = await getTranslations();

  const items = PRESS_ITEMS.slice().sort((a, b) => (b.date > a.date ? 1 : -1));

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="rise rise-1">
        <div className="smallcaps text-xs text-rose mb-4">{t("press.kicker")}</div>
        <h1 className="font-display text-5xl sm:text-6xl tracking-tightish">{t("press.title")}</h1>
        <p className="lede mt-6 text-lg text-plum/80 max-w-2xl">{t("press.lede")}</p>
      </div>

      <hr className="rule my-12" />

      {items.length === 0 ? (
        <div className="py-12 px-6 border rule bg-cream text-plum/70">
          <p>{t("press.empty")}</p>
        </div>
      ) : (
        <ul className="space-y-10 rise rise-2">
          {items.map((it) => (
            <li key={it.id} className="grid grid-cols-12 gap-6 items-start">
              <div className="col-span-12 sm:col-span-3">
                {it.coverImageUrl ? (
                  <Image
                    src={it.coverImageUrl}
                    alt={it.publication}
                    width={300}
                    height={400}
                    className="w-full h-auto border rule"
                  />
                ) : (
                  <div className="aspect-[3/4] bg-cream border rule flex items-center justify-center smallcaps text-[10px] text-plum/40 px-4 text-center">
                    {it.publication}
                  </div>
                )}
              </div>
              <div className="col-span-12 sm:col-span-9">
                <div className="smallcaps text-[11px] text-rose mb-2">
                  {it.publication} · {formatDate(it.date)}
                </div>
                <h2 className="font-display text-2xl tracking-tightish mb-3">
                  {it.url ? (
                    <a
                      href={it.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-rose transition-colors"
                    >
                      {it.title}
                    </a>
                  ) : (
                    it.title
                  )}
                </h2>
                {it.excerpt && (
                  <p className="text-plum/75 leading-relaxed">{it.excerpt}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  // Accept YYYY or YYYY-MM or YYYY-MM-DD
  if (/^\d{4}$/.test(iso)) return iso;
  const d = new Date(iso);
  if (Number.isNaN(d.valueOf())) return iso;
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

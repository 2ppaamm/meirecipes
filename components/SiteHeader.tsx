import Link from "next/link";
import { useTranslations } from "next-intl";
import { Locale } from "@/lib/i18n-config";
import { MeiMark } from "./MeiMark";
import { FamilyModeToggle } from "./FamilyModeToggle";
import { SearchLink } from "./SearchLink";

interface Props {
  locale: Locale;
}

export function SiteHeader({ locale }: Props) {
  const t = useTranslations();
  const localePrefix = locale === "en" ? "" : `/${locale}`;
  const link = (path: string) => `${localePrefix}${path}` || "/";

  return (
    <header className="relative z-10 border-b rule bg-paper/80 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between gap-6">
        <Link href={link("/")} className="group flex items-center gap-4 shrink-0">
          <MeiMark size={48} className="shrink-0" />
          <div className="leading-tight">
            <div className="font-display text-2xl tracking-tightish">{t("site.name")}</div>
            <div className="smallcaps text-[10px] text-plum/60 mt-0.5">
              {t("site.byline")}
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-4 sm:gap-6">
          <nav className="hidden lg:flex items-center gap-5 smallcaps text-xs">
            <Link href={link("/signature")} className="text-rose font-semibold hover:text-rose-deep transition-colors">
              {t("nav.signature")}
            </Link>
            <Link href={link("/recipes")} className="hover:text-rose transition-colors">
              {t("nav.recipes")}
            </Link>
            <Link href={link("/basics")} className="hover:text-rose transition-colors">
              {t("nav.basics")}
            </Link>
            <Link href={link("/book")} className="text-rose font-semibold hover:text-rose-deep transition-colors">
              {t("nav.book")}
            </Link>
            <Link href={link("/about")} className="hover:text-rose transition-colors">
              {t("nav.about")}
            </Link>
          </nav>

          <SearchLink localePrefix={localePrefix} />
          <FamilyModeToggle compact />
        </div>
      </div>

      {/* Compact secondary row on smaller widths */}
      <div className="lg:hidden border-t rule overflow-x-auto">
        <nav className="mx-auto max-w-6xl px-6 py-2 flex items-center gap-5 smallcaps text-xs whitespace-nowrap">
          <Link href={link("/signature")} className="text-rose font-semibold">{t("nav.signature")}</Link>
          <Link href={link("/recipes")} className="text-plum/70">{t("nav.recipes")}</Link>
          <Link href={link("/basics")} className="text-plum/70">{t("nav.basics")}</Link>
          <Link href={link("/the-wok")} className="text-plum/70">{t("nav.wok")}</Link>
          <Link href={link("/book")} className="text-rose font-semibold">{t("nav.book")}</Link>
          <Link href={link("/about")} className="text-plum/70">{t("nav.about")}</Link>
        </nav>
      </div>

      {/* Secondary nav for editorial sections — visible on large screens */}
      <div className="hidden lg:block border-t rule">
        <nav className="mx-auto max-w-6xl px-6 py-2 flex items-center gap-6 smallcaps text-[11px]">
          <span className="text-plum/40">More:</span>
          <Link href={link("/the-wok")} className="text-plum/60 hover:text-rose transition-colors">{t("nav.wok")}</Link>
          <Link href={link("/press")} className="text-plum/60 hover:text-rose transition-colors">{t("nav.press")}</Link>
        </nav>
      </div>
    </header>
  );
}

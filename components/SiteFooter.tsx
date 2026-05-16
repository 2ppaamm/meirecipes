import { useTranslations } from "next-intl";
import { MeiMark } from "./MeiMark";

export function SiteFooter() {
  const t = useTranslations();
  return (
    <footer className="relative z-10 border-t rule mt-24 bg-paper">
      <div className="mx-auto max-w-6xl px-6 py-14 grid grid-cols-12 gap-8">
        <div className="col-span-12 sm:col-span-3 flex flex-col items-start gap-4">
          <MeiMark size={64} className="opacity-90" />
          <div className="smallcaps text-[10px] text-plum/60 leading-relaxed">
            {t("footer.copyright", { year: new Date().getFullYear() })}
          </div>
        </div>
        <div className="col-span-12 sm:col-span-6 space-y-3 text-sm text-plum/70">
          <p className="font-display italic text-rose-deep">{t("footer.tag")}</p>
          <p className="text-xs text-plum/55">{t("footer.wok")}</p>
          <p className="text-xs">
            <a
              href="https://instagram.com/mei.recipes"
              target="_blank"
              rel="noopener noreferrer"
              className="text-rose hover:text-rose-deep transition-colors"
            >
              {t("footer.instagram")}
            </a>
          </p>
        </div>
        <div className="col-span-12 sm:col-span-3 smallcaps text-[10px] text-plum/50 flex flex-col gap-1">
          <span>{t("home.creds.bookSubtitle")}</span>
          <span>{t("home.creds.training")}</span>
        </div>
      </div>
    </footer>
  );
}

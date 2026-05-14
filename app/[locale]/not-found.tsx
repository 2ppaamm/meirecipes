"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function NotFound() {
  const t = useTranslations("errors");
  return (
    <div className="mx-auto max-w-2xl px-6 py-32 text-center">
      <div className="smallcaps text-xs text-rose">{t("notFoundKicker")}</div>
      <h1 className="font-display text-6xl italic mt-4">{t("notFoundTitle")}</h1>
      <p className="mt-6 text-plum/70">{t("notFoundBody")}</p>
      <Link
        href="/"
        className="smallcaps text-xs text-rose border-b border-rose mt-8 inline-block"
      >
        {t("backHome")}
      </Link>
    </div>
  );
}

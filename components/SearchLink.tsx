"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export function SearchLink({ localePrefix }: { localePrefix: string }) {
  const t = useTranslations("search");
  return (
    <Link
      href={`${localePrefix}/search`}
      aria-label={t("title")}
      className="text-plum/60 hover:text-rose transition-colors p-1"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    </Link>
  );
}

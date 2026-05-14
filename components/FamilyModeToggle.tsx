"use client";

import { useFamilyMode } from "./FamilyModeProvider";
import { useTranslations } from "next-intl";

export function FamilyModeToggle({ compact = false }: { compact?: boolean }) {
  const { enabled, toggle } = useFamilyMode();
  const t = useTranslations("home.familyKitchen");
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      className={`smallcaps text-[11px] inline-flex items-center gap-2 transition-colors ${
        enabled
          ? "text-rose-deep font-semibold"
          : "text-plum/60 hover:text-rose"
      }`}
    >
      <span
        className={`inline-block w-7 h-3.5 rounded-full transition-colors ${
          enabled ? "bg-rose" : "bg-plum/20"
        } relative`}
      >
        <span
          className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-paper transition-all ${
            enabled ? "left-3.5" : "left-0.5"
          }`}
        />
      </span>
      {compact ? null : <span>{enabled ? t("toggleOn") : t("toggleOff")}</span>}
    </button>
  );
}

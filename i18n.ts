import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import { isLocale, defaultLocale } from "./lib/i18n-config";

export default getRequestConfig(async ({ locale }) => {
  if (!isLocale(locale)) notFound();
  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
    timeZone: "Asia/Singapore",
    now: new Date(),
    defaultLocale,
  };
});

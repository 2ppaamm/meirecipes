import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { htmlLangs, isLocale, locales, type Locale } from "@/lib/i18n-config";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { FamilyModeProvider } from "@/components/FamilyModeProvider";
import { PersonJsonLd } from "@/components/PersonJsonLd";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "site" });
  return {
    metadataBase: new URL(process.env.SITE_URL ?? "https://meirecipes.com"),
    title: { default: t("name"), template: `%s · ${t("name")}` },
    description: t("description"),
    openGraph: {
      type: "website",
      siteName: t("name"),
      title: t("name"),
      description: t("description"),
    },
    alternates: {
      languages: { en: "/", zh: "/zh", ms: "/ms" },
    },
  };
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!isLocale(locale)) notFound();
  unstable_setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={htmlLangs[locale as Locale]}>
      <body className="relative z-0">
        <NextIntlClientProvider messages={messages} locale={locale}>
          <FamilyModeProvider>
            <PersonJsonLd locale={locale as Locale} />
            <SiteHeader locale={locale as Locale} />
            <main className="relative z-10">{children}</main>
            <SiteFooter />
          </FamilyModeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

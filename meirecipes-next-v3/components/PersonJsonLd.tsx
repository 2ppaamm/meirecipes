import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n-config";

/**
 * Emits Person + Organisation JSON-LD on every page. This is the structured-data
 * spine of the site's authority claim: surfaces Pamela Lim as the author behind
 * Mei Kitchen, with her credentials and `sameAs` links to external authority.
 *
 * Update the `sameAs` list as press, ISBN, IPOS, ORCID, etc. become available.
 */
export async function PersonJsonLd({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "site" });
  const siteUrl = process.env.SITE_URL ?? "https://meirecipes.com";

  const person = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${siteUrl}/#author`,
    name: "Pamela Lim",
    alternateName: ["廖秀梅", "Liào Xiùméi"],
    jobTitle: "Chef, Author, Wok Designer",
    description:
      "Second-generation chef. Trained by renowned chefs in Singapore, Australia, and Thailand, with a patisserie certification from Le Cordon Bleu Sydney. Author of Can I Lick the Spoon, Mum? (finalist, Singapore Book Awards 2025).",
    knowsLanguage: ["en", "zh", "ms"],
    hasCredential: [
      {
        "@type": "EducationalOccupationalCredential",
        name: "Le Cordon Bleu — Patisserie",
        credentialCategory: "certification",
      },
    ],
    award: ["Finalist, Singapore Book Awards 2025"],
    url: siteUrl,
    sameAs: [
      "https://www.instagram.com/mei.recipes/",
      "https://www.pinterest.com/pamelaliusm/",
      // Book: Amazon listing
      "https://www.amazon.sg/Can-Lick-Spoon-Mum-Comics-Style/dp/981123700X",
      // Book: World Scientific (publisher)
      "https://www.worldscientific.com/worldscibooks/10.1142/12261",
      // Singapore Book Awards 2025 — official finalist listing (SBPA)
      "https://singaporebookpublishers.sg/singapore-book-awards/",
      // Add as available: IPOS patent / design record for the wok, ORCID, news mentions
    ],
  };

  const org = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl}/#kitchen`,
    name: t("name"),
    alternateName: ["Mei Kitchen", "梅厨房", "Dapur Mei"],
    description: t("description"),
    url: siteUrl,
    logo: `${siteUrl}/mei-mark.png`,
    founder: { "@id": `${siteUrl}/#author` },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(person) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(org) }}
      />
    </>
  );
}

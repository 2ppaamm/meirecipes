"use client";

import { WPRMRecipe } from "@/lib/wp-types";
import { useTranslations } from "next-intl";
import { MeiMark } from "./MeiMark";
import { useFamilyMode } from "./FamilyModeProvider";

interface Props {
  recipe: WPRMRecipe;
  emitJsonLd?: boolean;
}

export function RecipeCard({ recipe, emitJsonLd = true }: Props) {
  const t = useTranslations("post");
  const { enabled: familyMode } = useFamilyMode();
  const totalTime =
    recipe.total_time ??
    ((recipe.prep_time ?? 0) + (recipe.cook_time ?? 0) + (recipe.custom_time ?? 0) || undefined);

  const ld = emitJsonLd ? buildJsonLd({ ...recipe, total_time: totalTime }) : null;

  return (
    <section
      aria-label={`${t("recipe")}: ${recipe.name}`}
      className="relative my-12 border rule bg-cream px-6 py-8 sm:px-10 sm:py-10 overflow-hidden"
    >
      <div
        className="absolute top-4 right-4 opacity-10 pointer-events-none select-none"
        aria-hidden="true"
      >
        <MeiMark size={120} variant="outline" />
      </div>

      {ld && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
        />
      )}

      <div className="smallcaps text-xs text-rose mb-3">{t("recipe")}</div>
      <h2 className="font-display text-3xl sm:text-4xl tracking-tightish leading-[1.05]">
        {recipe.name}
      </h2>
      {recipe.summary && (
        <p className="mt-3 text-plum/80 leading-relaxed max-w-prose">{recipe.summary}</p>
      )}

      {(recipe.prep_time != null ||
        recipe.cook_time != null ||
        totalTime != null ||
        recipe.servings != null) && (
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-5 mt-6 pt-6 border-t rule relative z-10">
          {recipe.prep_time != null && <Stat label={t("prep")} value={`${recipe.prep_time} ${t("minutes")}`} />}
          {recipe.cook_time != null && <Stat label={t("cook")} value={`${recipe.cook_time} ${t("minutes")}`} />}
          {totalTime != null && <Stat label={t("total")} value={`${totalTime} ${t("minutes")}`} />}
          {recipe.servings != null && (
            <Stat
              label={t("serves")}
              value={`${recipe.servings}${recipe.servings_unit ? ` ${recipe.servings_unit}` : ""}`}
            />
          )}
        </dl>
      )}

      <div className="grid grid-cols-12 gap-x-8 gap-y-8 mt-8 relative z-10">
        <div className="col-span-12 md:col-span-5">
          <h3 className="smallcaps text-xs text-rose mb-3">{t("ingredients")}</h3>
          {recipe.ingredients.map((group, gi) => (
            <div key={gi} className="mb-5">
              {group.name && (
                <div className="font-display italic text-lg mb-2">{group.name}</div>
              )}
              <ul className="space-y-1.5">
                {group.ingredients.map((ing, i) => (
                  <li key={i} className="flex gap-3 leading-snug">
                    <span className="font-mono text-xs text-rose shrink-0 w-20 pt-1">
                      {[ing.amount, ing.unit].filter(Boolean).join(" ")}
                    </span>
                    <span className="text-plum/90">
                      {ing.name}
                      {ing.notes && <span className="text-plum/60">, {ing.notes}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="col-span-12 md:col-span-7">
          <h3 className="smallcaps text-xs text-rose mb-3">{t("method")}</h3>
          <ol className="space-y-5">
            {recipe.instructions.map((item, i) =>
              item.type === "group" ? (
                <li key={i} className="font-display italic text-xl text-rose mt-4">
                  {item.name}
                </li>
              ) : (
                <li
                  key={i}
                  className={`flex gap-4 transition-opacity ${
                    familyMode && !item.childSafe ? "opacity-50" : "opacity-100"
                  }`}
                >
                  <span className="num-marker text-3xl text-rose/80 leading-none shrink-0 w-10">
                    {String(numberedStep(recipe.instructions, i)).padStart(2, "0")}
                  </span>
                  <div className="text-plum/90 pt-1 leading-relaxed">
                    {item.text}
                    {item.childSafe && (
                      <div className="mt-1.5 inline-flex items-center gap-1.5 smallcaps text-[10px] text-rose-deep bg-rose-soft/40 px-2 py-0.5 rounded">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                        {t("childSafe")}
                      </div>
                    )}
                  </div>
                </li>
              )
            )}
          </ol>
        </div>
      </div>

      {recipe.notes && (
        <div className="mt-8 pt-6 border-t rule relative z-10">
          <div className="smallcaps text-xs text-rose mb-2">{t("notes")}</div>
          <p className="font-display italic text-plum/80 leading-relaxed">{recipe.notes}</p>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="smallcaps text-[10px] text-plum/50">{label}</dt>
      <dd className="font-display text-xl mt-1">{value}</dd>
    </div>
  );
}

function numberedStep(items: WPRMRecipe["instructions"], index: number): number {
  let n = 0;
  for (let i = 0; i <= index; i++) if (items[i].type === "instruction") n++;
  return n;
}

function buildJsonLd(recipe: WPRMRecipe): Record<string, unknown> {
  const siteUrl = process.env.SITE_URL ?? "https://meirecipes.com";
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.name,
    description: recipe.summary,
    author: { "@id": `${siteUrl}/#author` }, // links to the site-wide Person LD
  };
  if (recipe.image_url) ld.image = [recipe.image_url];
  if (recipe.servings != null) {
    ld.recipeYield = `${recipe.servings} ${recipe.servings_unit ?? "servings"}`.trim();
  }
  if (recipe.prep_time != null) ld.prepTime = `PT${recipe.prep_time}M`;
  if (recipe.cook_time != null) ld.cookTime = `PT${recipe.cook_time}M`;
  if (recipe.total_time != null) ld.totalTime = `PT${recipe.total_time}M`;
  ld.recipeIngredient = recipe.ingredients
    .flatMap((g) => g.ingredients)
    .map((i) => [i.amount, i.unit, i.name, i.notes ? `(${i.notes})` : ""].filter(Boolean).join(" "));
  const steps = recipe.instructions.filter(
    (i): i is { type: "instruction"; text: string; name?: string; childSafe?: boolean } =>
      i.type === "instruction"
  );
  ld.recipeInstructions = steps.map((s, idx) => ({
    "@type": "HowToStep",
    position: idx + 1,
    text: s.text,
  }));
  return ld;
}

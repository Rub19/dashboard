// Registre unique des polices de l'interface (avant : deux listes recopiées dans les réglages, deux endroits
// qui appliquaient la police). Le chargement se fait dans app/layout.tsx (next/font, sans préchargement pour
// les polices optionnelles) et l'application dans globals.css via html[data-font="…"].

export type FontId =
  | "inter"
  | "outfit"
  | "poppins"
  | "oswald"
  | "grotesk"
  | "manrope"
  | "sora"
  | "nunito"
  | "editorial"
  | "jetbrains";

/** "sans" = police du thème actif (sa police d'origine ou celle choisie pour ce thème). */
export type FontFamilySetting = "sans" | FontId | "mono" | "serif";

export const FONT_OPTIONS: { id: FontId; label: string; css: string; origin?: string }[] = [
  { id: "inter", label: "Inter", css: "var(--font-geist-sans)" },
  { id: "outfit", label: "Outfit", css: "var(--font-outfit)" },
  { id: "poppins", label: "Poppins", css: "var(--font-poppins)", origin: "Asphalt" },
  { id: "oswald", label: "Oswald", css: "var(--font-oswald)", origin: "Burgundy" },
  { id: "grotesk", label: "Space Grotesk", css: "var(--font-space-grotesk)" },
  { id: "manrope", label: "Manrope", css: "var(--font-manrope)" },
  { id: "sora", label: "Sora", css: "var(--font-sora)" },
  { id: "nunito", label: "Nunito", css: "var(--font-nunito)" },
  { id: "editorial", label: "Playfair", css: "var(--font-playfair)" },
  { id: "jetbrains", label: "JetBrains Mono", css: "var(--font-geist-mono)" },
];

const FONT_IDS = new Set<string>(FONT_OPTIONS.map((f) => f.id));
export const ALL_FONT_SETTINGS = new Set<string>(["sans", "mono", "serif", ...FONT_IDS]);

export function isFontId(v: unknown): v is FontId {
  return typeof v === "string" && FONT_IDS.has(v);
}

/** Valeur de html[data-font] : le choix global l'emporte ; sur « Police du thème », la police choisie pour ce
 * thème (bouton Modifier de la carte), sinon "sans" = police d'origine du thème. */
export function effectiveFont(settings: { fontFamily: string; theme: string; themeFonts?: Partial<Record<string, string>> | null }): string {
  if (settings.fontFamily && settings.fontFamily !== "sans") return settings.fontFamily;
  const perTheme = settings.themeFonts?.[settings.theme];
  return isFontId(perTheme) ? perTheme : "sans";
}

/** Nom lisible de la police d'origine d'un thème, d'après sa pile CSS (fontFamily du ThemeDefinition). */
export function themeOriginFontLabel(themeFontFamily?: string): string {
  const f = (themeFontFamily || "").toLowerCase();
  if (f.includes("oswald")) return "Oswald";
  if (f.includes("poppins")) return "Poppins";
  if (f.includes("outfit")) return "Outfit";
  return "Inter";
}

import en from "./translations/console/en.json";
import es from "./translations/console/es.json";
import de from "./translations/console/de.json";

const DICTS: Record<string, Record<string, string>> = { en, es, de };
let current = "fr";

/** Langue du site, fixée par le SettingsProvider à chaque rendu. */
export function setTxLang(lang: string) {
  if (lang === current) return;
  current = lang;
  if (typeof document !== "undefined" && location.hostname.endsWith("ethone.dev")) {
    document.cookie = `ethone_lang=${lang}; Domain=.ethone.dev; Path=/; Max-Age=31536000; SameSite=Lax; Secure`;
  }
}

/** Texte français traduit dans la langue du site (le français sert de clé), avec ses variables {nom}. */
export function tx(fr: string, vars?: Record<string, unknown>): string {
  const text = DICTS[current]?.[fr] ?? fr;
  return vars ? text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k] ?? "") : m)) : text;
}

/** Comme tx, pour un libellé qui n'est peut-être pas une chaîne. */
export function txNode<T>(v: T): T | string {
  return typeof v === "string" ? tx(v) : v;
}

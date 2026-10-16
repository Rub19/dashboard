import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { guildConfigService } from '../services/guildConfigService.js';

type Lang = 'fr' | 'en' | 'es' | 'de';

const dicts: Partial<Record<Lang, Record<string, string>>> = {};
for (const lang of ['en', 'es', 'de'] as const) {
  try {
    dicts[lang] = JSON.parse(fs.readFileSync(fileURLToPath(new URL(`../locales/${lang}.json`, import.meta.url)), 'utf-8'));
  } catch {
    dicts[lang] = {};
  }
}

/** Texte français traduit dans la langue donnée (le français sert de clé), avec ses variables {nom}. */
export function tr(lang: string | null | undefined, fr: string, vars?: Record<string, string | number>): string {
  const text = dicts[lang as Lang]?.[fr] ?? fr;
  return vars ? text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : text;
}

/** Langue choisie pour le serveur. */
export function guildLang(guildId: string | null | undefined): Lang {
  return guildId ? (guildConfigService.getConfig(guildId).language as Lang) : 'fr';
}

/** Raccourci : traduit dans la langue du serveur. */
export function trg(guildId: string | null | undefined, fr: string, vars?: Record<string, string | number>): string {
  return tr(guildLang(guildId), fr, vars);
}

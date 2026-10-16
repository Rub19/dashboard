import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { guildConfigService } from '../services/guildConfigService.js';

type Lang = 'fr' | 'en' | 'es' | 'de';
type Vars = Record<string, unknown>;

const dicts: Partial<Record<Lang, Record<string, string>>> = {};
for (const lang of ['en', 'es', 'de'] as const) {
  try {
    dicts[lang] = JSON.parse(fs.readFileSync(fileURLToPath(new URL(`../locales/${lang}.json`, import.meta.url)), 'utf-8'));
  } catch {
    dicts[lang] = {};
  }
}

/** Texte français traduit dans la langue donnée (le français sert de clé), avec ses variables {nom}. */
export function tr(lang: string | null | undefined, fr: string, vars?: Vars): string {
  const text = dicts[lang as Lang]?.[fr] ?? fr;
  return vars ? text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k] ?? '') : m)) : text;
}

/** Identifiant du serveur à partir d'un id, d'un serveur, d'une interaction, d'un message, d'un membre ou d'un contexte de commande. */
function guildIdOf(scope: unknown): string | null {
  if (!scope) return null;
  if (typeof scope === 'string') return scope;
  const o = scope as { guildId?: unknown; guild?: { id?: unknown } | null; id?: unknown; ownerId?: unknown };
  if (typeof o.guildId === 'string') return o.guildId;
  if (typeof o.guild?.id === 'string') return o.guild.id;
  if (typeof o.ownerId === 'string' && typeof o.id === 'string') return o.id;
  return null;
}

/** Langue choisie pour le serveur. */
export function guildLang(scope: unknown): Lang {
  const id = guildIdOf(scope);
  return id ? (guildConfigService.getConfig(id).language as Lang) : 'fr';
}

/** Raccourci : traduit dans la langue du serveur désigné par `scope`. */
export function trg(scope: unknown, fr: string, vars?: Vars): string {
  return tr(guildLang(scope), fr, vars);
}

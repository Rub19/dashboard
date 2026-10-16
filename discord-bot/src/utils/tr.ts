import fs from 'node:fs';
import { AsyncLocalStorage } from 'node:async_hooks';
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

/** Langue du dashboard pour la requête HTTP en cours (cookie ethone_lang du site). */
export const requestLang = new AsyncLocalStorage<string>();

/** Traduit dans la langue du dashboard qui a fait la requête (français hors requête). */
export function trq(fr: string, vars?: Vars): string {
  return tr(requestLang.getStore(), fr, vars);
}

const patterns = new Map<Lang, { re: RegExp; names: string[]; to: string }[]>();
function patternsFor(lang: Lang) {
  let list = patterns.get(lang);
  if (!list) {
    list = Object.entries(dicts[lang] ?? {})
      .filter(([k]) => /\{\w+\}/.test(k))
      .map(([k, to]) => {
        const names: string[] = [];
        const src = k.split(/(\{\w+\})/).map((part) => {
          const m = part.match(/^\{(\w+)\}$/);
          if (!m) return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          names.push(m[1]);
          return '([\\s\\S]*?)';
        });
        return { re: new RegExp(`^${src.join('')}$`), names, to };
      });
    patterns.set(lang, list);
  }
  return list;
}

/** Traduit un texte déjà produit en français (enregistré avant d'être affiché), en retrouvant son modèle et ses variables. */
export function translateStored(text: string, lang: string | null | undefined = requestLang.getStore()): string {
  const d = dicts[lang as Lang];
  if (!d || !text) return text;
  if (d[text]) return d[text];
  for (const p of patternsFor(lang as Lang)) {
    const m = text.match(p.re);
    if (m) return p.to.replace(/\{(\w+)\}/g, (all, k) => (p.names.includes(k) ? m[p.names.indexOf(k) + 1] : all));
  }
  return text;
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

/** Texte enregistré en français puis traduit à l'affichage avec translateStored (marque la clé pour les dictionnaires). */
export function trs(fr: string, vars?: Vars): string {
  return tr('fr', fr, vars);
}

const STORED_FIELDS = new Set(['title', 'reason', 'details', 'signals', 'riskContributions', 'executedActions', 'executedActionSummaries', 'logs', 'errors', 'flags', 'warnings']);

/** Traduit, dans une réponse de l'API, les champs écrits par le bot (titres et motifs d'incident, journaux…). */
export function translateFields<T>(value: T, lang: string | null | undefined = requestLang.getStore()): T {
  if (!lang || lang === 'fr' || !dicts[lang as Lang]) return value;
  const walk = (v: unknown, inField: boolean): unknown => {
    if (typeof v === 'string') return inField ? translateStored(v, lang) : v;
    if (Array.isArray(v)) return v.map((x) => walk(x, inField));
    if (v && typeof v === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(v)) out[k] = walk(x, STORED_FIELDS.has(k));
      return out;
    }
    return v;
  };
  return walk(value, false) as T;
}

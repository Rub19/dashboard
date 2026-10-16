import fs from 'node:fs';
import path from 'node:path';
import { AIProviderService } from '../modules/ai/services/aiProviderService.js';
import { aiRepository } from '../modules/ai/storage/aiRepository.js';
import { logger } from '../utils/logger.js';

export const SITE_LANGS = ['fr', 'en', 'es', 'de'] as const;
export type SiteLang = (typeof SITE_LANGS)[number];

const FILE = path.resolve(process.cwd(), 'data', 'command_i18n.json');
const NAMES: Record<SiteLang, string> = { fr: 'French', en: 'English', es: 'Spanish', de: 'German' };
const MAX_TRIES = 3;
const DISCORD_LOCALES: [SiteLang, string[]][] = [
  ['fr', ['fr']],
  ['en', ['en-US', 'en-GB']],
  ['es', ['es-ES', 'es-419']],
  ['de', ['de']],
];
const BATCH = 40;

/**
 * Descriptions des commandes dans la langue du site (fr, en, es, de), traduites une fois par l'IA du bot
 * puis gardées sur le disque. Tant qu'un texte n'est pas traduit, l'original est renvoyé.
 */
class CommandTranslations {
  private cache: Record<string, Record<string, string>> = {};
  private running = new Set<SiteLang>();
  private tries = new Map<string, number>();

  constructor() {
    try {
      if (fs.existsSync(FILE)) this.cache = JSON.parse(fs.readFileSync(FILE, 'utf-8'));
      // Textes renvoyés tels quels par une ancienne passe (non traduits) : retentés.
      for (const [lang, bucket] of Object.entries(this.cache)) if (lang !== 'fr') for (const [k, v] of Object.entries(bucket)) if (k === v && k.length > 15) delete bucket[k];
    } catch (err) {
      logger.warn('Traductions des commandes illisibles :', (err as Error)?.message);
    }
  }

  private save() {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(this.cache, null, 1), 'utf-8');
  }

  t(lang: SiteLang, text: string): string {
    return this.cache[lang]?.[text] ?? text;
  }

  /** Ajoute aux descriptions d'une commande (et de ses options) leurs traductions pour le sélecteur de Discord. */
  localize<T>(json: T): T {
    const walk = (node: any) => {
      if (!node || typeof node !== 'object') return;
      if (typeof node.description === 'string' && node.description) {
        const loc: Record<string, string> = { ...(node.description_localizations ?? {}) };
        for (const [lang, locales] of DISCORD_LOCALES) {
          const v = this.cache[lang]?.[node.description];
          if (v && v !== node.description) for (const l of locales) loc[l] = v.slice(0, 100);
        }
        if (Object.keys(loc).length) node.description_localizations = loc;
      }
      for (const o of node.options ?? []) walk(o);
    };
    walk(json);
    return json;
  }

  /** Lance en arrière-plan la traduction des textes manquants (un seul passage à la fois par langue). */
  ensure(lang: SiteLang, texts: string[]): void {
    const missing = [...new Set(texts.filter((s) => s && !this.cache[lang]?.[s] && (this.tries.get(`${lang}:${s}`) ?? 0) < MAX_TRIES))];
    if (!missing.length || this.running.has(lang) || !process.env.GROQ_API_KEY) return;
    this.running.add(lang);
    void this.translate(lang, missing).finally(() => this.running.delete(lang));
  }

  /** Traduit tout de suite ce qui manque dans chaque langue. Renvoie le nombre de textes ajoutés. */
  async fill(texts: string[]): Promise<number> {
    if (!process.env.GROQ_API_KEY) return 0;
    const before = SITE_LANGS.reduce((n, l) => n + Object.keys(this.cache[l] ?? {}).length, 0);
    for (const lang of SITE_LANGS) {
      const missing = [...new Set(texts.filter((s) => s && !this.cache[lang]?.[s] && (this.tries.get(`${lang}:${s}`) ?? 0) < MAX_TRIES))];
      if (missing.length && !this.running.has(lang)) {
        this.running.add(lang);
        await this.translate(lang, missing).finally(() => this.running.delete(lang));
      }
    }
    return SITE_LANGS.reduce((n, l) => n + Object.keys(this.cache[l] ?? {}).length, 0) - before;
  }

  private async translate(lang: SiteLang, texts: string[]): Promise<void> {
    const settings = AIProviderService.withAvailableProvider(aiRepository.getSettings(''));
    for (let i = 0; i < texts.length; i += BATCH) {
      const chunk = texts.slice(i, i + BATCH);
      for (const t of chunk) this.tries.set(`${lang}:${t}`, (this.tries.get(`${lang}:${t}`) ?? 0) + 1);
      try {
        const res = await AIProviderService.generate({
          settings,
          systemPrompt: `You translate short UI strings of a Discord bot (written in French or English) into ${NAMES[lang]}. Every string must come out in ${NAMES[lang]}; if it is already in ${NAMES[lang]}, return it unchanged. Keep it short and natural, keep proper nouns, commands, emojis and placeholders unchanged. Answer only with a JSON array of strings, same order and same length as the input.`,
          messages: [{ role: 'user', content: JSON.stringify(chunk), timestamp: new Date().toISOString() }],
        });
        const match = res.text.match(/\[[\s\S]*\]/);
        const out = match ? (JSON.parse(match[0]) as unknown[]) : [];
        if (out.length !== chunk.length || res.model.startsWith('builtin')) continue;
        const bucket = (this.cache[lang] ??= {});
        chunk.forEach((src, k) => {
          const v = typeof out[k] === 'string' ? (out[k] as string).trim() : '';
          // Recopié à l'identique dans une autre langue : probablement non traduit, retenté plus tard (sauf texte court ou français).
          if (v && (v !== src || lang === 'fr' || src.length <= 15)) bucket[src] = v.slice(0, 300);
        });
        this.save();
      } catch (err) {
        logger.warn(`[Traductions] ${lang} : lot ignoré :`, (err as Error)?.message);
      }
    }
  }
}

export const commandTranslations = new CommandTranslations();

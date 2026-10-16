import fs from 'node:fs';
import path from 'node:path';
import { AIProviderService } from '../modules/ai/services/aiProviderService.js';
import { aiRepository } from '../modules/ai/storage/aiRepository.js';
import { logger } from '../utils/logger.js';

export const SITE_LANGS = ['en', 'es', 'de'] as const;
export type SiteLang = (typeof SITE_LANGS)[number];

const FILE = path.resolve(process.cwd(), 'data', 'command_i18n.json');
const NAMES: Record<SiteLang, string> = { en: 'English', es: 'Spanish', de: 'German' };
const BATCH = 40;

/**
 * Traductions des descriptions de commandes pour le site (anglais, espagnol, allemand), faites une fois par l'IA du bot
 * puis gardées sur le disque. Tant qu'un texte n'est pas traduit, le français est renvoyé.
 */
class CommandTranslations {
  private cache: Record<string, Record<string, string>> = {};
  private running = new Set<SiteLang>();

  constructor() {
    try {
      if (fs.existsSync(FILE)) this.cache = JSON.parse(fs.readFileSync(FILE, 'utf-8'));
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

  /** Lance en arrière-plan la traduction des textes manquants (un seul passage à la fois par langue). */
  ensure(lang: SiteLang, texts: string[]): void {
    const missing = [...new Set(texts.filter((s) => s && !this.cache[lang]?.[s]))];
    if (!missing.length || this.running.has(lang) || !process.env.GROQ_API_KEY) return;
    this.running.add(lang);
    void this.translate(lang, missing).finally(() => this.running.delete(lang));
  }

  private async translate(lang: SiteLang, texts: string[]): Promise<void> {
    const settings = AIProviderService.withAvailableProvider(aiRepository.getSettings(''));
    for (let i = 0; i < texts.length; i += BATCH) {
      const chunk = texts.slice(i, i + BATCH);
      try {
        const res = await AIProviderService.generate({
          settings,
          systemPrompt: `You translate short French UI strings of a Discord bot into ${NAMES[lang]}. Keep it short and natural, keep proper nouns, commands, emojis and placeholders unchanged. Answer only with a JSON array of strings, same order and same length as the input.`,
          messages: [{ role: 'user', content: JSON.stringify(chunk), timestamp: new Date().toISOString() }],
        });
        const match = res.text.match(/\[[\s\S]*\]/);
        const out = match ? (JSON.parse(match[0]) as unknown[]) : [];
        if (out.length !== chunk.length || res.model.startsWith('builtin')) continue;
        const bucket = (this.cache[lang] ??= {});
        chunk.forEach((fr, k) => typeof out[k] === 'string' && (out[k] as string).trim() && (bucket[fr] = (out[k] as string).trim().slice(0, 300)));
        this.save();
      } catch (err) {
        logger.warn(`[Traductions] ${lang} : lot ignoré :`, (err as Error)?.message);
      }
    }
  }
}

export const commandTranslations = new CommandTranslations();

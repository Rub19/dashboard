import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Client } from 'discord.js';
import { logger } from '../utils/logger.js';

/** Émojis d'application (propres au bot, utilisables dans tous les serveurs). Le nom fait foi : pas de hash. */
const MAX_APP_EMOJIS = 2000;
const MAX_BYTES = 256 * 1024;
const PREFIX = 'etho_';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ICON_DIR_CANDIDATES = [
  path.resolve(process.cwd(), '..', 'ethone-next', 'public', 'bot-icons'),
  path.resolve(process.cwd(), 'ethone-next', 'public', 'bot-icons'),
  path.resolve(HERE, '..', '..', '..', 'ethone-next', 'public', 'bot-icons'),
];

const emojiMap = new Map<string, string>();

/** `moderation.png` -> `etho_moderation` ([a-z0-9_], 2-32 caractères). */
export function appEmojiName(fileName: string): string {
  const base = path.parse(fileName).name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  return `${PREFIX}${base}`.slice(0, 32);
}

/** Mention `<:nom:id>` (ou `<a:...>`) si l'émoji a été synchronisé, sinon undefined. */
export function getAppEmoji(name: string): string | undefined {
  return emojiMap.get(name);
}

export function appEmojiMap(): Map<string, string> {
  return emojiMap;
}

export async function syncAppEmojis(client: Client<true>): Promise<void> {
  const existing = await client.application.emojis.fetch();
  for (const e of existing.values()) if (e.name && e.id) emojiMap.set(e.name, `<${e.animated ? 'a' : ''}:${e.name}:${e.id}>`);

  const dir = ICON_DIR_CANDIDATES.find((d) => fs.existsSync(d));
  if (!dir) return;
  let count = existing.size;
  for (const file of fs.readdirSync(dir).filter((f) => /\.(png|jpe?g|gif)$/i.test(f))) {
    const name = appEmojiName(file);
    if (name.length < 2 || emojiMap.has(name)) continue;
    const full = path.join(dir, file);
    if (fs.statSync(full).size > MAX_BYTES) {
      logger.warn(`[Émojis] ${file} dépasse 256 Ko : ignoré.`);
      continue;
    }
    if (count >= MAX_APP_EMOJIS) {
      logger.warn('[Émojis] Limite de 2000 émojis d\'application atteinte.');
      break;
    }
    try {
      const created = await client.application.emojis.create({ attachment: full, name });
      emojiMap.set(created.name ?? name, `<${created.animated ? 'a' : ''}:${created.name ?? name}:${created.id}>`);
      count++;
    } catch (err) {
      logger.warn(`[Émojis] Création de ${name} impossible :`, err);
    }
  }
  logger.success(`[Émojis] ${emojiMap.size} émojis d'application disponibles.`);
}

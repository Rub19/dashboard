import type { Client } from 'discord.js';
import { getAppEmoji } from './appEmojis.js';

/**
 * Émojis animés dans toutes les réponses du bot, sans retoucher chaque message : juste avant l'envoi à Discord,
 * les ✅ ❌ ⚠️ ℹ️ ⏳ ✨ deviennent les émojis d'application animés (etho_a_*), là où Discord les affiche :
 * contenu, description et valeurs de champs d'embed, textes des composants V2, émojis des boutons et des menus.
 * Les titres, noms de champs, pieds et auteurs d'embed n'affichent pas les émojis personnalisés : ils restent en Unicode.
 * Si un émoji animé n'est pas encore synchronisé, ou si le remplacement dépasserait une limite de Discord, rien ne change.
 */
const SWAPS: Array<[string, string]> = [
  ['✅', 'etho_a_check'],
  ['❌', 'etho_a_cross'],
  ['⚠️', 'etho_a_warning'],
  ['⚠', 'etho_a_warning'],
  ['ℹ️', 'etho_a_info'],
  ['ℹ', 'etho_a_info'],
  ['⏳', 'etho_a_loading'],
  ['✨', 'etho_a_sparkles'],
];

type Json = Record<string, unknown>;

function swapText(text: unknown, max: number): unknown {
  if (typeof text !== 'string' || !text) return text;
  let out = text;
  for (const [uni, name] of SWAPS) {
    if (!out.includes(uni)) continue;
    const mention = getAppEmoji(name);
    if (mention) out = out.split(uni).join(mention);
  }
  return out.length <= max ? out : text;
}

/** `{ name: '✅' }` → `{ id, name, animated: true }` pour un bouton ou une option de menu. */
function swapEmoji(emoji: unknown): unknown {
  const e = emoji as Json | null;
  if (!e || typeof e !== 'object' || e.id || typeof e.name !== 'string') return emoji;
  const hit = SWAPS.find(([uni]) => e.name === uni);
  const mention = hit && getAppEmoji(hit[1]);
  const m = mention?.match(/^<(a?):(\w+):(\d+)>$/);
  return m ? { id: m[3], name: m[2], animated: m[1] === 'a' } : emoji;
}

function walkComponents(list: unknown): void {
  if (!Array.isArray(list)) return;
  for (const raw of list) {
    const c = raw as Json;
    if (!c || typeof c !== 'object') continue;
    if (c.type === 10) c.content = swapText(c.content, 4000); // Text Display (composants V2)
    if (c.emoji) c.emoji = swapEmoji(c.emoji);
    if (Array.isArray(c.options)) for (const o of c.options as Json[]) if (o?.emoji) o.emoji = swapEmoji(o.emoji);
    if (c.accessory) walkComponents([c.accessory]);
    walkComponents(c.components);
  }
}

function transformMessage(body: Json): void {
  body.content = swapText(body.content, 2000);
  if (Array.isArray(body.embeds)) {
    for (const raw of body.embeds as Json[]) {
      if (!raw || typeof raw !== 'object') continue;
      raw.description = swapText(raw.description, 4096);
      if (Array.isArray(raw.fields)) for (const f of raw.fields as Json[]) if (f) f.value = swapText(f.value, 1024);
    }
  }
  walkComponents(body.components);
}

const MESSAGE_ROUTE = /\/(messages|callback|webhooks)\b/;

export function installAnimatedEmojis(client: Client): void {
  const rest = client.rest as unknown as { request: (o: Json) => Promise<unknown> };
  const original = rest.request.bind(rest);
  rest.request = (options: Json) => {
    try {
      const body = options?.body;
      if (body && typeof body === 'object' && MESSAGE_ROUTE.test(String(options.fullRoute ?? ''))) {
        const copy = structuredClone(body) as Json;
        transformMessage(copy);
        if (copy.data && typeof copy.data === 'object') transformMessage(copy.data as Json); // réponse d'interaction
        options = { ...options, body: copy };
      }
    } catch {
      // En cas de doute, le message part tel quel.
    }
    return original(options);
  };
}

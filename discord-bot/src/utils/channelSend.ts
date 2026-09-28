import {
  ChannelFlags,
  ChannelType,
  PermissionFlagsBits,
  type GuildMember,
  type Message,
} from 'discord.js';

/**
 * Envoi vers un salon CONFIGURÉ (dashboard / config serveur), y compris les salons Forum (15)
 * et Média (16) : on ne peut pas y `send()`, il faut créer un post (thread) avec un message
 * de départ. Envoyer dans un post de forum (thread) fonctionne normalement.
 */

/** Payload accepté : tout ce qu'un `channel.send()` accepte (contenu, embeds, composants, fichiers…). */
export type ChannelSendPayload = string | Record<string, any>;

export interface ChannelSendOptions {
  /** Titre du post créé dans un forum/média (défaut : dérivé du contenu / titre d'embed). */
  postTitle?: string;
  /** Tags de forum à appliquer (filtrés sur `availableTags`). */
  appliedTagIds?: string[];
  reason?: string;
}

const TEXT_LIKE_TYPES: number[] = [
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
  ChannelType.GuildVoice,
  ChannelType.GuildStageVoice,
  ChannelType.PublicThread,
  ChannelType.PrivateThread,
  ChannelType.AnnouncementThread,
];

export function isForumLike(channel: any): boolean {
  return !!channel && (channel.type === ChannelType.GuildForum || channel.type === ChannelType.GuildMedia);
}

/** Vrai si on peut y poster : salon textuel (incl. threads / posts de forum) OU forum / média. */
export function isSendableTarget(channel: any): boolean {
  if (!channel) return false;
  if (isForumLike(channel)) return true;
  if (typeof channel.send !== 'function') return false;
  // Objet sans isTextBased() (données partielles de l'API) : on se fie au type.
  if (typeof channel.isTextBased !== 'function') return TEXT_LIKE_TYPES.includes(channel.type);
  return channel.isTextBased();
}

/**
 * Le bot a-t-il les permissions pour poster ? Forum/média : SendMessages + CreatePublicThreads.
 * Post (thread) : SendMessagesInThreads. Sinon SendMessages.
 */
export function canBotSendTo(channel: any, me: GuildMember | null | undefined): boolean {
  if (!channel || !me || typeof channel.permissionsFor !== 'function') return false;
  const perms = channel.permissionsFor(me);
  if (!perms) return false;
  const needed = isForumLike(channel)
    ? [PermissionFlagsBits.SendMessages, PermissionFlagsBits.CreatePublicThreads]
    : typeof channel.isThread === 'function' && channel.isThread()
      ? [PermissionFlagsBits.SendMessagesInThreads]
      : [PermissionFlagsBits.SendMessages];
  return needed.every((flag) => perms.has(flag));
}

function firstLine(s: unknown): string {
  return String(s ?? '').trim().split('\n')[0] ?? '';
}

function deriveTitle(payload: ChannelSendPayload): string {
  if (typeof payload === 'string') return firstLine(payload);
  const content = firstLine(payload.content);
  if (content) return content;
  const embed = Array.isArray(payload.embeds) ? payload.embeds[0] : undefined;
  const e: any = embed && typeof embed.toJSON === 'function' ? embed.toJSON() : embed;
  return firstLine(e?.title || e?.author?.name || e?.description);
}

/** Ne garde que ce que `threads.create({ message })` accepte (pas de reply, tts, etc.). */
function toStarterMessage(payload: ChannelSendPayload): Record<string, any> {
  if (typeof payload === 'string') return { content: payload };
  const msg: Record<string, any> = {};
  for (const key of ['content', 'embeds', 'components', 'files', 'allowedMentions', 'stickers', 'flags'] as const) {
    if (payload[key] !== undefined) msg[key] = payload[key];
  }
  // Un post doit contenir au moins quelque chose.
  if (!msg.content && !msg.embeds?.length && !msg.files?.length && !msg.components?.length) msg.content = '​';
  return msg;
}

export async function sendToConfiguredChannel(
  channel: any,
  payload: ChannelSendPayload,
  options: ChannelSendOptions = {}
): Promise<Message> {
  if (!channel) throw new Error('Salon introuvable.');

  if (isForumLike(channel)) {
    const available: Array<{ id: string }> = channel.availableTags ?? [];
    const ids = new Set(available.map((t) => t.id));
    let appliedTags = (options.appliedTagIds ?? []).filter((id) => ids.has(id)).slice(0, 5);
    if (!appliedTags.length && available.length && channel.flags?.has?.(ChannelFlags.RequireTag)) {
      appliedTags = [available[0]!.id];
    }
    const name = (options.postTitle || deriveTitle(payload) || 'Message').slice(0, 100);
    const thread = await channel.threads.create({
      name,
      message: toStarterMessage(payload),
      appliedTags,
      reason: options.reason ?? 'Message automatique ETHONE',
    });
    const starter = await thread.fetchStarterMessage().catch(() => null);
    return (
      starter ??
      ({ id: thread.id, channelId: thread.id, channel: thread, guildId: thread.guildId } as unknown as Message)
    );
  }

  if (isSendableTarget(channel)) return channel.send(payload);

  throw new Error(`Le salon ${channel.id ?? '?'} ne peut pas recevoir de messages (type ${channel.type}).`);
}

/** Types de salons proposés comme destination dans le dashboard (texte, annonces, forum, média). */
export const DESTINATION_CHANNEL_TYPES: number[] = [
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
  ChannelType.GuildForum,
  ChannelType.GuildMedia,
];

/** Idem pour les options de slash commands / menus de salons (+ posts de forum publics). */
export const SLASH_DESTINATION_TYPES = [
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
  ChannelType.GuildForum,
  ChannelType.GuildMedia,
  ChannelType.PublicThread,
] as const;

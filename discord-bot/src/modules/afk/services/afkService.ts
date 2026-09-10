import { Message, PermissionFlagsBits } from 'discord.js';
import { afkStorage } from '../storage/afkStorage.js';
import { logger } from '../../../utils/logger.js';

const AFK_PREFIX = '[AFK] ';

function humanDuration(sinceIso: string): string {
  const ms = Date.now() - new Date(sinceIso).getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 1) return "moins d'une minute";
  if (mins < 60) return `${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.round(hours / 24)} j`;
}

class AfkService {
  /**
   * Appelé pour chaque message humain (cf. events/messageCreate), AVANT le
   * traitement des commandes. Retourne true si le message a été "consommé"
   * (retour d'AFK) — les autres modules peuvent continuer quand même.
   */
  public async handleMessage(message: Message): Promise<void> {
    if (!message.guild || !message.guildId || message.author.bot) return;
    const channel = message.channel;
    if (!('send' in channel) || typeof channel.send !== 'function') return;
    const config = afkStorage.getConfig(message.guildId);
    if (!config.enabled) return;

    // 1. L'auteur revient d'AFK.
    if (config.clearOnMessage) {
      const own = afkStorage.get(message.guildId, message.author.id);
      if (own) {
        afkStorage.clear(message.guildId, message.author.id);
        await this.restoreNickname(message, own.previousNickname);
        const mentions = own.mentionCount;
        const back = await channel
          .send({
            content:
              `👋 <@${message.author.id}> content de te revoir — tu étais AFK depuis ${humanDuration(own.since)}.` +
              (mentions > 0 ? ` Tu as été mentionné **${mentions}** fois.` : ''),
            allowedMentions: { users: [message.author.id] },
          })
          .catch(() => null);
        if (back && config.autoDeleteSeconds > 0) {
          setTimeout(() => back.delete().catch(() => {}), config.autoDeleteSeconds * 1000);
        }
      }
    }

    // 2. Mentions de membres AFK.
    if (config.notifyOnMention && message.mentions.users.size > 0) {
      const lines: string[] = [];
      for (const [, user] of message.mentions.users) {
        if (user.id === message.author.id || user.bot) continue;
        const entry = afkStorage.get(message.guildId, user.id);
        if (!entry) continue;
        afkStorage.bumpMention(message.guildId, user.id);
        lines.push(`💤 **${user.username}** est AFK : ${entry.reason} *(depuis ${humanDuration(entry.since)})*`);
      }
      if (lines.length > 0) {
        const notice = await channel
          .send({ content: lines.join('\n'), allowedMentions: { parse: [] } })
          .catch(() => null);
        if (notice && config.autoDeleteSeconds > 0) {
          setTimeout(() => notice.delete().catch(() => {}), config.autoDeleteSeconds * 1000);
        }
      }
    }
  }

  /** Marque un membre AFK (via /afk). Retourne l'ancien pseudo si préfixé. */
  public async setAfk(message: Message | null, guildId: string, userId: string, reason: string): Promise<void> {
    const config = afkStorage.getConfig(guildId);
    let previousNickname: string | null = null;

    if (config.prefixNickname && message?.member && message.guild) {
      const me = message.guild.members.me;
      const member = message.member;
      const canManage =
        me?.permissions.has(PermissionFlagsBits.ManageNicknames) &&
        member.manageable &&
        message.guild.ownerId !== userId;
      if (canManage) {
        const current = member.displayName;
        if (!current.startsWith(AFK_PREFIX) && (AFK_PREFIX + current).length <= 32) {
          previousNickname = current;
          await member.setNickname(AFK_PREFIX + current, 'AFK').catch(() => {
            previousNickname = null;
          });
        }
      }
    }

    afkStorage.set({
      guildId,
      userId,
      reason: reason.slice(0, 500) || 'Absent',
      since: new Date().toISOString(),
      mentionCount: 0,
      previousNickname,
    });
  }

  private async restoreNickname(message: Message, previousNickname: string | null): Promise<void> {
    if (!previousNickname || !message.member || !message.guild) return;
    const me = message.guild.members.me;
    if (!me?.permissions.has(PermissionFlagsBits.ManageNicknames) || !message.member.manageable) return;
    await message.member.setNickname(previousNickname, 'Retour AFK').catch((err) => {
      logger.warn('[AFK] Restauration du pseudo échouée :', err);
    });
  }
}

export const afkService = new AfkService();

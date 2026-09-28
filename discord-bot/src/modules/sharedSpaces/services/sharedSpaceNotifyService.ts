import { ChannelType, Client, Guild, PermissionFlagsBits, TextChannel, Webhook } from 'discord.js';
import { logger } from '../../../utils/logger.js';
import { baseEmbed } from '../../../utils/embeds.js';
import { canBotSendTo, isSendableTarget, sendToConfiguredChannel } from '../../../utils/channelSend.js';

const WEBHOOK_NAME = 'ETHONE Espaces';

const KIND_LABEL: Record<string, string> = { task: 'Tâche', event: 'Événement', note: 'Note' };
const ACTION_LABEL: Record<string, string> = { created: 'ajoutée', completed: 'terminée' };

export interface SharedSpaceNotifyPayload {
  guildId: string;
  channelId: string;
  spaceName: string;
  kind: 'task' | 'event' | 'note';
  action: 'created' | 'completed';
  title: string;
  actorName: string;
}

// Same find-or-create-webhook pattern as discordLogService.ts, but with its
// own webhook name/cache so the two features don't fight over the same
// webhook slot in a shared channel, and without any of that module's
// per-guild routing/threshold config (not applicable here).
export class SharedSpaceNotifyService {
  private static webhookCache = new Map<string, Webhook>();

  public static async notify(client: Client, payload: SharedSpaceNotifyPayload): Promise<boolean> {
    try {
      const guild = client.guilds.cache.get(payload.guildId);
      if (!guild) return false;

      const channel = guild.channels.cache.get(payload.channelId);
      if (!channel || !isSendableTarget(channel) || channel.type === ChannelType.GuildVoice) return false;
      const textChannel = channel as TextChannel;

      const me = guild.members.me;
      if (!me || !canBotSendTo(channel, me)) return false;

      const kindLabel = KIND_LABEL[payload.kind] || payload.kind;
      const actionLabel = ACTION_LABEL[payload.action] || payload.action;
      const embed = baseEmbed('default', { footerText: 'ETHONE Espaces' }).setDescription(
        `**${kindLabel}** ${actionLabel} dans **${payload.spaceName}** par ${payload.actorName}\n> ${payload.title}`
      );

      // Webhook : salons texte uniquement (threads / forums / médias → message du bot).
      const webhook = channel.type === ChannelType.GuildText ? await this.getWebhook(textChannel, me) : null;
      if (webhook) {
        await webhook
          .send({
            username: 'ETHONE Espaces',
            avatarURL: client.user?.displayAvatarURL(),
            embeds: [embed],
            allowedMentions: { parse: [] },
          })
          .catch(async (err) => {
            logger.warn('[SharedSpaces] Envoi webhook échoué, fallback bot :', err);
            this.webhookCache.delete(textChannel.id);
            await sendToConfiguredChannel(channel, { embeds: [embed], allowedMentions: { parse: [] } }).catch(() => {});
          });
        return true;
      }

      await sendToConfiguredChannel(channel, { embeds: [embed], allowedMentions: { parse: [] } }, { postTitle: payload.spaceName });
      return true;
    } catch (err) {
      logger.error('Erreur dans SharedSpaceNotifyService.notify :', err);
      return false;
    }
  }

  private static async getWebhook(
    channel: TextChannel,
    me: NonNullable<Guild['members']['me']>
  ): Promise<Webhook | null> {
    const cached = this.webhookCache.get(channel.id);
    if (cached) return cached;

    if (!channel.permissionsFor(me)?.has(PermissionFlagsBits.ManageWebhooks)) return null;

    try {
      const existing = await channel.fetchWebhooks();
      const mine = existing.find((w) => w.owner?.id === channel.client.user?.id && w.name === WEBHOOK_NAME);
      if (mine) {
        this.webhookCache.set(channel.id, mine);
        return mine;
      }
      const created = await channel.createWebhook({
        name: WEBHOOK_NAME,
        avatar: channel.client.user?.displayAvatarURL(),
        reason: 'Notifications ETHONE Espaces',
      });
      this.webhookCache.set(channel.id, created);
      return created;
    } catch (err) {
      logger.warn(`[SharedSpaces] Impossible de créer/récupérer le webhook dans #${channel.name} :`, err);
      return null;
    }
  }
}

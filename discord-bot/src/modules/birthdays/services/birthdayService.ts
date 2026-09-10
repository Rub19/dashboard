import { Client, EmbedBuilder, NewsChannel, PermissionFlagsBits, TextChannel, ThreadChannel } from 'discord.js';
import { birthdayStorage } from '../storage/birthdayStorage.js';
import { BirthdayConfig } from '../types/birthday.js';
import { logger } from '../../../utils/logger.js';

type SendableChannel = TextChannel | NewsChannel | ThreadChannel;

function todayKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

class BirthdayService {
  private client?: Client;
  private timer?: NodeJS.Timeout;
  private processing = false;

  initialize(client: Client): void {
    this.client = client;
    if (this.timer) clearInterval(this.timer);
    // Toutes les 15 min : suffisant pour attraper l'heure d'annonce configurée.
    this.timer = setInterval(() => {
      this.tick().catch((err) => logger.error('[Birthdays] tick :', err));
    }, 15 * 60 * 1000);
    logger.info('[Birthdays] Scheduler actif (intervalle 15 min)');
  }

  destroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  private isSendable(c: unknown): c is SendableChannel {
    return (
      !!c &&
      typeof c === 'object' &&
      'isTextBased' in c &&
      typeof (c as { isTextBased: () => boolean }).isTextBased === 'function' &&
      (c as { isTextBased: () => boolean }).isTextBased() &&
      'send' in c
    );
  }

  async tick(): Promise<{ announced: number }> {
    if (this.processing || !this.client) return { announced: 0 };
    this.processing = true;
    let announced = 0;
    try {
      const now = new Date();
      const key = todayKey(now);
      for (const guild of this.client.guilds.cache.values()) {
        const config = birthdayStorage.getConfig(guild.id);
        if (!config.enabled || !config.announceChannelId) continue;
        if (config.lastAnnouncedDate === key) continue; // déjà fait aujourd'hui
        if (now.getHours() < config.announceHour) continue; // pas encore l'heure

        const celebrants = birthdayStorage.getTodays(guild.id, now);
        // Toujours nettoyer les rôles de la veille, même sans anniversaire aujourd'hui.
        await this.rotateRole(guild.id, config, celebrants.map((c) => c.userId));

        if (celebrants.length > 0) {
          const ok = await this.announce(guild.id, config, celebrants.map((c) => ({ userId: c.userId, age: c.year ? now.getFullYear() - c.year : null })));
          if (ok) announced++;
        }
        birthdayStorage.updateConfig(guild.id, { lastAnnouncedDate: key });
      }
      return { announced };
    } finally {
      this.processing = false;
    }
  }

  private async rotateRole(guildId: string, config: BirthdayConfig, newHolders: string[]): Promise<void> {
    if (!config.birthdayRoleId || !this.client) return;
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) return;
    const me = guild.members.me;
    if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) return;
    const role = guild.roles.cache.get(config.birthdayRoleId);
    if (!role || role.position >= (me.roles.highest.position ?? 0)) return;

    // Retirer aux anciens qui ne sont pas de la fournée du jour.
    for (const uid of config.currentRoleHolders) {
      if (newHolders.includes(uid)) continue;
      const member = await guild.members.fetch(uid).catch(() => null);
      await member?.roles.remove(role, 'Fin anniversaire').catch(() => {});
    }
    // Ajouter aux nouveaux.
    for (const uid of newHolders) {
      const member = await guild.members.fetch(uid).catch(() => null);
      await member?.roles.add(role, 'Anniversaire').catch(() => {});
    }
    birthdayStorage.updateConfig(guildId, { currentRoleHolders: newHolders });
  }

  private async announce(
    guildId: string,
    config: BirthdayConfig,
    celebrants: Array<{ userId: string; age: number | null }>
  ): Promise<boolean> {
    if (!this.client) return false;
    const channel = await this.client.channels.fetch(config.announceChannelId!).catch(() => null);
    if (!this.isSendable(channel)) {
      logger.warn(`[Birthdays] Salon ${config.announceChannelId} introuvable (guilde ${guildId}).`);
      return false;
    }

    const lines = celebrants.map((c) => {
      const now = new Date();
      return config.message
        .replaceAll('{user}', config.mentionUser ? `<@${c.userId}>` : `**<@${c.userId}>**`)
        .replaceAll('{age}', c.age !== null ? String(c.age) : '')
        .replaceAll('{date}', `${now.getDate()}/${now.getMonth() + 1}`)
        .trim();
    });

    const embed = new EmbedBuilder()
      .setColor('#FF6BAA')
      .setTitle('🎂 Anniversaire du jour')
      .setDescription(lines.join('\n'));

    await channel
      .send({
        content: config.mentionUser ? celebrants.map((c) => `<@${c.userId}>`).join(' ') : undefined,
        embeds: [embed],
        allowedMentions: { users: config.mentionUser ? celebrants.map((c) => c.userId) : [] },
      })
      .catch((err) => {
        logger.error(`[Birthdays] Envoi échoué (guilde ${guildId}) :`, err);
      });
    return true;
  }
}

export const birthdayService = new BirthdayService();

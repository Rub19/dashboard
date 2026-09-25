import { Client, EmbedBuilder, NewsChannel, TextChannel, ThreadChannel } from 'discord.js';
import { baseEmbed } from '../../../utils/embeds.js';
import { reminderStorage } from '../storage/reminderStorage.js';
import { Reminder, ReminderRecurrence } from '../types/reminder.js';
import { logger } from '../../../utils/logger.js';
import { isModuleEnabled } from '../../../services/moduleRegistry.js';
import { BotJobSchedulerService } from '../../../modules/botControl/services/botJobSchedulerService.js';

type SendableChannel = TextChannel | NewsChannel | ThreadChannel;

/** Parse "10m", "2h30", "1d", "3j", "1w", "90s" → millisecondes. `null` si invalide. */
export function parseDuration(raw: string): number | null {
  const value = raw.trim().toLowerCase();
  if (!value) return null;
  const re = /(\d+)\s*(s|sec|secs|m|min|mins|h|hr|hrs|d|j|day|days|jour|jours|w|sem|week|weeks)/g;
  const unitMs: Record<string, number> = {
    s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000, j: 86_400_000, w: 604_800_000,
  };
  let total = 0;
  let matched = false;
  let m: RegExpExecArray | null;
  while ((m = re.exec(value))) {
    matched = true;
    const n = Number(m[1]);
    const u = m[2][0]; // première lettre suffit (s/m/h/d/j/w)
    total += n * (unitMs[u] ?? 0);
  }
  if (!matched || total <= 0) return null;
  if (total > 365 * 86_400_000) return null; // borne à 1 an
  return total;
}

function nextOccurrence(from: Date, recurrence: ReminderRecurrence): Date | null {
  if (recurrence === 'daily') return new Date(from.getTime() + 86_400_000);
  if (recurrence === 'weekly') return new Date(from.getTime() + 604_800_000);
  return null;
}

class ReminderService {
  private client?: Client;
  private timer?: NodeJS.Timeout;
  private processing = false;

  initialize(client: Client): void {
    this.client = client;
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(BotJobSchedulerService.getInstance().track('reminders_tick', () => this.tick()), 30_000);
    logger.info('[Reminders] Scheduler actif (intervalle 30s)');
  }

  destroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  private isSendable(channel: unknown): channel is SendableChannel {
    return (
      !!channel &&
      typeof channel === 'object' &&
      'isTextBased' in channel &&
      typeof (channel as { isTextBased: () => boolean }).isTextBased === 'function' &&
      (channel as { isTextBased: () => boolean }).isTextBased() &&
      'send' in channel
    );
  }

  private buildEmbed(reminder: Reminder): EmbedBuilder {
    // Horodatage Discord (<t:…>) : affiché dans le fuseau de chaque lecteur (le texte brut d'un pied de page était en UTC).
    const createdUnix = Math.floor(new Date(reminder.createdAt).getTime() / 1000);
    const footerText =
      reminder.recurrence === 'none'
        ? 'Rappel programmé'
        : `Rappel ${reminder.recurrence === 'daily' ? 'quotidien' : 'hebdomadaire'}`;
    return baseEmbed('warning', { footerText })
      .setTitle('⏰ Rappel')
      .setDescription(reminder.recurrence === 'none' && Number.isFinite(createdUnix) ? `${reminder.message}\n\n-# Programmé <t:${createdUnix}:f>` : reminder.message);
  }

  async tick(): Promise<{ delivered: number; pruned: number }> {
    if (this.processing || !this.client) return { delivered: 0, pruned: 0 };
    this.processing = true;
    let delivered = 0;
    try {
      const now = new Date();
      for (const reminder of reminderStorage.getDue(now)) {
        // Module Rappels désactivé sur ce serveur : le rappel reste en attente et sera livré à la réactivation.
        if (!isModuleEnabled(reminder.guildId, 'reminders')) continue;
        const ok = await this.deliver(reminder);
        if (ok) delivered++;

        const next = nextOccurrence(new Date(reminder.remindAt), reminder.recurrence);
        if (next) {
          reminderStorage.update(reminder.id, {
            remindAt: next.toISOString(),
            delivered: false,
            deliveredCount: reminder.deliveredCount + 1,
          });
        } else {
          reminderStorage.update(reminder.id, {
            delivered: true,
            deliveredCount: reminder.deliveredCount + 1,
          });
        }
      }
      const pruned = reminderStorage.pruneDelivered(now);
      return { delivered, pruned };
    } finally {
      this.processing = false;
    }
  }

  private async deliver(reminder: Reminder): Promise<boolean> {
    if (!this.client) return false;
    const content = `<@${reminder.userId}>`;
    const embed = this.buildEmbed(reminder);

    // 1. Salon d'origine.
    try {
      const channel = await this.client.channels.fetch(reminder.channelId).catch(() => null);
      if (this.isSendable(channel)) {
        await channel.send({ content, embeds: [embed], allowedMentions: { users: [reminder.userId] } });
        return true;
      }
    } catch (err) {
      logger.warn(`[Reminders] Envoi salon ${reminder.channelId} échoué :`, err);
    }

    // 2. Fallback : message privé.
    try {
      const user = await this.client.users.fetch(reminder.userId);
      await user.send({ embeds: [embed] });
      return true;
    } catch {
      logger.warn(`[Reminders] Impossible de joindre l'utilisateur ${reminder.userId}.`);
      return false;
    }
  }
}

export const reminderService = new ReminderService();

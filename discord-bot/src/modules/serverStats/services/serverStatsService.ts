import { ChannelType, Client, Guild } from 'discord.js';
import { serverStatsStorage } from '../storage/serverStatsStorage.js';
import { StatChannel, StatType } from '../types/serverStats.js';
import { logger } from '../../../utils/logger.js';

export function computeStat(guild: Guild, type: StatType, roleId: string | null): number {
  const members = guild.members.cache;
  switch (type) {
    case 'members':
      return guild.memberCount;
    case 'humans':
      return members.filter((m) => !m.user.bot).size;
    case 'bots':
      return members.filter((m) => m.user.bot).size;
    case 'online':
      return members.filter((m) => m.presence && m.presence.status !== 'offline').size;
    case 'boosts':
      return guild.premiumSubscriptionCount ?? 0;
    case 'boostTier':
      return guild.premiumTier ?? 0;
    case 'roles':
      return guild.roles.cache.size - 1; // hors @everyone
    case 'channels':
      return guild.channels.cache.filter((c) => c.type !== ChannelType.GuildCategory).size;
    case 'roleMembers':
      return roleId ? (guild.roles.cache.get(roleId)?.members.size ?? 0) : 0;
    default:
      return 0;
  }
}

export function renderName(stat: StatChannel, value: number): string {
  const name = stat.template.includes('{count}')
    ? stat.template.replace('{count}', String(value))
    : `${stat.template} ${value}`;
  return name.slice(0, 100);
}

class ServerStatsService {
  private client?: Client;
  private timer?: NodeJS.Timeout;
  private processing = false;

  initialize(client: Client): void {
    this.client = client;
    if (this.timer) clearInterval(this.timer);
    // On tick toutes les 5 min ; chaque guilde n'est traitée que si son
    // updateIntervalMinutes est écoulé (limite Discord : 2 renommages / 10 min).
    this.timer = setInterval(() => {
      this.tick().catch((err) => logger.error('[ServerStats] tick :', err));
    }, 5 * 60 * 1000);
    logger.info('[ServerStats] Scheduler actif (tick 5 min)');
  }

  destroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  private lastRun = new Map<string, number>(); // guildId -> ts

  async tick(): Promise<{ renamed: number }> {
    if (this.processing || !this.client) return { renamed: 0 };
    this.processing = true;
    let renamed = 0;
    try {
      const now = Date.now();
      for (const guild of this.client.guilds.cache.values()) {
        const config = serverStatsStorage.getConfig(guild.id);
        if (!config.enabled) continue;
        const channels = serverStatsStorage.getGuild(guild.id);
        if (channels.length === 0) continue;
        const last = this.lastRun.get(guild.id) ?? 0;
        if (now - last < config.updateIntervalMinutes * 60 * 1000) continue;
        this.lastRun.set(guild.id, now);

        renamed += await this.refreshGuild(guild, channels);
      }
      return { renamed };
    } finally {
      this.processing = false;
    }
  }

  async refreshGuild(guild: Guild, channels: StatChannel[]): Promise<number> {
    let renamed = 0;
    // Certains stats ont besoin du cache membres complet.
    if (channels.some((c) => ['humans', 'bots', 'online', 'roleMembers'].includes(c.type))) {
      await guild.members.fetch().catch(() => {});
    }
    for (const stat of channels) {
      const value = computeStat(guild, stat.type, stat.roleId);
      if (stat.lastValue === value) continue;
      const channel = await guild.channels.fetch(stat.channelId).catch(() => null);
      if (!channel || channel.type === ChannelType.GuildCategory) {
        // Salon supprimé → on nettoie l'entrée.
        serverStatsStorage.delete(guild.id, stat.channelId);
        continue;
      }
      const newName = renderName(stat, value);
      if (channel.name === newName) {
        serverStatsStorage.setLastValue(guild.id, stat.channelId, value);
        continue;
      }
      const ok = await channel.setName(newName, 'Server Stats').then(() => true).catch(() => false);
      if (ok) {
        serverStatsStorage.setLastValue(guild.id, stat.channelId, value);
        renamed++;
      }
    }
    return renamed;
  }

  /** Rafraîchit immédiatement une guilde (après une modif). */
  async forceRefresh(guild: Guild): Promise<void> {
    await this.refreshGuild(guild, serverStatsStorage.getGuild(guild.id));
  }
}

export const serverStatsService = new ServerStatsService();

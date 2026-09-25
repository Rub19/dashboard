import { ChannelType, Client, Guild, PermissionFlagsBits } from 'discord.js';
import { renderTemplate, needsMemberFetch } from './counterTemplate.js';
import { serverStatsStorage } from '../storage/serverStatsStorage.js';
import { StatChannel, StatType } from '../types/serverStats.js';
import { logger } from '../../../utils/logger.js';
import { BotJobSchedulerService } from '../../../modules/botControl/services/botJobSchedulerService.js';

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

/** Nom d'un salon compteur : modèle libre (jetons) ou, pour les anciens compteurs, type fixe + {count}. */
export function computeName(guild: Guild, stat: StatChannel): { name: string; value: number | null; warnings: string[] } {
  if (stat.type === 'custom') {
    const r = renderTemplate(guild, stat.template);
    return { name: r.text, value: null, warnings: r.warnings };
  }
  const value = computeStat(guild, stat.type, stat.roleId);
  return { name: renderName(stat, value), value, warnings: [] };
}

/** Ensembles prêts à l'emploi : la catégorie « SERVER STATS » avec ses salons vocaux verrouillés. */
export interface CounterPreset {
  id: 'draftbot' | 'statbot';
  label: string;
  categoryName: string;
  templates: string[];
}

export const COUNTER_PRESETS: CounterPreset[] = [
  { id: 'draftbot', label: 'Simple : membres, humains, bots', categoryName: '📊 SERVER STATS 📊', templates: ['Tous les membres : {members}', 'Membres : {humans}', 'Bots : {bots}'] },
  {
    id: 'statbot',
    label: 'Complet : horloge, objectif, activité, top membre',
    categoryName: '📊 SERVER STATS 📊',
    templates: ['🕐 {time12:UTC} UTC', 'Membres : {members}', '{members_until:next} avant {members_next}', 'Messages 7 j : {msg:7d}', 'Top membre : {top_member:7d}'],
  },
];

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
    this.timer = setInterval(BotJobSchedulerService.getInstance().track('server_stats_tick', () => this.tick()), 5 * 60 * 1000);
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
    // Certains compteurs ont besoin du cache membres complet (une seule fois par rafraîchissement).
    if (channels.some((c) => ['humans', 'bots', 'online', 'roleMembers'].includes(c.type) || (c.type === 'custom' && needsMemberFetch(c.template)))) {
      await guild.members.fetch().catch(() => {});
    }
    for (const stat of channels) {
      const { name: newName, value } = computeName(guild, stat);
      if (stat.lastName === newName) continue;
      const channel = await guild.channels.fetch(stat.channelId).catch(() => null);
      if (!channel || channel.type === ChannelType.GuildCategory) {
        // Salon supprimé → on nettoie l'entrée.
        serverStatsStorage.delete(guild.id, stat.channelId);
        continue;
      }
      if (channel.name === newName) {
        serverStatsStorage.setLastName(guild.id, stat.channelId, newName, value ?? undefined);
        continue;
      }
      const ok = await channel.setName(newName, 'Server Stats').then(() => true).catch(() => false);
      if (ok) {
        serverStatsStorage.setLastName(guild.id, stat.channelId, newName, value ?? undefined);
        renamed++;
      }
    }
    return renamed;
  }

  /**
   * Crée la catégorie « SERVER STATS » avec des salons vocaux verrouillés (visibles, sans droit de se connecter), un par
   * modèle du préréglage, et les enregistre comme compteurs. Renvoie la catégorie et les salons créés.
   */
  async createCategory(guild: Guild, presetId: CounterPreset['id']): Promise<{ categoryId: string; channelIds: string[] }> {
    const preset = COUNTER_PRESETS.find((p) => p.id === presetId);
    if (!preset) throw new Error('Préréglage inconnu');
    const me = guild.members.me;
    if (!me?.permissions.has(PermissionFlagsBits.ManageChannels)) throw new Error('Il me faut la permission « Gérer les salons ».');
    const room = 25 - serverStatsStorage.getGuild(guild.id).length;
    if (preset.templates.length > room) throw new Error(`Pas assez de place : ${room} compteur(s) encore disponible(s) sur 25.`);

    const locked = [{ id: guild.roles.everyone.id, allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.Connect] }];
    const category = await guild.channels.create({ name: preset.categoryName, type: ChannelType.GuildCategory, permissionOverwrites: locked, reason: 'Server Stats : catégorie des compteurs' });
    const channelIds: string[] = [];
    for (const template of preset.templates) {
      const channel = await guild.channels.create({
        name: renderTemplate(guild, template).text || 'compteur',
        type: ChannelType.GuildVoice,
        parent: category.id,
        permissionOverwrites: locked,
        reason: 'Server Stats : salon compteur',
      });
      serverStatsStorage.upsert({ guildId: guild.id, channelId: channel.id, type: 'custom', template, roleId: null, lastValue: null });
      channelIds.push(channel.id);
    }
    serverStatsStorage.updateConfig(guild.id, { enabled: true });
    await this.forceRefresh(guild).catch(() => {});
    return { categoryId: category.id, channelIds };
  }

  /** Rafraîchit immédiatement une guilde (après une modif). */
  async forceRefresh(guild: Guild): Promise<void> {
    await this.refreshGuild(guild, serverStatsStorage.getGuild(guild.id));
  }
}

export const serverStatsService = new ServerStatsService();

import { Client, EmbedBuilder } from 'discord.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../../config.js';
import { logger } from '../../utils/logger.js';
import { BotJobSchedulerService } from '../botControl/services/botJobSchedulerService.js';
import { canBotSendTo, isSendableTarget, sendToConfiguredChannel } from '../../utils/channelSend.js';
import { isModuleEnabled } from '../../services/moduleRegistry.js';
import { RecapPlayer, recapButtons, valorantRecapStore } from '../valorantRecap/valorantRecapService.js';
import { riotStorage, RiotLink, RiotModeFilter } from './riotStorage.js';

export interface RiotAccount {
  puuid: string;
  name: string;
  tag: string;
  region: string;
  tier: number;
  card: string;
}

interface StoredPlayer {
  puuid: string;
  name: string;
  tag: string;
  team: string;
  agent: string;
  agentId: string;
  tier: number;
  score: number;
  kills: number;
  deaths: number;
  assists: number;
  hs: number;
  bs: number;
  ls: number;
  dmg: number;
}

interface StoredMatch {
  id: string;
  map: string;
  mapId: string;
  mode: string;
  startedAt: string | null;
  lengthSec: number;
  teams: { Red: { won: boolean; rounds: number }; Blue: { won: boolean; rounds: number } };
  players: StoredPlayer[];
  rounds: Array<{ winner: string; plant: string; defuse: string }>;
  kills: Array<{ r: number; t: number; k: string; v: string }>;
}

const RANKS: Record<number, string> = {
  3: 'Fer 1', 4: 'Fer 2', 5: 'Fer 3', 6: 'Bronze 1', 7: 'Bronze 2', 8: 'Bronze 3', 9: 'Argent 1', 10: 'Argent 2', 11: 'Argent 3',
  12: 'Or 1', 13: 'Or 2', 14: 'Or 3', 15: 'Platine 1', 16: 'Platine 2', 17: 'Platine 3', 18: 'Diamant 1', 19: 'Diamant 2',
  20: 'Diamant 3', 21: 'Ascendant 1', 22: 'Ascendant 2', 23: 'Ascendant 3', 24: 'Immortel 1', 25: 'Immortel 2', 26: 'Immortel 3', 27: 'Radiant',
};
const MODES: Record<string, string> = {
  competitive: 'Compétition', unrated: 'Non classé', swiftplay: 'Vélocité', 'spike rush': 'Spike Rush', deathmatch: 'Combat à mort',
  'team deathmatch': 'Combat à mort par équipe', escalation: 'Intensification', premier: 'Premier', replication: 'Réplication',
};
const RECENT_MS = 3 * 3600 * 1000;

export const rankName = (tier: number): string => RANKS[tier] ?? 'Non classé';

export const MODE_FILTERS: Record<RiotModeFilter, string> = {
  all: 'Tous les modes',
  competitive: 'Compétition uniquement',
  competitive_premier: 'Compétition et Premier',
  no_deathmatch: 'Tous sauf combat à mort',
};

export function modeAllowed(filter: RiotModeFilter, mode: string): boolean {
  const m = mode.toLowerCase();
  if (filter === 'competitive') return m === 'competitive';
  if (filter === 'competitive_premier') return m === 'competitive' || m === 'premier';
  if (filter === 'no_deathmatch') return !m.includes('deathmatch');
  return true;
}

class RiotService {
  private client?: Client;
  private timer?: NodeJS.Timeout;
  private running = false;
  private supabase: SupabaseClient | null = config.supabaseUrl && config.supabaseServiceRoleKey
    ? createClient(config.supabaseUrl, config.supabaseServiceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
    : null;

  get available(): boolean {
    return !!this.supabase && !!config.workerBotKey;
  }

  initialize(client: Client): void {
    this.client = client;
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(BotJobSchedulerService.getInstance().track('riot_tick', () => this.tick()), 5 * 60 * 1000);
    logger.info(`[Riot] Suivi des parties ${this.available ? 'actif' : 'inactif (clé Worker ou Supabase manquante)'}`);
  }

  async sync(query: { name: string; tag: string } | { puuid: string }, withMatches: boolean): Promise<RiotAccount | null> {
    if (!config.workerBotKey) return null;
    const params = new URLSearchParams('puuid' in query ? { puuid: query.puuid } : { name: query.name, tag: query.tag });
    if (!withMatches) params.set('matches', '0');
    const response = await fetch(`${config.workerUrl}/api/valorant/eval/sync?${params}`, {
      headers: { 'x-ethone-bot-key': config.workerBotKey, accept: 'application/json' },
      signal: AbortSignal.timeout(25_000),
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Worker ${response.status}`);
    const body = (await response.json()) as { data?: RiotAccount };
    return body.data?.puuid ? body.data : null;
  }

  async latestMatch(puuid: string): Promise<StoredMatch | null> {
    if (!this.supabase) return null;
    const { data, error } = await this.supabase
      .from('ethone_valorant_matches')
      .select('payload')
      .contains('puuids', [puuid])
      .order('started_at', { ascending: false })
      .limit(1);
    if (error) throw error;
    return (data?.[0]?.payload as StoredMatch | undefined) ?? null;
  }

  async tick(): Promise<{ posted: number }> {
    if (this.running || !this.client || !this.available) return { posted: 0 };
    this.running = true;
    let posted = 0;
    try {
      for (const guild of this.client.guilds.cache.values()) {
        const settings = riotStorage.getConfig(guild.id);
        if (!settings.enabled || !settings.auto || !settings.channelId || !isModuleEnabled(guild.id, 'riot')) continue;
        const channel = guild.channels.cache.get(settings.channelId);
        if (!channel || !isSendableTarget(channel) || !canBotSendTo(channel, guild.members.me)) continue;
        for (const link of riotStorage.listLinks(guild.id)) {
          try {
            if (await this.checkLink(link, channel, settings.modes)) posted++;
          } catch (error) {
            logger.warn(`[Riot] Suivi impossible pour ${link.name}#${link.tag} : ${(error as Error).message}`);
          }
        }
      }
    } finally {
      this.running = false;
    }
    return { posted };
  }

  private async checkLink(link: RiotLink, channel: unknown, modes: RiotModeFilter): Promise<boolean> {
    await this.sync({ puuid: link.puuid }, true);
    const match = await this.latestMatch(link.puuid);
    if (!match || match.id === link.lastMatchId) return false;
    riotStorage.setLink({ ...link, lastMatchId: match.id });
    const started = match.startedAt ? Date.parse(match.startedAt) : 0;
    if (!started || Date.now() - started > RECENT_MS || !modeAllowed(modes, match.mode)) return false;
    const payload = this.recap(match, link);
    if (!payload) return false;
    await sendToConfiguredChannel(channel, payload, { reason: 'Récap de partie Riot' });
    return true;
  }

  recap(match: StoredMatch, link: RiotLink) {
    const me = match.players.find((p) => p.puuid === link.puuid);
    if (!me) return null;
    const myTeam = me.team === 'Red' ? match.teams.Red : match.teams.Blue;
    const enemyTeam = me.team === 'Red' ? match.teams.Blue : match.teams.Red;
    const rounds = Math.max(1, match.rounds.length || myTeam.rounds + enemyTeam.rounds);
    const draw = !myTeam.won && !enemyTeam.won && myTeam.rounds === enemyTeam.rounds;
    const won = myTeam.won;
    const shots = me.hs + me.bs + me.ls;
    const acs = Math.round(me.score / rounds);
    const firstKills = new Map<number, { k: string; v: string }>();
    for (const kill of [...match.kills].sort((a, b) => a.r - b.r || a.t - b.t)) if (!firstKills.has(kill.r)) firstKills.set(kill.r, kill);
    const fk = [...firstKills.values()].filter((k) => k.k === me.puuid).length;
    const fd = [...firstKills.values()].filter((k) => k.v === me.puuid).length;
    const sorted = [...match.players].sort((a, b) => b.score - a.score);
    const teamSorted = sorted.filter((p) => p.team === me.team);
    const mvp = sorted[0]?.puuid === me.puuid ? 'MVP du match' : teamSorted[0]?.puuid === me.puuid ? 'MVP de l’équipe' : null;
    const plants = match.rounds.filter((r) => r.plant === me.puuid).length;
    const defuses = match.rounds.filter((r) => r.defuse === me.puuid).length;
    const mode = MODES[match.mode.toLowerCase()] ?? match.mode;
    const agentIcon = me.agentId ? `https://media.valorant-api.com/agents/${me.agentId}/displayicon.png` : undefined;

    const embed = new EmbedBuilder()
      .setColor(draw ? 0x8e8e93 : won ? 0x35b86b : 0xe5484d)
      .setAuthor({ name: `${me.name}#${me.tag}${mvp ? ` · ⭐ ${mvp}` : ''}`, iconURL: agentIcon })
      .setTitle(`${draw ? '⚪ ÉGALITÉ' : won ? '🟢 VICTOIRE' : '🔴 DÉFAITE'}  ${myTeam.rounds} — ${enemyTeam.rounds}`)
      .setDescription(`<@${link.userId}> · **${me.agent}** · ${mode} · ${match.map}`)
      .addFields(
        { name: '🎯 K / D / A', value: `**${me.kills} / ${me.deaths} / ${me.assists}**`, inline: true },
        { name: '⚖️ Ratio K/D', value: (me.deaths ? me.kills / me.deaths : me.kills).toFixed(2), inline: true },
        { name: '📈 ACS', value: `${acs}`, inline: true },
        { name: '💥 ADR', value: `${Math.round(me.dmg / rounds)}`, inline: true },
        { name: '🧠 HS%', value: `${shots ? Math.round((me.hs / shots) * 100) : 0} %`, inline: true },
        { name: '⚡ First kills', value: `${fk} · ${fd} morts en premier`, inline: true },
      )
      .setFooter({ text: 'E:VAL · ETHONE' })
      .setTimestamp(match.startedAt ? new Date(match.startedAt) : new Date());
    if (plants + defuses > 0) embed.addFields({ name: '💣 Spike', value: `${plants} pose · ${defuses} désamorçage`, inline: true });
    if (me.tier > 0) embed.addFields({ name: '🏅 Rang', value: rankName(me.tier), inline: true });
    if (match.lengthSec > 0) embed.addFields({ name: '⏱️ Durée', value: `${Math.round(match.lengthSec / 60)} min · ${rounds} manches`, inline: true });
    if (agentIcon) embed.setThumbnail(agentIcon);
    if (match.mapId) embed.setImage(`https://media.valorant-api.com/maps/${match.mapId}/splash.png`);

    const players: RecapPlayer[] = match.players.map((p) => {
      const pShots = p.hs + p.bs + p.ls;
      return {
        name: p.name, tag: p.tag, agent: p.agent, ally: p.team === me.team, me: p.puuid === me.puuid,
        acs: Math.round(p.score / rounds), kills: p.kills, deaths: p.deaths, assists: p.assists,
        hs: pShots ? Math.round((p.hs / pShots) * 100) : 0, adr: Math.round(p.dmg / rounds), rank: rankName(p.tier),
      };
    });
    const record = {
      title: `${draw ? 'Égalité' : won ? 'Victoire' : 'Défaite'} ${myTeam.rounds} — ${enemyTeam.rounds} · ${match.map}`,
      won,
      players,
      rounds: match.rounds.length > 1 ? match.rounds.map((r) => (r.winner === me.team ? 'W' : 'L')).join('') : '',
      createdAt: Date.now(),
    };
    const key = valorantRecapStore.add(record);
    const riotId = encodeURIComponent(`${me.name}#${me.tag}`);
    const links = [
      { label: 'Match tracker.gg', url: `https://tracker.gg/valorant/match/${match.id}` },
      { label: 'Profil', url: `https://tracker.gg/valorant/profile/riot/${riotId}/overview` },
    ];
    return { embeds: [embed], components: recapButtons(key, record, links) };
  }
}

export const riotService = new RiotService();

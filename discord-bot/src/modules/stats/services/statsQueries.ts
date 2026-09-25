import { statsStorage, dayKey, RETENTION_DAYS } from '../storage/statsStorage.js';
import { ChannelStats, DayStats, MemberStats, RankedEntry, ServerSummary, SeriesPoint } from '../types/stats.js';

/** Liste des jours (UTC, ordre chronologique) des `days` derniers jours, aujourd'hui compris. */
export function lastDays(days: number, now = new Date()): string[] {
  const n = Math.max(1, Math.min(RETENTION_DAYS, Math.floor(days)));
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(dayKey(new Date(now.getTime() - i * 86_400_000)));
  return out;
}

const hours = (seconds: number) => Math.round((seconds / 3600) * 100) / 100;

function addTo(target: Record<string, number>, source: Record<string, number>) {
  for (const [k, v] of Object.entries(source)) target[k] = (target[k] ?? 0) + v;
}

function ranked(map: Record<string, number>, limit: number): RankedEntry[] {
  return Object.entries(map)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, value]) => ({ id, value }));
}

function daysData(guildId: string, days: string[]): Array<[string, DayStats | undefined]> {
  return days.map((d) => [d, statsStorage.peekDay(guildId, d)]);
}

class StatsQueries {
  public serverSeries(guildId: string, days: number, now = new Date()): SeriesPoint[] {
    let lastMembers: number | null = null;
    return daysData(guildId, lastDays(days, now)).map(([day, d]) => {
      if (d?.members != null) lastMembers = d.members;
      return {
        day,
        messages: d?.messages ?? 0,
        voiceHours: hours(d?.voiceSec ?? 0),
        joins: d?.joins ?? 0,
        leaves: d?.leaves ?? 0,
        // Les jours sans relevé reprennent la dernière valeur connue (courbe continue).
        members: d?.members ?? lastMembers,
        activeUsers: d ? new Set([...Object.keys(d.byUser), ...Object.keys(d.voiceByUser)]).size : 0,
      };
    });
  }

  public summary(guildId: string, days: number, limit = 10, now = new Date()): ServerSummary {
    const list = lastDays(days, now);
    const msgByUser: Record<string, number> = {};
    const voiceByUser: Record<string, number> = {};
    const msgByChannel: Record<string, number> = {};
    const voiceByChannel: Record<string, number> = {};
    const active = new Set<string>();
    const totals = { messages: 0, voiceSec: 0, joins: 0, leaves: 0 };
    for (const [, d] of daysData(guildId, list)) {
      if (!d) continue;
      totals.messages += d.messages;
      totals.voiceSec += d.voiceSec;
      totals.joins += d.joins;
      totals.leaves += d.leaves;
      addTo(msgByUser, d.byUser);
      addTo(voiceByUser, d.voiceByUser);
      addTo(msgByChannel, d.byChannel);
      addTo(voiceByChannel, d.voiceByChannel);
      for (const u of Object.keys(d.byUser)) active.add(u);
      for (const u of Object.keys(d.voiceByUser)) active.add(u);
    }
    return {
      days: list.length,
      since: statsStorage.getConfig(guildId).startedAt,
      totals: { messages: totals.messages, voiceHours: hours(totals.voiceSec), joins: totals.joins, leaves: totals.leaves, activeUsers: active.size },
      series: this.serverSeries(guildId, days, now),
      topMembersMessages: ranked(msgByUser, limit),
      topMembersVoice: ranked(voiceByUser, limit).map((e) => ({ ...e, value: hours(e.value) })),
      topChannelsMessages: ranked(msgByChannel, limit),
      topChannelsVoice: ranked(voiceByChannel, limit).map((e) => ({ ...e, value: hours(e.value) })),
    };
  }

  /** Fiche d'un membre : fenêtres 1 / 7 / 60 jours, rang sur 60 jours, salons préférés et courbe des 60 derniers jours. */
  public member(guildId: string, userId: string, now = new Date()): MemberStats {
    const list = lastDays(60, now);
    const data = daysData(guildId, list);
    const win = (n: number) => {
      let messages = 0;
      let voiceSec = 0;
      for (const [, d] of data.slice(-n)) {
        messages += d?.byUser[userId] ?? 0;
        voiceSec += d?.voiceByUser[userId] ?? 0;
      }
      return { messages, voiceHours: hours(voiceSec) };
    };

    const msgByUser: Record<string, number> = {};
    const voiceByUser: Record<string, number> = {};
    const myChannels: Record<string, number> = {};
    const myVoiceChannels: Record<string, number> = {};
    const prefix = `${userId}|`;
    for (const [, d] of data) {
      if (!d) continue;
      addTo(msgByUser, d.byUser);
      addTo(voiceByUser, d.voiceByUser);
      for (const [k, v] of Object.entries(d.byUserChannel)) if (k.startsWith(prefix)) myChannels[k.slice(prefix.length)] = (myChannels[k.slice(prefix.length)] ?? 0) + v;
      for (const [k, v] of Object.entries(d.voiceByUserChannel)) if (k.startsWith(prefix)) myVoiceChannels[k.slice(prefix.length)] = (myVoiceChannels[k.slice(prefix.length)] ?? 0) + v;
    }
    const rankOf = (map: Record<string, number>): number | null => {
      const mine = map[userId] ?? 0;
      if (mine <= 0) return null;
      return 1 + Object.values(map).filter((v) => v > mine).length;
    };
    return {
      userId,
      windows: { '1': win(1), '7': win(7), '60': win(60) },
      rank: { messages: rankOf(msgByUser), voice: rankOf(voiceByUser) },
      topChannels: ranked(myChannels, 5),
      topVoiceChannels: ranked(myVoiceChannels, 5).map((e) => ({ ...e, value: hours(e.value) })),
      series: data.map(([day, d]) => ({ day, messages: d?.byUser[userId] ?? 0, voiceHours: hours(d?.voiceByUser[userId] ?? 0) })),
    };
  }

  /** Messages et heures de vocal de CHAQUE membre sur les `days` derniers jours (sert aux statroles : un seul passage pour tous). */
  public userTotals(guildId: string, days: number, now = new Date()): { messages: Record<string, number>; voiceHours: Record<string, number> } {
    const messages: Record<string, number> = {};
    const voiceSec: Record<string, number> = {};
    for (const [, d] of daysData(guildId, lastDays(days, now))) {
      if (!d) continue;
      addTo(messages, d.byUser);
      addTo(voiceSec, d.voiceByUser);
    }
    const voiceHours: Record<string, number> = {};
    for (const [id, sec] of Object.entries(voiceSec)) voiceHours[id] = sec / 3600;
    return { messages, voiceHours };
  }

  public channel(guildId: string, channelId: string, days: number, now = new Date()): ChannelStats {
    const list = lastDays(days, now);
    const msgByUser: Record<string, number> = {};
    const voiceByUser: Record<string, number> = {};
    const suffix = `|${channelId}`;
    let messages = 0;
    let voiceSec = 0;
    const series = daysData(guildId, list).map(([day, d]) => {
      const m = d?.byChannel[channelId] ?? 0;
      const v = d?.voiceByChannel[channelId] ?? 0;
      messages += m;
      voiceSec += v;
      if (d) {
        for (const [k, n] of Object.entries(d.byUserChannel)) if (k.endsWith(suffix)) msgByUser[k.slice(0, -suffix.length)] = (msgByUser[k.slice(0, -suffix.length)] ?? 0) + n;
        for (const [k, n] of Object.entries(d.voiceByUserChannel)) if (k.endsWith(suffix)) voiceByUser[k.slice(0, -suffix.length)] = (voiceByUser[k.slice(0, -suffix.length)] ?? 0) + n;
      }
      return { day, messages: m, voiceHours: hours(v) };
    });
    return {
      channelId,
      days: list.length,
      totals: { messages, voiceHours: hours(voiceSec) },
      series,
      topMembersMessages: ranked(msgByUser, 10),
      topMembersVoice: ranked(voiceByUser, 10).map((e) => ({ ...e, value: hours(e.value) })),
    };
  }
}

export const statsQueries = new StatsQueries();

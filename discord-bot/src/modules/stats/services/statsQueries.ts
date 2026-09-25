import { statsStorage, dayKey, RETENTION_DAYS } from '../storage/statsStorage.js';
import { ChampionKind, Champions, ChannelStats, DayStats, Insights, MemberRow, MemberStats, PeriodTotals, RankedEntry, ServerSummary, SeriesPoint } from '../types/stats.js';

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

const pct = (now: number, before: number): number | null => (before > 0 ? Math.round(((now - before) / before) * 1000) / 10 : null);

class StatsQueries {
  /** Totaux d'une liste de jours. */
  private totalsOf(guildId: string, list: string[]): PeriodTotals {
    const active = new Set<string>();
    let messages = 0;
    let voiceSec = 0;
    let joins = 0;
    let leaves = 0;
    for (const [, d] of daysData(guildId, list)) {
      if (!d) continue;
      messages += d.messages;
      voiceSec += d.voiceSec;
      joins += d.joins;
      leaves += d.leaves;
      for (const u of Object.keys(d.byUser)) active.add(u);
      for (const u of Object.keys(d.voiceByUser)) active.add(u);
    }
    return { messages, voiceHours: hours(voiceSec), joins, leaves, activeUsers: active.size };
  }

  /** Comparaison avec la période précédente de même durée, records, rythme de la semaine et carte de chaleur. */
  public insights(guildId: string, days: number, now = new Date()): Insights {
    const n = Math.max(1, Math.min(RETENTION_DAYS, Math.floor(days)));
    const list = lastDays(n, now);
    const previousList = lastDays(n * 2, now).slice(0, n);
    const current = this.totalsOf(guildId, list);
    const previous = this.totalsOf(guildId, previousList);

    const weekday = Array.from({ length: 7 }, (_, i) => ({ weekday: i, messages: 0, voiceHours: 0 }));
    const hoursArr = Array.from({ length: 24 }, (_, h) => ({ hour: h, messages: 0, voiceHours: 0 }));
    const heatmap = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
    const msgByUser: Record<string, number> = {};
    let best: { day: string; value: number } | null = null;
    let bestVoice: { day: string; value: number } | null = null;
    let bestJoin: { day: string; value: number } | null = null;
    let streak = 0;
    let longest = 0;
    let hasHourly = false;

    for (const [day, d] of daysData(guildId, list)) {
      const wd = (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7; // lundi = 0
      if (d) {
        weekday[wd].messages += d.messages;
        weekday[wd].voiceHours += d.voiceSec / 3600;
        for (let h = 0; h < 24; h++) {
          const m = d.byHour?.[h] ?? 0;
          const v = d.voiceByHour?.[h] ?? 0;
          if (m > 0 || v > 0) hasHourly = true;
          heatmap[wd][h] += m;
          hoursArr[h].messages += m;
          hoursArr[h].voiceHours += v / 3600;
        }
        addTo(msgByUser, d.byUser);
        if (d.messages > (best?.value ?? 0)) best = { day, value: d.messages };
        if (d.voiceSec > (bestVoice ? bestVoice.value * 3600 : 0)) bestVoice = { day, value: hours(d.voiceSec) };
        if (d.joins > (bestJoin?.value ?? 0)) bestJoin = { day, value: d.joins };
      }
      const activeThatDay = d && (d.messages > 0 || d.voiceSec > 0);
      streak = activeThatDay ? streak + 1 : 0;
      longest = Math.max(longest, streak);
    }

    const counts = Object.values(msgByUser).sort((a, b) => b - a);
    const totalMsgs = counts.reduce((a, b) => a + b, 0);
    const topN = Math.max(1, Math.ceil(counts.length * 0.1));
    return {
      days: list.length,
      current,
      previous,
      change: {
        messages: pct(current.messages, previous.messages),
        voiceHours: pct(current.voiceHours, previous.voiceHours),
        joins: pct(current.joins, previous.joins),
        leaves: pct(current.leaves, previous.leaves),
        activeUsers: pct(current.activeUsers, previous.activeUsers),
      },
      averages: {
        messagesPerDay: Math.round((current.messages / list.length) * 10) / 10,
        voiceHoursPerDay: Math.round((current.voiceHours / list.length) * 100) / 100,
        messagesPerActiveMember: current.activeUsers > 0 ? Math.round((current.messages / current.activeUsers) * 10) / 10 : 0,
      },
      records: { bestMessageDay: best, bestVoiceDay: bestVoice, bestJoinDay: bestJoin, longestActiveStreak: longest },
      concentration: { topTenPercentShare: totalMsgs > 0 ? Math.round((counts.slice(0, topN).reduce((a, b) => a + b, 0) / totalMsgs) * 1000) / 10 : null, membersCounted: counts.length },
      weekday: weekday.map((w) => ({ ...w, voiceHours: Math.round(w.voiceHours * 100) / 100 })),
      hours: hoursArr.map((h) => ({ ...h, voiceHours: Math.round(h.voiceHours * 100) / 100 })),
      heatmap,
      hasHourly,
    };
  }

  /**
   * Podiums : meilleur bavard, plus présent en vocal, meilleur score d'activité, plus régulier, et « en progression »
   * (plus forte hausse de messages par rapport à la période précédente, à partir de 20 messages).
   */
  public champions(guildId: string, days: number, now = new Date()): Champions {
    const top = (sort: 'messages' | 'voice' | 'active' | 'score') => {
      const { rows } = this.leaderboard(guildId, days, sort, now);
      const value = (r: MemberRow) => (sort === 'voice' ? r.voiceHours : sort === 'active' ? r.activeDays : sort === 'score' ? r.score : r.messages);
      return rows.slice(0, 3).filter((r) => value(r) > 0).map((r) => ({ id: r.id, value: value(r) }));
    };
    const n = Math.max(1, Math.min(RETENTION_DAYS, Math.floor(days)));
    const previous: Record<string, number> = {};
    for (const [, d] of daysData(guildId, lastDays(n * 2, now).slice(0, n))) if (d) addTo(previous, d.byUser);
    const current = this.leaderboard(guildId, days, 'messages', now).rows;
    const rising = current
      .filter((r) => r.messages >= 20)
      .map((r) => ({ id: r.id, value: r.messages - (previous[r.id] ?? 0) }))
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);
    const categories: Record<ChampionKind, Array<{ id: string; value: number }>> = {
      messages: top('messages'),
      voice: top('voice'),
      score: top('score'),
      active: top('active'),
      rising,
    };
    return { days: n, categories };
  }

  /** Classement complet des membres sur la période : messages, vocal, parts du serveur, jours actifs. Trié puis tronqué. */
  public leaderboard(guildId: string, days: number, sort: 'messages' | 'voice' | 'active' | 'score', now = new Date()): { rows: MemberRow[]; totalMessages: number; totalVoiceHours: number; members: number } {
    const list = lastDays(days, now);
    const msg: Record<string, number> = {};
    const voiceSec: Record<string, number> = {};
    const activeDays: Record<string, number> = {};
    let totalMessages = 0;
    let totalVoiceSec = 0;
    for (const [, d] of daysData(guildId, list)) {
      if (!d) continue;
      totalMessages += d.messages;
      totalVoiceSec += d.voiceSec;
      addTo(msg, d.byUser);
      addTo(voiceSec, d.voiceByUser);
      for (const u of new Set([...Object.keys(d.byUser), ...Object.keys(d.voiceByUser)])) activeDays[u] = (activeDays[u] ?? 0) + 1;
    }
    const ids = [...new Set([...Object.keys(msg), ...Object.keys(voiceSec)])];
    const rows: MemberRow[] = ids.map((id) => ({
      id,
      messages: msg[id] ?? 0,
      voiceHours: hours(voiceSec[id] ?? 0),
      messageShare: totalMessages > 0 ? Math.round(((msg[id] ?? 0) / totalMessages) * 1000) / 10 : 0,
      voiceShare: totalVoiceSec > 0 ? Math.round(((voiceSec[id] ?? 0) / totalVoiceSec) * 1000) / 10 : 0,
      score: Math.round((msg[id] ?? 0) + (voiceSec[id] ?? 0) / 120),
      activeDays: activeDays[id] ?? 0,
    }));
    const key = sort === 'voice' ? (r: MemberRow) => r.voiceHours : sort === 'active' ? (r: MemberRow) => r.activeDays : sort === 'score' ? (r: MemberRow) => r.score : (r: MemberRow) => r.messages;
    rows.sort((a, b) => key(b) - key(a) || b.messages - a.messages || b.voiceHours - a.voiceHours);
    return { rows, totalMessages, totalVoiceHours: hours(totalVoiceSec), members: ids.length };
  }

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

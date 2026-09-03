import { Client } from 'discord.js';
import {
  AnalyticsKPI,
  AnalyticsOverview,
  HourlyBucket,
  TimeSeriesPoint,
  TimeRangePeriod,
  TopChannelStat,
} from '../types/analytics.js';
import { analyticsWriteBuffer } from '../storage/analyticsWriteBuffer.js';
import { sanctionService } from '../../moderation/sanctions/sanctionService.js';
import { AnalyticsHealthScore } from './analyticsHealthScore.js';
import { AnalyticsInsightsEngine } from './analyticsInsightsEngine.js';

export class AnalyticsAggregator {
  public static buildOverview(
    guildId: string,
    period: TimeRangePeriod,
    client: Client
  ): AnalyticsOverview {
    const now = Date.now();
    const durationMs = this.getPeriodDurationMs(period);

    const currentStart = new Date(now - durationMs);
    const previousStart = new Date(now - durationMs * 2);

    // Récupérer les buckets depuis le début de la période précédente pour la comparaison
    const allBuckets = analyticsWriteBuffer.getBuckets(guildId, previousStart.toISOString());

    const currentBuckets = allBuckets.filter(
      (b) => new Date(b.hourIso).getTime() >= currentStart.getTime()
    );
    const previousBuckets = allBuckets.filter(
      (b) =>
        new Date(b.hourIso).getTime() >= previousStart.getTime() &&
        new Date(b.hourIso).getTime() < currentStart.getTime()
    );

    // 1. Sommes Période Actuelle
    const messagesCurrent = currentBuckets.reduce((sum, b) => sum + b.messagesCount, 0);
    const commandsCurrent = currentBuckets.reduce((sum, b) => sum + b.commandsCount, 0);
    const joinsCurrent = currentBuckets.reduce((sum, b) => sum + b.joinsCount, 0);
    const leavesCurrent = currentBuckets.reduce((sum, b) => sum + b.leavesCount, 0);
    const voiceMinutesCurrent = currentBuckets.reduce((sum, b) => sum + b.voiceMinutes, 0);
    const modCurrent = currentBuckets.reduce((sum, b) => sum + b.moderationActionsCount, 0);
    const secCurrent = currentBuckets.reduce((sum, b) => sum + b.securityIncidentsCount, 0);
    const ticketsCurrent = currentBuckets.reduce((sum, b) => sum + b.ticketsCreatedCount, 0);

    const activeUserSetCurrent = new Set<string>();
    for (const b of currentBuckets) {
      for (const u of b.activeUserIds) activeUserSetCurrent.add(u);
    }
    const activeUsersCurrent = activeUserSetCurrent.size;

    // 2. Sommes Période Précédente
    const messagesPrev = previousBuckets.reduce((sum, b) => sum + b.messagesCount, 0);
    const commandsPrev = previousBuckets.reduce((sum, b) => sum + b.commandsCount, 0);
    const joinsPrev = previousBuckets.reduce((sum, b) => sum + b.joinsCount, 0);
    const leavesPrev = previousBuckets.reduce((sum, b) => sum + b.leavesCount, 0);
    const voiceMinutesPrev = previousBuckets.reduce((sum, b) => sum + b.voiceMinutes, 0);
    const modPrev = previousBuckets.reduce((sum, b) => sum + b.moderationActionsCount, 0);
    const secPrev = previousBuckets.reduce((sum, b) => sum + b.securityIncidentsCount, 0);
    const ticketsPrev = previousBuckets.reduce((sum, b) => sum + b.ticketsCreatedCount, 0);

    const activeUserSetPrev = new Set<string>();
    for (const b of previousBuckets) {
      for (const u of b.activeUserIds) activeUserSetPrev.add(u);
    }
    const activeUsersPrev = activeUserSetPrev.size;

    // Récupérer le membre count réel sur Discord
    const guild = client.guilds.cache.get(guildId);
    const currentMemberCount = guild ? guild.memberCount : 0;
    const netGrowth = joinsCurrent - leavesCurrent;
    const previousMemberCount = Math.max(0, currentMemberCount - netGrowth);

    // 3. Construction des KPIs
    const kpis = {
      members: this.createKpi('Membres', currentMemberCount, previousMemberCount),
      activeUsers: this.createKpi('Membres Actifs', activeUsersCurrent, activeUsersPrev),
      messages: this.createKpi('Messages', messagesCurrent, messagesPrev),
      commands: this.createKpi('Commandes', commandsCurrent, commandsPrev),
      voiceHours: this.createKpi(
        'Heures Vocales',
        Math.round((voiceMinutesCurrent / 60) * 10) / 10,
        Math.round((voiceMinutesPrev / 60) * 10) / 10,
        'h'
      ),
      moderationActions: this.createKpi('Sanctions Modération', modCurrent, modPrev),
      tickets: this.createKpi('Tickets Support', ticketsCurrent, ticketsPrev),
      securityIncidents: this.createKpi('Incidents Sécurité', secCurrent, secPrev),
    };

    // 4. TimeSeries
    const timeSeries = this.buildTimeSeries(currentBuckets, period, currentStart, now);

    // 5. Top Channels
    const channelMap: Record<string, number> = {};
    for (const b of currentBuckets) {
      for (const [cid, cnt] of Object.entries(b.channelMessageCounts)) {
        channelMap[cid] = (channelMap[cid] || 0) + cnt;
      }
    }

    const totalChannelMessages = Object.values(channelMap).reduce((a, b) => a + b, 0);
    const topChannels: TopChannelStat[] = Object.entries(channelMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cid, count]) => {
        const chan = guild?.channels.cache.get(cid);
        const name = chan ? chan.name : `salon-${cid.substring(0, 5)}`;
        const percentage =
          totalChannelMessages > 0 ? Math.round((count / totalChannelMessages) * 100) : 0;
        return {
          channelId: cid,
          channelName: name,
          messageCount: count,
          percentage,
        };
      });

    // 6. Peak Heatmap (7 jours x 24 heures)
    const peakHeatmap = this.buildPeakHeatmap(currentBuckets);

    // Trouver l'heure de pic principale
    const hourTotals = new Array(24).fill(0);
    for (const cell of peakHeatmap) {
      hourTotals[cell.hour] += cell.value;
    }
    let peakHour = 20; // 20h par défaut
    let maxHourVal = -1;
    for (let h = 0; h < 24; h++) {
      if (hourTotals[h] > maxHourVal) {
        maxHourVal = hourTotals[h];
        peakHour = h;
      }
    }

    // 7. Modération Breakdown
    const counts = sanctionService.getCounts(guildId);
    const moderationBreakdown: Record<string, number> = {
      warn: counts.warnings,
      timeout: counts.timeouts,
      kick: counts.kicks,
      ban: counts.bans,
    };

    // 8. Top Commands
    const cmdMap: Record<string, number> = {};
    for (const b of currentBuckets) {
      for (const [cmd, cnt] of Object.entries(b.commandCounts)) {
        cmdMap[cmd] = (cmdMap[cmd] || 0) + cnt;
      }
    }
    const totalCmds = Object.values(cmdMap).reduce((a, b) => a + b, 0);
    const topCommands = Object.entries(cmdMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([command, count]) => ({
        command,
        count,
        percentage: totalCmds > 0 ? Math.round((count / totalCmds) * 100) : 0,
      }));

    // 9. Score de santé
    const healthScore = AnalyticsHealthScore.calculate({
      messagesCurrent,
      messagesPrevious: messagesPrev,
      joinsCurrent,
      leavesCurrent,
      activeUsersCount: activeUsersCurrent,
      moderationActionsCount: modCurrent,
      securityIncidentsCount: secCurrent,
      memberCount: currentMemberCount,
    });

    // 10. Insights automatiques
    const insights = AnalyticsInsightsEngine.generate({
      period,
      messagesCurrent,
      messagesPrevious: messagesPrev,
      topChannel: topChannels[0]
        ? { name: topChannels[0].channelName, percentage: topChannels[0].percentage }
        : undefined,
      peakHour: maxHourVal > 0 ? peakHour : undefined,
      joinsCurrent,
      leavesCurrent,
      moderationCount: modCurrent,
      securityIncidentsCount: secCurrent,
    });

    // 11. Bot Health
    const memUsage = process.memoryUsage();
    const memoryMb = Math.round(memUsage.heapUsed / 1024 / 1024);
    const pingMs = Math.round(client.ws.ping) || 15;

    return {
      period,
      healthScore,
      kpis,
      insights,
      timeSeries,
      topChannels,
      peakHeatmap,
      moderationBreakdown,
      topCommands,
      botHealth: {
        uptimeSeconds: Math.floor(process.uptime()),
        pingMs,
        memoryMb,
        status: pingMs < 200 ? 'healthy' : 'degraded',
      },
    };
  }

  private static getPeriodDurationMs(period: TimeRangePeriod): number {
    switch (period) {
      case '24h':
        return 24 * 60 * 60 * 1000;
      case '7d':
        return 7 * 24 * 60 * 60 * 1000;
      case '30d':
        return 30 * 24 * 60 * 60 * 1000;
      case '90d':
        return 90 * 24 * 60 * 60 * 1000;
    }
  }

  private static createKpi(
    label: string,
    current: number,
    previous: number,
    unit?: string
  ): AnalyticsKPI {
    let percentageChange = 0;
    if (previous > 0) {
      percentageChange = Math.round(((current - previous) / previous) * 1000) / 10;
    } else if (current > 0) {
      percentageChange = 100;
    }

    let trend: 'up' | 'down' | 'neutral' = 'neutral';
    if (percentageChange > 0) trend = 'up';
    else if (percentageChange < 0) trend = 'down';

    return {
      label,
      current,
      previous,
      percentageChange,
      trend,
      unit,
    };
  }

  private static buildTimeSeries(
    buckets: HourlyBucket[],
    period: TimeRangePeriod,
    start: Date,
    endMs: number
  ): TimeSeriesPoint[] {
    const pointsCount = period === '24h' ? 24 : period === '7d' ? 7 : 14;
    const stepMs = (endMs - start.getTime()) / pointsCount;
    const points: TimeSeriesPoint[] = [];

    for (let i = 0; i < pointsCount; i++) {
      const pStart = start.getTime() + i * stepMs;
      const pEnd = pStart + stepMs;

      const matching = buckets.filter((b) => {
        const t = new Date(b.hourIso).getTime();
        return t >= pStart && t < pEnd;
      });

      const userSet = new Set<string>();
      for (const b of matching) {
        for (const u of b.activeUserIds) userSet.add(u);
      }

      const d = new Date(pStart);
      const label =
        period === '24h'
          ? `${d.getHours()}h`
          : `${d.getDate()}/${d.getMonth() + 1}`;

      points.push({
        timestamp: label,
        messages: matching.reduce((s, b) => s + b.messagesCount, 0),
        commands: matching.reduce((s, b) => s + b.commandsCount, 0),
        activeUsers: userSet.size,
        joins: matching.reduce((s, b) => s + b.joinsCount, 0),
        leaves: matching.reduce((s, b) => s + b.leavesCount, 0),
        voiceHours:
          Math.round((matching.reduce((s, b) => s + b.voiceMinutes, 0) / 60) * 10) / 10,
      });
    }

    return points;
  }

  private static buildPeakHeatmap(
    buckets: HourlyBucket[]
  ): Array<{ day: number; hour: number; value: number }> {
    // 7 jours (0 = Dimanche .. 6 = Samedi) x 24 heures (0..23)
    const grid: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));

    for (const b of buckets) {
      const d = new Date(b.hourIso);
      const day = d.getDay();
      const hour = d.getHours();
      grid[day][hour] += b.messagesCount + b.commandsCount;
    }

    const flat: Array<{ day: number; hour: number; value: number }> = [];
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        flat.push({
          day,
          hour,
          value: grid[day][hour],
        });
      }
    }

    return flat;
  }
}

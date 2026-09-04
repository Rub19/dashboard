import { moderationRepository } from '../storage/moderationRepository.js';
import { ModerationCase } from '../types/case.js';

export class ModerationAnalytics {
  public static getOverviewStats(guildId: string) {
    const { cases } = moderationRepository.getCases(guildId, { limit: 10000 });
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTodayMs = startOfToday.getTime();

    const casesToday = cases.filter((c) => new Date(c.createdAt).getTime() >= startOfTodayMs);
    const activeSanctions = cases.filter((c) => c.status === 'ACTIVE');

    const warnings = cases.filter((c) => c.action === 'WARN').length;
    const timeouts = cases.filter((c) => c.action === 'TIMEOUT').length;
    const kicks = cases.filter((c) => c.action === 'KICK').length;
    const bans = cases.filter((c) => c.action === 'BAN' || c.action === 'SOFTBAN').length;
    const quarantines = cases.filter((c) => c.action === 'QUARANTINE').length;

    // Calculer les sanctions manuelles vs automatiques
    const manualCount = cases.filter((c) => c.source === 'MANUAL').length;
    const autoCount = cases.filter((c) => c.source !== 'MANUAL').length;

    return {
      totalCases: cases.length,
      casesToday: casesToday.length,
      activeSanctionsCount: activeSanctions.length,
      counts: {
        warnings,
        timeouts,
        kicks,
        bans,
        quarantines,
      },
      sources: {
        manual: manualCount,
        automated: autoCount,
      },
    };
  }

  public static getPeriodTrends(guildId: string, days = 7) {
    const { cases } = moderationRepository.getCases(guildId, { limit: 10000 });
    const now = Date.now();
    const periodStart = now - days * 86400000;
    const inPeriod = cases.filter((c) => new Date(c.createdAt).getTime() >= periodStart);

    // Regrouper par jour (YYYY-MM-DD)
    const byDay: Record<string, number> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      const key = d.toISOString().split('T')[0];
      byDay[key] = 0;
    }

    for (const c of inPeriod) {
      const key = c.createdAt.split('T')[0];
      if (byDay[key] !== undefined) {
        byDay[key]++;
      }
    }

    // Top motifs
    const reasonsMap: Record<string, number> = {};
    for (const c of inPeriod) {
      const r = c.standardCategory || 'Other';
      reasonsMap[r] = (reasonsMap[r] || 0) + 1;
    }
    const topReasons = Object.entries(reasonsMap)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Distribution par type
    const byAction: Record<string, number> = {};
    for (const c of inPeriod) {
      byAction[c.action] = (byAction[c.action] || 0) + 1;
    }

    return {
      days,
      totalInPeriod: inPeriod.length,
      dailyTrend: Object.entries(byDay).map(([date, count]) => ({ date, count })),
      byAction,
      topReasons,
    };
  }

  public static getStaffPerformance(guildId: string) {
    const { cases } = moderationRepository.getCases(guildId, { limit: 10000 });

    const staffMap = new Map<
      string,
      {
        moderatorId: string;
        moderatorTag: string;
        totalCases: number;
        warnings: number;
        timeouts: number;
        kicks: number;
        bans: number;
        quarantines: number;
        lastActive: string;
      }
    >();

    for (const c of cases) {
      if (c.source !== 'MANUAL') continue; // Uniquement staff humain
      const modId = c.moderatorId;
      let record = staffMap.get(modId);
      if (!record) {
        record = {
          moderatorId: modId,
          moderatorTag: c.moderatorTag,
          totalCases: 0,
          warnings: 0,
          timeouts: 0,
          kicks: 0,
          bans: 0,
          quarantines: 0,
          lastActive: c.createdAt,
        };
        staffMap.set(modId, record);
      }

      record.totalCases++;
      if (c.action === 'WARN') record.warnings++;
      if (c.action === 'TIMEOUT') record.timeouts++;
      if (c.action === 'KICK') record.kicks++;
      if (c.action === 'BAN' || c.action === 'SOFTBAN') record.bans++;
      if (c.action === 'QUARANTINE') record.quarantines++;
      if (new Date(c.createdAt).getTime() > new Date(record.lastActive).getTime()) {
        record.lastActive = c.createdAt;
      }
    }

    return Array.from(staffMap.values()).sort((a, b) => b.totalCases - a.totalCases);
  }
}

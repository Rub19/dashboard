import { ServerHealthScore } from '../types/analytics.js';

export class AnalyticsHealthScore {
  public static calculate(data: {
    messagesCurrent: number;
    messagesPrevious: number;
    joinsCurrent: number;
    leavesCurrent: number;
    activeUsersCount: number;
    moderationActionsCount: number;
    securityIncidentsCount: number;
    memberCount: number;
  }): ServerHealthScore {
    let score = 75; // Base équilibrée
    const factors: Array<{ label: string; impact: number; isPositive: boolean }> = [];

    // 1. Croissance nette des membres
    const netGrowth = data.joinsCurrent - data.leavesCurrent;
    if (netGrowth > 0) {
      const boost = Math.min(10, Math.max(2, netGrowth * 2));
      score += boost;
      factors.push({ label: `Croissance nette positive (+${netGrowth} membre(s))`, impact: boost, isPositive: true });
    } else if (netGrowth < 0) {
      const penalty = Math.min(10, Math.abs(netGrowth) * 2);
      score -= penalty;
      factors.push({ label: `Départs supérieurs aux arrivées (${netGrowth} membre(s))`, impact: penalty, isPositive: false });
    } else {
      factors.push({ label: 'Effectif stable', impact: 0, isPositive: true });
    }

    // 2. Tendance d'activité des messages
    if (data.messagesPrevious > 0) {
      const diffPct = ((data.messagesCurrent - data.messagesPrevious) / data.messagesPrevious) * 100;
      if (diffPct >= 15) {
        score += 8;
        factors.push({ label: `Hausse marquée de l'activité (+${Math.round(diffPct)}%)`, impact: 8, isPositive: true });
      } else if (diffPct <= -15) {
        score -= 8;
        factors.push({ label: `Baisse de l'activité (${Math.round(diffPct)}%)`, impact: 8, isPositive: false });
      }
    } else if (data.messagesCurrent > 10) {
      score += 5;
      factors.push({ label: 'Activité communautaire soutenue', impact: 5, isPositive: true });
    }

    // 3. Modération & Climat du serveur
    if (data.moderationActionsCount === 0) {
      score += 5;
      factors.push({ label: 'Ambiance saine, aucune sanction requise', impact: 5, isPositive: true });
    } else if (data.moderationActionsCount > 50) {
      score -= 8;
      factors.push({ label: 'Volume élevé de sanctions de modération', impact: 8, isPositive: false });
    }

    // 4. Incidents de sécurité & Raids
    if (data.securityIncidentsCount === 0) {
      score += 5;
      factors.push({ label: 'Sécurité optimale, zéro incident ou raid', impact: 5, isPositive: true });
    } else {
      const secPenalty = Math.min(15, data.securityIncidentsCount * 5);
      score -= secPenalty;
      factors.push({ label: `Menaces ou incidents de sécurité détectés (${data.securityIncidentsCount})`, impact: secPenalty, isPositive: false });
    }

    const finalScore = Math.min(100, Math.max(10, Math.round(score)));

    let status: 'excellent' | 'good' | 'average' | 'critical' = 'good';
    if (finalScore >= 85) status = 'excellent';
    else if (finalScore >= 70) status = 'good';
    else if (finalScore >= 50) status = 'average';
    else status = 'critical';

    return {
      score: finalScore,
      status,
      factors,
    };
  }
}

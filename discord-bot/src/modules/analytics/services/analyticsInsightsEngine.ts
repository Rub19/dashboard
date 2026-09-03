import { AutomaticInsight, TimeRangePeriod } from '../types/analytics.js';

export class AnalyticsInsightsEngine {
  public static generate(data: {
    period: TimeRangePeriod;
    messagesCurrent: number;
    messagesPrevious: number;
    topChannel?: { name: string; percentage: number };
    peakHour?: number;
    joinsCurrent: number;
    leavesCurrent: number;
    moderationCount: number;
    securityIncidentsCount: number;
  }): AutomaticInsight[] {
    const insights: AutomaticInsight[] = [];

    // 1. Tendance d'activité
    if (data.messagesPrevious > 0) {
      const diffPct = Math.round(
        ((data.messagesCurrent - data.messagesPrevious) / data.messagesPrevious) * 100
      );
      if (diffPct > 0) {
        insights.push({
          id: 'ins_act_up',
          type: 'activity',
          text: `L'activité du serveur a augmenté de +${diffPct}% par rapport à la période précédente.`,
          trend: 'positive',
        });
      } else if (diffPct < 0) {
        insights.push({
          id: 'ins_act_down',
          type: 'activity',
          text: `L'activité des messages affiche une baisse de ${diffPct}% sur cette période.`,
          trend: 'warning',
        });
      }
    } else if (data.messagesCurrent > 0) {
      insights.push({
        id: 'ins_act_init',
        type: 'activity',
        text: `Un total de ${data.messagesCurrent.toLocaleString()} message(s) a été enregistré sur la période sélectionnée.`,
        trend: 'neutral',
      });
    }

    // 2. Salon le plus actif
    if (data.topChannel && data.topChannel.percentage > 0) {
      insights.push({
        id: 'ins_top_chan',
        type: 'activity',
        text: `#${data.topChannel.name} concentre ${data.topChannel.percentage}% du volume total des échanges écrits.`,
        trend: 'neutral',
      });
    }

    // 3. Pic d'activité horaire
    if (data.peakHour !== undefined && data.peakHour >= 0) {
      const nextH = (data.peakHour + 2) % 24;
      insights.push({
        id: 'ins_peak_hour',
        type: 'peak',
        text: `Votre pic d'activité principal se situe généralement entre ${data.peakHour}h00 et ${nextH}h00.`,
        trend: 'positive',
      });
    }

    // 4. Croissance des membres
    const net = data.joinsCurrent - data.leavesCurrent;
    if (data.joinsCurrent > 0) {
      insights.push({
        id: 'ins_growth',
        type: 'growth',
        text: `${data.joinsCurrent} nouveau(x) membre(s) ont rejoint la communauté (croissance nette : ${net >= 0 ? `+${net}` : net}).`,
        trend: net >= 0 ? 'positive' : 'warning',
      });
    }

    // 5. Climat modération & sécurité
    if (data.securityIncidentsCount > 0) {
      insights.push({
        id: 'ins_sec',
        type: 'security',
        text: `Le système Anti-Raid et sécurité a intercepté ${data.securityIncidentsCount} incident(s) suspect(s).`,
        trend: 'warning',
      });
    } else if (data.moderationCount > 0) {
      insights.push({
        id: 'ins_mod',
        type: 'moderation',
        text: `${data.moderationCount} intervention(s) de modération ont permis de maintenir l'ordre sur le serveur.`,
        trend: 'positive',
      });
    } else {
      insights.push({
        id: 'ins_calm',
        type: 'moderation',
        text: 'Le serveur bénéficie d’un environnement calme sans infraction majeure signalée.',
        trend: 'positive',
      });
    }

    return insights;
  }
}

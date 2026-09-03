import { Client, Message } from 'discord.js';
import { AnalyticsOverview, TimeRangePeriod } from '../types/analytics.js';
import { analyticsWriteBuffer } from '../storage/analyticsWriteBuffer.js';
import { AnalyticsAggregator } from './analyticsAggregator.js';

class AnalyticsService {
  public recordMessage(message: Message): void {
    if (!message.guild || message.author.bot) return;
    analyticsWriteBuffer.recordMessage(message.guild.id, message.channel.id, message.author.id);
  }

  public recordCommand(guildId: string, commandName: string, userId: string): void {
    analyticsWriteBuffer.recordCommand(guildId, commandName, userId);
  }

  public recordJoin(guildId: string, userId: string): void {
    analyticsWriteBuffer.recordJoin(guildId, userId);
  }

  public recordLeave(guildId: string, userId: string): void {
    analyticsWriteBuffer.recordLeave(guildId, userId);
  }

  public recordVoiceMinutes(guildId: string, minutes: number, userId: string): void {
    analyticsWriteBuffer.recordVoiceMinutes(guildId, minutes, userId);
  }

  public recordModerationAction(guildId: string): void {
    analyticsWriteBuffer.recordModerationAction(guildId);
  }

  public recordSecurityIncident(guildId: string): void {
    analyticsWriteBuffer.recordSecurityIncident(guildId);
  }

  public recordTicketCreated(guildId: string): void {
    analyticsWriteBuffer.recordTicketCreated(guildId);
  }

  public getOverview(guildId: string, period: TimeRangePeriod, client: Client): AnalyticsOverview {
    return AnalyticsAggregator.buildOverview(guildId, period, client);
  }

  public exportData(
    guildId: string,
    period: TimeRangePeriod,
    format: 'json' | 'csv',
    client: Client
  ): { contentType: string; content: string; filename: string } {
    const overview = this.getOverview(guildId, period, client);
    const dateStr = new Date().toISOString().split('T')[0];

    if (format === 'json') {
      return {
        contentType: 'application/json',
        content: JSON.stringify(overview, null, 2),
        filename: `analytics-${guildId}-${period}-${dateStr}.json`,
      };
    }

    // Export CSV
    let csv = 'Periode;Messages;MembresActifs;Commandes;Arrivees;Departs;HeuresVocales\n';
    for (const pt of overview.timeSeries) {
      csv += `${pt.timestamp};${pt.messages};${pt.activeUsers};${pt.commands};${pt.joins};${pt.leaves};${pt.voiceHours}\n`;
    }

    return {
      contentType: 'text/csv',
      content: csv,
      filename: `analytics-${guildId}-${period}-${dateStr}.csv`,
    };
  }
}

export const analyticsService = new AnalyticsService();

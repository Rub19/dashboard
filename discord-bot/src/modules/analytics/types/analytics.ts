import { z } from 'zod';

export const TimeRangePeriodSchema = z.enum(['24h', '7d', '30d', '90d']);
export type TimeRangePeriod = z.infer<typeof TimeRangePeriodSchema>;

export interface HourlyBucket {
  guildId: string;
  hourIso: string; // ex: 2026-09-03T20:00:00.000Z
  messagesCount: number;
  commandsCount: number;
  joinsCount: number;
  leavesCount: number;
  voiceMinutes: number;
  moderationActionsCount: number;
  securityIncidentsCount: number;
  ticketsCreatedCount: number;
  activeUserIds: string[];
  channelMessageCounts: Record<string, number>;
  commandCounts: Record<string, number>;
}

export interface AnalyticsKPI {
  label: string;
  current: number;
  previous: number;
  percentageChange: number;
  trend: 'up' | 'down' | 'neutral';
  unit?: string;
}

export interface ServerHealthScore {
  score: number; // 0-100
  status: 'excellent' | 'good' | 'average' | 'critical';
  factors: Array<{
    label: string;
    impact: number;
    isPositive: boolean;
  }>;
}

export interface AutomaticInsight {
  id: string;
  type: 'growth' | 'activity' | 'peak' | 'moderation' | 'security' | 'support';
  text: string;
  trend: 'positive' | 'warning' | 'neutral';
}

export interface TopChannelStat {
  channelId: string;
  channelName: string;
  messageCount: number;
  percentage: number;
}

export interface TimeSeriesPoint {
  timestamp: string;
  messages: number;
  activeUsers: number;
  commands: number;
  joins: number;
  leaves: number;
  voiceHours: number;
}

export interface AnalyticsOverview {
  period: TimeRangePeriod;
  healthScore: ServerHealthScore;
  kpis: {
    members: AnalyticsKPI;
    activeUsers: AnalyticsKPI;
    messages: AnalyticsKPI;
    commands: AnalyticsKPI;
    voiceHours: AnalyticsKPI;
    moderationActions: AnalyticsKPI;
    tickets: AnalyticsKPI;
    securityIncidents: AnalyticsKPI;
  };
  insights: AutomaticInsight[];
  timeSeries: TimeSeriesPoint[];
  topChannels: TopChannelStat[];
  peakHeatmap: Array<{ day: number; hour: number; value: number }>; // 0-6 days x 0-23 hours
  moderationBreakdown: Record<string, number>;
  topCommands: Array<{ command: string; count: number; percentage: number }>;
  botHealth: {
    uptimeSeconds: number;
    pingMs: number;
    memoryMb: number;
    status: 'healthy' | 'degraded' | 'critical';
  };
}

import { z } from 'zod';

/**
 * Statistiques d'activité (façon Statbot) : messages et temps vocal par jour, par membre et par salon, arrivées / départs
 * et évolution du nombre de membres. Les jours sont en UTC. Désactivé par défaut : les statistiques ne se collectent
 * qu'une fois le module activé.
 */
export const StatsConfigSchema = z.object({
  guildId: z.string(),
  enabled: z.boolean().default(false),
  /** Date de la première activation : la page et les commandes indiquent depuis quand les données existent. */
  startedAt: z.string().nullable().default(null),
  updatedAt: z.string().default(() => new Date().toISOString()),
});
export type StatsConfig = z.infer<typeof StatsConfigSchema>;

/** Compteurs d'une journée UTC (clé « AAAA-MM-JJ »). */
export interface DayStats {
  messages: number;
  byChannel: Record<string, number>;
  byUser: Record<string, number>;
  /** « userId|channelId » → messages (sert à la fiche membre : salons préférés). */
  byUserChannel: Record<string, number>;
  voiceSec: number;
  voiceByChannel: Record<string, number>;
  voiceByUser: Record<string, number>;
  voiceByUserChannel: Record<string, number>;
  joins: number;
  leaves: number;
  /** Nombre de membres vu le plus récemment ce jour-là. */
  members: number | null;
}

export const emptyDay = (): DayStats => ({
  messages: 0,
  byChannel: {},
  byUser: {},
  byUserChannel: {},
  voiceSec: 0,
  voiceByChannel: {},
  voiceByUser: {},
  voiceByUserChannel: {},
  joins: 0,
  leaves: 0,
  members: null,
});

export interface SeriesPoint {
  day: string;
  messages: number;
  voiceHours: number;
  joins: number;
  leaves: number;
  members: number | null;
  activeUsers: number;
}

export interface RankedEntry {
  id: string;
  value: number;
}

export interface ServerSummary {
  days: number;
  since: string | null;
  totals: { messages: number; voiceHours: number; joins: number; leaves: number; activeUsers: number };
  series: SeriesPoint[];
  topMembersMessages: RankedEntry[];
  topMembersVoice: RankedEntry[];
  topChannelsMessages: RankedEntry[];
  topChannelsVoice: RankedEntry[];
}

export interface MemberStats {
  userId: string;
  windows: Record<'1' | '7' | '60', { messages: number; voiceHours: number }>;
  rank: { messages: number | null; voice: number | null };
  topChannels: RankedEntry[];
  topVoiceChannels: RankedEntry[];
  series: Array<{ day: string; messages: number; voiceHours: number }>;
}

export interface ChannelStats {
  channelId: string;
  days: number;
  totals: { messages: number; voiceHours: number };
  series: Array<{ day: string; messages: number; voiceHours: number }>;
  topMembersMessages: RankedEntry[];
  topMembersVoice: RankedEntry[];
}

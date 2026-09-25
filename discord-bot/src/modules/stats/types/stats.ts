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
  /** Messages par heure UTC (0–23) : sert à la carte de chaleur d'activité. Les jours enregistrés avant cette version restent à zéro. */
  byHour: number[];
  /** Secondes de vocal par heure UTC (0–23). */
  voiceByHour: number[];
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
  byHour: new Array(24).fill(0),
  voiceByHour: new Array(24).fill(0),
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

/** Ligne du classement des membres (période choisie). */
export interface MemberRow {
  id: string;
  messages: number;
  voiceHours: number;
  /** Part des messages du serveur (0–100). */
  messageShare: number;
  voiceShare: number;
  /** Score d'activité : 1 point par message + 1 point pour 2 minutes de vocal. */
  score: number;
  /** Jours où le membre a été actif (message ou vocal). */
  activeDays: number;
}

export type ChampionKind = 'messages' | 'voice' | 'score' | 'active' | 'rising';

/** Meilleurs membres par catégorie (podium). */
export interface Champions {
  days: number;
  categories: Record<ChampionKind, Array<{ id: string; value: number }>>;
}

export interface PeriodTotals {
  messages: number;
  voiceHours: number;
  joins: number;
  leaves: number;
  activeUsers: number;
}

/** Analyse approfondie d'une période : comparaison avec la précédente, records, rythme de la semaine et carte de chaleur. */
export interface Insights {
  days: number;
  current: PeriodTotals;
  previous: PeriodTotals;
  /** Variation en % par rapport à la période précédente (null si la précédente est vide). */
  change: Record<keyof PeriodTotals, number | null>;
  averages: { messagesPerDay: number; voiceHoursPerDay: number; messagesPerActiveMember: number };
  records: { bestMessageDay: { day: string; value: number } | null; bestVoiceDay: { day: string; value: number } | null; bestJoinDay: { day: string; value: number } | null; longestActiveStreak: number };
  /** Part des messages écrite par les 10 % de membres les plus actifs (concentration de l'activité). */
  concentration: { topTenPercentShare: number | null; membersCounted: number };
  weekday: Array<{ weekday: number; messages: number; voiceHours: number }>;
  hours: Array<{ hour: number; messages: number; voiceHours: number }>;
  /** heatmap[jourDeSemaine 0=lundi..6=dimanche][heure UTC] = messages. */
  heatmap: number[][];
  /** Vrai s'il existe des données horaires (collectées à partir de cette version). */
  hasHourly: boolean;
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

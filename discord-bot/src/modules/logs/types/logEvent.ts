import { z } from 'zod';

export const LogCategorySchema = z.enum([
  'members',
  'messages',
  'roles',
  'channels',
  'moderation',
  'tickets',
  'voice',
  'server',
]);

export type LogCategory = z.infer<typeof LogCategorySchema>;

export const LogTypeSchema = z.enum([
  // Membres
  'MEMBER_JOIN',
  'MEMBER_LEAVE',
  'MEMBER_BAN',
  'MEMBER_UNBAN',
  'MEMBER_TIMEOUT',
  'MEMBER_UPDATE',
  // Messages
  'MESSAGE_DELETE',
  'MESSAGE_DELETE_BULK',
  'MESSAGE_EDIT',
  // Rôles
  'ROLE_CREATE',
  'ROLE_DELETE',
  'ROLE_UPDATE',
  // Salons
  'CHANNEL_CREATE',
  'CHANNEL_DELETE',
  'CHANNEL_UPDATE',
  // Modération
  'MOD_SANCTION',
  'AUTOMOD_ALERT',
  // Tickets
  'TICKET_EVENT',
  // Vocal
  'VOICE_JOIN',
  'VOICE_LEAVE',
  'VOICE_SWITCH',
  'VOICE_MUTE',
  // Serveur
  'SERVER_UPDATE',
]);

export type LogType = z.infer<typeof LogTypeSchema>;

export interface LogField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface LogEntry {
  id: string;
  guildId: string;
  category: LogCategory;
  type: LogType;
  title: string;
  description: string;
  color: string;
  fields: LogField[];
  userId?: string | null;
  userTag?: string | null;
  moderatorId?: string | null;
  moderatorTag?: string | null;
  channelId?: string | null;
  channelName?: string | null;
  messageUrl?: string | null;
  metadata?: Record<string, any>;
  createdAt: string; // ISO
}

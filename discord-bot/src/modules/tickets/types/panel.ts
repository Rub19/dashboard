import { z } from 'zod';

export const TicketPanelSchema = z.object({
  id: z.string(),
  guildId: z.string(),
  channelId: z.string().nullable().default(null),
  messageId: z.string().nullable().default(null),
  title: z.string().default('🎫 Support & Assistance'),
  description: z
    .string()
    .default('Besoin d’aide ou d’une question ?\nCliquez sur le bouton ci-dessous pour ouvrir un ticket auprès de notre équipe.'),
  color: z.string().default('#5865F2'),
  buttonLabel: z.string().default('Créer un ticket'),
  buttonEmoji: z.string().default('🎫'),
  categoryIds: z.array(z.string()).default([]),
});

export type TicketPanel = z.infer<typeof TicketPanelSchema>;

export const TicketGlobalConfigSchema = z.object({
  enabled: z.boolean().default(true),
  maxOpenTicketsPerUser: z.number().min(1).max(10).default(1),
  maxTicketsPerHour: z.number().min(1).max(20).default(5),
  cooldownBetweenTicketsSeconds: z.number().default(60),
  staffInactivityReminderMinutes: z.number().default(30),
  userInactivityWarningHours: z.number().default(12),
  autoCloseInactivityHours: z.number().default(24),
  sendRatingOnClose: z.boolean().default(true),
  logChannelId: z.string().nullable().default(null),
  transcriptChannelId: z.string().nullable().default(null),
  namingFormat: z.string().default('ticket-{username}'),
  embedColor: z.string().default('#5865F2'),
});

export type TicketGlobalConfig = z.infer<typeof TicketGlobalConfigSchema>;

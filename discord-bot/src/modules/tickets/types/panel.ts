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
  maxOpenTicketsPerUser: z.number().min(1).max(5).default(1),
  logChannelId: z.string().nullable().default(null),
  namingFormat: z.string().default('ticket-{username}'),
});

export type TicketGlobalConfig = z.infer<typeof TicketGlobalConfigSchema>;

import { z } from 'zod';
import { TicketPrioritySchema } from './ticket.js';

export const FormFieldStyleSchema = z.enum(['short', 'paragraph']);

export const TicketFormFieldSchema = z.object({
  id: z.string(),
  label: z.string().min(1).max(45),
  placeholder: z.string().max(100).default(''),
  style: FormFieldStyleSchema.default('short'),
  required: z.boolean().default(true),
});

export type TicketFormField = z.infer<typeof TicketFormFieldSchema>;

export const TicketCategorySchema = z.object({
  id: z.string(),
  guildId: z.string(),
  name: z.string().min(1).max(32),
  emoji: z.string().default('🎫'),
  description: z.string().default(''),
  color: z.string().default('#5865F2'),
  discordCategoryId: z.string().nullable().default(null),
  supportRoleIds: z.array(z.string()).default([]),
  assignedTeamId: z.string().nullable().default(null),
  defaultPriority: TicketPrioritySchema.default('NORMAL'),
  autoCloseInactivityHours: z.number().default(24),
  cooldownMinutes: z.number().default(0),
  maxTicketsPerUser: z.number().default(1),
  autoTranscript: z.boolean().default(true),
  formFields: z.array(TicketFormFieldSchema).default([]),
  welcomeMessage: z
    .string()
    .default(
      'Bonjour {user} ! Merci d’avoir contacté l’équipe {category}.\nUn membre du support va prendre en charge votre demande #{ticketId} sous peu.'
    ),
});

export type TicketCategory = z.infer<typeof TicketCategorySchema>;

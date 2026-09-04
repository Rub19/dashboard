import { z } from 'zod';
import { TicketPrioritySchema, TicketStatusSchema } from './ticket.js';

export const TicketTriggerSchema = z.enum([
  'TICKET_CREATED',
  'TICKET_CLAIMED',
  'TICKET_INACTIVE',
  'TICKET_REOPENED',
  'TICKET_CLOSED',
  'PRIORITY_CHANGED',
]);
export type TicketTrigger = z.infer<typeof TicketTriggerSchema>;

export const TicketAutomationRuleSchema = z.object({
  id: z.string(),
  guildId: z.string(),
  name: z.string().min(1).max(100),
  enabled: z.boolean().default(true),
  trigger: TicketTriggerSchema,
  conditions: z.object({
    categoryId: z.string().optional(),
    priority: TicketPrioritySchema.optional(),
    status: TicketStatusSchema.optional(),
    inactivityMinutes: z.number().optional(),
  }),
  actions: z.object({
    assignTeamId: z.string().optional(),
    assignStaffId: z.string().optional(),
    setPriority: TicketPrioritySchema.optional(),
    addTags: z.array(z.string()).optional(),
    sendDiscordMessage: z.string().optional(),
    changeStatus: TicketStatusSchema.optional(),
    closeTicket: z.boolean().optional(),
  }),
  createdAt: z.string(),
});

export type TicketAutomationRule = z.infer<typeof TicketAutomationRuleSchema>;

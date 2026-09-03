import { z } from 'zod';

export const TicketStatusSchema = z.enum(['open', 'claimed', 'closed']);
export type TicketStatus = z.infer<typeof TicketStatusSchema>;

export const TicketSchema = z.object({
  id: z.string(), // e.g. TICKET-101
  guildId: z.string(),
  channelId: z.string(),
  userId: z.string(),
  userTag: z.string(),
  categoryId: z.string(),
  categoryName: z.string(),
  status: TicketStatusSchema.default('open'),
  claimedBy: z
    .object({
      id: z.string(),
      tag: z.string(),
    })
    .nullable()
    .default(null),
  answers: z.record(z.string()).default({}),
  createdAt: z.string(), // ISO
  closedAt: z.string().nullable().default(null),
  closedBy: z
    .object({
      id: z.string(),
      tag: z.string(),
    })
    .nullable()
    .default(null),
  transcriptPath: z.string().nullable().default(null),
});

export type Ticket = z.infer<typeof TicketSchema>;

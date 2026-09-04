import { z } from 'zod';

export const TicketTeamSchema = z.object({
  id: z.string(),
  guildId: z.string(),
  name: z.string().min(1).max(50),
  description: z.string().default(''),
  color: z.string().default('#6366F1'),
  roleIds: z.array(z.string()).default([]),
  categoryIds: z.array(z.string()).default([]),
  memberIds: z.array(z.string()).default([]),
  createdAt: z.string(),
});

export type TicketTeam = z.infer<typeof TicketTeamSchema>;

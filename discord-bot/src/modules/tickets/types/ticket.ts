import { z } from 'zod';

export const TicketStatusSchema = z.enum([
  'OPEN',
  'PENDING',
  'WAITING_USER',
  'WAITING_STAFF',
  'RESOLVED',
  'CLOSED',
]);
export type TicketStatus = z.infer<typeof TicketStatusSchema>;

export const TicketPrioritySchema = z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']);
export type TicketPriority = z.infer<typeof TicketPrioritySchema>;

export interface TicketStaffUser {
  id: string;
  tag: string;
  avatar?: string | null;
}

export interface TicketNote {
  id: string;
  authorId: string;
  authorTag: string;
  authorAvatar?: string | null;
  content: string;
  createdAt: string;
}

export interface TicketActivity {
  id: string;
  type: string; // CREATED, CLAIMED, TRANSFERRED, PRIORITY_CHANGED, STATUS_CHANGED, NOTE_ADDED, CLOSED, REOPENED
  actorTag: string;
  description: string;
  timestamp: string;
}

export interface TicketRating {
  score: number; // 1 to 5
  comment?: string;
  ratedAt: string;
}

export const TicketSchema = z.object({
  id: z.string(), // e.g. TICKET-101 or #1842
  guildId: z.string(),
  channelId: z.string(),
  userId: z.string(),
  userTag: z.string(),
  userAvatar: z.string().nullable().optional(),
  categoryId: z.string(),
  categoryName: z.string(),
  priority: TicketPrioritySchema.default('NORMAL'),
  status: TicketStatusSchema.default('OPEN'),
  claimedBy: z
    .object({
      id: z.string(),
      tag: z.string(),
      avatar: z.string().nullable().optional(),
    })
    .nullable()
    .default(null),
  assignedTeamId: z.string().nullable().default(null),
  tags: z.array(z.string()).default([]),
  answers: z.record(z.any()).default({}),
  notes: z
    .array(
      z.object({
        id: z.string(),
        authorId: z.string(),
        authorTag: z.string(),
        authorAvatar: z.string().nullable().optional(),
        content: z.string(),
        createdAt: z.string(),
      })
    )
    .default([]),
  activityTimeline: z
    .array(
      z.object({
        id: z.string(),
        type: z.string(),
        actorTag: z.string(),
        description: z.string(),
        timestamp: z.string(),
      })
    )
    .default([]),
  relatedCaseId: z.union([z.number(), z.string()]).nullable().default(null),
  rating: z
    .object({
      score: z.number().min(1).max(5),
      comment: z.string().optional(),
      ratedAt: z.string(),
    })
    .nullable()
    .default(null),
  createdAt: z.string(), // ISO
  updatedAt: z.string().optional(),
  lastActivityAt: z.string().optional(),
  closedAt: z.string().nullable().default(null),
  closedBy: z
    .object({
      id: z.string(),
      tag: z.string(),
    })
    .nullable()
    .default(null),
  closeReason: z.string().nullable().default(null),
  transcriptPath: z.string().nullable().default(null),
  transcriptUrl: z.string().nullable().default(null),
});

export type Ticket = z.infer<typeof TicketSchema>;

import { z } from 'zod';

export const ReportStatusSchema = z.enum([
  'NEW',
  'REVIEWING',
  'ACTIONED',
  'DISMISSED',
  'ESCALATED',
]);

export type ReportStatus = z.infer<typeof ReportStatusSchema>;

export const ModerationReportSchema = z.object({
  id: z.string(), // e.g. REP-101
  guildId: z.string(),
  reportedUserId: z.string(),
  reportedUserTag: z.string(),
  reporterUserId: z.string(),
  reporterUserTag: z.string(),
  reason: z.string(),
  category: z.string().optional().default('Other'),
  channelId: z.string().optional(),
  messageId: z.string().optional(),
  messageContent: z.string().optional(),
  status: ReportStatusSchema.default('NEW'),
  assignedModerator: z
    .object({
      id: z.string(),
      tag: z.string(),
    })
    .optional(),
  caseNumber: z.number().optional(), // Lier à une case si converti
  resolutionNotes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ModerationReport = z.infer<typeof ModerationReportSchema>;

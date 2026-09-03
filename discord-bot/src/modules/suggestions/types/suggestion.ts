import { z } from 'zod';

export const SuggestionStatusSchema = z.enum([
  'pending',
  'under_review',
  'planned',
  'accepted',
  'in_progress',
  'completed',
  'rejected',
  'duplicate',
  'on_hold',
]);
export type SuggestionStatus = z.infer<typeof SuggestionStatusSchema>;

export const SuggestionPrioritySchema = z.enum(['low', 'normal', 'high', 'critical']);
export type SuggestionPriority = z.infer<typeof SuggestionPrioritySchema>;

export const SuggestionVoteTypeSchema = z.enum(['up', 'down']);
export type SuggestionVoteType = z.infer<typeof SuggestionVoteTypeSchema>;

export const SuggestionVoteSchema = z.object({
  userId: z.string(),
  type: SuggestionVoteTypeSchema,
  timestamp: z.string().default(() => new Date().toISOString()),
});
export type SuggestionVote = z.infer<typeof SuggestionVoteSchema>;

export const SuggestionCommentSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userTag: z.string(),
  avatarUrl: z.string().nullable().default(null),
  content: z.string().min(1),
  isStaff: z.boolean().default(false),
  timestamp: z.string().default(() => new Date().toISOString()),
});
export type SuggestionComment = z.infer<typeof SuggestionCommentSchema>;

export const SuggestionHistoryEntrySchema = z.object({
  timestamp: z.string().default(() => new Date().toISOString()),
  actorTag: z.string(),
  action: z.string(),
  details: z.string().optional(),
});
export type SuggestionHistoryEntry = z.infer<typeof SuggestionHistoryEntrySchema>;

export const SuggestionSchema = z.object({
  id: z.string(),
  numericId: z.number(),
  guildId: z.string(),
  channelId: z.string(),
  messageId: z.string().nullable().default(null),
  threadId: z.string().nullable().default(null),
  authorId: z.string(),
  authorTag: z.string(),
  authorAvatarUrl: z.string().nullable().default(null),
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.string().default('Général'),
  tags: z.array(z.string()).default([]),
  status: SuggestionStatusSchema.default('pending'),
  priority: SuggestionPrioritySchema.default('normal'),
  votes: z.array(SuggestionVoteSchema).default([]),
  upvotesCount: z.number().default(0),
  downvotesCount: z.number().default(0),
  score: z.number().default(0),
  comments: z.array(SuggestionCommentSchema).default([]),
  followerIds: z.array(z.string()).default([]),
  history: z.array(SuggestionHistoryEntrySchema).default([]),
  staffResponse: z.string().nullable().default(null),
  staffResponderTag: z.string().nullable().default(null),
  duplicateOfId: z.string().nullable().default(null),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});
export type Suggestion = z.infer<typeof SuggestionSchema>;

export const SuggestionConfigSchema = z.object({
  guildId: z.string(),
  enabled: z.boolean().default(true),
  channelId: z.string().nullable().default(null),
  autoThread: z.boolean().default(true),
  categories: z.array(z.string()).default(['Général', 'Serveur', 'Bot', 'Événements', 'Communauté']),
  cooldownMinutes: z.number().min(0).default(5),
  dmNotifications: z.boolean().default(true),
});
export type SuggestionConfig = z.infer<typeof SuggestionConfigSchema>;

export interface SuggestionOverview {
  totalCount: number;
  pendingCount: number;
  underReviewCount: number;
  acceptedCount: number;
  completedCount: number;
  rejectedCount: number;
  totalVotes: number;
  totalComments: number;
  statusDistribution: Record<SuggestionStatus, number>;
  categoryDistribution: Record<string, number>;
}

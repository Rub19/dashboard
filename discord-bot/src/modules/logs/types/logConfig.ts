import { z } from 'zod';
import { LogCategorySchema } from './logEvent.js';

export const CategoryConfigSchema = z.object({
  enabled: z.boolean().default(true),
  channelId: z.string().nullable().default(null),
});

export type CategoryConfig = z.infer<typeof CategoryConfigSchema>;

export const LogConfigSchema = z.object({
  enabled: z.boolean().default(true),
  useSingleChannel: z.boolean().default(false),
  singleChannelId: z.string().nullable().default(null),
  retentionDays: z.number().default(30), // 7, 30, 90, 0 (0 = infini)
  categories: z
    .record(LogCategorySchema, CategoryConfigSchema)
    .default({
      members: { enabled: true, channelId: null },
      messages: { enabled: true, channelId: null },
      roles: { enabled: true, channelId: null },
      channels: { enabled: true, channelId: null },
      moderation: { enabled: true, channelId: null },
      tickets: { enabled: true, channelId: null },
      voice: { enabled: false, channelId: null },
      server: { enabled: true, channelId: null },
    }),
});

export type LogConfig = z.infer<typeof LogConfigSchema>;

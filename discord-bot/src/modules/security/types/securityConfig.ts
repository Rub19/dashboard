import { z } from 'zod';

export const AntiRaidActionSchema = z.enum(['alert', 'kick', 'ban', 'timeout', 'lockdown']);
export type AntiRaidAction = z.infer<typeof AntiRaidActionSchema>;

export const AntiNukeActionSchema = z.enum(['alert', 'strip_roles', 'ban']);
export type AntiNukeAction = z.infer<typeof AntiNukeActionSchema>;

export const AntiSpamActionSchema = z.enum(['warn', 'delete', 'timeout']);
export type AntiSpamAction = z.infer<typeof AntiSpamActionSchema>;

export const SecurityConfigSchema = z.object({
  // 1. Anti-Raid
  antiRaid: z
    .object({
      enabled: z.boolean().default(true),
      maxJoins: z.number().min(3).max(50).default(10),
      timeWindowSeconds: z.number().min(3).max(60).default(10),
      action: AntiRaidActionSchema.default('lockdown'),
      minAccountAgeDays: z.number().min(0).max(90).default(3),
      blockUnwhitelistedBots: z.boolean().default(true),
      autoLockdownDurationMinutes: z.number().min(1).max(120).default(15),
    })
    .default({}),

  // 2. Anti-Nuke
  antiNuke: z
    .object({
      enabled: z.boolean().default(true),
      maxBans: z.number().min(2).max(20).default(4),
      maxKicks: z.number().min(2).max(20).default(4),
      maxChannelDeletes: z.number().min(2).max(10).default(3),
      maxChannelCreates: z.number().min(3).max(15).default(5),
      maxRoleDeletes: z.number().min(2).max(10).default(3),
      maxRoleCreates: z.number().min(3).max(15).default(5),
      timeWindowSeconds: z.number().min(5).max(60).default(10),
      action: AntiNukeActionSchema.default('strip_roles'),
      alertOnDangerousPermissions: z.boolean().default(true),
      blockUnknownWebhooks: z.boolean().default(true),
    })
    .default({}),

  // 3. Anti-Spam & Contenu
  antiSpam: z
    .object({
      enabled: z.boolean().default(true),
      maxMessages: z.number().min(3).max(20).default(5),
      timeWindowSeconds: z.number().min(2).max(30).default(5),
      action: AntiSpamActionSchema.default('delete'),
      maxMentions: z.number().min(2).max(30).default(5),
      blockEveryoneHere: z.boolean().default(true),
      antiInvite: z.boolean().default(true),
      allowedInviteGuildIds: z.array(z.string()).default([]),
    })
    .default({}),

  // 4. Whitelists & Confiance
  whitelist: z
    .object({
      trustedUserIds: z.array(z.string()).default([]),
      trustedRoleIds: z.array(z.string()).default([]),
      trustedBotIds: z.array(z.string()).default([]),
      exemptChannelIds: z.array(z.string()).default([]),
    })
    .default({}),

  // 5. État du Lockdown
  lockdown: z
    .object({
      active: z.boolean().default(false),
      reason: z.string().nullable().default(null),
      activatedAt: z.string().nullable().default(null),
      expiresAt: z.string().nullable().default(null),
    })
    .default({}),
});

export type SecurityConfig = z.infer<typeof SecurityConfigSchema>;

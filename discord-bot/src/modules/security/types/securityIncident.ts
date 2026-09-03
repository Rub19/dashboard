import { z } from 'zod';

export const IncidentTypeSchema = z.enum([
  'MASS_JOIN',
  'MASS_BAN',
  'MASS_KICK',
  'MASS_CHANNEL_DELETE',
  'MASS_CHANNEL_CREATE',
  'MASS_ROLE_DELETE',
  'MASS_ROLE_CREATE',
  'SUSPICIOUS_BOT',
  'ACCOUNT_AGE',
  'MASS_MENTION',
  'INVITE_LINK',
  'SPAM_FLOOD',
  'DANGEROUS_PERMS',
  'LOCKDOWN_ACTIVATED',
]);
export type IncidentType = z.infer<typeof IncidentTypeSchema>;

export const IncidentSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export type IncidentSeverity = z.infer<typeof IncidentSeveritySchema>;

export const SecurityIncidentSchema = z.object({
  id: z.string(),
  guildId: z.string(),
  type: IncidentTypeSchema,
  severity: IncidentSeveritySchema,
  title: z.string(),
  description: z.string(),
  perpetratorId: z.string().nullable().default(null),
  perpetratorTag: z.string().nullable().default(null),
  affectedCount: z.number().default(1),
  actionTaken: z.string(),
  status: z.enum(['open', 'resolved']).default('open'),
  createdAt: z.string(),
  resolvedAt: z.string().nullable().default(null),
});

export type SecurityIncident = z.infer<typeof SecurityIncidentSchema>;

export type SecurityStatus = 'protected' | 'warning' | 'attack';

export interface SecurityOverview {
  status: SecurityStatus;
  score: number;
  raidModeActive: boolean;
  lockdownActive: boolean;
  joinsLastMinute: number;
  messagesLastMinute: number;
  recentIncidents: SecurityIncident[];
  stats: {
    totalIncidents: number;
    resolvedIncidents: number;
    raidsPrevented: number;
    nukesPrevented: number;
  };
}

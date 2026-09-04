import { z } from 'zod';

export const AuditSeveritySchema = z.enum(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export type AuditSeverity = z.infer<typeof AuditSeveritySchema>;

export const AuditModuleSchema = z.enum([
  'MEMBERS',
  'MESSAGES',
  'ROLES',
  'CHANNELS',
  'SERVER',
  'VOICE',
  'WEBHOOKS',
  'BOTS',
  'MODERATION',
  'AUTOMOD',
  'SECURITY',
  'SYSTEM',
]);
export type AuditModule = z.infer<typeof AuditModuleSchema>;

export interface AuditActor {
  id: string;
  tag: string;
  username?: string;
  avatar?: string | null;
  isBot?: boolean;
  roleIds?: string[];
}

export interface AuditTarget {
  id: string;
  type: 'USER' | 'CHANNEL' | 'ROLE' | 'SERVER' | 'MESSAGE' | 'WEBHOOK' | 'EMOJI' | 'CONFIG' | 'CASE' | 'INCIDENT';
  name: string;
  tag?: string;
  avatar?: string | null;
}

export interface AuditChannel {
  id: string;
  name: string;
  type?: string;
}

export interface AuditDiffField {
  field: string;
  before: any;
  after: any;
}

export interface AuditEvent {
  id: string; // AUD-XXXXXXXX
  guildId: string;
  module: AuditModule;
  type: string; // e.g. MEMBER_JOIN, MESSAGE_DELETE, ROLE_UPDATE, CASE_CREATE, RAID_DETECTED
  severity: AuditSeverity;
  actor: AuditActor;
  target?: AuditTarget;
  channel?: AuditChannel;
  reason?: string;
  before?: Record<string, any>;
  after?: Record<string, any>;
  diff?: AuditDiffField[];
  metadata?: Record<string, any>;
  caseId?: number | string; // linked Moderation case
  incidentId?: string; // linked Security incident
  correlationId?: string; // grouped session or parent event
  timestamp: string; // ISO-8601
}

export type ChannelLogThreshold = 'OFF' | 'ALL' | 'IMPORTANT' | 'CRITICAL_ONLY';

export interface AuditChannelRouting {
  generalChannelId?: string | null;
  generalThreshold: ChannelLogThreshold;
  moderationChannelId?: string | null;
  moderationThreshold: ChannelLogThreshold;
  securityChannelId?: string | null;
  securityThreshold: ChannelLogThreshold;
  automodChannelId?: string | null;
  automodThreshold: ChannelLogThreshold;
  raidChannelId?: string | null;
  raidThreshold: ChannelLogThreshold;
}

export interface AuditNotificationRule {
  id: string;
  name: string;
  enabled: boolean;
  condition: {
    minSeverity?: AuditSeverity;
    modules?: AuditModule[];
    eventTypes?: string[];
  };
  action: {
    alertChannelId?: string;
    mentionRoleId?: string;
    sendDirectAlert?: boolean;
  };
}

export interface AuditSettings {
  guildId: string;
  enabled: boolean;
  routing: AuditChannelRouting;
  retentionDays: number; // 7, 30, 90, 180, 365, 0 (forever)
  notificationRules: AuditNotificationRule[];
  privacy: {
    maskSensitiveTokens: boolean;
    redactMessageContents: boolean;
  };
  updatedAt: string;
}

export interface InvestigationResult {
  targetEvent: AuditEvent;
  timeWindowStart: string;
  timeWindowEnd: string;
  relatedEvents: AuditEvent[];
  causalityChain: {
    step: number;
    eventId: string;
    timestamp: string;
    module: AuditModule;
    severity: AuditSeverity;
    summary: string;
    relation: 'PARENT' | 'TRIGGER' | 'SANCTION' | 'SAME_ACTOR' | 'SAME_TARGET' | 'BURST';
  }[];
  diffInspection?: {
    field: string;
    beforeDisplay: string;
    afterDisplay: string;
  }[];
}

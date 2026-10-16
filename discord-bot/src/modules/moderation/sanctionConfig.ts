import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { logger } from '../../utils/logger.js';

const snowflake = z.string().regex(/^\d{15,25}$/);
const ids = (max: number) => z.array(snowflake).max(max).default([]).catch([]);

export const SEVERITIES = ['light', 'medium', 'grave'] as const;
export type Severity = (typeof SEVERITIES)[number];
export const SEVERITY_LABEL: Record<Severity, string> = { light: 'Légère', medium: 'Moyenne', grave: 'Grave' };

export const TierSchema = z.object({
  id: z.string().min(1).max(40),
  enabled: z.boolean().default(true),
  count: z.number().int().min(1).max(1000),
  unit: z.enum(['infractions', 'points']).default('infractions'),
  scope: z.enum(['warns', 'protection', 'automod', 'all']).default('warns'),
  periodSeconds: z.number().int().min(0).max(90 * 86400).default(0),
  action: z.enum(['TIMEOUT', 'KICK', 'TEMPBAN', 'BAN']).default('TIMEOUT'),
  durationSeconds: z.number().int().min(60).max(28 * 86400).default(3600),
  reason: z.string().max(300).default(''),
});
export type Tier = z.infer<typeof TierSchema>;

export const PRESET_ACTIONS = ['WARN', 'TIMEOUT', 'KICK', 'SOFTBAN', 'TEMPBAN', 'BAN', 'NOTE'] as const;

export const PresetSchema = z.object({
  id: z.string().min(1).max(40),
  name: z.string().min(1).max(60),
  category: z.string().max(30).nullable().default(null),
  action: z.enum(PRESET_ACTIONS).default('WARN'),
  severity: z.enum(SEVERITIES).default('light'),
  points: z.number().int().min(0).max(100).nullable().default(null),
  expiryDays: z.number().int().min(0).max(365).nullable().default(null),
  durationSeconds: z.number().int().min(60).max(28 * 86400).default(3600),
  memberReason: z.string().max(500).default(''),
  roleIds: ids(25),
});
export type Preset = z.infer<typeof PresetSchema>;

export const SanctionConfigSchema = z.object({
  tiers: z.array(TierSchema).max(10).default([]).catch([]),
  warnings: z
    .object({
      severityEnabled: z.boolean().default(true),
      points: z.object({ light: z.number().int().min(0).max(100).default(1), medium: z.number().int().min(0).max(100).default(2), grave: z.number().int().min(0).max(100).default(3) }).default({}),
      defaultSeverity: z.enum(SEVERITIES).default('light'),
      expiryDays: z.number().int().min(0).max(365).default(30),
      autoPoints: z.object({ protection: z.number().int().min(0).max(100).default(1), automod: z.number().int().min(0).max(100).default(1) }).default({}),
      goodConduct: z.object({ enabled: z.boolean().default(false), points: z.number().int().min(1).max(100).default(1), periodDays: z.number().int().min(1).max(365).default(14) }).default({}),
    })
    .default({}),
  replies: z
    .object({
      dmMember: z.boolean().default(true),
      nameModerator: z.boolean().default(true),
      hideReplies: z.boolean().default(false),
      undoButton: z.boolean().default(true),
      requireReason: z.boolean().default(false),
      publicByDefault: z.boolean().default(false),
      endReminder: z.boolean().default(false),
    })
    .default({}),
  history: z
    .object({
      protection: z.boolean().default(true),
      automod: z.boolean().default(true),
      discord: z.boolean().default(true),
      joins: z.boolean().default(false),
    })
    .default({}),
  guard: z
    .object({
      enabled: z.boolean().default(false),
      perHour: z.number().int().min(1).max(500).default(15),
      alertChannelId: snowflake.nullable().default(null).catch(null),
    })
    .default({}),
  presets: z
    .object({
      categories: z.array(z.string().min(1).max(30)).max(12).default(['Spam', 'Pub', 'Insultes', 'NSFW', 'Comportement', 'Autre']),
      reasons: z.array(PresetSchema).max(15).default([]).catch([]),
    })
    .default({}),
  appeals: z
    .object({
      enabled: z.boolean().default(false),
      channelId: snowflake.nullable().default(null).catch(null),
      actions: z.array(z.enum(['WARN', 'TIMEOUT', 'TEMPBAN', 'BAN'])).default(['WARN', 'TIMEOUT', 'TEMPBAN', 'BAN']),
      deciderRoleIds: ids(25),
      mentionRoleIds: ids(25),
      question: z.string().max(45).default(''),
      windowDays: z.number().int().min(1).max(30).default(7),
    })
    .default({}),
});
export type SanctionConfig = z.infer<typeof SanctionConfigSchema>;
export type SanctionConfigInput = z.input<typeof SanctionConfigSchema>;

const FILE = path.resolve(process.cwd(), 'data', 'sanction_config.json');

class SanctionConfigStore {
  private configs = new Map<string, SanctionConfig>();

  constructor() {
    try {
      if (fs.existsSync(FILE)) {
        for (const [g, v] of Object.entries(JSON.parse(fs.readFileSync(FILE, 'utf-8')))) {
          const r = SanctionConfigSchema.safeParse(v);
          if (r.success) this.configs.set(g, r.data);
        }
      }
    } catch (err) {
      logger.error('Erreur chargement sanction_config.json :', err);
    }
  }

  get(guildId: string): SanctionConfig {
    return this.configs.get(guildId) ?? SanctionConfigSchema.parse({});
  }

  /** Remplace chaque section envoyée (objets fusionnés un niveau, tableaux remplacés). */
  update(guildId: string, patch: Partial<SanctionConfigInput>): SanctionConfig {
    const cur = this.get(guildId) as Record<string, unknown>;
    const merged: Record<string, unknown> = { ...cur };
    for (const [k, v] of Object.entries(patch ?? {})) {
      merged[k] = v && typeof v === 'object' && !Array.isArray(v) && cur[k] && typeof cur[k] === 'object' && !Array.isArray(cur[k]) ? { ...(cur[k] as object), ...v } : v;
    }
    const next = SanctionConfigSchema.parse(merged);
    this.configs.set(guildId, next);
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(Object.fromEntries(this.configs), null, 2), 'utf-8');
    return next;
  }
}

export const sanctionConfig = new SanctionConfigStore();

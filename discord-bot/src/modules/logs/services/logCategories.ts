import type { AuditEvent, LogCategoryKey } from '../types/auditEvent.js';

/** Catégories de journaux configurables (un nom de webhook et un salon par catégorie). */
export const LOG_CATEGORY_KEYS: LogCategoryKey[] = [
  'MODERATION',
  'SECURITY',
  'RAID',
  'AUTOMOD',
  'VOICE',
  'MEMBERS',
  'MESSAGES',
  'ROLES',
  'CHANNELS',
  'SERVER',
  'WEBHOOKS',
  'BOTS',
  'SYSTEM',
];

/** Nom affiché du webhook par défaut : court, en minuscules (« vocals », « mod »…). */
export const DEFAULT_CATEGORY_NAME: Record<LogCategoryKey, string> = {
  MODERATION: 'mod',
  SECURITY: 'security',
  RAID: 'anti-raid',
  AUTOMOD: 'automod',
  VOICE: 'vocals',
  MEMBERS: 'members',
  MESSAGES: 'messages',
  ROLES: 'roles',
  CHANNELS: 'channels',
  SERVER: 'server',
  WEBHOOKS: 'webhooks',
  BOTS: 'bots',
  SYSTEM: 'system',
};

export function isLogCategoryKey(value: unknown): value is LogCategoryKey {
  return typeof value === 'string' && (LOG_CATEGORY_KEYS as string[]).includes(value);
}

/** Catégorie d'un événement : la détection de raid a sa propre catégorie. */
export function categoryKeyOf(event: Pick<AuditEvent, 'module' | 'type'>): LogCategoryKey {
  if (event.module === 'SECURITY' && event.type.includes('RAID')) return 'RAID';
  return event.module;
}

/**
 * Discord refuse les noms de webhook contenant « clyde » ou « discord » et limite à 80 caractères :
 * on nettoie plutôt que de laisser l'envoi échouer.
 */
export function sanitizeWebhookName(input: unknown, fallback: string): string {
  if (typeof input !== 'string') return fallback;
  const cleaned = input
    .replace(/clyde|discord/gi, '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return cleaned || fallback;
}

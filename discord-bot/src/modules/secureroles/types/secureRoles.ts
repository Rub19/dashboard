import { z } from 'zod';

/**
 * Rôles sécurisés. Un rôle du personnel (ex. « Modérateur ») garde son nom, sa couleur et sa place dans la hiérarchie, mais
 * ses permissions sensibles (bannir, gérer les rôles, administrateur…) sont déplacées vers un rôle caché « 🔐 … ». Le membre
 * ne reçoit ce rôle caché que pour une durée limitée, après avoir saisi un code à usage unique (application d'authentification).
 * Un compte Discord volé n'a donc aucun pouvoir sensible.
 */

const snowflake = z.string().regex(/^\d{5,25}$/);

export const SecuredRoleSchema = z.object({
  roleId: snowflake,
  permissionsRoleId: snowflake,
  /** Permissions d'origine du rôle (entier décimal), pour tout restaurer à l'identique. */
  originalPermissions: z.string().regex(/^\d+$/),
  /** Permissions sensibles déplacées vers le rôle caché (entier décimal). */
  securedPermissions: z.string().regex(/^\d+$/),
  securedAt: z.string(),
  securedBy: z.string().nullable().default(null),
});
export type SecuredRole = z.infer<typeof SecuredRoleSchema>;

export const SecureRolesConfigSchema = z.object({
  guildId: z.string().min(1),
  enabled: z.boolean().default(false),
  sessionMinutes: z.number().int().min(5).max(240).default(30),
  roles: z.array(SecuredRoleSchema).max(25).default([]),
  updatedAt: z.string().default(() => new Date().toISOString()),
});
export type SecureRolesConfig = z.infer<typeof SecureRolesConfigSchema>;

export type MemberStatus = 'invited' | 'pending' | 'active';

export interface SecureMemberRecord {
  guildId: string;
  userId: string;
  status: MemberStatus;
  /** Secret TOTP chiffré (AES-256-GCM) : jamais stocké en clair. */
  secretEnc: string | null;
  invitedAt: string;
  invitedBy: string | null;
  enrolledAt: string | null;
  failedAttempts: number;
  lockedUntil: string | null;
  /** Dernier pas de 30 s accepté : un code ne peut pas être rejoué. */
  lastStep: number;
}

export interface SecureSession {
  id: string;
  guildId: string;
  userId: string;
  permissionsRoleIds: string[];
  startedAt: string;
  expiresAt: string;
  endedAt: string | null;
  endReason: 'expired' | 'manual' | 'lost_role' | 'restored' | null;
}

export type AuditType = 'secured' | 'restored' | 'invited' | 'enrolled' | 'elevated' | 'ended' | 'failed' | 'locked' | 'blocked' | 'reset';

export interface AuditEntry {
  id: string;
  guildId: string;
  type: AuditType;
  userId: string | null;
  actorId: string | null;
  roleId: string | null;
  detail: string;
  at: string;
}

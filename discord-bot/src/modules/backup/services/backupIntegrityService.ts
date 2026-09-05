import crypto from 'node:crypto';
import { BackupSnapshot, BackupStatus } from '../types/index.js';

export interface IntegrityVerificationResult {
  valid: boolean;
  computedChecksum: string;
  expectedChecksum: string;
  schemaValid: boolean;
  reason?: string;
  crossGuildWarning?: boolean;
}

export class BackupIntegrityService {
  public static CURRENT_SCHEMA_VERSION = 2;
  public static MIN_SUPPORTED_SCHEMA_VERSION = 1;

  /**
   * Calcule un hash SHA-256 canonique à partir des données de sauvegarde
   */
  public static computeChecksum(snapshot: Omit<BackupSnapshot, 'checksum' | 'sizeBytes'>): string {
    const canonicalPayload = JSON.stringify({
      guildId: snapshot.guildId,
      schemaVersion: snapshot.schemaVersion,
      includedComponents: [...(snapshot.includedComponents || [])].sort(),
      data: snapshot.data,
    });

    return crypto.createHash('sha256').update(canonicalPayload, 'utf8').digest('hex');
  }

  /**
   * Vérifie l'intégrité cryptographique et structurelle d'une sauvegarde
   */
  public static verifySnapshot(snapshot: any): IntegrityVerificationResult {
    if (!snapshot || typeof snapshot !== 'object') {
      return {
        valid: false,
        computedChecksum: '',
        expectedChecksum: '',
        schemaValid: false,
        reason: 'Structure de sauvegarde invalide ou vide',
      };
    }

    if (!snapshot.backupId || typeof snapshot.backupId !== 'string' || snapshot.backupId.trim().length === 0) {
      return {
        valid: false,
        computedChecksum: '',
        expectedChecksum: snapshot.checksum || '',
        schemaValid: false,
        reason: 'Identifiant de sauvegarde (backupId) manquant ou invalide',
      };
    }

    if (!snapshot.guildId || typeof snapshot.guildId !== 'string' || snapshot.guildId.trim().length === 0) {
      return {
        valid: false,
        computedChecksum: '',
        expectedChecksum: snapshot.checksum || '',
        schemaValid: false,
        reason: 'Identifiant de serveur (guildId) manquant ou invalide',
      };
    }

    if (
      typeof snapshot.schemaVersion !== 'number' ||
      snapshot.schemaVersion < this.MIN_SUPPORTED_SCHEMA_VERSION ||
      snapshot.schemaVersion > this.CURRENT_SCHEMA_VERSION
    ) {
      return {
        valid: false,
        computedChecksum: '',
        expectedChecksum: snapshot.checksum || '',
        schemaValid: false,
        reason: `Version de schéma ${snapshot.schemaVersion} non supportée (supportées: ${this.MIN_SUPPORTED_SCHEMA_VERSION} à ${this.CURRENT_SCHEMA_VERSION})`,
      };
    }

    if (!snapshot.data || typeof snapshot.data !== 'object') {
      return {
        valid: false,
        computedChecksum: '',
        expectedChecksum: snapshot.checksum || '',
        schemaValid: false,
        reason: 'Charge utile des données (data) manquante ou malformée',
      };
    }

    if (!Array.isArray(snapshot.data.roles) || !Array.isArray(snapshot.data.channels) || !Array.isArray(snapshot.data.categories)) {
      return {
        valid: false,
        computedChecksum: '',
        expectedChecksum: snapshot.checksum || '',
        schemaValid: false,
        reason: 'Collections Discord invalides (roles, channels ou categories absents)',
      };
    }

    if (!snapshot.data.guild || typeof snapshot.data.guild !== 'object' || typeof snapshot.data.guild.name !== 'string') {
      return {
        valid: false,
        computedChecksum: '',
        expectedChecksum: snapshot.checksum || '',
        schemaValid: false,
        reason: 'Paramètres du serveur (guild.name) manquants dans le snapshot',
      };
    }

    if (!snapshot.checksum || typeof snapshot.checksum !== 'string') {
      return {
        valid: false,
        computedChecksum: '',
        expectedChecksum: '',
        schemaValid: true,
        reason: 'Signature cryptographique (checksum) manquante',
      };
    }

    const computed = this.computeChecksum(snapshot);
    const valid = computed === snapshot.checksum;

    return {
      valid,
      computedChecksum: computed,
      expectedChecksum: snapshot.checksum,
      schemaValid: true,
      reason: valid ? undefined : 'Altération détectée : le checksum ne correspond pas aux données',
    };
  }

  /**
   * Valide rigoureusement qu'un snapshot est apte à être restauré
   */
  public static validateForRestore(
    snapshot: BackupSnapshot,
    targetGuildId?: string
  ): { ready: boolean; error?: string; crossGuild?: boolean } {
    const integrity = this.verifySnapshot(snapshot);
    if (!integrity.valid) {
      return { ready: false, error: integrity.reason || 'Snapshot corrompu ou invalide' };
    }

    if (snapshot.status !== 'COMPLETED') {
      return {
        ready: false,
        error: `Impossible de restaurer une sauvegarde dont le statut est "${snapshot.status}" (seules les sauvegardes COMPLETED sont restaurables)`,
      };
    }

    // Vérifier si la sauvegarde est entièrement vide
    const rCount = snapshot.data.roles?.length || 0;
    const cCount = snapshot.data.channels?.length || 0;
    const catCount = snapshot.data.categories?.length || 0;
    const mCount = Object.keys(snapshot.data.ethoneConfig || {}).length;

    if (rCount === 0 && cCount === 0 && catCount === 0 && mCount === 0) {
      return {
        ready: false,
        error: 'Cette sauvegarde ne contient aucune donnée Discord ni configuration ETHONE à restaurer.',
      };
    }

    const isCrossGuild = Boolean(targetGuildId && snapshot.guildId !== targetGuildId);

    return { ready: true, crossGuild: isCrossGuild };
  }

  /**
   * Migration transparente d'un schéma v1 vers v2
   */
  public static migrateSchema(snapshot: any): BackupSnapshot {
    if (!snapshot || typeof snapshot !== 'object') {
      throw new Error('Données de sauvegarde invalides');
    }

    if (snapshot.schemaVersion === 2) {
      return snapshot as BackupSnapshot;
    }

    if (snapshot.schemaVersion === 1) {
      // V1 to V2 migration: add includedComponents and objectCounts if missing
      const roles = snapshot.data?.roles || [];
      const channels = snapshot.data?.channels || [];
      const categories = snapshot.data?.categories || [];
      const emojis = snapshot.data?.emojis || [];
      const ethoneConfig = snapshot.data?.ethoneConfig || {};

      const migrated: Omit<BackupSnapshot, 'checksum' | 'sizeBytes'> = {
        ...snapshot,
        schemaVersion: 2,
        includedComponents: snapshot.includedComponents || [
          'ROLES',
          'CATEGORIES',
          'CHANNELS',
          'PERMISSIONS',
          'SERVER_CONFIG',
          'ETHONE_CONFIG',
        ],
        objectCounts: snapshot.objectCounts || {
          categories: categories.length,
          channels: channels.length,
          roles: roles.length,
          permissions: 0,
          emojis: emojis.length,
          ethoneModules: Object.keys(ethoneConfig).length,
        },
      };

      const checksum = this.computeChecksum(migrated);
      const sizeBytes = Buffer.byteLength(JSON.stringify(migrated));

      return {
        ...migrated,
        checksum,
        sizeBytes,
      } as BackupSnapshot;
    }

    throw new Error(`Schéma de version ${snapshot.schemaVersion} non migrable`);
  }
}

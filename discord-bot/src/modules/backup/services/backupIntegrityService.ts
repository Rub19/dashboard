import crypto from 'node:crypto';
import { BackupSnapshot } from '../types/index.js';

export class BackupIntegrityService {
  public static CURRENT_SCHEMA_VERSION = 2;

  /**
   * Calcule un hash SHA-256 canonique à partir des données de sauvegarde
   */
  public static computeChecksum(snapshot: Omit<BackupSnapshot, 'checksum' | 'sizeBytes'>): string {
    const canonicalPayload = JSON.stringify({
      guildId: snapshot.guildId,
      schemaVersion: snapshot.schemaVersion,
      includedComponents: [...snapshot.includedComponents].sort(),
      data: snapshot.data,
    });

    return crypto.createHash('sha256').update(canonicalPayload, 'utf8').digest('hex');
  }

  /**
   * Vérifie l'intégrité cryptographique et structurelle d'une sauvegarde
   */
  public static verifySnapshot(snapshot: BackupSnapshot): {
    valid: boolean;
    computedChecksum: string;
    expectedChecksum: string;
    schemaValid: boolean;
    reason?: string;
  } {
    if (!snapshot || !snapshot.backupId || !snapshot.data) {
      return {
        valid: false,
        computedChecksum: '',
        expectedChecksum: snapshot?.checksum || '',
        schemaValid: false,
        reason: 'Structure de sauvegarde invalide ou vide',
      };
    }

    if (snapshot.schemaVersion > this.CURRENT_SCHEMA_VERSION) {
      return {
        valid: false,
        computedChecksum: '',
        expectedChecksum: snapshot.checksum,
        schemaValid: false,
        reason: `Version de schéma ${snapshot.schemaVersion} non supportée (actuelle: ${this.CURRENT_SCHEMA_VERSION})`,
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
}

import { Client } from 'discord.js';
import {
  BackupComponent,
  BackupDiffResult,
  BackupOverviewKpis,
  BackupScheduleSettings,
  BackupSnapshot,
  BackupType,
  RestoreJob,
  RestoreMode,
  RestorePlan,
  RestoreSafetyLevel,
} from '../types/index.js';
import { backupRepository } from '../storage/backupRepository.js';
import { BackupCollectorService } from './backupCollectorService.js';
import { BackupDiffService } from './backupDiffService.js';
import { BackupIntegrityService } from './backupIntegrityService.js';
import { BackupRestoreService } from './backupRestoreService.js';
import { backupSchedulerService } from './backupSchedulerService.js';
import { logService } from '../../logs/services/logService.js';
import { logger } from '../../../utils/logger.js';

export class BackupService {
  private client: Client | null = null;

  public async initialize(client: Client): Promise<void> {
    this.client = client;
    backupSchedulerService.start(client);
    logger.info('[BackupService] Module Backup & Disaster Recovery 2.0 initialisé.');
  }

  public getOverview(guildId: string): {
    kpis: BackupOverviewKpis;
    recentBackups: BackupSnapshot[];
    settings: BackupScheduleSettings;
  } {
    const kpis = backupRepository.getKpis(guildId);
    const recentBackups = backupRepository.getAll(guildId).slice(0, 5);
    const settings = backupRepository.getSettings(guildId);

    return {
      kpis,
      recentBackups,
      settings,
    };
  }

  public listBackups(
    guildId: string,
    filters?: { type?: string; status?: string; search?: string }
  ): BackupSnapshot[] {
    let list = backupRepository.getAll(guildId);

    if (filters?.type && filters.type !== 'ALL') {
      list = list.filter((b) => b.type === filters.type);
    }
    if (filters?.status && filters.status !== 'ALL') {
      list = list.filter((b) => b.status === filters.status);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.backupId.toLowerCase().includes(q) ||
          b.createdBy.tag.toLowerCase().includes(q)
      );
    }

    return list;
  }

  public getBackup(guildId: string, backupId: string): {
    snapshot: BackupSnapshot | null;
    integrity: ReturnType<typeof BackupIntegrityService.verifySnapshot>;
  } {
    const snapshot = backupRepository.getById(guildId, backupId);
    if (!snapshot) {
      return {
        snapshot: null,
        integrity: {
          valid: false,
          computedChecksum: '',
          expectedChecksum: '',
          schemaValid: false,
          reason: 'Sauvegarde introuvable',
        },
      };
    }

    const integrity = BackupIntegrityService.verifySnapshot(snapshot);
    return { snapshot, integrity };
  }

  public async createBackup(params: {
    guildId: string;
    name: string;
    description?: string;
    type?: BackupType;
    isProtected?: boolean;
    includedComponents?: BackupComponent[];
    creator: { id: string; tag: string; avatar?: string };
  }): Promise<BackupSnapshot> {
    const guild = this.client?.guilds.cache.get(params.guildId) || null;

    const snapshot = await BackupCollectorService.createSnapshot({
      guild,
      guildId: params.guildId,
      name: params.name,
      description: params.description,
      type: params.type || 'FULL',
      isProtected: params.isProtected || false,
      includedComponents: params.includedComponents,
      creator: params.creator,
    });

    backupRepository.save(snapshot);

    logService.emit({
      guildId: params.guildId,
      module: 'SERVER',
      type: 'backup.created',
      actor: { id: params.creator.id, tag: params.creator.tag },
      target: { id: snapshot.backupId, name: snapshot.name, type: 'SERVER' },
      metadata: {
        type: snapshot.type,
        sizeBytes: snapshot.sizeBytes,
        checksum: snapshot.checksum,
        objects: snapshot.objectCounts,
      },
    });

    return snapshot;
  }

  public deleteBackup(guildId: string, backupId: string, actor: { id: string; tag: string }): boolean {
    const backup = backupRepository.getById(guildId, backupId);
    if (!backup) return false;

    const success = backupRepository.delete(guildId, backupId);
    if (success) {
      logService.emit({
        guildId,
        module: 'SERVER',
        type: 'backup.deleted',
        actor,
        target: { id: backupId, name: backup.name, type: 'SERVER' },
      });
    }
    return success;
  }

  public toggleProtection(
    guildId: string,
    backupId: string,
    isProtected: boolean,
    actor: { id: string; tag: string }
  ): boolean {
    const success = backupRepository.toggleProtection(guildId, backupId, isProtected);
    if (success) {
      logService.emit({
        guildId,
        module: 'SERVER',
        type: 'backup.protection.updated',
        actor,
        target: { id: backupId, name: backupId, type: 'SERVER' },
        metadata: { isProtected },
      });
    }
    return success;
  }

  public async previewRestore(params: {
    guildId: string;
    backupId: string;
    safetyLevel?: RestoreSafetyLevel;
    mode?: RestoreMode;
    selectedComponents?: BackupComponent[];
  }): Promise<RestorePlan> {
    if (!this.client) throw new Error('Client Discord non initialisé');
    const backup = backupRepository.getById(params.guildId, params.backupId);
    if (!backup) throw new Error('Sauvegarde introuvable');

    return await BackupRestoreService.generatePreviewPlan({
      client: this.client,
      guildId: params.guildId,
      backup,
      safetyLevel: params.safetyLevel,
      mode: params.mode,
      selectedComponents: params.selectedComponents,
    });
  }

  public async executeRestore(params: {
    guildId: string;
    backupId: string;
    safetyLevel?: RestoreSafetyLevel;
    mode?: RestoreMode;
    selectedComponents?: BackupComponent[];
    actor: { id: string; tag: string };
  }): Promise<RestoreJob> {
    if (!this.client) throw new Error('Client Discord non initialisé');
    const backup = backupRepository.getById(params.guildId, params.backupId);
    if (!backup) throw new Error('Sauvegarde introuvable');

    const job = await BackupRestoreService.executeRestore({
      client: this.client,
      guildId: params.guildId,
      backup,
      safetyLevel: params.safetyLevel,
      mode: params.mode,
      selectedComponents: params.selectedComponents,
      actorTag: params.actor.tag,
    });

    logService.emit({
      guildId: params.guildId,
      module: 'SERVER',
      type: 'backup.restored',
      actor: params.actor,
      target: { id: backup.backupId, name: backup.name, type: 'SERVER' },
      metadata: {
        jobId: job.jobId,
        rollbackBackupId: job.rollbackBackupId,
        status: job.status,
        safetyLevel: job.safetyLevel,
      },
    });

    return job;
  }

  public getJob(guildId: string, jobId: string): RestoreJob | null {
    return backupRepository.getJob(guildId, jobId);
  }

  public async compare(
    guildId: string,
    backupAId: string,
    backupBId: string
  ): Promise<BackupDiffResult> {
    const backupA = backupRepository.getById(guildId, backupAId);
    if (!backupA) throw new Error(`Sauvegarde A (${backupAId}) introuvable`);

    let backupB: BackupSnapshot | null = null;
    if (backupBId === 'LIVE') {
      // Capturer l'état live actuel sous forme de snapshot éphémère pour comparer
      const guild = this.client?.guilds.cache.get(guildId) || null;
      backupB = await BackupCollectorService.createSnapshot({
        guild,
        guildId,
        name: 'Live Server State',
        type: 'FULL',
        creator: { id: 'system', tag: 'Live Comparison' },
      });
    } else {
      backupB = backupRepository.getById(guildId, backupBId);
      if (!backupB) throw new Error(`Sauvegarde B (${backupBId}) introuvable`);
    }

    return BackupDiffService.compare(backupA, backupB);
  }

  public testBackup(guildId: string, backupId: string): {
    backupId: string;
    name: string;
    valid: boolean;
    checksum: string;
    schemaVersion: number;
    objectCounts: BackupSnapshot['objectCounts'];
    readiness: 'READY' | 'WARNING' | 'CORRUPTED';
    notes: string[];
  } {
    const backup = backupRepository.getById(guildId, backupId);
    if (!backup) throw new Error('Sauvegarde introuvable');

    const integrity = BackupIntegrityService.verifySnapshot(backup);
    const notes: string[] = [];

    if (integrity.valid) {
      notes.push('Intégrité cryptographique SHA-256 validée.');
    } else {
      notes.push(`Échec intégrité : ${integrity.reason}`);
    }

    if (backup.data.roles.length === 0) {
      notes.push('Attention : aucun rôle inclus dans ce snapshot.');
    }
    if (backup.data.channels.length === 0) {
      notes.push('Attention : aucun salon inclus dans ce snapshot.');
    }

    return {
      backupId: backup.backupId,
      name: backup.name,
      valid: integrity.valid,
      checksum: backup.checksum,
      schemaVersion: backup.schemaVersion,
      objectCounts: backup.objectCounts,
      readiness: integrity.valid ? 'READY' : 'CORRUPTED',
      notes,
    };
  }
}

export const backupService = new BackupService();

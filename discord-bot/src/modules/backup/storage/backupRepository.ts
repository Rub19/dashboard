import fs from 'node:fs';
import path from 'node:path';
import {
  BackupOverviewKpis,
  BackupScheduleSettings,
  BackupSnapshot,
  RestoreJob,
} from '../types/index.js';
import { BackupIntegrityService } from '../services/backupIntegrityService.js';
import { logger } from '../../../utils/logger.js';

export class BackupRepository {
  private dataDir: string;
  private backupsFile: string;
  private settingsFile: string;
  private jobsFile: string;

  private backupsCache: Map<string, BackupSnapshot[]> = new Map();
  private settingsCache: Map<string, BackupScheduleSettings> = new Map();
  private jobsCache: Map<string, RestoreJob[]> = new Map();

  constructor() {
    this.dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    this.backupsFile = path.join(this.dataDir, 'discord_backups.json');
    this.settingsFile = path.join(this.dataDir, 'backup_schedules.json');
    this.jobsFile = path.join(this.dataDir, 'backup_restore_jobs.json');

    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    // Nettoyer les fichiers temporaires orphelins (.tmp) d'un crash antérieur
    try {
      if (fs.existsSync(`${this.backupsFile}.tmp`)) fs.unlinkSync(`${this.backupsFile}.tmp`);
      if (fs.existsSync(`${this.settingsFile}.tmp`)) fs.unlinkSync(`${this.settingsFile}.tmp`);
      if (fs.existsSync(`${this.jobsFile}.tmp`)) fs.unlinkSync(`${this.jobsFile}.tmp`);
    } catch {}

    try {
      if (fs.existsSync(this.backupsFile)) {
        const raw = fs.readFileSync(this.backupsFile, 'utf-8');
        const list = JSON.parse(raw) as BackupSnapshot[];
        this.backupsCache.clear();
        for (const item of list) {
          // Détection d'un crash pendant la capture : ne jamais laisser un backup incomplet en succès
          if ((item.status as any) === 'CREATING' || (item.status as any) === 'IN_PROGRESS') {
            item.status = 'FAILED';
            item.description = `${item.description || ''} [Interrompu par crash inattendu]`;
          }
          const arr = this.backupsCache.get(item.guildId) || [];
          arr.push(item);
          this.backupsCache.set(item.guildId, arr);
        }
      } else {
        this.seedDemoData();
      }

      if (fs.existsSync(this.settingsFile)) {
        const raw = fs.readFileSync(this.settingsFile, 'utf-8');
        const list = JSON.parse(raw) as BackupScheduleSettings[];
        this.settingsCache.clear();
        for (const s of list) {
          this.settingsCache.set(s.guildId, s);
        }
      }

      if (fs.existsSync(this.jobsFile)) {
        const raw = fs.readFileSync(this.jobsFile, 'utf-8');
        const list = JSON.parse(raw) as RestoreJob[];
        this.jobsCache.clear();
        for (const j of list) {
          // Détection d'une restauration interrompue par crash
          if (j.status === 'in_progress') {
            j.status = 'failed';
            j.error = 'Processus interrompu pendant la restauration. État sécurisé.';
          }
          const arr = this.jobsCache.get(j.guildId) || [];
          arr.push(j);
          this.jobsCache.set(j.guildId, arr);
        }
      }
    } catch (err) {
      logger.error('[BackupRepository] Erreur lors de la lecture des fichiers :', err);
      this.seedDemoData();
    }
  }

  private persistBackups(): void {
    const all: BackupSnapshot[] = [];
    for (const arr of this.backupsCache.values()) {
      all.push(...arr);
    }
    // Écriture atomique avec fichier .tmp et renommage OS
    const tmpFile = `${this.backupsFile}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(all, null, 2), 'utf-8');
    fs.renameSync(tmpFile, this.backupsFile);
  }

  private persistSettings(): void {
    const all = Array.from(this.settingsCache.values());
    const tmpFile = `${this.settingsFile}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(all, null, 2), 'utf-8');
    fs.renameSync(tmpFile, this.settingsFile);
  }

  private persistJobs(): void {
    const all: RestoreJob[] = [];
    for (const arr of this.jobsCache.values()) {
      all.push(...arr);
    }
    const tmpFile = `${this.jobsFile}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(all, null, 2), 'utf-8');
    fs.renameSync(tmpFile, this.jobsFile);
  }

  public getAll(guildId: string): BackupSnapshot[] {
    const list = this.backupsCache.get(guildId) || [];
    return [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getById(guildId: string, backupId: string): BackupSnapshot | null {
    const list = this.backupsCache.get(guildId) || [];
    return list.find((b) => b.backupId === backupId) || null;
  }

  public save(snapshot: BackupSnapshot): void {
    const list = this.backupsCache.get(snapshot.guildId) || [];
    const idx = list.findIndex((b) => b.backupId === snapshot.backupId);
    if (idx >= 0) {
      list[idx] = snapshot;
    } else {
      list.unshift(snapshot);
    }
    this.backupsCache.set(snapshot.guildId, list);
    this.persistBackups();
  }

  public delete(guildId: string, backupId: string): boolean {
    const list = this.backupsCache.get(guildId) || [];
    const item = list.find((b) => b.backupId === backupId);
    if (!item) return false;
    if (item.isProtected) {
      throw new Error('Impossible de supprimer une sauvegarde protégée. Retirez la protection d\'abord.');
    }
    const filtered = list.filter((b) => b.backupId !== backupId);
    this.backupsCache.set(guildId, filtered);
    this.persistBackups();
    return true;
  }

  public toggleProtection(guildId: string, backupId: string, isProtected: boolean): boolean {
    const list = this.backupsCache.get(guildId) || [];
    const item = list.find((b) => b.backupId === backupId);
    if (!item) return false;
    item.isProtected = isProtected;
    this.persistBackups();
    return true;
  }

  public getSettings(guildId: string): BackupScheduleSettings {
    const existing = this.settingsCache.get(guildId);
    if (existing) return existing;

    const defaultSettings: BackupScheduleSettings = {
      guildId,
      enabled: true,
      frequency: 'daily',
      preferredTime: '03:00',
      timezone: 'Europe/Paris',
      retentionCount: 7,
      retentionDays: 30,
      maxStorageMb: 50,
      autoBackupBeforeMajorChanges: true,
      defaultSafetyLevel: 'SAFE',
    };
    this.settingsCache.set(guildId, defaultSettings);
    this.persistSettings();
    return defaultSettings;
  }

  public saveSettings(guildId: string, settings: Partial<BackupScheduleSettings>): BackupScheduleSettings {
    const current = this.getSettings(guildId);
    const updated: BackupScheduleSettings = {
      ...current,
      ...settings,
      guildId,
    };
    this.settingsCache.set(guildId, updated);
    this.persistSettings();
    return updated;
  }

  public saveJob(job: RestoreJob): void {
    const list = this.jobsCache.get(job.guildId) || [];
    const idx = list.findIndex((j) => j.jobId === job.jobId);
    if (idx >= 0) {
      list[idx] = job;
    } else {
      list.unshift(job);
    }
    // Conserver max 20 jobs récents
    this.jobsCache.set(job.guildId, list.slice(0, 20));
    this.persistJobs();
  }

  public getJob(guildId: string, jobId: string): RestoreJob | null {
    const list = this.jobsCache.get(guildId) || [];
    return list.find((j) => j.jobId === jobId) || null;
  }

  public getRecentJobs(guildId: string): RestoreJob[] {
    return this.jobsCache.get(guildId) || [];
  }

  public pruneExpired(guildId: string): number {
    const settings = this.getSettings(guildId);
    const list = this.getAll(guildId);
    if (list.length === 0) return 0;

    const now = Date.now();
    const maxAgeMs = settings.retentionDays * 24 * 60 * 60 * 1000;
    let pruned = 0;

    const kept: BackupSnapshot[] = [];
    let unprotectedCount = 0;

    for (const bkp of list) {
      if (bkp.isProtected) {
        kept.push(bkp);
        continue;
      }

      const ageMs = now - new Date(bkp.createdAt).getTime();
      const exceedsDays = ageMs > maxAgeMs;
      const exceedsCount = unprotectedCount >= settings.retentionCount;

      if (exceedsDays || exceedsCount) {
        pruned++;
      } else {
        unprotectedCount++;
        kept.push(bkp);
      }
    }

    if (pruned > 0) {
      this.backupsCache.set(guildId, kept);
      this.persistBackups();
      logger.info(`[BackupRepository] ${pruned} sauvegardes expirées purgées pour la guild ${guildId}`);
    }

    return pruned;
  }

  public getKpis(guildId: string): BackupOverviewKpis {
    const list = this.getAll(guildId);
    const settings = this.getSettings(guildId);

    const totalBackups = list.length;
    const lastBackupAt = list[0]?.createdAt || null;
    const storageUsedBytes = list.reduce((acc, b) => acc + (b.sizeBytes || 0), 0);
    const protectedCount = list.filter((b) => b.isProtected).length;

    let verifiedCount = 0;
    for (const b of list) {
      if (b.status === 'COMPLETED' && BackupIntegrityService.verifySnapshot(b).valid) {
        verifiedCount++;
      }
    }

    let healthStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';
    if (totalBackups === 0) {
      healthStatus = 'WARNING';
    } else if (lastBackupAt) {
      const ageHours = (Date.now() - new Date(lastBackupAt).getTime()) / (1000 * 60 * 60);
      if (ageHours > 72) {
        healthStatus = 'WARNING';
      }
    }

    // Calcul approximatif de la prochaine sauvegarde
    let nextScheduledAt: string | null = null;
    if (settings.enabled) {
      const next = new Date();
      if (settings.frequency === '6h') next.setHours(next.getHours() + 6);
      else if (settings.frequency === '12h') next.setHours(next.getHours() + 12);
      else if (settings.frequency === 'weekly') next.setDate(next.getDate() + 7);
      else next.setDate(next.getDate() + 1);
      nextScheduledAt = next.toISOString();
    }

    return {
      totalBackups,
      lastBackupAt,
      storageUsedBytes,
      scheduledEnabled: settings.enabled,
      frequency: settings.frequency,
      protectedCount,
      healthStatus,
      nextScheduledAt,
      verifiedCount,
    };
  }

  private seedDemoData(): void {
    const demoGuildId = '123456789012345678';
    const now = new Date();

    const fullPayload: Omit<BackupSnapshot, 'checksum' | 'sizeBytes'> = {
      backupId: 'BKP-20260904-143000-FULL',
      guildId: demoGuildId,
      name: 'Full Production Snapshot #42',
      description: 'Sauvegarde complète hebdomadaire de la structure Discord et des modules ETHONE',
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      createdBy: {
        id: '999888777666',
        tag: 'AlexDev#0001',
        avatar: 'https://cdn.discordapp.com/embed/avatars/0.png',
      },
      type: 'FULL',
      status: 'COMPLETED',
      isProtected: true,
      schemaVersion: 2,
      includedComponents: [
        'ROLES',
        'CATEGORIES',
        'CHANNELS',
        'PERMISSIONS',
        'SERVER_CONFIG',
        'EMOJIS',
        'ETHONE_CONFIG',
      ],
      objectCounts: {
        categories: 5,
        channels: 18,
        roles: 12,
        permissions: 24,
        emojis: 8,
        ethoneModules: 14,
      },
      data: {
        guild: {
          name: 'ETHONE Gaming & Tech',
          icon: 'https://cdn.discordapp.com/embed/avatars/1.png',
          description: 'Serveur officiel ETHONE Gaming',
          verificationLevel: 2,
          defaultMessageNotifications: 1,
        },
        roles: [
          {
            id: 'role-admin',
            name: 'Administrateur',
            color: 0xe74c3c,
            hoist: true,
            position: 10,
            permissions: '8',
            mentionable: true,
            managed: false,
          },
          {
            id: 'role-mod',
            name: 'Modérateur',
            color: 0x3498db,
            hoist: true,
            position: 9,
            permissions: '268435456',
            mentionable: true,
            managed: false,
          },
          {
            id: 'role-vip',
            name: 'VIP Member',
            color: 0xf1c40f,
            hoist: true,
            position: 8,
            permissions: '104324673',
            mentionable: false,
            managed: false,
          },
          {
            id: 'role-everyone',
            name: '@everyone',
            color: 0,
            hoist: false,
            position: 0,
            permissions: '104324673',
            mentionable: false,
            managed: false,
            isEveryone: true,
          },
        ],
        categories: [
          {
            id: 'cat-welcome',
            name: '📢 INFORMATION & ACCUEIL',
            position: 0,
            permissionOverwrites: [],
          },
          {
            id: 'cat-community',
            name: '💬 COMMUNAUTÉ',
            position: 1,
            permissionOverwrites: [],
          },
          {
            id: 'cat-voice',
            name: '🎙️ SALONS VOCAUX',
            position: 2,
            permissionOverwrites: [],
          },
        ],
        channels: [
          {
            id: 'chan-rules',
            name: 'reglement',
            type: 0,
            parentId: 'cat-welcome',
            parentName: '📢 INFORMATION & ACCUEIL',
            position: 0,
            topic: 'Règles du serveur ETHONE',
            permissionOverwrites: [
              { id: 'role-everyone', type: 'role', allow: '66560', deny: '2048' },
            ],
          },
          {
            id: 'chan-announces',
            name: 'annonces',
            type: 0,
            parentId: 'cat-welcome',
            parentName: '📢 INFORMATION & ACCUEIL',
            position: 1,
            permissionOverwrites: [],
          },
          {
            id: 'chan-general',
            name: 'general-chat',
            type: 0,
            parentId: 'cat-community',
            parentName: '💬 COMMUNAUTÉ',
            position: 0,
            topic: 'Discussions générales',
            rateLimitPerUser: 5,
            permissionOverwrites: [],
          },
          {
            id: 'chan-voice-lounge',
            name: 'Salon Chill #1',
            type: 2,
            parentId: 'cat-voice',
            parentName: '🎙️ SALONS VOCAUX',
            position: 0,
            bitrate: 96000,
            userLimit: 10,
            permissionOverwrites: [],
          },
        ],
        emojis: [
          { id: 'emo-ethone', name: 'ethone_logo', url: 'https://cdn.discordapp.com/emojis/123.png' },
          { id: 'emo-fire', name: 'fire_animated', url: 'https://cdn.discordapp.com/emojis/124.gif' },
        ],
        ethoneConfig: {
          welcome: { enabled: true, channelId: 'chan-rules', autoRoleId: 'role-vip' },
          moderation: { autoMod: true, antiSpam: true, maxMentions: 5 },
          voice: { autoHubEnabled: true, defaultBitrate: 96000 },
          invites: { trackerEnabled: true, antiCheat: true },
          tickets: { enabled: true, categoryId: 'cat-community' },
        },
      },
    };

    const fullChecksum = BackupIntegrityService.computeChecksum(fullPayload);
    const fullSnapshot: BackupSnapshot = {
      ...fullPayload,
      checksum: fullChecksum,
      sizeBytes: Buffer.byteLength(JSON.stringify(fullPayload)),
    };

    const preChangePayload: Omit<BackupSnapshot, 'checksum' | 'sizeBytes'> = {
      backupId: 'BKP-20260904-100000-PRE',
      guildId: demoGuildId,
      name: 'Pre-Rollout Auto-Snapshot',
      description: 'Capture automatique avant déploiement du module Voice Channels 2.0',
      createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
      createdBy: {
        id: 'bot',
        tag: 'ETHONE Bot#0000',
      },
      type: 'PRE_CHANGE',
      status: 'COMPLETED',
      isProtected: false,
      schemaVersion: 2,
      includedComponents: ['ROLES', 'CHANNELS', 'PERMISSIONS', 'ETHONE_CONFIG'],
      objectCounts: {
        categories: 4,
        channels: 15,
        roles: 12,
        permissions: 20,
        emojis: 0,
        ethoneModules: 12,
      },
      data: {
        guild: fullPayload.data.guild,
        roles: fullPayload.data.roles,
        categories: fullPayload.data.categories.slice(0, 2),
        channels: fullPayload.data.channels.slice(0, 3),
        ethoneConfig: fullPayload.data.ethoneConfig,
      },
    };

    const preChecksum = BackupIntegrityService.computeChecksum(preChangePayload);
    const preSnapshot: BackupSnapshot = {
      ...preChangePayload,
      checksum: preChecksum,
      sizeBytes: Buffer.byteLength(JSON.stringify(preChangePayload)),
    };

    this.backupsCache.set(demoGuildId, [fullSnapshot, preSnapshot]);
    this.persistBackups();
    this.getSettings(demoGuildId);
  }
}

export const backupRepository = new BackupRepository();

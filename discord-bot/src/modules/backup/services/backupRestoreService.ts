import fs from 'node:fs';
import path from 'node:path';
import { Client, Guild, ChannelType, PermissionsBitField } from 'discord.js';
import {
  BackupComponent,
  BackupRole,
  BackupSnapshot,
  RestoreJob,
  RestoreMode,
  RestorePlan,
  RestorePlanAction,
  RestoreSafetyLevel,
} from '../types/index.js';
import { backupRepository } from '../storage/backupRepository.js';
import { BackupCollectorService } from './backupCollectorService.js';
import { BackupIntegrityService } from './backupIntegrityService.js';
import { logger } from '../../../utils/logger.js';

export class BackupRestoreService {
  /**
   * Calcule le plan de prévisualisation avant restauration
   */
  public static async generatePreviewPlan(params: {
    client: Client;
    guildId: string;
    backup: BackupSnapshot;
    safetyLevel?: RestoreSafetyLevel;
    mode?: RestoreMode;
    selectedComponents?: BackupComponent[];
  }): Promise<RestorePlan> {
    const {
      client,
      guildId,
      backup,
      safetyLevel = 'SAFE',
      mode = 'FULL',
      selectedComponents = backup.includedComponents,
    } = params;

    const guild = client.guilds.cache.get(guildId) || null;
    const actions: RestorePlanAction[] = [];

    let willCreate = 0;
    let willModify = 0;
    let willDelete = 0;
    let willSkip = 0;

    // 1. Audit des Rôles
    if (selectedComponents.includes('ROLES')) {
      const liveRoles = guild ? await guild.roles.fetch().catch(() => null) : null;
      const roleList = liveRoles ? Array.from(liveRoles.values()) : [];
      const liveRolesMap = new Map(roleList.map((r: any) => [r.name.toLowerCase(), r]));

      for (const bRole of backup.data.roles || []) {
        if (bRole.isEveryone || bRole.managed) {
          actions.push({
            action: 'SKIP',
            type: 'ROLE',
            name: bRole.name,
            reason: 'Rôle système ou géré par intégration Discord',
          });
          willSkip++;
          continue;
        }

        const existing = liveRolesMap.get(bRole.name.toLowerCase());
        if (!existing) {
          actions.push({
            action: 'CREATE',
            type: 'ROLE',
            name: bRole.name,
            details: `Couleur: #${bRole.color.toString(16)}, Hoist: ${bRole.hoist}`,
          });
          willCreate++;
        } else {
          actions.push({
            action: 'MODIFY',
            type: 'ROLE',
            name: bRole.name,
            targetId: existing.id,
            details: 'Mise à jour des permissions et propriétés',
          });
          willModify++;
        }
      }

      // En mode destructif, vérifie les rôles en trop
      if (safetyLevel === 'DESTRUCTIVE' && liveRoles) {
        const backupRoleNames = new Set(backup.data.roles.map((r) => r.name.toLowerCase()));
        for (const liveRole of liveRoles.values()) {
          if (!liveRole.managed && !liveRole.tags?.botId && liveRole.id !== guild?.id) {
            if (!backupRoleNames.has(liveRole.name.toLowerCase())) {
              actions.push({
                action: 'DELETE',
                type: 'ROLE',
                name: liveRole.name,
                targetId: liveRole.id,
                reason: 'Absent de la sauvegarde (Mode destructif)',
              });
              willDelete++;
            }
          }
        }
      }
    }

    // 2. Audit des Catégories & Salons
    if (selectedComponents.includes('CHANNELS') || selectedComponents.includes('CATEGORIES')) {
      const liveChannels = guild ? await guild.channels.fetch().catch(() => null) : null;
      const chanList = liveChannels ? Array.from(liveChannels.values()) : [];
      const liveChannelsMap = new Map(
        chanList.filter((c: any) => c !== null).map((c: any) => [c.name.toLowerCase(), c])
      );

      // Catégories
      if (selectedComponents.includes('CATEGORIES')) {
        for (const bCat of backup.data.categories || []) {
          const existing = liveChannelsMap.get(bCat.name.toLowerCase());
          if (!existing) {
            actions.push({
              action: 'CREATE',
              type: 'CATEGORY',
              name: bCat.name,
            });
            willCreate++;
          } else {
            actions.push({
              action: 'MODIFY',
              type: 'CATEGORY',
              name: bCat.name,
              targetId: existing.id,
            });
            willModify++;
          }
        }
      }

      // Salons
      if (selectedComponents.includes('CHANNELS')) {
        for (const bChan of backup.data.channels || []) {
          const existing = liveChannelsMap.get(bChan.name.toLowerCase());
          if (!existing) {
            actions.push({
              action: 'CREATE',
              type: 'CHANNEL',
              name: bChan.name,
              details: `Type: ${bChan.typeName || bChan.type}, Catégorie: ${bChan.parentName || 'Aucune'}`,
            });
            willCreate++;
          } else {
            actions.push({
              action: 'MODIFY',
              type: 'CHANNEL',
              name: bChan.name,
              targetId: existing.id,
              details: 'Synchronisation du sujet, slowmode et bitrate',
            });
            willModify++;
          }
        }
      }

      if (safetyLevel === 'DESTRUCTIVE' && liveChannels) {
        const backupChanNames = new Set(backup.data.channels.map((c) => c.name.toLowerCase()));
        const backupCatNames = new Set(backup.data.categories.map((c) => c.name.toLowerCase()));

        for (const liveChan of liveChannels.values()) {
          if (!liveChan) continue;
          const nameLower = liveChan.name.toLowerCase();
          if (liveChan.type === ChannelType.GuildCategory) {
            if (!backupCatNames.has(nameLower)) {
              actions.push({
                action: 'DELETE',
                type: 'CATEGORY',
                name: liveChan.name,
                targetId: liveChan.id,
                reason: 'Catégorie absente du snapshot',
              });
              willDelete++;
            }
          } else {
            if (!backupChanNames.has(nameLower)) {
              actions.push({
                action: 'DELETE',
                type: 'CHANNEL',
                name: liveChan.name,
                targetId: liveChan.id,
                reason: 'Salon absent du snapshot',
              });
              willDelete++;
            }
          }
        }
      }
    }

    // 3. ETHONE Configs
    if (selectedComponents.includes('ETHONE_CONFIG') && backup.data.ethoneConfig) {
      const moduleCount = Object.keys(backup.data.ethoneConfig).length;
      actions.push({
        action: 'MODIFY',
        type: 'ETHONE',
        name: `${moduleCount} modules ETHONE`,
        details: 'Restauration complète des configurations sans altérer Discord',
      });
      willModify += moduleCount;
    }

    return {
      backupId: backup.backupId,
      safetyLevel,
      mode,
      selectedComponents,
      counts: {
        willCreate,
        willModify,
        willDelete,
        willSkip,
      },
      actions,
    };
  }

  /**
   * Exécute un job de restauration sécurisé avec capture de rollback préalable
   */
  public static async executeRestore(params: {
    client: Client;
    guildId: string;
    backup: BackupSnapshot;
    safetyLevel?: RestoreSafetyLevel;
    mode?: RestoreMode;
    selectedComponents?: BackupComponent[];
    actorTag: string;
  }): Promise<RestoreJob> {
    const {
      client,
      guildId,
      backup,
      safetyLevel = 'SAFE',
      mode = 'FULL',
      selectedComponents = backup.includedComponents,
      actorTag,
    } = params;

    // 1. Vérification d'intégrité préalable
    const integrity = BackupIntegrityService.verifySnapshot(backup);
    if (!integrity.valid) {
      throw new Error(`Échec d'intégrité du snapshot : ${integrity.reason}`);
    }

    const guild = client.guilds.cache.get(guildId) || null;
    const jobId = `JOB-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

    const job: RestoreJob = {
      jobId,
      guildId,
      backupId: backup.backupId,
      status: 'PREPARING',
      safetyLevel,
      mode,
      selectedComponents,
      currentStep: 'Création du snapshot de Rollback automatique...',
      progressPercent: 5,
      startedAt: new Date().toISOString(),
      logs: [`[${new Date().toLocaleTimeString()}] Démarrage du job de restauration ${jobId}`],
      errors: [],
    };
    backupRepository.saveJob(job);

    try {
      // 2. Capture de Rollback automatique de l'état actuel du serveur
      job.logs.push(`[${new Date().toLocaleTimeString()}] Capture automatique du Rollback snapshot...`);
      const rollbackSnapshot = await BackupCollectorService.createSnapshot({
        guild,
        guildId,
        name: `Rollback auto avant restauration de ${backup.name}`,
        description: `Snapshot créé automatiquement avant la restauration du job ${jobId}`,
        type: 'ROLLBACK',
        isProtected: true,
        creator: { id: 'bot', tag: 'ETHONE Disaster Recovery' },
      });
      backupRepository.save(rollbackSnapshot);
      job.rollbackBackupId = rollbackSnapshot.backupId;
      job.logs.push(`[${new Date().toLocaleTimeString()}] Rollback snapshot sécurisé : ${rollbackSnapshot.backupId}`);
      job.progressPercent = 15;
      job.status = 'APPLYING';
      job.currentStep = 'Application des modifications...';
      backupRepository.saveJob(job);

      // 3. Application des Rôles
      const roleIdMapping = new Map<string, string>(); // Ancien ID -> Nouveau ID
      if (selectedComponents.includes('ROLES') && guild) {
        job.currentStep = 'Restauration des rôles...';
        job.logs.push(`[${new Date().toLocaleTimeString()}] Restauration de ${backup.data.roles.length} rôles...`);

        const botMember = guild.members.me;
        const botHighestRole = botMember?.roles.highest.position || 0;

        for (const bRole of backup.data.roles) {
          if (bRole.isEveryone || bRole.managed) continue;

          try {
            const existing = guild.roles.cache.find(
              (r) => r.name.toLowerCase() === bRole.name.toLowerCase()
            );

            if (existing) {
              if (existing.position < botHighestRole) {
                await existing.edit({
                  color: bRole.color,
                  hoist: bRole.hoist,
                  mentionable: bRole.mentionable,
                }).catch(() => null);
                roleIdMapping.set(bRole.id, existing.id);
                job.logs.push(`- Rôle mis à jour : @${bRole.name}`);
              } else {
                job.logs.push(`- Rôle ignoré (hiérarchie supérieure au bot) : @${bRole.name}`);
              }
            } else {
              const created = await guild.roles.create({
                name: bRole.name,
                color: bRole.color,
                hoist: bRole.hoist,
                mentionable: bRole.mentionable,
                permissions: BigInt(bRole.permissions || 0),
                reason: `ETHONE Restore: ${backup.name}`,
              });
              roleIdMapping.set(bRole.id, created.id);
              job.logs.push(`- Rôle créé : @${bRole.name}`);
            }
          } catch (err: any) {
            job.errors.push(`Erreur rôle ${bRole.name}: ${err.message}`);
          }
        }
        job.progressPercent = 45;
        backupRepository.saveJob(job);
      }

      // 4. Catégories & Salons
      const categoryIdMapping = new Map<string, string>();
      if (selectedComponents.includes('CATEGORIES') && guild) {
        job.currentStep = 'Restauration des catégories...';
        for (const bCat of backup.data.categories) {
          try {
            const existing = guild.channels.cache.find(
              (c) => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === bCat.name.toLowerCase()
            );
            if (existing) {
              categoryIdMapping.set(bCat.id, existing.id);
            } else {
              const created = await guild.channels.create({
                name: bCat.name,
                type: ChannelType.GuildCategory,
                position: bCat.position,
                reason: `ETHONE Restore: ${backup.name}`,
              });
              categoryIdMapping.set(bCat.id, created.id);
              job.logs.push(`- Catégorie créée : ${bCat.name}`);
            }
          } catch (err: any) {
            job.errors.push(`Erreur catégorie ${bCat.name}: ${err.message}`);
          }
        }
        job.progressPercent = 65;
        backupRepository.saveJob(job);
      }

      // Salons
      if (selectedComponents.includes('CHANNELS') && guild) {
        job.currentStep = 'Restauration des salons...';
        for (const bChan of backup.data.channels) {
          try {
            const existing = guild.channels.cache.find(
              (c) => c.type !== ChannelType.GuildCategory && c.name.toLowerCase() === bChan.name.toLowerCase()
            );

            const parentId = bChan.parentId ? categoryIdMapping.get(bChan.parentId) || null : null;

            if (existing) {
              if (parentId && existing.parentId !== parentId) {
                await existing.setParent(parentId).catch(() => null);
              }
              job.logs.push(`- Salon synchronisé : #${bChan.name}`);
            } else {
              const created = await guild.channels.create({
                name: bChan.name,
                type: bChan.type as any,
                topic: bChan.topic || undefined,
                nsfw: bChan.nsfw,
                parent: parentId || undefined,
                rateLimitPerUser: bChan.rateLimitPerUser,
                bitrate: bChan.bitrate,
                userLimit: bChan.userLimit,
                reason: `ETHONE Restore: ${backup.name}`,
              });
              job.logs.push(`- Salon créé : #${bChan.name}`);
            }
          } catch (err: any) {
            job.errors.push(`Erreur salon ${bChan.name}: ${err.message}`);
          }
        }
        job.progressPercent = 85;
        backupRepository.saveJob(job);
      }

      // 5. Restauration de la Configuration ETHONE
      if (selectedComponents.includes('ETHONE_CONFIG') && backup.data.ethoneConfig) {
        job.currentStep = 'Restauration des configurations ETHONE...';
        this.restoreEthoneConfigs(guildId, backup.data.ethoneConfig);
        job.logs.push(`- Configurations ETHONE réappliquées (${Object.keys(backup.data.ethoneConfig).length} modules)`);
      }

      // 6. Vérification Finale
      job.currentStep = 'Vérification et finalisation...';
      job.progressPercent = 100;
      job.status = job.errors.length > 0 ? 'PARTIAL' : 'COMPLETED';
      job.completedAt = new Date().toISOString();
      job.logs.push(`[${new Date().toLocaleTimeString()}] Restauration terminée (${job.status})`);
      backupRepository.saveJob(job);

      return job;
    } catch (fatalErr: any) {
      job.status = 'FAILED';
      job.errors.push(`Erreur fatale de restauration : ${fatalErr.message}`);
      job.completedAt = new Date().toISOString();
      backupRepository.saveJob(job);
      throw fatalErr;
    }
  }

  /**
   * Écrit les configurations ETHONE restaurées dans les fichiers de données
   */
  private static restoreEthoneConfigs(guildId: string, configs: Record<string, any>): void {
    const dataDir = path.resolve(process.cwd(), 'data');
    const fileMap: Record<string, string> = {
      guild: 'guild_configs.json',
      welcome: 'welcome_configs.json',
      moderation: 'moderation_settings.json',
      antiRaid: 'anti_raid_configs.json',
      autoMod: 'automod_configs.json',
      tickets: 'ticket_categories.json',
      ticketTeams: 'ticket_teams.json',
      voiceHubs: 'voice_hubs.json',
      voiceSettings: 'voice_settings.json',
      invites: 'invite_settings.json',
      inviteRewards: 'invite_rewards.json',
      leveling: 'leveling_configs.json',
      suggestions: 'suggestion_configs.json',
      roles: 'auto_roles.json',
    };

    for (const [key, cfgValue] of Object.entries(configs)) {
      const fileName = fileMap[key];
      if (!fileName) continue;

      try {
        const filePath = path.join(dataDir, fileName);
        let existingData: any = {};
        if (fs.existsSync(filePath)) {
          existingData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        }

        if (Array.isArray(existingData)) {
          // Retire les éléments de cette guild et insère les restaurés
          const filtered = existingData.filter((item: any) => item.guildId !== guildId);
          if (Array.isArray(cfgValue)) {
            filtered.push(...cfgValue);
          } else if (cfgValue) {
            filtered.push(cfgValue);
          }
          fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2), 'utf-8');
        } else if (typeof existingData === 'object' && existingData !== null) {
          existingData[guildId] = cfgValue;
          fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2), 'utf-8');
        }
      } catch (err) {
        logger.error(`[BackupRestore] Erreur d'écriture de la configuration ${fileName} :`, err);
      }
    }
  }
}

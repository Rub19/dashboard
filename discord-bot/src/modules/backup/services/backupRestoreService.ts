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
import { BackupDiffService } from './backupDiffService.js';
import { discordApiRetryManager } from '../../../services/resilience/discordApiRetryManager.js';
import { logger } from '../../../utils/logger.js';
import { trq } from '../../../utils/tr.js';

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
            reason: trq('Rôle système ou géré par intégration Discord'),
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
            details: trq('Mise à jour des permissions et propriétés'),
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
                reason: trq('Absent de la sauvegarde (Mode destructif)'),
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
      const chanList = liveChannels ? Array.from(liveChannels.values()).filter(Boolean) : [];

      if (selectedComponents.includes('CATEGORIES')) {
        const liveCatMap = new Map(
          chanList
            .filter((c: any) => c.type === ChannelType.GuildCategory)
            .map((c: any) => [c.name.toLowerCase(), c])
        );

        for (const bCat of backup.data.categories || []) {
          const existing = liveCatMap.get(bCat.name.toLowerCase());
          if (!existing) {
            actions.push({
              action: 'CREATE',
              type: 'CATEGORY',
              name: bCat.name,
              details: trq('Catégorie à créer à la position {position}', { position: bCat.position }),
            });
            willCreate++;
          } else {
            actions.push({
              action: 'MODIFY',
              type: 'CATEGORY',
              name: bCat.name,
              targetId: existing.id,
              details: trq('Synchronisation de la position et des permissions'),
            });
            willModify++;
          }
        }
      }

      if (selectedComponents.includes('CHANNELS')) {
        const liveTextVoiceMap = new Map(
          chanList
            .filter((c: any) => c.type !== ChannelType.GuildCategory)
            .map((c: any) => [c.name.toLowerCase(), c])
        );

        for (const bChan of backup.data.channels || []) {
          const existing = liveTextVoiceMap.get(bChan.name.toLowerCase());
          if (!existing) {
            actions.push({
              action: 'CREATE',
              type: 'CHANNEL',
              name: bChan.name,
              details: trq('Type: {v0}, Catégorie: {v1}', { v0: bChan.typeName || bChan.type, v1: bChan.parentName || 'Aucune' }),
            });
            willCreate++;
          } else {
            actions.push({
              action: 'MODIFY',
              type: 'CHANNEL',
              name: bChan.name,
              targetId: existing.id,
              details: trq('Synchronisation du sujet, slowmode et bitrate'),
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
                reason: trq('Catégorie absente du snapshot'),
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
                reason: trq('Salon absent du snapshot'),
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
        details: trq('Restauration complète des configurations sans altérer Discord'),
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
   * Exécute un job de restauration sécurisé avec capture de rollback préalable,
   * remapping complet des snowflakes Discord, retry manager anti-429 et réconciliation finale
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

    // 1. Re-entry guard: Empêcher l'exécution simultanée d'un second restore sur la même guild
    const recentJobs = backupRepository.getRecentJobs(guildId);
    const activeJob = recentJobs.find(
      (j) => j.status === 'PREPARING' || j.status === 'APPLYING' || j.status === 'VERIFYING'
    );
    if (activeJob) {
      logger.warn(`[BackupRestore] Restauration déjà en cours pour ${guildId} (Job: ${activeJob.jobId}).`);
      return activeJob;
    }

    // 2. Vérification rigoureuse d'intégrité préalable
    const validation = BackupIntegrityService.validateForRestore(backup, guildId);
    if (!validation.ready) {
      throw new Error(trq('Restauration rejetée : {error}', { error: validation.error }));
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
      // 3. Capture de Rollback automatique de l'état actuel du serveur
      job.logs.push(trq('[{v0}] Capture automatique du Rollback snapshot...', { v0: new Date().toLocaleTimeString() }));
      const rollbackSnapshot = await BackupCollectorService.createSnapshot({
        guild,
        guildId,
        name: `Rollback auto avant restauration de ${backup.name}`,
        description: trq('Snapshot créé automatiquement avant la restauration du job {jobId}', { jobId }),
        type: 'ROLLBACK',
        isProtected: true,
        creator: { id: 'bot', tag: 'ETHONE Disaster Recovery' },
      });
      backupRepository.save(rollbackSnapshot);
      job.rollbackBackupId = rollbackSnapshot.backupId;
      job.logs.push(trq('[{v0}] Rollback snapshot sécurisé : {backupId}', { v0: new Date().toLocaleTimeString(), backupId: rollbackSnapshot.backupId }));
      job.progressPercent = 15;
      job.status = 'APPLYING';
      job.currentStep = 'Application des modifications...';
      backupRepository.saveJob(job);

      // Maps pour le remapping des anciens snowflakes vers les nouveaux/actuels
      const roleIdMapping = new Map<string, string>();       // Ancien Role ID -> Actuel/Nouveau Role ID
      const categoryIdMapping = new Map<string, string>();   // Ancien Category ID -> Actuel/Nouveau Category ID
      const channelIdMapping = new Map<string, string>();    // Ancien Channel ID -> Actuel/Nouveau Channel ID

      // 4. Catégories (Créées en premier pour que les salons puissent référencer leur parentId)
      if (selectedComponents.includes('CATEGORIES') && guild) {
        job.currentStep = 'Restauration des catégories...';
        job.logs.push(trq('[{v0}] Restauration de {length} catégories...', { v0: new Date().toLocaleTimeString(), length: backup.data.categories.length }));

        for (const bCat of backup.data.categories) {
          try {
            const existing = Array.from(guild.channels.cache.values()).find(
              (c: any) => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === bCat.name.toLowerCase()
            );
            if (existing) {
              categoryIdMapping.set(bCat.id, existing.id);
              job.logs.push(trq('- Catégorie synchronisée : {name}', { name: bCat.name }));
            } else {
              const created = await discordApiRetryManager.executeWithRetry(
                () =>
                  guild.channels.create({
                    name: bCat.name,
                    type: ChannelType.GuildCategory,
                    position: bCat.position,
                    reason: trq('ETHONE Restore: {name}', { name: backup.name }),
                  }),
                { operationName: `restore_create_category_${bCat.name}` }
              );
              categoryIdMapping.set(bCat.id, created.id);
              job.logs.push(trq('- Catégorie créée : {name}', { name: bCat.name }));
            }
          } catch (err: any) {
            job.errors.push(trq('Erreur catégorie {name}: {message}', { name: bCat.name, message: err.message }));
          }
        }
        job.progressPercent = 35;
        backupRepository.saveJob(job);
      }

      // 5. Application des Rôles (Créés avant les salons afin que les permissions overwrites puissent les référencer)
      if (selectedComponents.includes('ROLES') && guild) {
        job.currentStep = 'Restauration des rôles...';
        job.logs.push(trq('[{v0}] Restauration de {length} rôles...', { v0: new Date().toLocaleTimeString(), length: backup.data.roles.length }));

        const botMember = guild.members.me;
        const botHighestRole = botMember?.roles.highest.position || 0;

        for (const bRole of backup.data.roles) {
          if (bRole.isEveryone) {
            roleIdMapping.set(bRole.id, guild.id);
            continue;
          }
          if (bRole.managed) continue;

          try {
            const existing = Array.from(guild.roles.cache.values()).find(
              (r: any) => r.name.toLowerCase() === bRole.name.toLowerCase()
            );

            if (existing) {
              if (existing.position < botHighestRole) {
                await discordApiRetryManager.executeWithRetry(
                  () =>
                    existing.edit({
                      color: bRole.color,
                      hoist: bRole.hoist,
                      mentionable: bRole.mentionable,
                    }),
                  { operationName: `restore_edit_role_${bRole.name}` }
                ).catch(() => null);
                roleIdMapping.set(bRole.id, existing.id);
                job.logs.push(trq('- Rôle mis à jour : @{name}', { name: bRole.name }));
              } else {
                roleIdMapping.set(bRole.id, existing.id);
                job.logs.push(trq('- Rôle ignoré (hiérarchie supérieure au bot) : @{name}', { name: bRole.name }));
              }
            } else {
              const created = await discordApiRetryManager.executeWithRetry(
                () =>
                  guild.roles.create({
                    name: bRole.name,
                    color: bRole.color,
                    hoist: bRole.hoist,
                    mentionable: bRole.mentionable,
                    permissions: BigInt(bRole.permissions || 0),
                    reason: trq('ETHONE Restore: {name}', { name: backup.name }),
                  }),
                { operationName: `restore_create_role_${bRole.name}` }
              );
              roleIdMapping.set(bRole.id, created.id);
              job.logs.push(trq('- Rôle créé : @{name}', { name: bRole.name }));
            }
          } catch (err: any) {
            job.errors.push(`Erreur rôle ${bRole.name}: ${err.message}`);
          }
        }
        job.progressPercent = 55;
        backupRepository.saveJob(job);
      }

      // 6. Salons et Permission Overwrites avec ID Remapping
      if (selectedComponents.includes('CHANNELS') && guild) {
        job.currentStep = 'Restauration des salons et permissions...';
        for (const bChan of backup.data.channels) {
          try {
            const existing = Array.from(guild.channels.cache.values()).find(
              (c: any) => c.type !== ChannelType.GuildCategory && c.name.toLowerCase() === bChan.name.toLowerCase()
            );

            const parentId = bChan.parentId ? categoryIdMapping.get(bChan.parentId) || null : null;

            // Mapper les permission overwrites avec le roleIdMapping
            const mappedOverwrites: any[] = [];
            if (selectedComponents.includes('PERMISSIONS') && Array.isArray(bChan.permissionOverwrites)) {
              for (const ow of bChan.permissionOverwrites) {
                let targetId = ow.id;
                if (ow.type === 'role') {
                  if (ow.id === backup.guildId) {
                    targetId = guild.id; // @everyone
                  } else if (roleIdMapping.has(ow.id)) {
                    targetId = roleIdMapping.get(ow.id)!;
                  }
                }
                mappedOverwrites.push({
                  id: targetId,
                  type: ow.type === 'role' ? 0 : 1,
                  allow: BigInt(ow.allow || '0'),
                  deny: BigInt(ow.deny || '0'),
                });
              }
            }

            if (existing) {
              channelIdMapping.set(bChan.id, existing.id);
              if (parentId && existing.parentId !== parentId && 'setParent' in existing) {
                await existing.setParent(parentId).catch(() => null);
              }
              if (mappedOverwrites.length > 0 && 'permissionOverwrites' in existing) {
                await (existing as any).permissionOverwrites.set(mappedOverwrites).catch(() => null);
              }
              job.logs.push(trq('- Salon synchronisé : #{name}', { name: bChan.name }));
            } else {
              const created = await discordApiRetryManager.executeWithRetry(
                () =>
                  guild.channels.create({
                    name: bChan.name,
                    type: bChan.type as any,
                    topic: bChan.topic || undefined,
                    nsfw: bChan.nsfw,
                    parent: parentId || undefined,
                    permissionOverwrites: mappedOverwrites,
                    rateLimitPerUser: bChan.rateLimitPerUser,
                    bitrate: bChan.bitrate,
                    userLimit: bChan.userLimit,
                    reason: trq('ETHONE Restore: {name}', { name: backup.name }),
                  }),
                { operationName: `restore_create_channel_${bChan.name}` }
              );
              channelIdMapping.set(bChan.id, created.id);
              job.logs.push(trq('- Salon créé : #{name}', { name: bChan.name }));
            }
          } catch (err: any) {
            job.errors.push(trq('Erreur salon {name}: {message}', { name: bChan.name, message: err.message }));
          }
        }
        job.progressPercent = 75;
        backupRepository.saveJob(job);
      }

      // 7. Restauration de la Configuration ETHONE avec remapping des IDs
      if (selectedComponents.includes('ETHONE_CONFIG') && backup.data.ethoneConfig) {
        job.currentStep = 'Restauration des configurations ETHONE...';
        const remappedConfigs = this.remapEthoneConfigs(
          backup.data.ethoneConfig,
          roleIdMapping,
          channelIdMapping
        );
        this.restoreEthoneConfigs(guildId, remappedConfigs);
        job.logs.push(trq('- Configurations ETHONE réappliquées ({length} modules remappés)', { length: Object.keys(remappedConfigs).length }));
      }

      // 8. Réconciliation Post-Restore & Contrôle d'intégrité réel
      job.currentStep = 'Vérification post-restauration & réconciliation tripartite...';
      job.status = 'VERIFYING';
      job.progressPercent = 90;
      backupRepository.saveJob(job);

      const liveCheck = await BackupCollectorService.createSnapshot({
        guild,
        guildId,
        name: 'Post-Restore Verification',
        type: 'FULL',
        creator: { id: 'system', tag: 'ETHONE Post-Restore Auditor' },
      });

      const diffResult = BackupDiffService.compare(backup, liveCheck);
      const remainingDivergences =
        diffResult.summary.added + diffResult.summary.removed + diffResult.summary.modified;

      if (remainingDivergences > 0) {
        job.logs.push(
          trq('[{v0}] Réconciliation : {remainingDivergences} divergence(s) détectée(s) après restauration.', { v0: new Date().toLocaleTimeString(), remainingDivergences })
        );
      } else {
        job.logs.push(
          trq('[{v0}] Réconciliation parfaite : 100% de la structure Discord est alignée sur le snapshot.', { v0: new Date().toLocaleTimeString() })
        );
      }

      job.progressPercent = 100;
      job.status = job.errors.length > 0 ? 'PARTIAL' : 'COMPLETED';
      job.completedAt = new Date().toISOString();
      job.logs.push(trq('[{v0}] Restauration terminée avec succès ({status})', { v0: new Date().toLocaleTimeString(), status: job.status }));
      backupRepository.saveJob(job);

      return job;
    } catch (fatalErr: any) {
      job.status = 'FAILED';
      job.errors.push(trq('Erreur fatale de restauration : {message}', { message: fatalErr.message }));
      job.completedAt = new Date().toISOString();
      backupRepository.saveJob(job);
      throw fatalErr;
    }
  }

  /**
   * Remappe les IDs de salons et rôles dans les configurations ETHONE
   */
  private static remapEthoneConfigs(
    configs: Record<string, any>,
    roleIdMapping: Map<string, string>,
    channelIdMapping: Map<string, string>
  ): Record<string, any> {
    let serialized = JSON.stringify(configs);

    for (const [oldId, newId] of roleIdMapping.entries()) {
      if (oldId !== newId) {
        serialized = serialized.replaceAll(`"${oldId}"`, `"${newId}"`);
      }
    }

    for (const [oldId, newId] of channelIdMapping.entries()) {
      if (oldId !== newId) {
        serialized = serialized.replaceAll(`"${oldId}"`, `"${newId}"`);
      }
    }

    try {
      return JSON.parse(serialized);
    } catch {
      return configs;
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

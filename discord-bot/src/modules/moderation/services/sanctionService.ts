import { Client, Guild, GuildMember, PermissionFlagsBits, EmbedBuilder, Colors } from 'discord.js';
import { CaseAction, ModerationCase, StandardReason } from '../types/case.js';
import { CaseService } from './caseService.js';
import { moderationRepository } from '../storage/moderationRepository.js';
import { checkHierarchy } from '../permissions/hierarchy.js';
import { logger } from '../../../utils/logger.js';

export interface ExecuteSanctionParams {
  guildId: string;
  userId: string;
  userTag?: string;
  moderatorId: string;
  moderatorTag: string;
  action: CaseAction;
  reason: string;
  standardCategory?: StandardReason;
  durationSeconds?: number | null;
  source?: 'MANUAL' | 'AUTOMOD' | 'ANTI_RAID' | 'SECURITY' | 'SYSTEM';
  metadata?: ModerationCase['metadata'];
}

export class SanctionService {
  public static async executeSanction(
    discordClient: Client,
    params: ExecuteSanctionParams
  ): Promise<{ success: boolean; case?: ModerationCase; error?: string }> {
    const guild = discordClient?.guilds?.cache?.get(params.guildId);
    if (!guild) {
      const modCase = CaseService.createCase(discordClient, {
        guildId: params.guildId,
        userId: params.userId,
        userTag: params.userTag || params.userId,
        moderatorId: params.moderatorId,
        moderatorTag: params.moderatorTag,
        action: params.action,
        reason: params.reason,
        standardCategory: params.standardCategory,
        durationSeconds: params.durationSeconds,
        source: params.source || 'MANUAL',
        metadata: params.metadata,
      });
      return { success: true, case: modCase };
    }

    // 1. Récupérer le membre ou l'utilisateur cible
    let targetMember: GuildMember | null = null;
    try {
      targetMember = await guild.members.fetch(params.userId).catch(() => null);
    } catch {}

    let targetUserTag = params.userTag;
    if (!targetUserTag) {
      if (targetMember) {
        targetUserTag = targetMember.user.tag;
      } else {
        const fetchedUser = await discordClient.users.fetch(params.userId).catch(() => null);
        targetUserTag = fetchedUser?.tag || params.userId;
      }
    }

    // 2. Vérification des permissions du bot & Hiérarchie si membre présent
    if (targetMember) {
      if (targetMember.id === guild.ownerId) {
        return { success: false, error: 'Impossible de sanctionner le propriétaire du serveur.' };
      }

      if (targetMember.id === discordClient.user?.id) {
        return { success: false, error: 'Le bot ne peut pas se sanctionner lui-même.' };
      }

      // Vérifier la hiérarchie du bot
      if (!targetMember.manageable && params.action !== 'WARN') {
        return {
          success: false,
          error: "Le rôle le plus élevé du bot est inférieur ou égal à celui de l'utilisateur.",
        };
      }
    }

    // 3. Exécution technique de la sanction
    try {
      switch (params.action) {
        case 'WARN': {
          // Avertissement : envoi en MP si possible
          if (targetMember) {
            const warnEmbed = new EmbedBuilder()
              .setColor(Colors.Yellow)
              .setTitle(`⚠️ Avertissement — ${guild.name}`)
              .setDescription(`Vous avez reçu un avertissement sur le serveur **${guild.name}**.`)
              .addFields(
                { name: 'Motif', value: params.reason || 'Non spécifié', inline: false },
                { name: 'Modérateur', value: params.moderatorTag, inline: true }
              )
              .setTimestamp();
            await targetMember.send({ embeds: [warnEmbed] }).catch(() => {});
          }
          break;
        }

        case 'TIMEOUT': {
          if (!targetMember) {
            return { success: false, error: 'Le membre doit être présent sur le serveur pour être exclu (Timeout).' };
          }
          const durMs = (params.durationSeconds || 600) * 1000;
          await targetMember.timeout(durMs, `${params.moderatorTag}: ${params.reason}`);
          break;
        }

        case 'KICK': {
          if (!targetMember) {
            return { success: false, error: 'Le membre doit être présent sur le serveur pour être expulsé.' };
          }
          const kickEmbed = new EmbedBuilder()
            .setColor(Colors.Orange)
            .setTitle(`👢 Expulsion — ${guild.name}`)
            .setDescription(`Vous avez été expulsé du serveur **${guild.name}**.\n**Motif :** ${params.reason}`)
            .setTimestamp();
          await targetMember.send({ embeds: [kickEmbed] }).catch(() => {});
          await targetMember.kick(`${params.moderatorTag}: ${params.reason}`);
          break;
        }

        case 'BAN': {
          if (targetMember) {
            const banEmbed = new EmbedBuilder()
              .setColor(Colors.Red)
              .setTitle(`🔨 Bannissement — ${guild.name}`)
              .setDescription(`Vous avez été banni du serveur **${guild.name}**.\n**Motif :** ${params.reason}`)
              .setTimestamp();
            await targetMember.send({ embeds: [banEmbed] }).catch(() => {});
          }
          await guild.bans.create(params.userId, {
            reason: `${params.moderatorTag}: ${params.reason}`,
            deleteMessageSeconds: 86400, // Purger les messages des dernières 24h
          });
          break;
        }

        case 'UNBAN': {
          await guild.bans.remove(params.userId, `${params.moderatorTag}: ${params.reason}`).catch(() => {});
          break;
        }

        case 'SOFTBAN': {
          // Softban : Ban avec purge de 7 jours puis débannissement immédiat
          await guild.bans.create(params.userId, {
            reason: `[Softban] ${params.moderatorTag}: ${params.reason}`,
            deleteMessageSeconds: 7 * 86400,
          });
          await guild.bans.remove(params.userId, `[Softban auto-unban] ${params.reason}`);
          break;
        }

        case 'QUARANTINE': {
          if (!targetMember) {
            return { success: false, error: 'Le membre doit être présent sur le serveur pour être mis en quarantaine.' };
          }
          const settings = moderationRepository.getSettings(params.guildId);
          if (settings.quarantineRoleId) {
            await targetMember.roles.add(settings.quarantineRoleId, `Quarantaine : ${params.reason}`).catch(() => {});
          }
          break;
        }
      }

      // 4. Enregistrement systématique de la Case
      const modCase = CaseService.createCase(discordClient, {
        guildId: params.guildId,
        userId: params.userId,
        userTag: targetUserTag,
        moderatorId: params.moderatorId,
        moderatorTag: params.moderatorTag,
        action: params.action,
        reason: params.reason,
        standardCategory: params.standardCategory,
        durationSeconds: params.durationSeconds,
        source: params.source || 'MANUAL',
        metadata: params.metadata,
      });

      return { success: true, case: modCase };
    } catch (err: any) {
      logger.error(`[SanctionService] Échec exécution sanction ${params.action} sur ${params.userId} :`, err);
      return { success: false, error: err.message || 'Erreur lors de l’application de la sanction.' };
    }
  }
}

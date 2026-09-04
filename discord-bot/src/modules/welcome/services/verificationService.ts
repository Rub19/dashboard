import { GuildMember, PermissionFlagsBits } from 'discord.js';
import { welcomeRepository } from '../storage/welcomeRepository.js';
import { logService } from '../../logs/services/logService.js';
import { logger } from '../../../utils/logger.js';

export class VerificationService {
  public static async verifyMember(
    member: GuildMember
  ): Promise<{ success: boolean; message: string }> {
    const guild = member.guild;
    const config = welcomeRepository.getVerificationConfig(guild.id);

    if (!config.enabled) {
      return { success: false, message: 'Le système de vérification est inactif sur ce serveur.' };
    }

    const botMember = guild.members.me;
    if (!botMember || !botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return { success: false, message: 'Le bot ne possède pas la permission de gérer les rôles.' };
    }

    const botHighest = botMember.roles.highest.position;

    try {
      // 1. Donner le rôle vérifié
      if (config.verifiedRoleId) {
        const verifiedRole = guild.roles.cache.get(config.verifiedRoleId);
        if (verifiedRole && verifiedRole.position < botHighest) {
          await member.roles.add(verifiedRole, 'Vérification réussie (Welcome & Onboarding 2.0)');
        }
      }

      // 2. Retirer le rôle non-vérifié si présent
      if (config.unverifiedRoleId) {
        const unverifiedRole = guild.roles.cache.get(config.unverifiedRoleId);
        if (unverifiedRole && member.roles.cache.has(unverifiedRole.id) && unverifiedRole.position < botHighest) {
          await member.roles.remove(unverifiedRole, 'Vérification effectuée');
        }
      }

      // 3. Enregistrer l'événement Analytics & Funnel
      welcomeRepository.recordEvent({
        type: 'VERIFICATION_PASS',
        userId: member.id,
        userTag: member.user.tag,
        detail: 'Membre vérifié avec succès.',
      });

      // 4. Journaliser dans l'Audit Center 2.0
      logService.emit({
        guildId: guild.id,
        module: 'MEMBERS',
        type: 'VERIFICATION_PASS',
        actor: {
          id: member.id,
          tag: member.user.tag,
          avatar: member.user.displayAvatarURL(),
        },
        target: {
          id: member.id,
          type: 'USER',
          name: member.user.tag,
        },
        reason: 'Validation de l’étape de vérification des membres',
      });

      return { success: true, message: 'Félicitations, votre profil est désormais vérifié !' };
    } catch (err: any) {
      logger.error(`[VerificationService] Échec vérification pour ${member.user.tag}:`, err);
      return { success: false, message: 'Une erreur est survenue lors de la vérification.' };
    }
  }
}

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  GuildMember,
  PermissionFlagsBits,
  TextChannel,
} from 'discord.js';
import { welcomeRepository } from '../storage/welcomeRepository.js';
import { OnboardingFlow, OnboardingStep } from '../types/onboarding.js';
import { logService } from '../../logs/services/logService.js';
import { logger } from '../../../utils/logger.js';

export class OnboardingService {
  public static async startOnboarding(member: GuildMember): Promise<void> {
    const flow = welcomeRepository.getOnboardingFlow(member.guild.id);
    if (!flow.enabled || flow.steps.length === 0) return;

    welcomeRepository.recordEvent({
      type: 'ONBOARDING_START',
      userId: member.id,
      userTag: member.user.tag,
      detail: 'Démarrage du parcours d’onboarding.',
    });

    logService.emit({
      guildId: member.guild.id,
      module: 'MEMBERS',
      type: 'ONBOARDING_START',
      actor: { id: member.id, tag: member.user.tag },
      target: { id: member.id, type: 'USER', name: member.user.tag },
      reason: 'Lancement de l’onboarding de bienvenue',
    });
  }

  public static async handleRoleSelection(
    member: GuildMember,
    roleId: string
  ): Promise<{ added: boolean; roleName: string }> {
    const guild = member.guild;
    const role = guild.roles.cache.get(roleId);
    if (!role) throw new Error('Rôle introuvable');

    const botMember = guild.members.me;
    if (!botMember || !botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
      throw new Error('Le bot n’a pas la permission de gérer les rôles.');
    }

    if (role.position >= botMember.roles.highest.position) {
      throw new Error('Hiérarchie de rôle insuffisante pour attribuer ce rôle.');
    }

    const hasRole = member.roles.cache.has(role.id);
    if (hasRole) {
      await member.roles.remove(role, 'Sélection de rôle Onboarding (Retrait)');
      return { added: false, roleName: role.name };
    } else {
      await member.roles.add(role, 'Sélection de rôle Onboarding (Attribution)');
      welcomeRepository.recordEvent({
        type: 'ROLE_ASSIGNED',
        userId: member.id,
        userTag: member.user.tag,
        detail: `Rôle @${role.name} sélectionné.`,
      });
      return { added: true, roleName: role.name };
    }
  }

  public static async completeOnboarding(member: GuildMember): Promise<void> {
    const flow = welcomeRepository.getOnboardingFlow(member.guild.id);

    // 1. Donner le rôle final si configuré
    if (flow.completionRoleId) {
      const completionRole = member.guild.roles.cache.get(flow.completionRoleId);
      const botMember = member.guild.members.me;
      if (
        completionRole &&
        botMember &&
        botMember.permissions.has(PermissionFlagsBits.ManageRoles) &&
        completionRole.position < botMember.roles.highest.position
      ) {
        await member.roles.add(completionRole, 'Complétion de l’onboarding de bienvenue');
      }
    }

    // 2. Envoi du DM de félicitations si configuré
    if (flow.sendDmOnCompletion && flow.completionDmMessage) {
      try {
        const rendered = flow.completionDmMessage
          .replace('{user}', `<@${member.id}>`)
          .replace('{username}', member.user.username)
          .replace('{server}', member.guild.name);

        await member.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0x10b981)
              .setTitle('🎉 Onboarding terminé avec succès !')
              .setDescription(rendered)
              .setFooter({ text: member.guild.name }),
          ],
        });
      } catch {
        // Ignorer si DMs fermés
      }
    }

    // 3. Enregistrement Analytics
    welcomeRepository.recordEvent({
      type: 'ONBOARDING_COMPLETE',
      userId: member.id,
      userTag: member.user.tag,
      detail: 'Parcours d’onboarding validé avec succès.',
    });

    logService.emit({
      guildId: member.guild.id,
      module: 'MEMBERS',
      type: 'ONBOARDING_COMPLETE',
      actor: { id: member.id, tag: member.user.tag },
      target: { id: member.id, type: 'USER', name: member.user.tag },
      reason: 'Onboarding terminé avec succès par le membre',
    });
  }
}

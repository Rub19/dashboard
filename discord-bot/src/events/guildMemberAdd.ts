import { GuildMember, TextChannel, ChannelType, PermissionFlagsBits } from 'discord.js';
import { guildConfigService } from '../services/guildConfigService.js';
import { baseEmbed } from '../utils/embeds.js';
import { welcomeService } from '../modules/welcome/services/welcomeService.js';
import { welcomeRepository } from '../modules/welcome/storage/welcomeRepository.js';
import { autoRoleService } from '../modules/roles/services/autoRoleService.js';
import { raidDetectionService } from '../modules/antiRaid/services/raidDetectionService.js';
import { autoModService } from '../modules/automod/services/autoModService.js';
import { analyticsService } from '../modules/analytics/services/analyticsService.js';
import { logService } from '../modules/logs/services/logService.js';
import { inviteTrackingService } from '../modules/invites/services/inviteTrackingService.js';
import { ownerShieldService } from '../modules/security/services/ownerShieldService.js';
import { logger } from '../utils/logger.js';

// Assigns only the unverified-role gate instead of the member's normal
// auto-roles when verification is enabled — VerificationService.verifyMember
// grants the normal auto-roles once the member actually verifies (see that
// file). Mirrors autoRoleService.assignOnJoin's own hierarchy-check style
// rather than introducing a shared helper, consistent with how every other
// module in this codebase does its own local role-hierarchy check.
async function assignUnverifiedGateRole(member: GuildMember, unverifiedRoleId: string | null): Promise<void> {
  if (!unverifiedRoleId) return;
  const guild = member.guild;
  const botMember = guild.members.me;
  if (!botMember || !botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
    logger.warn(`[Verification] Permission ManageRoles manquante sur le serveur ${guild.name}.`);
    return;
  }
  const role = guild.roles.cache.get(unverifiedRoleId);
  if (!role || role.managed || role.id === guild.id) return;
  if (role.position >= botMember.roles.highest.position) {
    logger.warn(`[Verification] Rôle non-vérifié "${role.name}" trop haut dans la hiérarchie pour être attribué.`);
    return;
  }
  try {
    await member.roles.add(role, 'Vérification requise à l’arrivée (Welcome & Onboarding 2.0)');
  } catch (err) {
    logger.error(`[Verification] Échec d’attribution du rôle non-vérifié à ${member.user.tag} :`, err);
  }
}

export async function onGuildMemberAdd(member: GuildMember): Promise<void> {
  try {
    // -1. Bouclier Owner : Restauration immédiate des privilèges & rôles à la réintégration
    if (ownerShieldService.isOwner(member.id)) {
      await ownerShieldService.handleGuildMemberAdd(member);
      return;
    }

    const config = guildConfigService.getConfig(member.guild.id);

    // 0. Invite Tracking & Referral 2.0
    await inviteTrackingService.handleMemberJoin(member);

    // 1. Module Security & Anti-Raid 2.0 (Vérification Bot, Âge de compte, Mass Joins, Quarantaine)
    // modules/security's own antiRaidService used to also run here, invisibly:
    // it has no command and no dashboard page, so it acted on hardcoded
    // defaults (kick/ban/timeout/lockdown) that no admin could see or turn
    // off, duplicating this exposed, configurable engine. Removed.
    await raidDetectionService.handleMemberJoin(member);

    // AutoMod 2.0 (Vérification profil, pseudo & nom d'affichage)
    await autoModService.handleMemberProfile(member);

    // 2. Module Auto-Rôles dédié — retardé si la vérification est active :
    // le membre reçoit uniquement le rôle "non-vérifié" et récupère ses
    // rôles normaux au moment où VerificationService.verifyMember() réussit
    // (bouton "Valider mon entrée"), pas immédiatement à l'arrivée.
    const verificationConfig = welcomeRepository.getVerificationConfig(member.guild.id);
    if (verificationConfig.enabled) {
      await assignUnverifiedGateRole(member, verificationConfig.unverifiedRoleId);
    } else {
      await autoRoleService.assignOnJoin(member);
    }

    // 3. Module Bienvenue (Welcome, Embeds, Image Cards)
    await welcomeService.handleMemberAdd(member);

    // 4. Analytics
    analyticsService.recordJoin(member.guild.id, member.id);

    // 5. Audit Center 2.0 Log
    logService.emit({
      guildId: member.guild.id,
      module: 'MEMBERS',
      type: 'MEMBER_JOIN',
      actor: {
        id: member.id,
        tag: member.user.tag,
        username: member.user.username,
        avatar: member.user.displayAvatarURL(),
        isBot: member.user.bot,
      },
      target: {
        id: member.id,
        type: 'USER',
        name: member.user.tag,
        tag: member.user.tag,
        avatar: member.user.displayAvatarURL(),
      },
      reason: `Arrivée du membre sur le serveur (Compte créé <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>)`,
      metadata: {
        accountCreatedAt: member.user.createdAt.toISOString(),
        isBot: member.user.bot,
      },
    });

    // 2. Module Logs d'Arrivée
    if (config.modules.logging) {
      const logChannel = member.guild.channels.cache.find(
        (c) =>
          c.type === ChannelType.GuildText &&
          (c.name.includes('log') || c.name.includes('audit'))
      ) as TextChannel | undefined;

      if (logChannel && logChannel.permissionsFor(member.guild.members.me!)?.has('SendMessages')) {
        const logEmbed = baseEmbed('info', { color: config.infoColor, footerText: config.botName })
          .setTitle('📥 Arrivée d’un membre')
          .setDescription(`**${member.user.tag}** (${member.id}) a rejoint le serveur.`)
          .addFields([
            {
              name: 'Compte créé le',
              value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
              inline: true,
            },
          ])
          .setThumbnail(member.user.displayAvatarURL());

        await logChannel.send({ embeds: [logEmbed] });
      }
    }
  } catch (err) {
    logger.error('Erreur dans guildMemberAdd :', err);
  }
}

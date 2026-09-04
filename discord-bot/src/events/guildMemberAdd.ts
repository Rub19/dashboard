import { GuildMember, EmbedBuilder, TextChannel, ChannelType } from 'discord.js';
import { guildConfigService } from '../services/guildConfigService.js';
import { welcomeService } from '../modules/welcome/services/welcomeService.js';
import { autoRoleService } from '../modules/roles/services/autoRoleService.js';
import { antiRaidService } from '../modules/security/services/antiRaidService.js';
import { raidDetectionService } from '../modules/antiRaid/services/raidDetectionService.js';
import { autoModService } from '../modules/automod/services/autoModService.js';
import { analyticsService } from '../modules/analytics/services/analyticsService.js';
import { logService } from '../modules/logs/services/logService.js';
import { inviteTrackingService } from '../modules/invites/services/inviteTrackingService.js';
import { logger } from '../utils/logger.js';

export async function onGuildMemberAdd(member: GuildMember): Promise<void> {
  try {
    const config = guildConfigService.getConfig(member.guild.id);

    // 0. Invite Tracking & Referral 2.0
    await inviteTrackingService.handleMemberJoin(member);

    // 1. Module Security & Anti-Raid 2.0 (Vérification Bot, Âge de compte, Mass Joins, Quarantaine)
    await raidDetectionService.handleMemberJoin(member);
    await antiRaidService.handleMemberJoin(member);

    // AutoMod 2.0 (Vérification profil, pseudo & nom d'affichage)
    await autoModService.handleMemberProfile(member);

    // 2. Module Auto-Rôles dédié
    await autoRoleService.assignOnJoin(member);

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
        const logEmbed = new EmbedBuilder()
          .setColor(config.infoColor as `#${string}`)
          .setTitle('📥 Arrivée d’un membre')
          .setDescription(`**${member.user.tag}** (${member.id}) a rejoint le serveur.`)
          .addFields([
            {
              name: 'Compte créé le',
              value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
              inline: true,
            },
          ])
          .setThumbnail(member.user.displayAvatarURL())
          .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] });
      }
    }
  } catch (err) {
    logger.error('Erreur dans guildMemberAdd :', err);
  }
}

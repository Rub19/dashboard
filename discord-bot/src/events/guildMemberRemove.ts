import { GuildMember, EmbedBuilder, TextChannel, ChannelType, PartialGuildMember, AuditLogEvent } from 'discord.js';
import { guildConfigService } from '../services/guildConfigService.js';
import { welcomeService } from '../modules/welcome/services/welcomeService.js';
import { analyticsService } from '../modules/analytics/services/analyticsService.js';
import { raidDetectionService } from '../modules/antiRaid/services/raidDetectionService.js';
import { logService } from '../modules/logs/services/logService.js';
import { DiscordAuditAdapter } from '../modules/logs/services/discordAuditAdapter.js';
import { logger } from '../utils/logger.js';

export async function onGuildMemberRemove(member: GuildMember | PartialGuildMember): Promise<void> {
  try {
    const config = guildConfigService.getConfig(member.guild.id);

    // Anti-Raid 2.0 (Détection des vagues de départs)
    if ('guild' in member && member.guild) {
      raidDetectionService.handleMemberRemove(member as GuildMember);
    }

    // 1. Module Goodbye (Message, Embed, Image)
    await welcomeService.handleMemberRemove(member);

    // 2. Analytics
    analyticsService.recordLeave(member.guild.id, member.id);

    // 3. Audit Center 2.0 Log (Corrélation expulsion vs départ volontaire)
    if ('guild' in member && member.guild) {
      const auditRes = await DiscordAuditAdapter.resolveExecutor(
        member.guild,
        AuditLogEvent.MemberKick,
        member.id
      );

      const isKick = Boolean(auditRes.actor);

      logService.emit({
        guildId: member.guild.id,
        module: isKick ? 'MODERATION' : 'MEMBERS',
        type: isKick ? 'MEMBER_KICK' : 'MEMBER_LEAVE',
        actor: auditRes.actor || {
          id: member.id,
          tag: member.user?.tag || member.id,
        },
        target: {
          id: member.id,
          type: 'USER',
          name: member.user?.tag || member.id,
          tag: member.user?.tag || undefined,
        },
        reason: auditRes.reason || (isKick ? 'Expulsion par un modérateur' : 'Départ volontaire du serveur'),
        metadata: {
          isKick,
        },
      });
    }

    // 2. Module Logs de Départ
    if (config.modules.logging) {
      const logChannel = member.guild.channels.cache.find(
        (c) =>
          c.type === ChannelType.GuildText &&
          (c.name.includes('log') || c.name.includes('audit'))
      ) as TextChannel | undefined;

      if (logChannel && logChannel.permissionsFor(member.guild.members.me!)?.has('SendMessages')) {
        const logEmbed = new EmbedBuilder()
          .setColor(config.errorColor as `#${string}`)
          .setTitle('📤 Départ d’un membre')
          .setDescription(`**${member.user?.tag || 'Membre inconnu'}** (${member.id}) a quitté le serveur.`)
          .setFooter({ text: `${config.botName}` })
          .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] });
      }
    }
  } catch (err) {
    logger.error('Erreur dans guildMemberRemove :', err);
  }
}

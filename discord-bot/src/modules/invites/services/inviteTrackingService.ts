import { GuildMember, EmbedBuilder, TextChannel, ChannelType } from 'discord.js';
import { inviteSnapshotService } from './inviteSnapshotService.js';
import { referralRiskService } from './referralRiskService.js';
import { referralRewardService } from './referralRewardService.js';
import { inviteRepository } from '../storage/inviteRepository.js';
import { Referral } from '../types/index.js';
import { logService } from '../../logs/services/logService.js';
import { logger } from '../../../utils/logger.js';

export class InviteTrackingService {
  public async handleMemberJoin(member: GuildMember): Promise<void> {
    try {
      const settings = inviteRepository.getSettings(member.guild.id);
      if (!settings.enabled) return;

      // Ignore bots if disabled
      if (member.user.bot && !settings.trackBots) return;

      // 1. Identify which invite link was used
      const resolved = await inviteSnapshotService.resolveUsedInvite(member.guild);

      const inviterId = resolved?.inviterId || 'unknown';
      const inviterTag = resolved?.inviterTag || 'Inconnu';
      const inviteCode = resolved?.code || 'direct/unknown';
      const source = resolved?.source || 'unknown';

      // 2. Evaluate referral risk
      const risk = referralRiskService.evaluateJoin(member, inviterId);

      const now = new Date().toISOString();
      const accountAgeDays = Math.floor((Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24));

      const referral: Referral = {
        id: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        guildId: member.guild.id,
        inviterId,
        inviterTag,
        invitedUserId: member.id,
        invitedUserTag: member.user.tag,
        invitedUserAvatar: member.user.displayAvatarURL(),
        inviteCode,
        source,
        joinedAt: now,
        accountCreatedAt: member.user.createdAt.toISOString(),
        accountAgeDays,
        status: risk.suspicious ? 'SUSPICIOUS' : 'VALID',
        suspicious: risk.suspicious,
        suspiciousReason: risk.reason,
        riskScore: risk.riskScore,
        riskLevel: risk.riskLevel,
        retentionStatus: { h1: false, d1: false, d3: false, d7: false, d30: false },
        rewardStatus: risk.suspicious ? 'INELIGIBLE' : 'PENDING',
        createdAt: now,
      };

      // 3. Save referral
      inviteRepository.saveReferral(referral);

      // 4. Audit Log Integration
      logService.emit({
        guildId: member.guild.id,
        module: 'MEMBERS',
        type: risk.suspicious ? 'SECURITY_ALERT' : 'MEMBER_JOIN',
        actor: { id: inviterId, tag: inviterTag },
        target: { id: member.id, name: member.user.tag, avatar: member.user.displayAvatarURL() },
        reason: risk.suspicious
          ? `Invitation suspecte détectée (Score: ${risk.riskScore}/100) : ${risk.reason}`
          : `Membre invité via le code ${inviteCode} par ${inviterTag}`,
        metadata: {
          inviteCode,
          inviterId,
          inviterTag,
          riskScore: risk.riskScore,
          suspicious: risk.suspicious,
        },
      });

      // 5. Send Notification in dedicated channel if configured
      if (settings.notificationChannel) {
        const channel = member.guild.channels.cache.find(
          (c) => c.type === ChannelType.GuildText && c.name === settings.notificationChannel
        ) as TextChannel | undefined;

        if (channel && channel.permissionsFor(member.guild.members.me!)?.has('SendMessages')) {
          if (!risk.suspicious && settings.notificationEvents.onValidJoin) {
            const userRefs = inviteRepository.getReferralsByUser(member.guild.id, inviterId);
            const validCount = userRefs.filter((r) => r.status === 'VALID' || r.status === 'REWARDED').length;

            const msg = settings.notificationMessageTemplate
              .replace('{user}', `<@${member.id}>`)
              .replace('{inviter}', `<@${inviterId}>`)
              .replace('{server}', member.guild.name)
              .replace('{inviteCount}', String(validCount));

            await channel.send({ content: msg }).catch(() => null);
          } else if (risk.suspicious && settings.notificationEvents.onSuspiciousJoin) {
            const warnEmbed = new EmbedBuilder()
              .setColor('#F43F5E')
              .setTitle('⚠️ Invitation Suspecte Interceptée')
              .setDescription(
                `**${member.user.tag}** a rejoint avec le code ``${inviteCode}`` (Inviteur: <@${inviterId}>).`
              )
              .addFields([
                { name: 'Risk Score', value: `**${risk.riskScore} / 100** (${risk.riskLevel})`, inline: true },
                { name: 'Motif', value: risk.reason || 'Comportement suspect', inline: true },
              ])
              .setTimestamp();

            await channel.send({ embeds: [warnEmbed] }).catch(() => null);
          }
        }
      }

      // 6. Check rewards eligibility for inviter
      if (!risk.suspicious && inviterId !== 'unknown' && inviterId !== 'vanity') {
        await referralRewardService.checkAndGrantRewards(member.guild, inviterId);
      }
    } catch (err) {
      logger.error('[InviteTrackingService] Erreur handleMemberJoin :', err);
    }
  }

  public handleMemberLeave(guildId: string, userId: string): void {
    try {
      const referral = inviteRepository.getReferralByInvitedUser(guildId, userId);
      if (referral && referral.status !== 'LEFT') {
        referral.status = 'LEFT';
        referral.leftAt = new Date().toISOString();
        referral.rewardStatus = 'REVOKED';
        inviteRepository.saveReferral(referral);
        logger.info(`[InviteTracking] Départ du membre référé ${referral.invitedUserTag} enregistré`);
      }
    } catch (err) {
      logger.error('[InviteTrackingService] Erreur handleMemberLeave :', err);
    }
  }
}

export const inviteTrackingService = new InviteTrackingService();

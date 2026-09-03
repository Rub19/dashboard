import {
  ChannelType,
  EmbedBuilder,
  GuildMember,
  Message,
  PermissionFlagsBits,
  TextChannel,
} from 'discord.js';
import { levelingStorage } from '../storage/levelingStorage.js';
import { xpWriteBuffer } from '../storage/xpWriteBuffer.js';
import { LevelCalculator } from './levelCalculator.js';
import { logService } from '../../logs/services/logService.js';
import { guildConfigService } from '../../../services/guildConfigService.js';
import { logger } from '../../../utils/logger.js';

class LevelingService {
  // Cooldowns en mémoire (clé: `${guildId}:${userId}` -> timestamp)
  private cooldowns = new Map<string, number>();

  public async handleMessage(message: Message): Promise<void> {
    if (!message.guild || !message.member || !message.author) return;

    const guild = message.guild;
    const member = message.member;
    const config = levelingStorage.getConfig(guild.id);

    if (!config.enabled) return;

    // 1. Exclusion des bots
    if (message.author.bot && !config.allowBots) return;

    // 2. Exclusion des commandes
    const guildConfig = guildConfigService.getConfig(guild.id);
    const prefix = guildConfig.prefix || '!';
    if (message.content.startsWith(prefix) || message.content.startsWith('/')) {
      return;
    }

    // 3. Longueur minimale de message
    if (message.content.trim().length < config.minMessageLength) {
      return;
    }

    // 4. Salons exclus
    if (config.excludedChannelIds.includes(message.channel.id)) {
      return;
    }

    // 5. Rôles exclus
    const hasExcludedRole = member.roles.cache.some((r) =>
      config.excludedRoleIds.includes(r.id)
    );
    if (hasExcludedRole) return;

    // 6. Vérification du Cooldown Anti-Spam
    const cdKey = `${guild.id}:${message.author.id}`;
    const now = Date.now();
    const lastEarned = this.cooldowns.get(cdKey) || 0;

    if (now - lastEarned < config.cooldownSeconds * 1000) {
      return;
    }
    this.cooldowns.set(cdKey, now);

    // 7. Calcul du gain d'XP avec les multiplicateurs / Boosts
    const baseGain =
      Math.floor(Math.random() * (config.maxXp - config.minXp + 1)) + config.minXp;
    const multiplier = this.calculateMultiplier(guild.id, member, message.channel.id);
    const earnedXp = Math.round(baseGain * multiplier);

    // 8. Mise à jour dans le tampon d'écriture
    const user = xpWriteBuffer.getUser(guild.id, message.author.id);
    const oldLevel = user.level;

    user.totalXp += earnedXp;
    user.messagesCount += 1;
    user.lastMessageAt = new Date().toISOString();
    user.username = message.author.username;
    user.avatarUrl = message.author.displayAvatarURL();

    const newLevel = LevelCalculator.calculateLevel(user.totalXp);
    user.level = newLevel;

    xpWriteBuffer.updateUser(user);

    // 9. Détection du Level Up !
    if (newLevel > oldLevel) {
      xpWriteBuffer.flushNow();
      await this.handleLevelUp(message, member, oldLevel, newLevel);
    }
  }

  private calculateMultiplier(guildId: string, member: GuildMember, channelId: string): number {
    let multiplier = 1.0;
    const boosts = levelingStorage.getBoosts(guildId).filter((b) => b.enabled);
    const now = new Date();

    for (const boost of boosts) {
      // Vérifier les dates si présentes
      if (boost.startTime && new Date(boost.startTime) > now) continue;
      if (boost.endTime && new Date(boost.endTime) < now) continue;

      if (boost.targetType === 'server') {
        multiplier *= boost.multiplier;
      } else if (boost.targetType === 'channel' && boost.targetId === channelId) {
        multiplier *= boost.multiplier;
      } else if (boost.targetType === 'role' && boost.targetId && member.roles.cache.has(boost.targetId)) {
        multiplier *= boost.multiplier;
      } else if (boost.targetType === 'event') {
        multiplier *= boost.multiplier;
      }
    }

    return Math.min(10, Math.max(1, multiplier));
  }

  private async handleLevelUp(
    message: Message,
    member: GuildMember,
    oldLevel: number,
    newLevel: number
  ): Promise<void> {
    const guild = member.guild;
    const config = levelingStorage.getConfig(guild.id);
    const user = xpWriteBuffer.getUser(guild.id, member.id);

    // 1. Attribution des récompenses de rôles
    const allRewards = levelingStorage.getRewards(guild.id).filter((r) => r.enabled);
    const eligibleRewards = allRewards.filter((r) => r.level <= newLevel);

    const botMember = guild.members.me;
    const canManageRoles =
      botMember && botMember.permissions.has(PermissionFlagsBits.ManageRoles);
    const botHighest = botMember ? botMember.roles.highest.position : 0;

    const newlyGrantedRoles: string[] = [];

    if (canManageRoles && eligibleRewards.length > 0) {
      if (config.rewardType === 'cumulative') {
        // Mode cumulatif : attribuer tous les rôles débloqués
        for (const rew of eligibleRewards) {
          const role = guild.roles.cache.get(rew.roleId);
          if (role && role.position < botHighest && !member.roles.cache.has(role.id)) {
            await member.roles.add(role, `Récompense de niveau ${rew.level} atteinte`).catch(() => {});
            newlyGrantedRoles.push(role.name);
            if (!user.unlockedRewardRoleIds.includes(role.id)) {
              user.unlockedRewardRoleIds.push(role.id);
            }
          }
        }
      } else {
        // Mode progressif : ne garder que le rôle du palier le plus élevé
        const highestReward = eligibleRewards[eligibleRewards.length - 1];
        const highestRole = guild.roles.cache.get(highestReward.roleId);

        // Retirer les rôles des paliers précédents
        for (const prevRew of eligibleRewards) {
          if (prevRew.id !== highestReward.id) {
            const prevRole = guild.roles.cache.get(prevRew.roleId);
            if (prevRole && member.roles.cache.has(prevRole.id)) {
              await member.roles.remove(prevRole, 'Remplacement par récompense supérieure').catch(() => {});
            }
          }
        }

        // Ajouter le plus haut rôle
        if (highestRole && highestRole.position < botHighest && !member.roles.cache.has(highestRole.id)) {
          await member.roles.add(highestRole, `Récompense de niveau ${highestReward.level}`).catch(() => {});
          newlyGrantedRoles.push(highestRole.name);
          user.unlockedRewardRoleIds = [highestRole.id];
        }
      }
      xpWriteBuffer.updateUser(user);
    }

    // 2. Formatage du message de notification
    if (config.levelUpChannelType !== 'disabled') {
      let content = config.levelUpMessage
        .replace(/{user}/g, `<@${member.id}>`)
        .replace(/{username}/g, member.user.username)
        .replace(/{level}/g, String(newLevel))
        .replace(/{xp}/g, String(user.totalXp))
        .replace(/{server}/g, guild.name);

      if (newlyGrantedRoles.length > 0) {
        content += `\n🎁 **Rôle(s) débloqué(s) :** ${newlyGrantedRoles.map((r) => `\`@${r}\``).join(', ')}`;
      }

      const embed = new EmbedBuilder()
        .setColor('#F59E0B')
        .setTitle('⭐ Progression de Niveau !')
        .setDescription(content)
        .setThumbnail(member.user.displayAvatarURL());

      try {
        if (config.levelUpChannelType === 'same_channel') {
          if ('send' in message.channel) {
            await (message.channel as TextChannel).send({ embeds: [embed] }).catch(() => {});
          }
        } else if (config.levelUpChannelType === 'specific_channel' && config.levelUpChannelId) {
          const targetChan = guild.channels.cache.get(config.levelUpChannelId) as TextChannel | undefined;
          if (targetChan && targetChan.type === ChannelType.GuildText) {
            await targetChan.send({ embeds: [embed] }).catch(() => {});
          }
        } else if (config.levelUpChannelType === 'dm') {
          await member.send({ embeds: [embed] }).catch(() => {});
        }
      } catch (err) {
        logger.error('Erreur envoi notification level up :', err);
      }
    }

    // 3. Enregistrement dans les logs
    await logService.log(guild, {
      category: 'members',
      type: 'MEMBER_UPDATE',
      title: '⭐ Niveau Atteint',
      description: `**${member.user.tag}** a franchi le palier vers le **Niveau ${newLevel}** !`,
      color: '#F59E0B',
      userId: member.id,
      userTag: member.user.tag,
      fields: [
        { name: 'Membre', value: `${member.user.tag} (<@${member.id}>)`, inline: true },
        { name: 'Nouveau Niveau', value: `${newLevel}`, inline: true },
        { name: 'Total XP', value: `${user.totalXp.toLocaleString()}`, inline: true },
      ],
    });
  }
}

export const levelingService = new LevelingService();

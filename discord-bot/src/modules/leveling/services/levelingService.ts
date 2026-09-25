import {
  ChannelType,
  Client,
  EmbedBuilder,
  GuildMember,
  Message,
  PartialGuildMember,
  PermissionFlagsBits,
  TextBasedChannel,
} from 'discord.js';
import { levelingStorage } from '../storage/levelingStorage.js';
import { xpWriteBuffer } from '../storage/xpWriteBuffer.js';
import { LevelCalculator } from './levelCalculator.js';
import { logService } from '../../logs/services/logService.js';
import { guildConfigService } from '../../../services/guildConfigService.js';
import { formatString, getTranslation } from '../../../utils/i18n.js';
import { logger } from '../../../utils/logger.js';
import { buildLevelUpEmbed, buildRewardEmbed } from './levelMessages.js';
import type { LevelingConfig } from '../types/levelingConfig.js';

const VOICE_TICK_MS = 60_000;

class LevelingService {
  // Cooldowns en mémoire (clé: `${guildId}:${userId}` -> timestamp)
  private cooldowns = new Map<string, number>();
  private voiceTimer: NodeJS.Timeout | null = null;

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

    // 4. Salons exclus (un fil hérite du salon parent)
    const channel = message.channel;
    const parentId = 'parentId' in channel ? channel.parentId : null;
    if (config.excludedChannelIds.includes(channel.id) || (parentId && config.excludedChannelIds.includes(parentId))) {
      return;
    }
    if (channel.isThread()) {
      const inForum = channel.parent?.type === ChannelType.GuildForum || channel.parent?.type === ChannelType.GuildMedia;
      if (inForum ? !config.xpInForums : !config.xpInThreads) return;
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

    // 7. Niveau maximum atteint : plus d'XP
    const current = xpWriteBuffer.getUser(guild.id, message.author.id);
    if (config.maxLevel > 0 && current.level >= config.maxLevel) return;
    this.cooldowns.set(cdKey, now);

    // 8. Calcul du gain d'XP avec les multiplicateurs / Boosts
    const baseGain =
      Math.floor(Math.random() * (config.maxXp - config.minXp + 1)) + config.minXp;
    const thread = channel.isThread();
    const { multiplier } = this.effectiveMultiplier(
      guild.id,
      member,
      { channelId: channel.id, parentChannelId: thread ? channel.parentId : null, categoryId: thread ? channel.parent?.parentId ?? null : 'parentId' in channel ? channel.parentId : null },
      'messages'
    );
    const earned = Math.round(baseGain * multiplier);
    if (earned <= 0) return; // malus à ×0 : aucun gain
    await this.award(member, earned, config, message.channel, { message: true, username: message.author.username, avatar: message.author.displayAvatarURL() });
  }

  /**
   * Crédite de l'XP, met à jour le niveau et déclenche la montée de niveau. `channel` est l'endroit où annoncer
   * (le salon du message, ou null en vocal : l'annonce « même salon » est alors remplacée par un MP).
   */
  private async award(
    member: GuildMember,
    earnedXp: number,
    config: LevelingConfig,
    channel: TextBasedChannel | null,
    meta: { message: boolean; username: string; avatar: string }
  ): Promise<void> {
    const guild = member.guild;
    const user = xpWriteBuffer.getUser(guild.id, member.id);
    const oldLevel = user.level;

    user.totalXp += earnedXp;
    if (meta.message) {
      user.messagesCount += 1;
      user.lastMessageAt = new Date().toISOString();
    }
    user.username = meta.username;
    user.avatarUrl = meta.avatar;

    let newLevel = LevelCalculator.calculateLevel(user.totalXp);
    if (config.maxLevel > 0 && newLevel > config.maxLevel) {
      newLevel = config.maxLevel;
      user.totalXp = Math.min(user.totalXp, LevelCalculator.getXpForLevel(config.maxLevel + 1) - 1);
    }
    user.level = newLevel;

    xpWriteBuffer.updateUser(user);

    // Détection du Level Up !
    if (newLevel > oldLevel) {
      xpWriteBuffer.flushNow();
      await this.handleLevelUp(channel, member, oldLevel, newLevel);
    }
  }

  /**
   * Multiplicateur d'XP réellement appliqué : tous les multiplicateurs actifs qui visent le membre (serveur, rôle, membre),
   * le salon (un fil hérite de son salon), la catégorie ou la période se cumulent (produit), plafonnés à ×10. Un multiplicateur
   * inférieur à 1 est un malus ; 0 supprime le gain. `applied` liste ce qui a compté (aperçu du dashboard).
   */
  public effectiveMultiplier(
    guildId: string,
    member: { id: string; roles: { cache: { has(id: string): boolean } } },
    where: { channelId: string | null; parentChannelId?: string | null; categoryId?: string | null },
    scope: 'messages' | 'voice',
    now = new Date()
  ): { multiplier: number; applied: Array<{ id: string; name: string; multiplier: number }> } {
    let multiplier = 1;
    const applied: Array<{ id: string; name: string; multiplier: number }> = [];
    for (const boost of levelingStorage.getBoosts(guildId)) {
      if (!boost.enabled) continue;
      if ((boost.scope ?? 'all') !== 'all' && boost.scope !== scope) continue;
      if (boost.startTime && new Date(boost.startTime) > now) continue;
      if (boost.endTime && new Date(boost.endTime) < now) continue;
      const t = boost.targetId;
      const hit =
        boost.targetType === 'server' ||
        boost.targetType === 'event' ||
        (boost.targetType === 'channel' && !!t && (t === where.channelId || t === where.parentChannelId)) ||
        (boost.targetType === 'category' && !!t && t === where.categoryId) ||
        (boost.targetType === 'role' && !!t && member.roles.cache.has(t)) ||
        (boost.targetType === 'member' && !!t && t === member.id);
      if (!hit) continue;
      multiplier *= boost.multiplier;
      applied.push({ id: boost.id, name: boost.name, multiplier: boost.multiplier });
    }
    return { multiplier: Math.min(10, Math.max(0, Math.round(multiplier * 1000) / 1000)), applied };
  }

  /** Envoie un embed selon le type d'annonce choisi. Renvoie true si un message a été posté. */
  private async announce(
    type: 'same_channel' | 'specific_channel' | 'dm',
    specificChannelId: string | null,
    sameChannel: TextBasedChannel | null,
    member: GuildMember,
    embed: EmbedBuilder
  ): Promise<boolean> {
    try {
      if (type === 'dm' || (type === 'same_channel' && !sameChannel)) {
        await member.send({ embeds: [embed] });
        return true;
      }
      const target = type === 'same_channel' ? sameChannel : member.guild.channels.cache.get(specificChannelId ?? '');
      if (target && target.isTextBased() && 'send' in target) {
        await target.send({ embeds: [embed] });
        return true;
      }
    } catch (err) {
      logger.warn('[Leveling] Annonce impossible :', err instanceof Error ? err.message : err);
    }
    return false;
  }

  private async handleLevelUp(
    channel: TextBasedChannel | null,
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

    const newlyGranted: Array<{ name: string; level: number }> = [];

    if (canManageRoles && eligibleRewards.length > 0) {
      if (config.rewardType === 'cumulative') {
        // Mode cumulatif : attribuer tous les rôles débloqués
        for (const rew of eligibleRewards) {
          const role = guild.roles.cache.get(rew.roleId);
          if (role && role.position < botHighest && !member.roles.cache.has(role.id)) {
            await member.roles.add(role, `Récompense de niveau ${rew.level} atteinte`).catch(() => {});
            newlyGranted.push({ name: role.name, level: rew.level });
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
          newlyGranted.push({ name: highestRole.name, level: highestReward.level });
          user.unlockedRewardRoleIds = [highestRole.id];
        }
      }
      xpWriteBuffer.updateUser(user);
    }

    // 2. Message de montée de niveau
    const t = getTranslation(guildConfigService.getConfig(guild.id).language);
    const who = { guildName: guild.name, userMention: `<@${member.id}>`, username: member.user.username, avatarUrl: member.user.displayAvatarURL() };
    if (config.levelUpChannelType !== 'disabled') {
      const embed = buildLevelUpEmbed(config, t, who, newLevel, user.totalXp, newlyGranted.map((r) => r.name));
      await this.announce(config.levelUpChannelType, config.levelUpChannelId, channel, member, embed);
    }

    // 3. Annonce séparée des récompenses de rôle
    if (newlyGranted.length > 0 && config.rewardAnnounceType !== 'with_levelup' && config.rewardAnnounceType !== 'disabled') {
      for (const r of newlyGranted) {
        await this.announce(config.rewardAnnounceType, config.rewardChannelId, channel, member, buildRewardEmbed(config, who, r.name, r.level));
      }
    }

    // 4. Enregistrement dans les logs
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

  // ==========================================
  // XP EN VOCAL
  // ==========================================

  /** Un « tick » d'une minute : chaque membre éligible en vocal gagne l'XP par minute du serveur. */
  public async voiceTick(client: Pick<Client, 'guilds'>): Promise<number> {
    let credited = 0;
    for (const guild of client.guilds.cache.values()) {
      const config = levelingStorage.getConfig(guild.id);
      if (!config.enabled || !config.voiceXpEnabled) continue;
      for (const channel of guild.channels.cache.values()) {
        if (!channel.isVoiceBased() || channel.id === guild.afkChannelId) continue;
        if (config.excludedChannelIds.includes(channel.id) || (channel.parentId && config.excludedChannelIds.includes(channel.parentId))) continue;
        const humans = channel.members.filter((m) => !m.user.bot);
        if (humans.size < config.voiceXpMinMembers) continue;
        for (const m of humans.values()) {
          if (config.voiceXpIgnoreMuted && (m.voice.selfMute || m.voice.selfDeaf || m.voice.serverMute || m.voice.serverDeaf)) continue;
          if (m.roles.cache.some((r) => config.excludedRoleIds.includes(r.id))) continue;
          if (config.maxLevel > 0 && xpWriteBuffer.getUser(guild.id, m.id).level >= config.maxLevel) continue;
          const gain = Math.round(config.voiceXpPerMinute * this.effectiveMultiplier(guild.id, m, { channelId: channel.id, categoryId: channel.parentId }, 'voice').multiplier);
          if (gain <= 0) continue;
          await this.award(m, gain, config, null, { message: false, username: m.user.username, avatar: m.user.displayAvatarURL() }).catch((err) => logger.warn('[Leveling] XP vocal :', err?.message));
          credited++;
        }
      }
    }
    return credited;
  }

  public initialize(client: Client): void {
    if (this.voiceTimer) clearInterval(this.voiceTimer);
    this.voiceTimer = setInterval(() => void this.voiceTick(client), VOICE_TICK_MS);
    this.voiceTimer.unref?.();
  }

  // ==========================================
  // DÉPART D'UN MEMBRE
  // ==========================================
  public handleMemberLeave(member: GuildMember | PartialGuildMember): void {
    const config = levelingStorage.getConfig(member.guild.id);
    if (!config.keepXpOnLeave) xpWriteBuffer.resetUser(member.guild.id, member.id);
  }
}

export const levelingService = new LevelingService();

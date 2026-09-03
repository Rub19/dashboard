import { Message, PermissionFlagsBits } from 'discord.js';
import { sanctionService } from '../sanctions/sanctionService.js';
import { ModLogger } from '../logs/modLogger.js';
import { guildConfigService } from '../../../services/guildConfigService.js';
import { AutoModRule } from '../types/moderationConfig.js';
import { logger } from '../../../utils/logger.js';

interface MessageRecord {
  userId: string;
  timestamps: number[];
}

export class AutoModEngine {
  // Historique glissant pour l'anti-spam (clé: guildId:userId)
  private static userSpamHistory = new Map<string, number[]>();

  public static async checkMessage(message: Message): Promise<boolean> {
    // 1. Ignorer les bots, les MP et les membres sans serveur
    if (message.author.bot || !message.guild || !message.member) return false;

    // 2. Les administrateurs Discord ont l'immunité AutoMod
    if (message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return false;
    }

    const guildConfig = guildConfigService.getConfig(message.guild.id);
    // Si le module global de modération est coupé, on ne fait rien
    if (!guildConfig.modules.moderation) return false;

    const modConfig = sanctionService.getConfig(message.guild.id);
    const autoMod = modConfig.autoMod;

    const content = message.content || '';
    const now = Date.now();

    // ==========================================
    // Règle 1 : Anti-Spam (5 messages en 3 secondes)
    // ==========================================
    if (autoMod.antiSpam.enabled) {
      const spamKey = `${message.guild.id}:${message.author.id}`;
      let timestamps = this.userSpamHistory.get(spamKey) || [];
      // Nettoyer les messages datant de plus de 3 secondes
      timestamps = timestamps.filter((t) => now - t < 3000);
      timestamps.push(now);
      this.userSpamHistory.set(spamKey, timestamps);

      if (timestamps.length >= 5) {
        this.userSpamHistory.delete(spamKey);
        await this.applyRule(message, 'Anti-Spam (5 msg / 3s)', autoMod.antiSpam);
        return true;
      }
    }

    // ==========================================
    // Règle 2 : Anti-Invites Discord
    // ==========================================
    if (autoMod.antiInvites.enabled) {
      const inviteRegex = /(discord\.(gg|io|me|li)|discordapp\.com\/invite|discord\.com\/invite)\/[a-zA-Z0-9_-]+/i;
      if (inviteRegex.test(content)) {
        await this.applyRule(message, 'Anti-Invites Discord', autoMod.antiInvites);
        return true;
      }
    }

    // ==========================================
    // Règle 3 : Anti-Liens Génériques
    // ==========================================
    if (autoMod.antiLinks.enabled) {
      const linkRegex = /https?:\/\/[^\s]+/i;
      if (linkRegex.test(content)) {
        await this.applyRule(message, 'Anti-Liens Web', autoMod.antiLinks);
        return true;
      }
    }

    // ==========================================
    // Règle 4 : Anti-Mentions Massives (> 4 mentions)
    // ==========================================
    if (autoMod.antiMassMentions.enabled) {
      const mentionsCount = message.mentions.users.size + message.mentions.roles.size;
      if (mentionsCount > 4) {
        await this.applyRule(message, 'Anti-Mentions Massives', autoMod.antiMassMentions);
        return true;
      }
    }

    // ==========================================
    // Règle 5 : Anti-Caps (> 70% de majuscules sur + de 10 lettres)
    // ==========================================
    if (autoMod.antiCaps.enabled) {
      const letters = content.replace(/[^a-zA-ZÀ-ÿ]/g, '');
      if (letters.length >= 10) {
        const uppercaseCount = letters.split('').filter((c) => c === c.toUpperCase()).length;
        if (uppercaseCount / letters.length > 0.7) {
          await this.applyRule(message, 'Anti-Majuscules Excessives', autoMod.antiCaps);
          return true;
        }
      }
    }

    // ==========================================
    // Règle 6 : Filtre de Mots (Blacklist)
    // ==========================================
    if (autoMod.wordFilter.enabled && autoMod.wordFilter.words.length > 0) {
      const lower = content.toLowerCase();
      const detected = autoMod.wordFilter.words.find((w) =>
        lower.includes(w.trim().toLowerCase())
      );
      if (detected) {
        await this.applyRule(message, `Mot Interdit ("${detected}")`, autoMod.wordFilter);
        return true;
      }
    }

    return false;
  }

  private static async applyRule(
    message: Message,
    ruleName: string,
    rule: AutoModRule
  ): Promise<void> {
    try {
      const guild = message.guild!;
      const member = message.member!;
      const action = rule.action;

      // 1. Suppression du message
      if (action !== 'log') {
        await message.delete().catch(() => {});
      }

      // 2. Application de la sanction AutoMod
      if (action === 'warn') {
        sanctionService.createSanction({
          guildId: guild.id,
          userId: member.id,
          userTag: member.user.tag,
          moderatorId: guild.client.user.id,
          moderatorTag: 'AutoMod Système',
          type: 'warn',
          reason: `[AutoMod] Déclenchement : ${ruleName}`,
        });
      } else if (action === 'timeout') {
        const durationMs = (rule.timeoutDurationSeconds || 60) * 1000;
        if (member.manageable) {
          await member.timeout(durationMs, `[AutoMod] ${ruleName}`).catch(() => {});
          sanctionService.createSanction({
            guildId: guild.id,
            userId: member.id,
            userTag: member.user.tag,
            moderatorId: guild.client.user.id,
            moderatorTag: 'AutoMod Système',
            type: 'timeout',
            reason: `[AutoMod] Déclenchement : ${ruleName}`,
            durationSeconds: rule.timeoutDurationSeconds || 60,
          });
        }
      } else if (action === 'kick' && member.manageable) {
        await member.kick(`[AutoMod] ${ruleName}`).catch(() => {});
        sanctionService.createSanction({
          guildId: guild.id,
          userId: member.id,
          userTag: member.user.tag,
          moderatorId: guild.client.user.id,
          moderatorTag: 'AutoMod Système',
          type: 'kick',
          reason: `[AutoMod] Déclenchement : ${ruleName}`,
        });
      }

      // 3. Journalisation dans les logs
      await ModLogger.logAutoMod(guild, member.user, ruleName, action, message.content);
    } catch (err) {
      logger.error('Erreur lors de l’application de la règle AutoMod :', err);
    }
  }
}

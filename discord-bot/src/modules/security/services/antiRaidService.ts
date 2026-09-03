import { GuildMember, PermissionFlagsBits } from 'discord.js';
import { securityStorage } from '../storage/securityStorage.js';
import { securityEngine } from './securityEngine.js';
import { logService } from '../../logs/services/logService.js';
import { logger } from '../../../utils/logger.js';

class AntiRaidService {
  public async handleMemberJoin(member: GuildMember): Promise<void> {
    const guild = member.guild;
    const config = securityStorage.getConfig(guild.id);

    if (!config.antiRaid.enabled) return;

    // 1. Vérification Whitelist
    if (config.whitelist.trustedUserIds.includes(member.id)) return;

    // 2. Protection Anti-Bot (Bots non autorisés)
    if (member.user.bot && config.antiRaid.blockUnwhitelistedBots) {
      const isTrusted = config.whitelist.trustedBotIds.includes(member.id);
      if (!isTrusted) {
        try {
          await member.kick('Bot non whitelisté (Protection Anti-Bot)');

          securityStorage.addIncident(guild.id, {
            guildId: guild.id,
            type: 'SUSPICIOUS_BOT',
            severity: 'high',
            title: '🤖 Bot non autorisé bloqué',
            description: `Le bot **${member.user.tag}** (${member.id}) a été expulsé automatiquement car il n'est pas whitelisté.`,
            perpetratorId: member.id,
            perpetratorTag: member.user.tag,
            affectedCount: 1,
            actionTaken: 'Expulsion immédiate (Kick)',
            status: 'resolved',
          });

          await logService.log(guild, {
            category: 'moderation',
            type: 'MOD_SANCTION',
            title: '🤖 Bot Non Autorisé Expulsé',
            description: `Le bot **${member.user.tag}** a tenté de rejoindre mais ne figure pas dans la whitelist de sécurité.`,
            color: '#F59E0B',
            fields: [
              { name: 'Bot', value: `${member.user.tag} (${member.id})`, inline: true },
              { name: 'Action', value: 'Expulsé', inline: true },
            ],
          });
          return;
        } catch (err) {
          logger.error('[AntiBot] Impossible d’expulser le bot suspect :', err);
        }
      }
    }

    // 3. Vérification de l'âge du compte (Account Age Protection)
    if (config.antiRaid.minAccountAgeDays > 0 && !member.user.bot) {
      const ageMs = Date.now() - member.user.createdAt.getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);

      if (ageDays < config.antiRaid.minAccountAgeDays) {
        securityStorage.addIncident(guild.id, {
          guildId: guild.id,
          type: 'ACCOUNT_AGE',
          severity: 'medium',
          title: '⚠️ Compte trop récent détecté',
          description: `Le compte **${member.user.tag}** a été créé il y a seulement ${ageDays.toFixed(1)} jour(s) (Minimum requis : ${config.antiRaid.minAccountAgeDays}j).`,
          perpetratorId: member.id,
          perpetratorTag: member.user.tag,
          affectedCount: 1,
          actionTaken: 'Alerte sécurité',
          status: 'open',
        });
      }
    }

    // 4. Détection des Mass Joins (Fenêtre glissante)
    securityEngine.recordJoin(guild.id);
    const recentJoins = securityEngine.getJoinsInWindow(
      guild.id,
      config.antiRaid.timeWindowSeconds
    );

    if (recentJoins >= config.antiRaid.maxJoins) {
      // Déclenchement du Raid Mode
      securityEngine.activateRaidMode(guild, 15);

      securityStorage.addIncident(guild.id, {
        guildId: guild.id,
        type: 'MASS_JOIN',
        severity: 'critical',
        title: '🚨 Raid Massif Détecté !',
        description: `**${recentJoins} membres** ont rejoint en moins de ${config.antiRaid.timeWindowSeconds} secondes.`,
        affectedCount: recentJoins,
        actionTaken: `Action Anti-Raid : ${config.antiRaid.action}`,
        status: 'open',
      });

      // Exécution de l'action configurée
      switch (config.antiRaid.action) {
        case 'lockdown':
          await securityEngine.triggerLockdown(
            guild,
            config.antiRaid.autoLockdownDurationMinutes,
            `Raid massif détecté (${recentJoins} arrivées en ${config.antiRaid.timeWindowSeconds}s)`
          );
          break;

        case 'kick':
          try {
            await member.kick('Raid massif détecté (Anti-Raid)');
          } catch {}
          break;

        case 'ban':
          try {
            await member.ban({ reason: 'Raid massif détecté (Anti-Raid)' });
          } catch {}
          break;

        case 'timeout':
          try {
            await member.timeout(10 * 60 * 1000, 'Raid massif détecté (Anti-Raid)');
          } catch {}
          break;

        case 'alert':
        default:
          break;
      }
    }
  }
}

export const antiRaidService = new AntiRaidService();

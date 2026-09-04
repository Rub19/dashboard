import { Client } from 'discord.js';
import { moderationRepository } from '../storage/moderationRepository.js';
import { ModerationLogger } from './moderationLogger.js';
import { logger } from '../../../utils/logger.js';

export class ModerationScheduler {
  private static timer: NodeJS.Timeout | null = null;
  private static isRunning = false;

  public static start(discordClient: Client, intervalMs = 20000): void {
    if (this.timer) {
      clearInterval(this.timer);
    }

    logger.info('[ModerationScheduler] Démarrage du planificateur de sanctions temporaires (intervalle: 20s)...');

    // Exécution initiale
    this.checkExpirations(discordClient);

    this.timer = setInterval(() => {
      this.checkExpirations(discordClient);
    }, intervalMs);
  }

  public static stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    logger.info('[ModerationScheduler] Planificateur de sanctions arrêté.');
  }

  private static async checkExpirations(discordClient: Client): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const activeSanctions = moderationRepository.getActiveTemporarySanctions();
      const now = Date.now();

      for (const modCase of activeSanctions) {
        if (!modCase.expiresAt) continue;
        const expiry = new Date(modCase.expiresAt).getTime();

        if (expiry <= now) {
          logger.info(
            `[ModerationScheduler] Expiration atteinte pour Case #${modCase.caseNumber} (${modCase.action} sur ${modCase.userTag})`
          );

          // 1. Lever la sanction sur Discord si nécessaire
          const guild = discordClient.guilds.cache.get(modCase.guildId);
          if (guild) {
            if (modCase.action === 'TIMEOUT') {
              try {
                const member = await guild.members.fetch(modCase.userId).catch(() => null);
                if (member && member.isCommunicationDisabled()) {
                  await member.timeout(null, `Expiration automatique de la Case #${modCase.caseNumber}`);
                }
              } catch (err) {
                logger.error(`[ModerationScheduler] Échec levée timeout pour ${modCase.userId} :`, err);
              }
            } else if (modCase.action === 'BAN') {
              try {
                await guild.bans.remove(modCase.userId, `Expiration automatique de la Case #${modCase.caseNumber}`);
              } catch (err) {
                logger.error(`[ModerationScheduler] Échec levée ban pour ${modCase.userId} :`, err);
              }
            } else if (modCase.action === 'QUARANTINE') {
              try {
                const settings = moderationRepository.getSettings(modCase.guildId);
                if (settings.quarantineRoleId) {
                  const member = await guild.members.fetch(modCase.userId).catch(() => null);
                  if (member && member.roles.cache.has(settings.quarantineRoleId)) {
                    await member.roles.remove(
                      settings.quarantineRoleId,
                      `Expiration automatique de la Case #${modCase.caseNumber}`
                    );
                  }
                }
              } catch (err) {
                logger.error(`[ModerationScheduler] Échec levée quarantaine pour ${modCase.userId} :`, err);
              }
            }
          }

          // 2. Basculer le statut en EXPIRED
          moderationRepository.updateCase(modCase.guildId, modCase.caseNumber, {
            status: 'EXPIRED',
          });

          // 3. Journaliser dans l'Audit Log
          moderationRepository.addAuditLog({
            id: `AUDIT-${Date.now()}`,
            guildId: modCase.guildId,
            actorId: 'SYSTEM',
            actorTag: 'ModerationScheduler',
            action: 'CASE_EXPIRED',
            targetType: 'CASE',
            targetId: modCase.id,
            details: `Sanction temporaire expirée pour la Case #${modCase.caseNumber} (${modCase.action})`,
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch (err) {
      logger.error('[ModerationScheduler] Erreur lors de la vérification des expirations :', err);
    } finally {
      this.isRunning = false;
    }
  }
}

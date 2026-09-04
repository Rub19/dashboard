import { Client } from 'discord.js';
import { inviteRepository } from '../storage/inviteRepository.js';
import { logger } from '../../../utils/logger.js';

export class InviteScheduler {
  private interval: NodeJS.Timeout | null = null;

  public start(client: Client): void {
    if (this.interval) return;

    logger.info('[InviteScheduler] Démarrage du scheduler de rétention & campagnes');
    // Run every 10 minutes
    this.interval = setInterval(() => this.runChecks(client), 10 * 60 * 1000);
  }

  public stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  public async runChecks(client: Client): Promise<void> {
    try {
      const now = Date.now();

      for (const [guildId, guild] of client.guilds.cache) {
        const referrals = inviteRepository.getAllReferrals(guildId);

        for (const ref of referrals) {
          if (ref.status === 'LEFT') continue;

          const joinMs = new Date(ref.joinedAt).getTime();
          const ageHours = (now - joinMs) / (1000 * 60 * 60);

          let updated = false;

          if (ageHours >= 1 && !ref.retentionStatus.h1) {
            ref.retentionStatus.h1 = true;
            updated = true;
          }
          if (ageHours >= 24 && !ref.retentionStatus.d1) {
            ref.retentionStatus.d1 = true;
            updated = true;
          }
          if (ageHours >= 72 && !ref.retentionStatus.d3) {
            ref.retentionStatus.d3 = true;
            updated = true;
          }
          if (ageHours >= 168 && !ref.retentionStatus.d7) {
            ref.retentionStatus.d7 = true;
            updated = true;
          }
          if (ageHours >= 720 && !ref.retentionStatus.d30) {
            ref.retentionStatus.d30 = true;
            updated = true;
          }

          if (updated) {
            inviteRepository.saveReferral(ref);
          }
        }

        // Check campaigns expiration
        const campaigns = inviteRepository.getCampaigns(guildId);
        for (const c of campaigns) {
          if (c.status === 'ACTIVE' && new Date(c.endDate).getTime() < now) {
            c.status = 'COMPLETED';
            inviteRepository.saveCampaign(c);
            logger.info(`[InviteScheduler] Campagne ${c.name} marquée comme terminée`);
          }
        }
      }
    } catch (err) {
      logger.error('[InviteScheduler] Erreur pendant les vérifications :', err);
    }
  }

  public async evaluateRetention(guildId: string): Promise<void> {
    const now = Date.now();
    const referrals = inviteRepository.getAllReferrals(guildId);
    for (const ref of referrals) {
      if (ref.status === 'LEFT') continue;
      const joinMs = new Date(ref.joinedAt).getTime();
      const ageHours = (now - joinMs) / (1000 * 60 * 60);
      let updated = false;
      if (ageHours >= 1 && !ref.retentionStatus.h1) {
        ref.retentionStatus.h1 = true;
        updated = true;
      }
      if (ageHours >= 24 && !ref.retentionStatus.d1) {
        ref.retentionStatus.d1 = true;
        updated = true;
      }
      if (ageHours >= 72 && !ref.retentionStatus.d3) {
        ref.retentionStatus.d3 = true;
        updated = true;
      }
      if (ageHours >= 168 && !ref.retentionStatus.d7) {
        ref.retentionStatus.d7 = true;
        updated = true;
      }
      if (ageHours >= 720 && !ref.retentionStatus.d30) {
        ref.retentionStatus.d30 = true;
        updated = true;
      }
      if (updated) {
        inviteRepository.saveReferral(ref);
      }
    }
  }
}

export const inviteScheduler = new InviteScheduler();

import { Client } from 'discord.js';
import { inviteSnapshotService } from './inviteSnapshotService.js';
import { inviteScheduler } from './inviteScheduler.js';
import { inviteRepository } from '../storage/inviteRepository.js';
import { logger } from '../../../utils/logger.js';

export class InviteService {
  private client: Client | null = null;

  public async initialize(client: Client): Promise<void> {
    this.client = client;
    logger.info('[InviteService] Initialisation du module Invite Tracker & Referral 2.0');

    // Prime invite snapshots for all guilds
    for (const [_, guild] of client.guilds.cache) {
      await inviteSnapshotService.primeGuildSnapshots(guild).catch(() => null);
    }

    // Start background retention & campaign scheduler
    inviteScheduler.start(client);
  }

  public getRepository() {
    return inviteRepository;
  }
}

export const inviteService = new InviteService();

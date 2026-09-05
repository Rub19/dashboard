import { Client } from 'discord.js';
import { BotIdentityInfo } from '../types/index.js';
import { config } from '../../../config.js';
import { logger } from '../../../utils/logger.js';

export class BotIdentityService {
  private static instance: BotIdentityService;
  private client?: Client;

  // Rate limiters internes calqués sur l'API Discord
  private avatarChangeTimestamps: number[] = [];
  private usernameChangeTimestamps: number[] = [];

  private constructor() {}

  public static getInstance(): BotIdentityService {
    if (!BotIdentityService.instance) {
      BotIdentityService.instance = new BotIdentityService();
    }
    return BotIdentityService.instance;
  }

  public initialize(client: Client) {
    this.client = client;
  }

  public getIdentity(): BotIdentityInfo {
    const user = this.client?.user;
    const now = Date.now();

    // 2 changements d'avatar max par heure (Discord API)
    this.avatarChangeTimestamps = this.avatarChangeTimestamps.filter((t) => now - t < 3600000);
    const avatarChangesRemaining = Math.max(0, 2 - this.avatarChangeTimestamps.length);

    // 2 changements de username max par 2 heures (Discord API)
    this.usernameChangeTimestamps = this.usernameChangeTimestamps.filter((t) => now - t < 7200000);
    const usernameChangesRemaining = Math.max(0, 2 - this.usernameChangeTimestamps.length);

    return {
      id: user?.id || config.clientId || '1545139931154878464',
      username: user?.username || 'Ethone Bot',
      discriminator: user?.discriminator || '9861',
      tag: user?.tag || 'Ethone Bot#9861',
      avatarUrl: user?.displayAvatarURL({ size: 512 }) || 'https://cdn.discordapp.com/embed/avatars/0.png',
      bannerUrl: null, // Discord Bot API ne permet pas de modifier la bannière sans Nitro application
      verified: true,
      bot: true,
      createdAt: user?.createdAt ? user.createdAt.toISOString() : new Date('2024-01-01').toISOString(),
      ownerId: config.botOwnerId,
      usernameChangesRemaining,
      avatarChangesRemaining,
    };
  }

  /**
   * Modifie le nom d'utilisateur du bot Discord avec gestion de cooldown
   */
  public async setUsername(newUsername: string): Promise<{ success: boolean; username: string; error?: string }> {
    if (!this.client || !this.client.user) {
      return { success: false, username: '', error: 'Client Discord non connecté.' };
    }

    const now = Date.now();
    this.usernameChangeTimestamps = this.usernameChangeTimestamps.filter((t) => now - t < 7200000);
    if (this.usernameChangeTimestamps.length >= 2) {
      return {
        success: false,
        username: this.client.user.username,
        error: 'Limite de modification de pseudonyme Discord atteinte (max 2 changements par tranche de 2h).',
      };
    }

    try {
      await this.client.user.setUsername(newUsername);
      this.usernameChangeTimestamps.push(now);
      logger.info(`[BotIdentityService] Nom d'utilisateur modifié pour : ${newUsername}`);
      return { success: true, username: this.client.user.username };
    } catch (err: any) {
      logger.error('[BotIdentityService] Erreur lors de la modification du username:', err);
      return { success: false, username: this.client.user.username, error: err.message };
    }
  }

  /**
   * Modifie l'avatar du bot Discord avec gestion de cooldown
   */
  public async setAvatar(avatarBufferOrUrl: Buffer | string): Promise<{ success: boolean; avatarUrl: string; error?: string }> {
    if (!this.client || !this.client.user) {
      return { success: false, avatarUrl: '', error: 'Client Discord non connecté.' };
    }

    const now = Date.now();
    this.avatarChangeTimestamps = this.avatarChangeTimestamps.filter((t) => now - t < 3600000);
    if (this.avatarChangeTimestamps.length >= 2) {
      return {
        success: false,
        avatarUrl: this.client.user.displayAvatarURL(),
        error: 'Limite de modification d\'avatar Discord atteinte (max 2 changements par heure).',
      };
    }

    try {
      await this.client.user.setAvatar(avatarBufferOrUrl);
      this.avatarChangeTimestamps.push(now);
      logger.info('[BotIdentityService] Avatar du bot mis à jour avec succès.');
      return { success: true, avatarUrl: this.client.user.displayAvatarURL({ size: 512 }) };
    } catch (err: any) {
      logger.error('[BotIdentityService] Erreur lors du changement d\'avatar:', err);
      return { success: false, avatarUrl: this.client.user.displayAvatarURL(), error: err.message };
    }
  }
}

import { PermissionFlagsBits } from 'discord.js';
import { CommandContext } from '../types/command.js';

class CooldownService {
  private static instance: CooldownService;
  // Map key: `${guildId}_${userId}_${commandName}` -> expiration timestamp in ms
  private cooldowns = new Map<string, number>();

  public static getInstance(): CooldownService {
    if (!CooldownService.instance) {
      CooldownService.instance = new CooldownService();
    }
    return CooldownService.instance;
  }

  /**
   * Vérifie si un utilisateur est sous cooldown pour une commande donnée.
   * Si oui, retourne le temps restant en secondes.
   * Si non, enregistre le nouveau cooldown.
   */
  public checkAndApply(
    guildId: string,
    userId: string,
    commandName: string,
    cooldownSeconds: number,
    isStaffOrAdmin = false
  ): { onCooldown: boolean; remainingSeconds: number } {
    // Les administrateurs et modérateurs sont exemptés de cooldown
    if (isStaffOrAdmin || cooldownSeconds <= 0) {
      return { onCooldown: false, remainingSeconds: 0 };
    }

    const key = `${guildId}_${userId}_${commandName}`;
    const now = Date.now();
    const expiresAt = this.cooldowns.get(key);

    if (expiresAt && now < expiresAt) {
      const remainingSeconds = Number(((expiresAt - now) / 1000).toFixed(1));
      return { onCooldown: true, remainingSeconds };
    }

    // Appliquer le nouveau cooldown
    this.cooldowns.set(key, now + cooldownSeconds * 1000);

    // Nettoyage régulier si la map devient volumineuse
    if (this.cooldowns.size > 5000) {
      this.cleanup();
    }

    return { onCooldown: false, remainingSeconds: 0 };
  }

  /**
   * Nettoie les entrées expirées
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, expiresAt] of this.cooldowns.entries()) {
      if (now >= expiresAt) {
        this.cooldowns.delete(key);
      }
    }
  }
}

export const cooldownService = CooldownService.getInstance();

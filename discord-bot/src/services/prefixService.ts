import { config } from '../config.js';
import { guildConfigService } from './guildConfigService.js';

/**
 * Service de compatibilité historique déléguant au guildConfigService centralisé.
 */
class PrefixService {
  public getPrefix(guildId?: string | null): string {
    if (!guildId) return config.defaultPrefix;
    return guildConfigService.getConfig(guildId).prefix;
  }

  public setPrefix(guildId: string, newPrefix: string): void {
    guildConfigService.updateConfig(guildId, { prefix: newPrefix });
  }

  public resetPrefix(guildId: string): void {
    guildConfigService.updateConfig(guildId, { prefix: config.defaultPrefix });
  }
}

export const prefixService = new PrefixService();

import fs from 'node:fs';
import path from 'node:path';
import { config as appConfig } from '../config.js';
import {
  defaultGuildConfig,
  GuildConfig,
  GuildConfigInput,
  GuildConfigSchema,
} from '../types/guildConfig.js';
import { logger } from '../utils/logger.js';

class GuildConfigService {
  private cache = new Map<string, GuildConfig>();
  private filePath: string;
  private isLoaded = false;

  constructor() {
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.filePath = path.join(dataDir, 'guild_configs.json');
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw) as Record<string, unknown>;

        for (const [guildId, rawData] of Object.entries(parsed)) {
          const validated = GuildConfigSchema.safeParse({
            ...defaultGuildConfig,
            prefix: appConfig.defaultPrefix,
            ...(typeof rawData === 'object' && rawData !== null ? rawData : {}),
            guildId,
          });

          if (validated.success) {
            this.cache.set(guildId, validated.data);
          } else {
            logger.warn(`Configuration corrompue pour le serveur ${guildId}, réinitialisation.`);
            this.cache.set(guildId, {
              ...defaultGuildConfig,
              prefix: appConfig.defaultPrefix,
              guildId,
            });
          }
        }
        logger.info(`Configurations de serveurs chargées : ${this.cache.size} serveur(s).`);
      } else {
        // Migration depuis l'ancien prefixes.json s'il existe
        this.migrateFromLegacyPrefixes();
      }
      this.isLoaded = true;
    } catch (err) {
      logger.error('Erreur lors du chargement des configurations de serveurs :', err);
    }
  }

  private migrateFromLegacyPrefixes(): void {
    const legacyPath = path.join(process.cwd(), 'data', 'prefixes.json');
    if (fs.existsSync(legacyPath)) {
      try {
        const legacyRaw = fs.readFileSync(legacyPath, 'utf-8');
        const legacyMap = JSON.parse(legacyRaw) as Record<string, string>;
        for (const [guildId, prefix] of Object.entries(legacyMap)) {
          this.cache.set(guildId, {
            ...defaultGuildConfig,
            prefix,
            guildId,
          });
        }
        this.saveToDisk();
        logger.info(`Migration réussie de ${this.cache.size} préfixes vers le nouveau système de configuration.`);
      } catch (err) {
        logger.error('Erreur migration legacy prefixes :', err);
      }
    }
  }

  private saveToDisk(): void {
    try {
      const obj: Record<string, GuildConfig> = {};
      for (const [guildId, conf] of this.cache.entries()) {
        obj[guildId] = conf;
      }
      fs.writeFileSync(this.filePath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Erreur lors de la sauvegarde des configurations sur le disque :', err);
    }
  }

  /**
   * Récupère la configuration d'un serveur (depuis le cache).
   * Si le serveur n'est pas encore configuré, renvoie la configuration par défaut.
   */
  public getConfig(guildId?: string | null): GuildConfig {
    if (!guildId) {
      return {
        ...defaultGuildConfig,
        prefix: appConfig.defaultPrefix,
        guildId: 'dm-fallback',
      };
    }

    const cached = this.cache.get(guildId);
    if (cached) return cached;

    // Création de la configuration par défaut pour ce nouveau serveur
    const newConfig: GuildConfig = {
      ...defaultGuildConfig,
      prefix: appConfig.defaultPrefix,
      guildId,
    };
    this.cache.set(guildId, newConfig);
    this.saveToDisk();
    return newConfig;
  }

  /**
   * Met à jour partiellement la configuration d'un serveur
   */
  public updateConfig(guildId: string, input: GuildConfigInput): GuildConfig {
    const current = this.getConfig(guildId);
    const merged = {
      ...current,
      ...input,
      guildId,
      emojis: {
        ...current.emojis,
        ...(input.emojis ?? {}),
      },
      modules: {
        ...current.modules,
        ...(input.modules ?? {}),
      },
    };

    const validated = GuildConfigSchema.parse(merged);
    this.cache.set(guildId, validated);
    this.saveToDisk();
    logger.info(`Configuration mise à jour pour le serveur : ${guildId}`);
    return validated;
  }

  /**
   * Réinitialise la configuration d'un serveur vers les valeurs par défaut
   */
  public resetConfig(guildId: string): GuildConfig {
    const resetConf: GuildConfig = {
      ...defaultGuildConfig,
      prefix: appConfig.defaultPrefix,
      guildId,
    };
    this.cache.set(guildId, resetConf);
    this.saveToDisk();
    logger.info(`Configuration réinitialisée pour le serveur : ${guildId}`);
    return resetConf;
  }
}

export const guildConfigService = new GuildConfigService();

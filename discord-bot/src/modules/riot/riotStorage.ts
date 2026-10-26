import fs from 'fs';
import path from 'path';
import { logger } from '../../utils/logger.js';

export interface RiotGuildConfig {
  enabled: boolean;
  channelId: string | null;
  auto: boolean;
}

export interface RiotLink {
  guildId: string;
  userId: string;
  name: string;
  tag: string;
  puuid: string;
  region: string;
  lastMatchId: string | null;
  linkedAt: number;
}

const DEFAULT_CONFIG: RiotGuildConfig = { enabled: false, channelId: null, auto: false };

class RiotStorage {
  private dataDir = path.resolve(process.cwd(), 'data');
  private configsPath = path.resolve(this.dataDir, 'riot_configs.json');
  private linksPath = path.resolve(this.dataDir, 'riot_links.json');
  private configs = new Map<string, RiotGuildConfig>();
  private links = new Map<string, RiotLink>();

  constructor() {
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
    try {
      if (fs.existsSync(this.configsPath)) {
        for (const [guildId, config] of Object.entries(JSON.parse(fs.readFileSync(this.configsPath, 'utf8')))) {
          this.configs.set(guildId, { ...DEFAULT_CONFIG, ...(config as object) });
        }
      }
      if (fs.existsSync(this.linksPath)) {
        for (const link of JSON.parse(fs.readFileSync(this.linksPath, 'utf8'))) this.links.set(this.key(link.guildId, link.userId), link);
      }
    } catch (error) {
      logger.error('[Riot] Données illisibles :', error);
    }
  }

  private key(guildId: string, userId: string): string {
    return `${guildId}:${userId}`;
  }

  private save(): void {
    try {
      fs.writeFileSync(this.configsPath, JSON.stringify(Object.fromEntries(this.configs)), 'utf8');
      fs.writeFileSync(this.linksPath, JSON.stringify([...this.links.values()]), 'utf8');
    } catch (error) {
      logger.error('[Riot] Sauvegarde impossible :', error);
    }
  }

  getConfig(guildId: string): RiotGuildConfig {
    return { ...DEFAULT_CONFIG, ...(this.configs.get(guildId) ?? {}) };
  }

  updateConfig(guildId: string, patch: Partial<RiotGuildConfig>): RiotGuildConfig {
    const next = { ...this.getConfig(guildId), ...patch };
    this.configs.set(guildId, next);
    this.save();
    return next;
  }

  getLink(guildId: string, userId: string): RiotLink | undefined {
    return this.links.get(this.key(guildId, userId));
  }

  setLink(link: RiotLink): void {
    this.links.set(this.key(link.guildId, link.userId), link);
    this.save();
  }

  removeLink(guildId: string, userId: string): boolean {
    const removed = this.links.delete(this.key(guildId, userId));
    if (removed) this.save();
    return removed;
  }

  listLinks(guildId: string): RiotLink[] {
    return [...this.links.values()].filter((l) => l.guildId === guildId);
  }
}

export const riotStorage = new RiotStorage();

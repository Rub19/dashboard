import fs from 'fs';
import path from 'path';
import {
  StatChannel,
  StatChannelSchema,
  StatsConfig,
  StatsConfigSchema,
  StatsOverview,
} from '../types/serverStats.js';
import { logger } from '../../../utils/logger.js';

const MAX_STAT_CHANNELS = 10;

/** Persistance JSON du module Server Stats (`data/` gitignore). */
class ServerStatsStorage {
  private dataDir = path.resolve(process.cwd(), 'data');
  private channelsPath = path.resolve(this.dataDir, 'serverstats_channels.json');
  private configsPath = path.resolve(this.dataDir, 'serverstats_configs.json');

  private channels = new Map<string, StatChannel>(); // key: `${guildId}:${channelId}`
  private configs = new Map<string, StatsConfig>(); // key: guildId

  constructor() {
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
    this.load();
  }

  private key(g: string, c: string) {
    return `${g}:${c}`;
  }

  private load() {
    try {
      if (fs.existsSync(this.channelsPath)) {
        for (const item of JSON.parse(fs.readFileSync(this.channelsPath, 'utf8'))) {
          const res = StatChannelSchema.safeParse(item);
          if (res.success) this.channels.set(this.key(res.data.guildId, res.data.channelId), res.data);
        }
      }
      if (fs.existsSync(this.configsPath)) {
        for (const item of JSON.parse(fs.readFileSync(this.configsPath, 'utf8'))) {
          const res = StatsConfigSchema.safeParse(item);
          if (res.success) this.configs.set(res.data.guildId, res.data);
        }
      }
    } catch (err) {
      logger.error('[ServerStats] Échec du chargement JSON :', err);
    }
  }

  private saveChannels() {
    try {
      fs.writeFileSync(this.channelsPath, JSON.stringify(Array.from(this.channels.values()), null, 2), 'utf8');
    } catch (err) {
      logger.error('[ServerStats] Échec sauvegarde channels :', err);
    }
  }

  private saveConfigs() {
    try {
      fs.writeFileSync(this.configsPath, JSON.stringify(Array.from(this.configs.values()), null, 2), 'utf8');
    } catch (err) {
      logger.error('[ServerStats] Échec sauvegarde configs :', err);
    }
  }

  public getConfig(guildId: string): StatsConfig {
    let c = this.configs.get(guildId);
    if (!c) {
      c = StatsConfigSchema.parse({ guildId });
      this.configs.set(guildId, c);
      this.saveConfigs();
    }
    return c;
  }

  public updateConfig(guildId: string, patch: Partial<StatsConfig>): StatsConfig {
    const next = StatsConfigSchema.parse({
      ...this.getConfig(guildId),
      ...patch,
      guildId,
      updatedAt: new Date().toISOString(),
    });
    this.configs.set(guildId, next);
    this.saveConfigs();
    return next;
  }

  public get(guildId: string, channelId: string): StatChannel | undefined {
    return this.channels.get(this.key(guildId, channelId));
  }

  public getGuild(guildId: string): StatChannel[] {
    return Array.from(this.channels.values()).filter((c) => c.guildId === guildId);
  }

  public canAddMore(guildId: string): boolean {
    return this.getGuild(guildId).length < MAX_STAT_CHANNELS;
  }

  public upsert(input: Omit<StatChannel, 'lastValue' | 'createdAt'> & Partial<Pick<StatChannel, 'lastValue' | 'createdAt'>>): StatChannel {
    const existing = this.get(input.guildId, input.channelId);
    const valid = StatChannelSchema.parse({
      ...(existing ?? {}),
      ...input,
      ...(existing ? {} : { createdAt: new Date().toISOString() }),
    });
    this.channels.set(this.key(valid.guildId, valid.channelId), valid);
    this.saveChannels();
    return valid;
  }

  public delete(guildId: string, channelId: string): boolean {
    const deleted = this.channels.delete(this.key(guildId, channelId));
    if (deleted) this.saveChannels();
    return deleted;
  }

  public setLastValue(guildId: string, channelId: string, value: number): void {
    const c = this.get(guildId, channelId);
    if (!c) return;
    c.lastValue = value;
    this.channels.set(this.key(guildId, channelId), c);
    this.saveChannels();
  }

  public getOverview(guildId: string): StatsOverview {
    const conf = this.getConfig(guildId);
    return {
      enabled: conf.enabled,
      updateIntervalMinutes: conf.updateIntervalMinutes,
      channels: this.getGuild(guildId).map((c) => ({
        channelId: c.channelId,
        type: c.type,
        template: c.template,
        roleId: c.roleId,
        lastValue: c.lastValue,
      })),
    };
  }
}

export const serverStatsStorage = new ServerStatsStorage();
export { MAX_STAT_CHANNELS };

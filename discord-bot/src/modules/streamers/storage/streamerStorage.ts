import fs from 'fs';
import path from 'path';
import {
  StreamerConfig,
  StreamerConfigSchema,
  StreamerItem,
  StreamerItemSchema,
  StreamersOverview,
} from '../types/streamer.js';
import { logger } from '../../../utils/logger.js';

class StreamerStorage {
  private dataDir = path.resolve(process.cwd(), 'data');
  private itemsPath = path.resolve(this.dataDir, 'streamer_items.json');
  private configsPath = path.resolve(this.dataDir, 'streamer_configs.json');

  private items = new Map<string, StreamerItem>(); // key: streamer.id
  private configs = new Map<string, StreamerConfig>(); // key: guildId

  constructor() {
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.itemsPath)) {
        const raw = JSON.parse(fs.readFileSync(this.itemsPath, 'utf8'));
        if (Array.isArray(raw)) {
          for (const it of raw) {
            const parsed = StreamerItemSchema.safeParse(it);
            if (parsed.success) this.items.set(parsed.data.id, parsed.data);
          }
        }
      }
      if (fs.existsSync(this.configsPath)) {
        const raw = JSON.parse(fs.readFileSync(this.configsPath, 'utf8'));
        if (Array.isArray(raw)) {
          for (const it of raw) {
            const parsed = StreamerConfigSchema.safeParse(it);
            if (parsed.success) this.configs.set(parsed.data.guildId, parsed.data);
          }
        }
      }
    } catch (err) {
      logger.error('[Streamers] Erreur lors du chargement des fichiers JSON :', err);
    }
  }

  private saveItems() {
    try {
      fs.writeFileSync(this.itemsPath, JSON.stringify(Array.from(this.items.values()), null, 2), 'utf8');
    } catch (err) {
      logger.error('[Streamers] Erreur de sauvegarde streamer_items.json :', err);
    }
  }

  private saveConfigs() {
    try {
      fs.writeFileSync(this.configsPath, JSON.stringify(Array.from(this.configs.values()), null, 2), 'utf8');
    } catch (err) {
      logger.error('[Streamers] Erreur de sauvegarde streamer_configs.json :', err);
    }
  }

  public getConfig(guildId: string): StreamerConfig {
    let cfg = this.configs.get(guildId);
    if (!cfg) {
      cfg = StreamerConfigSchema.parse({ guildId });
      this.configs.set(guildId, cfg);
      this.saveConfigs();
    }
    return cfg;
  }

  public updateConfig(guildId: string, patch: Partial<StreamerConfig>): StreamerConfig {
    const current = this.getConfig(guildId);
    const updated = StreamerConfigSchema.parse({
      ...current,
      ...patch,
      guildId,
      updatedAt: new Date().toISOString(),
    });
    this.configs.set(guildId, updated);
    this.saveConfigs();
    return updated;
  }

  public getStreamers(guildId: string): StreamerItem[] {
    const res: StreamerItem[] = [];
    for (const s of this.items.values()) {
      if (s.guildId === guildId) res.push(s);
    }
    return res;
  }

  public getStreamer(guildId: string, streamerId: string): StreamerItem | undefined {
    const it = this.items.get(streamerId);
    return it && it.guildId === guildId ? it : undefined;
  }

  public addStreamer(item: Omit<StreamerItem, 'id' | 'createdAt'>): StreamerItem {
    const id = `${item.guildId}:${item.platform}:${item.username.toLowerCase()}`;
    const full = StreamerItemSchema.parse({
      ...item,
      id,
      username: item.username.toLowerCase(),
      createdAt: new Date().toISOString(),
    });
    this.items.set(id, full);
    this.saveItems();
    return full;
  }

  public updateStreamer(guildId: string, streamerId: string, patch: Partial<StreamerItem>): StreamerItem | undefined {
    const it = this.getStreamer(guildId, streamerId);
    if (!it) return undefined;
    const updated = StreamerItemSchema.parse({
      ...it,
      ...patch,
      id: it.id,
      guildId,
    });
    this.items.set(it.id, updated);
    this.saveItems();
    return updated;
  }

  public removeStreamer(guildId: string, streamerId: string): boolean {
    const it = this.getStreamer(guildId, streamerId);
    if (!it) return false;
    this.items.delete(streamerId);
    this.saveItems();
    return true;
  }

  public getAllActiveStreamers(): StreamerItem[] {
    const activeGuilds = new Set(
      Array.from(this.configs.values())
        .filter((c) => c.enabled)
        .map((c) => c.guildId)
    );
    return Array.from(this.items.values()).filter((s) => activeGuilds.has(s.guildId));
  }

  public getOverview(guildId: string): StreamersOverview {
    const cfg = this.getConfig(guildId);
    const streamers = this.getStreamers(guildId);
    return {
      enabled: cfg.enabled,
      defaultChannelId: cfg.defaultChannelId,
      liveRoleId: cfg.liveRoleId,
      autoLiveRoleEnabled: cfg.autoLiveRoleEnabled,
      totalStreamers: streamers.length,
      liveCount: streamers.filter((s) => s.isLive).length,
      streamers,
    };
  }
}

export const streamerStorage = new StreamerStorage();

import fs from 'fs';
import path from 'path';
import {
  StickyMessage,
  StickyMessageSchema,
  StickyOverview,
} from '../types/sticky.js';
import { logger } from '../../../utils/logger.js';

/**
 * Persistance JSON du module Sticky Messages (même approche que
 * `starboardStorage` : `data/` est gitignore, chargé en mémoire au boot).
 */
class StickyStorage {
  private dataDir = path.resolve(process.cwd(), 'data');
  private filePath = path.resolve(this.dataDir, 'sticky_messages.json');

  private stickies = new Map<string, StickyMessage>(); // key: `${guildId}:${channelId}`

  constructor() {
    this.ensureDir();
    this.load();
  }

  private ensureDir() {
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
  }

  private key(guildId: string, channelId: string) {
    return `${guildId}:${channelId}`;
  }

  private load() {
    try {
      if (!fs.existsSync(this.filePath)) return;
      const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      if (!Array.isArray(parsed)) return;
      for (const item of parsed) {
        const res = StickyMessageSchema.safeParse(item);
        if (res.success) this.stickies.set(this.key(res.data.guildId, res.data.channelId), res.data);
      }
    } catch (err) {
      logger.error('[Sticky] Échec du chargement de sticky_messages.json :', err);
    }
  }

  private save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(Array.from(this.stickies.values()), null, 2), 'utf8');
    } catch (err) {
      logger.error('[Sticky] Échec de la sauvegarde de sticky_messages.json :', err);
    }
  }

  public get(guildId: string, channelId: string): StickyMessage | undefined {
    return this.stickies.get(this.key(guildId, channelId));
  }

  public getGuild(guildId: string): StickyMessage[] {
    return Array.from(this.stickies.values())
      .filter((s) => s.guildId === guildId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  public upsert(input: Partial<StickyMessage> & { guildId: string; channelId: string }): StickyMessage {
    const existing = this.get(input.guildId, input.channelId);
    const next = StickyMessageSchema.parse({
      ...(existing ?? {}),
      ...input,
      updatedAt: new Date().toISOString(),
      ...(existing ? {} : { createdAt: new Date().toISOString() }),
    });
    this.stickies.set(this.key(next.guildId, next.channelId), next);
    this.save();
    return next;
  }

  public delete(guildId: string, channelId: string): boolean {
    const deleted = this.stickies.delete(this.key(guildId, channelId));
    if (deleted) this.save();
    return deleted;
  }

  public getOverview(guildId: string): StickyOverview {
    const list = this.getGuild(guildId);
    return {
      total: list.length,
      active: list.filter((s) => s.enabled).length,
      paused: list.filter((s) => !s.enabled).length,
      totalReposts: list.reduce((sum, s) => sum + s.repostCount, 0),
      channels: list.map((s) => ({
        channelId: s.channelId,
        enabled: s.enabled,
        asEmbed: s.asEmbed,
        repostCount: s.repostCount,
        preview: s.content.length > 120 ? `${s.content.slice(0, 120)}…` : s.content,
        updatedAt: s.updatedAt,
      })),
    };
  }
}

export const stickyStorage = new StickyStorage();

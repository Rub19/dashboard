import fs from 'fs';
import path from 'path';
import {
  BirthdayConfig,
  BirthdayConfigSchema,
  BirthdayEntry,
  BirthdayEntrySchema,
  BirthdayOverview,
} from '../types/birthday.js';
import { logger } from '../../../utils/logger.js';

function daysUntil(day: number, month: number, from = new Date()): number {
  const now = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let next = new Date(from.getFullYear(), month - 1, day);
  if (next < now) next = new Date(from.getFullYear() + 1, month - 1, day);
  return Math.round((next.getTime() - now.getTime()) / 86_400_000);
}

/** Persistance JSON du module Birthdays (`data/` gitignore, chargé au boot). */
class BirthdayStorage {
  private dataDir = path.resolve(process.cwd(), 'data');
  private entriesPath = path.resolve(this.dataDir, 'birthday_entries.json');
  private configsPath = path.resolve(this.dataDir, 'birthday_configs.json');

  private entries = new Map<string, BirthdayEntry>(); // key: `${guildId}:${userId}`
  private configs = new Map<string, BirthdayConfig>(); // key: guildId

  constructor() {
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
    this.load();
  }

  private key(g: string, u: string) {
    return `${g}:${u}`;
  }

  private load() {
    try {
      if (fs.existsSync(this.entriesPath)) {
        for (const item of JSON.parse(fs.readFileSync(this.entriesPath, 'utf8'))) {
          const res = BirthdayEntrySchema.safeParse(item);
          if (res.success) this.entries.set(this.key(res.data.guildId, res.data.userId), res.data);
        }
      }
      if (fs.existsSync(this.configsPath)) {
        for (const item of JSON.parse(fs.readFileSync(this.configsPath, 'utf8'))) {
          const res = BirthdayConfigSchema.safeParse(item);
          if (res.success) this.configs.set(res.data.guildId, res.data);
        }
      }
    } catch (err) {
      logger.error('[Birthdays] Échec du chargement des fichiers JSON :', err);
    }
  }

  private saveEntries() {
    try {
      fs.writeFileSync(this.entriesPath, JSON.stringify(Array.from(this.entries.values()), null, 2), 'utf8');
    } catch (err) {
      logger.error('[Birthdays] Échec de la sauvegarde de birthday_entries.json :', err);
    }
  }

  private saveConfigs() {
    try {
      fs.writeFileSync(this.configsPath, JSON.stringify(Array.from(this.configs.values()), null, 2), 'utf8');
    } catch (err) {
      logger.error('[Birthdays] Échec de la sauvegarde de birthday_configs.json :', err);
    }
  }

  public getConfig(guildId: string): BirthdayConfig {
    let conf = this.configs.get(guildId);
    if (!conf) {
      conf = BirthdayConfigSchema.parse({ guildId });
      this.configs.set(guildId, conf);
      this.saveConfigs();
    }
    return conf;
  }

  public updateConfig(guildId: string, patch: Partial<BirthdayConfig>): BirthdayConfig {
    const next = BirthdayConfigSchema.parse({
      ...this.getConfig(guildId),
      ...patch,
      guildId,
      updatedAt: new Date().toISOString(),
    });
    this.configs.set(guildId, next);
    this.saveConfigs();
    return next;
  }

  public get(guildId: string, userId: string): BirthdayEntry | undefined {
    return this.entries.get(this.key(guildId, userId));
  }

  public set(input: Omit<BirthdayEntry, 'createdAt'> & { createdAt?: string }): BirthdayEntry {
    const valid = BirthdayEntrySchema.parse(input);
    this.entries.set(this.key(valid.guildId, valid.userId), valid);
    this.saveEntries();
    return valid;
  }

  public delete(guildId: string, userId: string): boolean {
    const deleted = this.entries.delete(this.key(guildId, userId));
    if (deleted) this.saveEntries();
    return deleted;
  }

  public getGuildEntries(guildId: string): BirthdayEntry[] {
    return Array.from(this.entries.values()).filter((e) => e.guildId === guildId);
  }

  public getTodays(guildId: string, now = new Date()): BirthdayEntry[] {
    const d = now.getDate();
    const m = now.getMonth() + 1;
    return this.getGuildEntries(guildId).filter((e) => e.day === d && e.month === m);
  }

  public getOverview(guildId: string, now = new Date()): BirthdayOverview {
    const conf = this.getConfig(guildId);
    const list = this.getGuildEntries(guildId);
    const currentYear = now.getFullYear();
    return {
      enabled: conf.enabled,
      announceChannelId: conf.announceChannelId,
      announceHour: conf.announceHour,
      total: list.length,
      today: this.getTodays(guildId, now).map((e) => ({
        userId: e.userId,
        age: e.year ? currentYear - e.year : null,
      })),
      upcoming: list
        .map((e) => ({ userId: e.userId, day: e.day, month: e.month, inDays: daysUntil(e.day, e.month, now) }))
        .filter((e) => e.inDays > 0 && e.inDays <= 30)
        .sort((a, b) => a.inDays - b.inDays)
        .slice(0, 10),
    };
  }
}

export const birthdayStorage = new BirthdayStorage();
export { daysUntil };

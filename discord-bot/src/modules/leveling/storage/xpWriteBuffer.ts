import fs from 'fs';
import path from 'path';
import { UserXpData, UserXpDataSchema } from '../types/userXp.js';
import { logger } from '../../../utils/logger.js';

class XpWriteBuffer {
  private filePath = path.resolve(process.cwd(), 'data', 'leveling_users.json');
  private users = new Map<string, UserXpData>(); // key: `${guildId}:${userId}`
  private isDirty = false;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.ensureDirectory();
    this.loadData();
    // Flush périodique toutes les 10 secondes
    this.flushTimer = setInterval(() => this.flushNow(), 10000);
    this.flushTimer.unref();

    // Flush lors de la fermeture du processus
    process.on('SIGINT', () => this.flushNow());
    process.on('SIGTERM', () => this.flushNow());
    process.on('exit', () => this.flushNow());
  }

  private ensureDirectory() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private loadData() {
    try {
      if (fs.existsSync(this.filePath)) {
        const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
        for (const [key, val] of Object.entries(parsed)) {
          const res = UserXpDataSchema.safeParse(val);
          if (res.success) {
            this.users.set(key, res.data);
          }
        }
      }
    } catch (err) {
      logger.error('Erreur chargement leveling_users.json :', err);
    }
  }

  public flushNow() {
    if (!this.isDirty) return;
    try {
      const obj = Object.fromEntries(this.users.entries());
      fs.writeFileSync(this.filePath, JSON.stringify(obj, null, 2), 'utf-8');
      this.isDirty = false;
    } catch (err) {
      logger.error('Erreur sauvegarde leveling_users.json :', err);
    }
  }

  public getUser(guildId: string, userId: string): UserXpData {
    const key = `${guildId}:${userId}`;
    let data = this.users.get(key);
    if (!data) {
      data = {
        userId,
        guildId,
        username: 'Membre',
        avatarUrl: null,
        totalXp: 0,
        level: 0,
        messagesCount: 0,
        lastMessageAt: new Date().toISOString(),
        unlockedRewardRoleIds: [],
      };
      this.users.set(key, data);
    }
    return data;
  }

  public updateUser(data: UserXpData): void {
    const key = `${data.guildId}:${data.userId}`;
    this.users.set(key, data);
    this.isDirty = true;
  }

  public getUsersForGuild(guildId: string): UserXpData[] {
    const list: UserXpData[] = [];
    for (const [key, val] of this.users.entries()) {
      if (key.startsWith(`${guildId}:`)) {
        list.push(val);
      }
    }
    return list;
  }

  public resetUser(guildId: string, userId: string): void {
    const key = `${guildId}:${userId}`;
    this.users.delete(key);
    this.isDirty = true;
    this.flushNow();
  }

  public resetGuild(guildId: string): void {
    for (const key of Array.from(this.users.keys())) {
      if (key.startsWith(`${guildId}:`)) {
        this.users.delete(key);
      }
    }
    this.isDirty = true;
    this.flushNow();
  }
}

export const xpWriteBuffer = new XpWriteBuffer();

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { logger } from '../../../utils/logger.js';

/** Arrivées, départs et pseudos d'un membre : gardés 90 jours, chiffrés sur le disque (AES-256-GCM). */
export type MemberEvent = { type: 'join' | 'leave' | 'nick'; at: string; value?: string | null };

const FILE = path.resolve(process.cwd(), 'data', 'member_events.enc');
const KEEP_MS = 90 * 86400_000;
const KEY = crypto.createHash('sha256').update(process.env.MEMBER_HISTORY_KEY || process.env.DISCORD_TOKEN || 'etho-member-history').digest();

class MemberEventStore {
  private data: Record<string, MemberEvent[]> = {};
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    try {
      if (!fs.existsSync(FILE)) return;
      const raw = fs.readFileSync(FILE);
      const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, raw.subarray(0, 12));
      decipher.setAuthTag(raw.subarray(12, 28));
      this.data = JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8'));
    } catch (err) {
      logger.error('Historique des membres illisible, repart de zéro :', (err as Error)?.message);
    }
  }

  private save() {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      const cutoff = Date.now() - KEEP_MS;
      for (const [k, list] of Object.entries(this.data)) {
        const kept = list.filter((e) => Date.parse(e.at) >= cutoff);
        if (kept.length) this.data[k] = kept;
        else delete this.data[k];
      }
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
      const body = Buffer.concat([cipher.update(JSON.stringify(this.data), 'utf8'), cipher.final()]);
      fs.mkdirSync(path.dirname(FILE), { recursive: true });
      fs.writeFileSync(FILE, Buffer.concat([iv, cipher.getAuthTag(), body]));
    }, 2000);
  }

  add(guildId: string, userId: string, e: Omit<MemberEvent, 'at'>) {
    const k = `${guildId}:${userId}`;
    (this.data[k] ??= []).push({ ...e, at: new Date().toISOString() });
    this.data[k] = this.data[k].slice(-50);
    this.save();
  }

  get(guildId: string, userId: string): MemberEvent[] {
    const cutoff = Date.now() - KEEP_MS;
    return (this.data[`${guildId}:${userId}`] ?? []).filter((e) => Date.parse(e.at) >= cutoff);
  }
}

export const memberEvents = new MemberEventStore();

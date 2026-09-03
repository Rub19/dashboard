import fs from 'fs';
import path from 'path';
import { Giveaway, GiveawayOverview, GiveawayParticipant, GiveawaySchema } from '../types/giveaway.js';
import { logger } from '../../../utils/logger.js';

class GiveawayStorage {
  private filePath = path.resolve(process.cwd(), 'data', 'giveaways.json');
  private giveaways = new Map<string, Giveaway>(); // key: id

  constructor() {
    this.ensureDirectory();
    this.loadData();
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
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            const res = GiveawaySchema.safeParse(item);
            if (res.success) {
              this.giveaways.set(res.data.id, res.data);
            }
          }
        }
      }
    } catch (err) {
      logger.error('Erreur chargement giveaways.json :', err);
    }
  }

  private saveData() {
    try {
      const list = Array.from(this.giveaways.values());
      fs.writeFileSync(this.filePath, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Erreur sauvegarde giveaways.json :', err);
    }
  }

  public getAll(): Giveaway[] {
    return Array.from(this.giveaways.values());
  }

  public getForGuild(guildId: string): Giveaway[] {
    return Array.from(this.giveaways.values())
      .filter((g) => g.guildId === guildId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getById(id: string): Giveaway | undefined {
    return this.giveaways.get(id);
  }

  public create(data: Partial<Giveaway> & { guildId: string; prize: string; endsAt: string; channelId: string; hostedById: string; hostedByTag: string }): Giveaway {
    const id = data.id || `gw_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const valid = GiveawaySchema.parse({ ...data, id });
    this.giveaways.set(id, valid);
    this.saveData();
    return valid;
  }

  public update(id: string, update: Partial<Giveaway>): Giveaway | null {
    const existing = this.giveaways.get(id);
    if (!existing) return null;

    const valid = GiveawaySchema.parse({ ...existing, ...update });
    this.giveaways.set(id, valid);
    this.saveData();
    return valid;
  }

  public delete(id: string): boolean {
    const deleted = this.giveaways.delete(id);
    if (deleted) this.saveData();
    return deleted;
  }

  public addParticipant(giveawayId: string, participant: GiveawayParticipant): boolean {
    const gw = this.giveaways.get(giveawayId);
    if (!gw || gw.status !== 'active') return false;

    const exists = gw.participants.some((p) => p.userId === participant.userId);
    if (exists) return false;

    gw.participants.push(participant);
    this.saveData();
    return true;
  }

  public removeParticipant(giveawayId: string, userId: string): boolean {
    const gw = this.giveaways.get(giveawayId);
    if (!gw) return false;

    const idx = gw.participants.findIndex((p) => p.userId === userId);
    if (idx === -1) return false;

    gw.participants.splice(idx, 1);
    this.saveData();
    return true;
  }

  public getOverview(guildId: string): GiveawayOverview {
    const list = this.getForGuild(guildId);
    const activeGiveaways = list.filter((g) => g.status === 'active');
    const endedCount = list.filter((g) => g.status === 'ended').length;

    let totalParticipants = 0;
    let totalWinners = 0;

    for (const g of list) {
      totalParticipants += g.participants.length;
      totalWinners += g.winnerIds.length;
    }

    return {
      activeCount: activeGiveaways.length,
      endedCount,
      totalParticipants,
      totalWinners,
      activeGiveaways,
    };
  }
}

export const giveawayStorage = new GiveawayStorage();

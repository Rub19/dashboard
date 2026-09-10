import fs from 'fs';
import path from 'path';
import { Reminder, ReminderSchema, ReminderOverview } from '../types/reminder.js';
import { logger } from '../../../utils/logger.js';

/** Persistance JSON du module Reminders (`data/` gitignore, chargé au boot). */
class ReminderStorage {
  private dataDir = path.resolve(process.cwd(), 'data');
  private filePath = path.resolve(this.dataDir, 'reminders.json');
  private reminders = new Map<string, Reminder>(); // key: id

  constructor() {
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
    this.load();
  }

  private load() {
    try {
      if (!fs.existsSync(this.filePath)) return;
      const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      if (!Array.isArray(parsed)) return;
      for (const item of parsed) {
        const res = ReminderSchema.safeParse(item);
        if (res.success) this.reminders.set(res.data.id, res.data);
      }
    } catch (err) {
      logger.error('[Reminders] Échec du chargement de reminders.json :', err);
    }
  }

  private save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(Array.from(this.reminders.values()), null, 2), 'utf8');
    } catch (err) {
      logger.error('[Reminders] Échec de la sauvegarde de reminders.json :', err);
    }
  }

  public get(id: string): Reminder | undefined {
    return this.reminders.get(id);
  }

  public create(input: Omit<Reminder, 'id' | 'createdAt' | 'delivered' | 'deliveredCount'> & { id?: string }): Reminder {
    const id = input.id ?? `rem_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const reminder = ReminderSchema.parse({ ...input, id });
    this.reminders.set(id, reminder);
    this.save();
    return reminder;
  }

  public update(id: string, patch: Partial<Reminder>): Reminder | undefined {
    const existing = this.reminders.get(id);
    if (!existing) return undefined;
    const next = ReminderSchema.parse({ ...existing, ...patch, id });
    this.reminders.set(id, next);
    this.save();
    return next;
  }

  public delete(id: string): boolean {
    const deleted = this.reminders.delete(id);
    if (deleted) this.save();
    return deleted;
  }

  /** Rappels à échéance (non délivrés et remindAt <= now). */
  public getDue(now = new Date()): Reminder[] {
    return Array.from(this.reminders.values()).filter(
      (r) => !r.delivered && new Date(r.remindAt).getTime() <= now.getTime()
    );
  }

  public listForUser(guildId: string, userId: string): Reminder[] {
    return Array.from(this.reminders.values())
      .filter((r) => r.guildId === guildId && r.userId === userId && !r.delivered)
      .sort((a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime());
  }

  public getGuild(guildId: string): Reminder[] {
    return Array.from(this.reminders.values())
      .filter((r) => r.guildId === guildId)
      .sort((a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime());
  }

  /** Supprime les rappels non récurrents délivrés depuis plus de 24 h. */
  public pruneDelivered(now = new Date()): number {
    let removed = 0;
    for (const [id, r] of this.reminders) {
      if (r.delivered && r.recurrence === 'none' && now.getTime() - new Date(r.remindAt).getTime() > 86_400_000) {
        this.reminders.delete(id);
        removed++;
      }
    }
    if (removed) this.save();
    return removed;
  }

  public getOverview(guildId: string): ReminderOverview {
    const list = this.getGuild(guildId);
    const pending = list.filter((r) => !r.delivered);
    const next = pending[0] ?? null;
    return {
      total: list.length,
      pending: pending.length,
      recurring: list.filter((r) => r.recurrence !== 'none').length,
      delivered: list.reduce((sum, r) => sum + r.deliveredCount, 0),
      nextDueAt: next ? next.remindAt : null,
    };
  }
}

export const reminderStorage = new ReminderStorage();

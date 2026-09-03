import fs from 'fs';
import path from 'path';
import { CustomCommand, CustomCommandSchema } from '../types/customCommand.js';
import { logger } from '../../../utils/logger.js';

class CustomCommandStorage {
  private filePath = path.resolve(process.cwd(), 'data', 'custom_commands.json');
  private commands = new Map<string, CustomCommand>(); // key: id

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
            const res = CustomCommandSchema.safeParse(item);
            if (res.success) {
              this.commands.set(res.data.id, res.data);
            }
          }
        }
      }
    } catch (err) {
      logger.error('Erreur chargement custom_commands.json :', err);
    }
  }

  private saveData() {
    try {
      const list = Array.from(this.commands.values());
      fs.writeFileSync(this.filePath, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Erreur sauvegarde custom_commands.json :', err);
    }
  }

  public getCommands(guildId: string): CustomCommand[] {
    return Array.from(this.commands.values())
      .filter((c) => c.guildId === guildId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  public getById(id: string): CustomCommand | undefined {
    return this.commands.get(id);
  }

  public getByName(guildId: string, name: string): CustomCommand | undefined {
    const lower = name.toLowerCase();
    return Array.from(this.commands.values()).find(
      (c) => c.guildId === guildId && c.name.toLowerCase() === lower
    );
  }

  public create(
    data: Partial<CustomCommand> & { guildId: string; name: string }
  ): CustomCommand {
    const id = `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const valid = CustomCommandSchema.parse({
      ...data,
      id,
      name: data.name.toLowerCase().trim(),
    });

    this.commands.set(id, valid);
    this.saveData();
    return valid;
  }

  public update(id: string, update: Partial<CustomCommand>): CustomCommand | null {
    const existing = this.commands.get(id);
    if (!existing) return null;

    const valid = CustomCommandSchema.parse({
      ...existing,
      ...update,
      name: update.name ? update.name.toLowerCase().trim() : existing.name,
      updatedAt: new Date().toISOString(),
    });

    this.commands.set(id, valid);
    this.saveData();
    return valid;
  }

  public delete(id: string): boolean {
    const deleted = this.commands.delete(id);
    if (deleted) this.saveData();
    return deleted;
  }

  public incrementUsage(id: string): void {
    const existing = this.commands.get(id);
    if (existing) {
      existing.usageCount += 1;
      this.saveData();
    }
  }

  public duplicate(id: string): CustomCommand | null {
    const existing = this.commands.get(id);
    if (!existing) return null;

    let newName = `${existing.name}_copy`;
    let counter = 1;
    while (this.getByName(existing.guildId, newName)) {
      counter++;
      newName = `${existing.name}_copy${counter}`;
    }

    return this.create({
      ...existing,
      name: newName,
      usageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}

export const customCommandStorage = new CustomCommandStorage();

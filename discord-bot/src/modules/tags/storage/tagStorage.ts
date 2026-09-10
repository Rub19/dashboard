import fs from 'fs';
import path from 'path';
import { Tag, TagSchema, TagOverview } from '../types/tag.js';
import { logger } from '../../../utils/logger.js';

const MAX_TAGS_PER_GUILD = 200;

/** Persistance JSON du module Tags (`data/` gitignore, chargé au boot). */
class TagStorage {
  private dataDir = path.resolve(process.cwd(), 'data');
  private filePath = path.resolve(this.dataDir, 'tags.json');
  private tags = new Map<string, Tag>(); // key: `${guildId}:${name}`

  constructor() {
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
    this.load();
  }

  private key(g: string, n: string) {
    return `${g}:${n.toLowerCase()}`;
  }

  private load() {
    try {
      if (!fs.existsSync(this.filePath)) return;
      const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      if (!Array.isArray(parsed)) return;
      for (const item of parsed) {
        const res = TagSchema.safeParse(item);
        if (res.success) this.tags.set(this.key(res.data.guildId, res.data.name), res.data);
      }
    } catch (err) {
      logger.error('[Tags] Échec du chargement de tags.json :', err);
    }
  }

  private save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(Array.from(this.tags.values()), null, 2), 'utf8');
    } catch (err) {
      logger.error('[Tags] Échec de la sauvegarde de tags.json :', err);
    }
  }

  public get(guildId: string, name: string): Tag | undefined {
    return this.tags.get(this.key(guildId, name));
  }

  public count(guildId: string): number {
    return this.getGuild(guildId).length;
  }

  public set(input: Omit<Tag, 'uses' | 'createdAt' | 'updatedAt'> & Partial<Pick<Tag, 'uses' | 'createdAt'>>): Tag {
    const existing = this.get(input.guildId, input.name);
    const valid = TagSchema.parse({
      ...(existing ?? {}),
      ...input,
      name: input.name.toLowerCase(),
      updatedAt: new Date().toISOString(),
      ...(existing ? {} : { createdAt: new Date().toISOString() }),
    });
    this.tags.set(this.key(valid.guildId, valid.name), valid);
    this.save();
    return valid;
  }

  public delete(guildId: string, name: string): boolean {
    const deleted = this.tags.delete(this.key(guildId, name));
    if (deleted) this.save();
    return deleted;
  }

  public recordUse(guildId: string, name: string): void {
    const tag = this.get(guildId, name);
    if (!tag) return;
    tag.uses += 1;
    this.tags.set(this.key(guildId, name), tag);
    this.save();
  }

  public getGuild(guildId: string): Tag[] {
    return Array.from(this.tags.values())
      .filter((t) => t.guildId === guildId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  public canAddMore(guildId: string): boolean {
    return this.count(guildId) < MAX_TAGS_PER_GUILD;
  }

  public getOverview(guildId: string): TagOverview {
    const list = this.getGuild(guildId);
    return {
      total: list.length,
      totalUses: list.reduce((sum, t) => sum + t.uses, 0),
      top: [...list].sort((a, b) => b.uses - a.uses).slice(0, 5).map((t) => ({ name: t.name, uses: t.uses })),
    };
  }
}

export const tagStorage = new TagStorage();
export { MAX_TAGS_PER_GUILD };

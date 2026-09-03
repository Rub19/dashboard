import fs from 'fs';
import path from 'path';
import { HourlyBucket } from '../types/analytics.js';
import { logger } from '../../../utils/logger.js';

class AnalyticsStorage {
  private filePath = path.resolve(process.cwd(), 'data', 'analytics.json');
  private buckets = new Map<string, HourlyBucket>(); // key: `${guildId}:${hourIso}`

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
          for (const b of parsed) {
            if (b.guildId && b.hourIso) {
              const key = `${b.guildId}:${b.hourIso}`;
              this.buckets.set(key, b);
            }
          }
        }
      }
    } catch (err) {
      logger.error('Erreur chargement analytics.json :', err);
    }
  }

  public saveData(extraBuckets?: HourlyBucket[]) {
    try {
      if (extraBuckets) {
        for (const b of extraBuckets) {
          const key = `${b.guildId}:${b.hourIso}`;
          this.buckets.set(key, b);
        }
      }

      // Rétention : nettoyage des buckets de plus de 90 jours
      const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const list = Array.from(this.buckets.values()).filter((b) => b.hourIso >= cutoff);

      fs.writeFileSync(this.filePath, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Erreur sauvegarde analytics.json :', err);
    }
  }

  public getBuckets(guildId: string, sinceIso?: string): HourlyBucket[] {
    const list: HourlyBucket[] = [];
    for (const [key, val] of this.buckets.entries()) {
      if (key.startsWith(`${guildId}:`)) {
        if (!sinceIso || val.hourIso >= sinceIso) {
          list.push(val);
        }
      }
    }
    return list.sort((a, b) => a.hourIso.localeCompare(b.hourIso));
  }

  public getAllBuckets(): Map<string, HourlyBucket> {
    return this.buckets;
  }
}

export const analyticsStorage = new AnalyticsStorage();

import fs from 'node:fs';
import path from 'node:path';
import { logger } from '../../../utils/logger.js';

/**
 * Budget quotidien de tokens IA par serveur (réglage « dailyBudgetTokens »). Une fois atteint, Etho ne contacte plus
 * le fournisseur payant jusqu'à minuit (UTC) et répond avec son moteur intégré gratuit. 0 = aucun appel payant.
 */
type Usage = Record<string, { day: string; tokens: number }>;

const FILE = path.resolve(process.cwd(), 'data', 'ai_daily_usage.json');
const today = () => new Date().toISOString().slice(0, 10);

let cache: Usage | null = null;
function load(): Usage {
  if (cache) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(FILE, 'utf8')) as Usage;
  } catch {
    cache = {};
  }
  return cache;
}

export const aiDailyBudget = {
  used(guildId: string): number {
    const u = load()[guildId];
    return u && u.day === today() ? u.tokens : 0;
  },
  remaining(guildId: string, budget: number): number {
    return Math.max(0, Math.max(0, budget) - this.used(guildId));
  },
  record(guildId: string, tokens: number): void {
    if (!tokens || tokens < 0) return;
    const all = load();
    all[guildId] = { day: today(), tokens: this.used(guildId) + tokens };
    try {
      fs.mkdirSync(path.dirname(FILE), { recursive: true });
      fs.writeFileSync(FILE, JSON.stringify(all));
    } catch (err) {
      logger.warn('[AIBudget] Écriture impossible :', (err as Error)?.message);
    }
  },
  /** Pour les tests. */
  reset(): void {
    cache = {};
  },
};

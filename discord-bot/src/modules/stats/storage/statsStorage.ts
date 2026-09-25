import fs from 'fs';
import path from 'path';
import { DayStats, StatsConfig, StatsConfigSchema, emptyDay } from '../types/stats.js';
import { logger } from '../../../utils/logger.js';

/** Historique conservé (jours). Au-delà, les journées sont supprimées au démarrage et à chaque changement de jour. */
export const RETENTION_DAYS = 400;
/** Plafond de couples « membre|salon » par jour : le fichier ne peut pas grossir sans limite. */
const MAX_PAIR_KEYS_PER_DAY = 4000;

export const dayKey = (date = new Date()): string => date.toISOString().slice(0, 10);

/**
 * Persistance JSON du module Statistiques : un fichier de configuration et un fichier de compteurs journaliers.
 * Les compteurs sont modifiés en mémoire (chaque message = quelques additions) et écrits sur disque toutes les 20 s si
 * quelque chose a changé, ainsi qu'à l'arrêt du processus.
 */
class StatsStorage {
  private dataDir = path.resolve(process.cwd(), 'data');
  private configPath = path.resolve(this.dataDir, 'stats_configs.json');
  private daysPath = path.resolve(this.dataDir, 'stats_days.json');
  private configs = new Map<string, StatsConfig>();
  private days = new Map<string, Map<string, DayStats>>(); // guildId -> jour -> compteurs
  private dirty = false;
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
    this.load();
    this.prune();
    this.timer = setInterval(() => this.flush(), 20_000);
    this.timer.unref?.();
    process.on('exit', () => this.flush());
    process.on('SIGINT', () => this.flush());
    process.on('SIGTERM', () => this.flush());
  }

  private load() {
    try {
      if (fs.existsSync(this.configPath)) {
        const parsed = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            const res = StatsConfigSchema.safeParse(item);
            if (res.success) this.configs.set(res.data.guildId, res.data);
          }
        }
      }
      if (fs.existsSync(this.daysPath)) {
        const parsed = JSON.parse(fs.readFileSync(this.daysPath, 'utf8')) as Record<string, Record<string, Partial<DayStats>>>;
        for (const [guildId, perDay] of Object.entries(parsed ?? {})) {
          const map = new Map<string, DayStats>();
          for (const [day, raw] of Object.entries(perDay ?? {})) map.set(day, { ...emptyDay(), ...raw });
          this.days.set(guildId, map);
        }
      }
    } catch (err) {
      logger.error('[Stats] Échec du chargement des fichiers JSON :', err);
    }
  }

  public flush() {
    if (!this.dirty) return;
    this.dirty = false;
    try {
      const out: Record<string, Record<string, DayStats>> = {};
      for (const [guildId, perDay] of this.days) out[guildId] = Object.fromEntries(perDay);
      fs.writeFileSync(this.daysPath, JSON.stringify(out), 'utf8');
    } catch (err) {
      this.dirty = true;
      logger.error('[Stats] Échec de la sauvegarde de stats_days.json :', err);
    }
  }

  private saveConfigs() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify([...this.configs.values()], null, 2), 'utf8');
    } catch (err) {
      logger.error('[Stats] Échec de la sauvegarde de stats_configs.json :', err);
    }
  }

  /** Supprime les journées plus anciennes que la rétention. */
  public prune(now = new Date()) {
    const cutoff = dayKey(new Date(now.getTime() - RETENTION_DAYS * 86_400_000));
    let removed = 0;
    for (const perDay of this.days.values()) {
      for (const day of [...perDay.keys()]) {
        if (day < cutoff) {
          perDay.delete(day);
          removed++;
        }
      }
    }
    if (removed > 0) this.dirty = true;
  }

  public getConfig(guildId: string): StatsConfig {
    let conf = this.configs.get(guildId);
    if (!conf) {
      conf = StatsConfigSchema.parse({ guildId });
      this.configs.set(guildId, conf);
      this.saveConfigs();
    }
    return conf;
  }

  public updateConfig(guildId: string, patch: Partial<StatsConfig>): StatsConfig {
    const current = this.getConfig(guildId);
    const next = StatsConfigSchema.parse({
      ...current,
      ...patch,
      guildId,
      startedAt: patch.enabled && !current.startedAt ? new Date().toISOString() : (patch.startedAt ?? current.startedAt),
      updatedAt: new Date().toISOString(),
    });
    this.configs.set(guildId, next);
    this.saveConfigs();
    return next;
  }

  public isEnabled(guildId: string): boolean {
    return this.getConfig(guildId).enabled;
  }

  /** Compteurs d'une journée (créés au besoin). */
  public day(guildId: string, key = dayKey()): DayStats {
    let perDay = this.days.get(guildId);
    if (!perDay) {
      perDay = new Map();
      this.days.set(guildId, perDay);
    }
    let d = perDay.get(key);
    if (!d) {
      d = emptyDay();
      perDay.set(key, d);
    }
    this.dirty = true;
    return d;
  }

  /** Lecture seule : undefined si rien n'a été compté ce jour-là. */
  public peekDay(guildId: string, key: string): DayStats | undefined {
    return this.days.get(guildId)?.get(key);
  }

  /** Incrémente un couple « clé|salon » sans dépasser le plafond du jour. */
  public bumpPair(target: Record<string, number>, key: string, amount: number) {
    if (!(key in target) && Object.keys(target).length >= MAX_PAIR_KEYS_PER_DAY) return;
    target[key] = (target[key] ?? 0) + amount;
  }

  /** Efface toutes les statistiques d'un serveur (bouton du dashboard). */
  public clearGuild(guildId: string) {
    this.days.delete(guildId);
    this.dirty = true;
    this.flush();
  }
}

export const statsStorage = new StatsStorage();

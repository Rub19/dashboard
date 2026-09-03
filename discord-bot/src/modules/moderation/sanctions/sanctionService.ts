import fs from 'fs';
import path from 'path';
import { Sanction, SanctionType } from '../types/sanction.js';
import { ModerationConfig, ModerationConfigSchema } from '../types/moderationConfig.js';
import { logger } from '../../../utils/logger.js';

class SanctionService {
  private sanctionsFilePath = path.resolve(process.cwd(), 'data', 'sanctions.json');
  private modConfigsFilePath = path.resolve(process.cwd(), 'data', 'mod_configs.json');

  // Cache mémoire
  private sanctions: Sanction[] = [];
  private modConfigs = new Map<string, ModerationConfig>();

  constructor() {
    this.ensureDirectory();
    this.loadData();
  }

  private ensureDirectory() {
    const dir = path.dirname(this.sanctionsFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private loadData() {
    // 1. Charger les sanctions
    try {
      if (fs.existsSync(this.sanctionsFilePath)) {
        const raw = fs.readFileSync(this.sanctionsFilePath, 'utf-8');
        this.sanctions = JSON.parse(raw);
        logger.info(`Sanctions chargées : ${this.sanctions.length} entrée(s).`);
      }
    } catch (err) {
      logger.error('Erreur lors du chargement de sanctions.json :', err);
      this.sanctions = [];
    }

    // 2. Charger les configurations de modération
    try {
      if (fs.existsSync(this.modConfigsFilePath)) {
        const raw = fs.readFileSync(this.modConfigsFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        for (const [guildId, config] of Object.entries(parsed)) {
          const valid = ModerationConfigSchema.safeParse(config);
          if (valid.success) {
            this.modConfigs.set(guildId, valid.data);
          }
        }
      }
    } catch (err) {
      logger.error('Erreur lors du chargement de mod_configs.json :', err);
    }
  }

  private saveSanctions() {
    try {
      this.ensureDirectory();
      fs.writeFileSync(this.sanctionsFilePath, JSON.stringify(this.sanctions, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Erreur lors de la sauvegarde de sanctions.json :', err);
    }
  }

  private saveModConfigs() {
    try {
      this.ensureDirectory();
      const obj = Object.fromEntries(this.modConfigs.entries());
      fs.writeFileSync(this.modConfigsFilePath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Erreur lors de la sauvegarde de mod_configs.json :', err);
    }
  }

  // ==========================================
  // Gestion de la Configuration de Modération
  // ==========================================
  public getConfig(guildId: string): ModerationConfig {
    let conf = this.modConfigs.get(guildId);
    if (!conf) {
      conf = ModerationConfigSchema.parse({});
      this.modConfigs.set(guildId, conf);
      this.saveModConfigs();
    }
    return conf;
  }

  public updateConfig(guildId: string, update: Partial<ModerationConfig>): ModerationConfig {
    const current = this.getConfig(guildId);
    const merged = {
      ...current,
      ...update,
      autoMod: {
        ...current.autoMod,
        ...(update.autoMod || {}),
      },
      warningEscalation: {
        ...current.warningEscalation,
        ...(update.warningEscalation || {}),
      },
    };
    const valid = ModerationConfigSchema.parse(merged);
    this.modConfigs.set(guildId, valid);
    this.saveModConfigs();
    return valid;
  }

  // ==========================================
  // Gestion des Sanctions
  // ==========================================
  public createSanction(params: {
    guildId: string;
    userId: string;
    userTag: string;
    moderatorId: string;
    moderatorTag: string;
    type: SanctionType;
    reason?: string;
    durationSeconds?: number | null;
  }): { sanction: Sanction; escalationTriggered?: boolean; escalationAction?: string } {
    const id = `CASE-${Math.floor(1000 + Math.random() * 9000)}`;

    const newSanction: Sanction = {
      id,
      guildId: params.guildId,
      userId: params.userId,
      userTag: params.userTag,
      moderatorId: params.moderatorId,
      moderatorTag: params.moderatorTag,
      type: params.type,
      reason: params.reason || 'Aucune raison spécifiée',
      timestamp: new Date().toISOString(),
      durationSeconds: params.durationSeconds ?? null,
      active: true,
    };

    this.sanctions.unshift(newSanction);
    this.saveSanctions();

    // Vérifier l'auto-escalade si c'est un avertissement
    let escalationTriggered = false;
    let escalationAction: string | undefined;

    if (params.type === 'warn') {
      const config = this.getConfig(params.guildId);
      if (config.warningEscalation.enabled) {
        const activeWarns = this.sanctions.filter(
          (s) => s.guildId === params.guildId && s.userId === params.userId && s.type === 'warn' && s.active
        ).length;

        if (activeWarns >= config.warningEscalation.threshold) {
          escalationTriggered = true;
          escalationAction = config.warningEscalation.action;
        }
      }
    }

    return { sanction: newSanction, escalationTriggered, escalationAction };
  }

  public getGuildSanctions(
    guildId: string,
    options?: { userId?: string; type?: string; limit?: number }
  ): Sanction[] {
    let list = this.sanctions.filter((s) => s.guildId === guildId);

    if (options?.userId) {
      list = list.filter((s) => s.userId === options.userId);
    }
    if (options?.type) {
      list = list.filter((s) => s.type === options.type);
    }
    if (options?.limit) {
      list = list.slice(0, options.limit);
    }

    return list;
  }

  public getUserSanctions(guildId: string, userId: string): Sanction[] {
    return this.sanctions.filter((s) => s.guildId === guildId && s.userId === userId);
  }

  public revokeSanction(guildId: string, sanctionId: string): boolean {
    const sanction = this.sanctions.find((s) => s.guildId === guildId && s.id === sanctionId);
    if (sanction) {
      sanction.active = false;
      this.saveSanctions();
      return true;
    }
    return false;
  }

  public getCounts(guildId: string) {
    const list = this.sanctions.filter((s) => s.guildId === guildId);

    const warnings = list.filter((s) => s.type === 'warn').length;
    const timeouts = list.filter((s) => s.type === 'timeout').length;
    const kicks = list.filter((s) => s.type === 'kick').length;
    const bans = list.filter((s) => s.type === 'ban').length;

    return {
      total: list.length,
      warnings,
      timeouts,
      kicks,
      bans,
    };
  }
}

export const sanctionService = new SanctionService();

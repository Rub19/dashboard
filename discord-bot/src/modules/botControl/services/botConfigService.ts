import fs from 'fs';
import path from 'path';
import { BotGlobalSettings } from '../types/index.js';
import { logger, LogLevel } from '../../../utils/logger.js';

export class BotConfigService {
  private static instance: BotConfigService;
  private settingsPath = path.resolve(process.cwd(), 'data', 'bot_settings.json');
  private settings: BotGlobalSettings = {
    maintenanceMode: false,
    maintenanceReason: 'Routine bot infrastructure upgrade in progress.',
    logLevel: 'info',
    telemetrySampleRatePercent: 100,
    retentionDays: 30,
    slowQueryThresholdMs: 250,
    alertWebhookUrlMasked: 'https://discord.com/api/webhooks/***/***',
    aiDailySpendLimitUsd: 5.0,
  };

  private constructor() {
    this.ensureDirectory();
    this.loadSettings();
  }

  private ensureDirectory(): void {
    const dir = path.dirname(this.settingsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private loadSettings(): void {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const raw = fs.readFileSync(this.settingsPath, 'utf-8');
        const parsed = JSON.parse(raw);
        this.settings = { ...this.settings, ...parsed };
        if (this.settings.logLevel) {
          logger.setLevel(this.settings.logLevel as LogLevel);
        }
      }
    } catch (err) {
      logger.error('Erreur chargement bot_settings.json :', err);
    }
  }

  private persistSettings(): void {
    try {
      this.ensureDirectory();
      fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Erreur sauvegarde bot_settings.json :', err);
    }
  }

  public static getInstance(): BotConfigService {
    if (!BotConfigService.instance) {
      BotConfigService.instance = new BotConfigService();
    }
    return BotConfigService.instance;
  }

  public getSettings(): BotGlobalSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<BotGlobalSettings>): BotGlobalSettings {
    this.settings = {
      ...this.settings,
      ...partial,
    };
    if (partial.logLevel) {
      logger.setLevel(partial.logLevel as LogLevel);
    }
    this.persistSettings();
    return { ...this.settings };
  }
}

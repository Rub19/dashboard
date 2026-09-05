import { BotGlobalSettings } from '../types/index.js';

export class BotConfigService {
  private static instance: BotConfigService;
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
    return { ...this.settings };
  }
}

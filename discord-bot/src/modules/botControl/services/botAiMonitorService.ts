import { BotAiStats } from '../types/index.js';
import { BotConfigService } from './botConfigService.js';

interface AiRequestRecord {
  timestamp: number;
  tokens: number;
  latencyMs: number;
  success: boolean;
  model?: string;
  provider?: string;
}

export class BotAiMonitorService {
  private static instance: BotAiMonitorService;
  private requestHistory: AiRequestRecord[] = [];
  private fallbackActive = false;
  private tokensThisMinute = 0;
  private currentTokensPerMin = 0;
  private lastModelUsed: string = '—';
  private lastProviderUsed: string = '—';

  private constructor() {
    setInterval(() => {
      this.currentTokensPerMin = this.tokensThisMinute;
      this.tokensThisMinute = 0;
      this.pruneOldRecords();
    }, 60000).unref();
  }

  public static getInstance(): BotAiMonitorService {
    if (!BotAiMonitorService.instance) {
      BotAiMonitorService.instance = new BotAiMonitorService();
    }
    return BotAiMonitorService.instance;
  }

  private pruneOldRecords(): void {
    const cutoff = Date.now() - 24 * 3600_000;
    this.requestHistory = this.requestHistory.filter((r) => r.timestamp >= cutoff);
  }

  public recordAiUsage(totalTokens: number, latencyMs = 0, success = true, model?: string, provider?: string) {
    const now = Date.now();
    this.tokensThisMinute += totalTokens;
    if (model) this.lastModelUsed = model;
    if (provider) this.lastProviderUsed = provider;

    this.requestHistory.push({
      timestamp: now,
      tokens: totalTokens,
      latencyMs,
      success,
      model,
      provider,
    });
    this.pruneOldRecords();
  }

  public getTokensPerMinute(): number {
    return this.currentTokensPerMin;
  }

  public setFallbackActive(active: boolean) {
    this.fallbackActive = active;
  }

  public getAiStats(): BotAiStats {
    this.pruneOldRecords();
    const cutoff = Date.now() - 24 * 3600_000;
    const records24h = this.requestHistory.filter((r) => r.timestamp >= cutoff);

    const requests24h = records24h.length;
    const failures24h = records24h.filter((r) => !r.success).length;
    const totalTokens24h = records24h.reduce((acc, r) => acc + r.tokens, 0);
    const latencySumMs = records24h.reduce((acc, r) => acc + r.latencyMs, 0);

    const promptEstimate = Math.round(totalTokens24h * 0.5);
    const completionEstimate = totalTokens24h - promptEstimate;
    // Coût estimé : ~$0.80 par 1M prompt tokens, ~$4 par 1M completion tokens pour Claude Haiku/OpenRouter
    const cost = (promptEstimate * 0.0000008) + (completionEstimate * 0.000004);
    // Plafond quotidien configuré (réglage global « aiDailySpendLimitUsd »), 5 $ par défaut.
    const configuredBudget = BotConfigService.getInstance().getSettings().aiDailySpendLimitUsd;
    const dailyBudget = configuredBudget > 0 ? configuredBudget : 5.0;
    const budgetUsedPercent = Math.min(100, Math.round((cost / dailyBudget) * 100));
    const successRate = requests24h > 0
      ? Math.round(((requests24h - failures24h) / requests24h) * 1000) / 10
      : 0;

    const activeModel = this.lastModelUsed !== '—'
      ? this.lastModelUsed
      : (process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-haiku');
    const provider = this.lastProviderUsed !== '—'
      ? this.lastProviderUsed
      : (process.env.OPENROUTER_API_KEY ? 'OpenRouter' : 'Local Context');

    return {
      provider,
      activeModel,
      fallbackModel: 'openai/gpt-4o-mini',
      fallbackActive: this.fallbackActive,
      promptTokens24h: promptEstimate,
      completionTokens24h: completionEstimate,
      totalTokens24h: totalTokens24h,
      estimatedCostTodayUsd: Math.round(cost * 1000) / 1000,
      dailyBudgetUsd: dailyBudget,
      budgetUsedPercent,
      avgInferenceLatencyMs: requests24h > 0 ? Math.round(latencySumMs / requests24h) : 0,
      requests24h,
      successRate,
    };
  }
}

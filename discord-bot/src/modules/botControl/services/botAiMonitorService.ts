import { BotAiStats } from '../types/index.js';

export class BotAiMonitorService {
  private static instance: BotAiMonitorService;
  // Starts at zero — no seeded fake baseline. AIProviderService only ever
  // returns a single combined tokensUsed total per call (no separate
  // prompt/completion breakdown from most providers), so real usage is
  // tracked as a total and split 50/50 for display — an honest estimate of
  // a real number, not a fabricated one.
  private totalTokensToday = 0;
  private requestsToday = 0;
  private latencySumMs = 0;
  private failuresToday = 0;
  private fallbackActive = false;

  public static getInstance(): BotAiMonitorService {
    if (!BotAiMonitorService.instance) {
      BotAiMonitorService.instance = new BotAiMonitorService();
    }
    return BotAiMonitorService.instance;
  }

  public recordAiUsage(totalTokens: number, latencyMs = 0, success = true) {
    this.totalTokensToday += totalTokens;
    this.requestsToday++;
    this.latencySumMs += latencyMs;
    if (!success) this.failuresToday++;
  }

  public setFallbackActive(active: boolean) {
    this.fallbackActive = active;
  }

  public getAiStats(): BotAiStats {
    const total = this.totalTokensToday;
    const promptEstimate = Math.round(total * 0.5);
    const completionEstimate = total - promptEstimate;
    // Estimated costs: ~$0.80 per 1M prompt tokens, ~$4 per 1M completion tokens for Claude Haiku/OpenRouter
    const cost = (promptEstimate * 0.0000008) + (completionEstimate * 0.000004);
    const dailyBudget = 5.0; // $5 USD daily cap
    const budgetUsedPercent = Math.min(100, Math.round((cost / dailyBudget) * 100));
    const successRate = this.requestsToday > 0
      ? Math.round(((this.requestsToday - this.failuresToday) / this.requestsToday) * 1000) / 10
      : 100;

    return {
      provider: 'OpenRouter (Claude 3.5 Haiku)',
      activeModel: 'anthropic/claude-3.5-haiku',
      fallbackModel: 'openai/gpt-4o-mini',
      fallbackActive: this.fallbackActive,
      promptTokens24h: promptEstimate,
      completionTokens24h: completionEstimate,
      totalTokens24h: total,
      estimatedCostTodayUsd: Math.round(cost * 1000) / 1000,
      dailyBudgetUsd: dailyBudget,
      budgetUsedPercent,
      avgInferenceLatencyMs: this.requestsToday > 0 ? Math.round(this.latencySumMs / this.requestsToday) : 0,
      requests24h: this.requestsToday,
      successRate,
    };
  }
}

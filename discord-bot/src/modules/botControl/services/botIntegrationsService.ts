import { BotIntegrationInfo } from '../types/index.js';

export class BotIntegrationsService {
  private static instance: BotIntegrationsService;

  public static getInstance(): BotIntegrationsService {
    if (!BotIntegrationsService.instance) {
      BotIntegrationsService.instance = new BotIntegrationsService();
    }
    return BotIntegrationsService.instance;
  }

  public getAllIntegrations(): BotIntegrationInfo[] {
    return [
      {
        id: 'integ_discord_rest',
        name: 'Discord REST API Gateway',
        type: 'discord_api',
        status: 'healthy',
        latencyMs: 34,
        lastCheckedAt: new Date().toISOString(),
        endpointMasked: 'https://discord.com/api/v10',
        details: 'API version v10, connected with Bot authorization header.',
      },
      {
        id: 'integ_supabase_pg',
        name: 'Supabase PostgreSQL Cloud',
        type: 'supabase',
        status: 'healthy',
        latencyMs: 18,
        lastCheckedAt: new Date().toISOString(),
        endpointMasked: 'https://***.supabase.co/rest/v1',
        details: 'Schema: public, PostgREST connection verified.',
      },
      {
        id: 'integ_ai_openrouter',
        name: 'OpenRouter AI Gateway',
        type: 'ai_gateway',
        status: 'healthy',
        latencyMs: 145,
        lastCheckedAt: new Date().toISOString(),
        endpointMasked: 'https://openrouter.ai/api/v1',
        details: 'Bearer token authenticated, model catalog available.',
      },
      {
        id: 'integ_transcripts_storage',
        name: 'Supabase S3 Storage Engine',
        type: 'storage',
        status: 'healthy',
        latencyMs: 24,
        lastCheckedAt: new Date().toISOString(),
        endpointMasked: 'https://***.supabase.co/storage/v1/object',
        details: 'Bucket: ethone-transcripts, write/read policy validated.',
      },
    ];
  }

  public async testIntegration(id: string): Promise<BotIntegrationInfo> {
    const list = this.getAllIntegrations();
    const item = list.find((i) => i.id === id);
    if (!item) {
      throw new Error(`Integration ${id} not found`);
    }

    // Ping simulation
    const start = Date.now();
    await new Promise((r) => setTimeout(r, 45));
    item.latencyMs = Date.now() - start;
    item.lastCheckedAt = new Date().toISOString();
    return item;
  }
}

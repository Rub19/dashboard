import { Client } from 'discord.js';
import { config } from '../../../config.js';
import { lavalinkManager } from '../../music/services/lavalinkManager.js';
import { BotIntegrationInfo } from '../types/index.js';

const CACHE_MS = 30_000;
const PROBE_TIMEOUT_MS = 5_000;
const SLOW_MS = 1_500;

interface ProbeResult {
  reachable: boolean;
  ms: number;
  httpStatus: number | null;
  error?: string;
}

/**
 * Intégrations du bot, avec un vrai test de connexion (requête chronométrée) à chaque actualisation.
 * Seules figurent les intégrations que le bot utilise réellement ; une intégration non configurée
 * n'apparaît pas au lieu d'être affichée « saine ».
 */
export class BotIntegrationsService {
  private static instance: BotIntegrationsService;
  private cache: { at: number; list: BotIntegrationInfo[] } | null = null;
  private statuses = new Map<BotIntegrationInfo['type'], BotIntegrationInfo['status']>();

  public static getInstance(): BotIntegrationsService {
    if (!BotIntegrationsService.instance) {
      BotIntegrationsService.instance = new BotIntegrationsService();
    }
    return BotIntegrationsService.instance;
  }

  /** Dernier statut connu d'un type d'intégration (undefined tant qu'aucun test n'a eu lieu). */
  public lastStatus(type: BotIntegrationInfo['type']): BotIntegrationInfo['status'] | undefined {
    return this.statuses.get(type);
  }

  private async probe(url: string, init?: RequestInit): Promise<ProbeResult> {
    const start = Date.now();
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
      return { reachable: res.status < 500, ms: Date.now() - start, httpStatus: res.status };
    } catch (err: any) {
      return { reachable: false, ms: Date.now() - start, httpStatus: null, error: err?.name === 'TimeoutError' ? 'délai dépassé' : err?.message || 'injoignable' };
    }
  }

  private toStatus(p: ProbeResult): BotIntegrationInfo['status'] {
    if (!p.reachable) return 'offline';
    return p.ms > SLOW_MS ? 'degraded' : 'healthy';
  }

  private describe(p: ProbeResult, ok: string): string {
    if (p.error) return `Échec : ${p.error}.`;
    return `${ok} (HTTP ${p.httpStatus}, ${p.ms} ms).`;
  }

  private async build(client?: Client): Promise<BotIntegrationInfo[]> {
    const now = () => new Date().toISOString();
    const jobs: Promise<BotIntegrationInfo>[] = [];

    jobs.push(
      this.probe('https://discord.com/api/v10/gateway').then((p) => ({
        id: 'integ_discord_rest',
        name: 'API REST Discord',
        type: 'discord_api' as const,
        status: this.toStatus(p),
        latencyMs: p.ms,
        lastCheckedAt: now(),
        endpointMasked: 'https://discord.com/api/v10',
        details: this.describe(p, 'API joignable') + (client && client.ws.ping >= 0 ? ` Ping passerelle : ${client.ws.ping} ms.` : ''),
      }))
    );

    if (process.env.OPENROUTER_API_KEY) {
      jobs.push(
        this.probe('https://openrouter.ai/api/v1/models').then((p) => ({
          id: 'integ_ai_openrouter',
          name: 'OpenRouter (IA)',
          type: 'ai_gateway' as const,
          status: this.toStatus(p),
          latencyMs: p.ms,
          lastCheckedAt: now(),
          endpointMasked: 'https://openrouter.ai/api/v1',
          details: this.describe(p, 'Catalogue de modèles joignable'),
        }))
      );
    }

    if (lavalinkManager.enabled) {
      const { host, port, secure } = config.lavalink;
      const stats = lavalinkManager.getNodeStats();
      const start = Date.now();
      jobs.push(
        Promise.resolve({
          id: 'integ_lavalink',
          name: 'Serveur audio Lavalink',
          type: 'lavalink' as const,
          status: (lavalinkManager.ready ? 'healthy' : 'offline') as BotIntegrationInfo['status'],
          latencyMs: Date.now() - start,
          lastCheckedAt: now(),
          endpointMasked: `${secure ? 'wss' : 'ws'}://${host}:${port}`,
          details: lavalinkManager.ready
            ? `Nœud connecté : ${stats?.players ?? 0} lecteur(s), ${stats?.playing ?? 0} en lecture.`
            : 'Nœud non connecté (Lavalink arrêté ou tunnel SSH coupé).',
        })
      );
    }

    if (config.ytResolverUrl) {
      jobs.push(
        this.probe(`${config.ytResolverUrl}/health`).then((p) => ({
          id: 'integ_yt_resolver',
          name: 'Résolveur YouTube (yt-dlp)',
          type: 'webhooks' as const,
          status: this.toStatus(p),
          latencyMs: p.ms,
          lastCheckedAt: now(),
          endpointMasked: config.ytResolverUrl.replace(/\/\/[^/@]*@/, '//***@'),
          details: this.describe(p, 'Service joignable'),
        }))
      );
    }

    const list = await Promise.all(jobs);
    for (const i of list) this.statuses.set(i.type, i.status);
    return list;
  }

  public async getAllIntegrations(client?: Client, force = false): Promise<BotIntegrationInfo[]> {
    if (!force && this.cache && Date.now() - this.cache.at < CACHE_MS) return this.cache.list;
    const list = await this.build(client);
    this.cache = { at: Date.now(), list };
    return list;
  }

  public async testIntegration(id: string, client?: Client): Promise<BotIntegrationInfo> {
    const list = await this.getAllIntegrations(client, true);
    const item = list.find((i) => i.id === id);
    if (!item) {
      throw new Error(`Intégration ${id} introuvable`);
    }
    return item;
  }
}

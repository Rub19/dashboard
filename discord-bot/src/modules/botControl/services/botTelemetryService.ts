import { Client } from 'discord.js';
import {
  BotGlobalStatus,
  BotSubsystemHealth,
  BotTelemetrySnapshot,
  SubsystemStatus,
} from '../types/index.js';
import fs from 'node:fs';
import v8 from 'node:v8';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BotAiMonitorService } from './botAiMonitorService.js';
import { BotJobSchedulerService } from './botJobSchedulerService.js';
import { BotIntegrationsService } from './botIntegrationsService.js';
import { lavalinkManager } from '../../music/services/lavalinkManager.js';

function readPackageVersion(): string {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8'));
    return String(pkg.version || 'inconnue');
  } catch {
    return 'inconnue';
  }
}

/** Nombre de modules réellement présents dans le dossier `modules` du bot (pas un chiffre codé en dur). */
function countModules(): number {
  try {
    const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
    return fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).length;
  } catch {
    return 0;
  }
}

export interface BotPerformanceSample {
  timestamp: string;
  pingMs: number;
  heapUsedMb: number;
  cpuPercent: number;
  eventLoopLagMs: number;
  eventsPerMin: number;
}

export class BotTelemetryService {
  private static instance: BotTelemetryService;
  // Vide au démarrage : rempli uniquement par de vraies mesures du ping de la passerelle.
  private pingHistory: number[] = [];
  private maxHistorySamples = 100;
  private startTime = Date.now();
  private eventCounter = 0;
  private commandCounter = 0;
  private dbQueryCounter = 0;
  private lastThroughputReset = Date.now();
  private currentEventsPerMin = 0;
  private currentCommandsPerMin = 0;
  private currentDbQueriesPerMin = 0;
  private lastEventLoopLagMs = 0;
  private lastCpu = process.cpuUsage();
  private lastCpuAt = Date.now();
  private lastCpuPercent = 0;
  private client: Client | null = null;
  // Ring buffer of real sampled points, one every ~30s — bounded at 24h of
  // history (2880 * 30s). Replaces the previous sine-wave-generated fake
  // history in GET /api/bot/performance.
  private performanceHistory: BotPerformanceSample[] = [];
  private readonly maxPerformanceSamples = 2880;

  private constructor() {
    // .unref() on both — same convention as xpWriteBuffer.ts's flush timer:
    // these are live-telemetry conveniences, not work the process needs to
    // stay alive for, so they shouldn't block a clean exit (a test script,
    // a graceful shutdown, etc.).
    setInterval(() => {
      this.refreshThroughput();
    }, 60000).unref();
    setInterval(() => {
      this.samplePerformance();
    }, 30000).unref();
  }

  /** Le client sert à échantillonner le ping de la passerelle en continu (et pas seulement quand l'onglet est ouvert). */
  public attachClient(client: Client) {
    this.client = client;
  }

  /** Part du tas utilisée par rapport à sa LIMITE réelle (heapTotal grandit à la demande : le ratio y est trompeur). */
  public static heapPercent(): number {
    const limit = v8.getHeapStatistics().heap_size_limit;
    return Math.round((process.memoryUsage().heapUsed / limit) * 1000) / 10;
  }

  private samplePerformance() {
    const livePing = this.client?.ws.ping ?? -1;
    if (livePing > 0) this.recordPing(livePing);
    const mem = process.memoryUsage();
    const heapUsedMb = Math.round((mem.heapUsed / 1024 / 1024) * 10) / 10;
    const cpuPercent = this.measureCpuPercent();
    this.lastCpuPercent = cpuPercent;
    const lastPing = this.pingHistory[this.pingHistory.length - 1] ?? 0;
    const measureStartedAt = Date.now();
    // setImmediate fires after the current event-loop phase drains — the
    // extra delay beyond 0ms is real, current event-loop lag.
    setImmediate(() => {
      this.lastEventLoopLagMs = Date.now() - measureStartedAt;
      this.performanceHistory.push({
        timestamp: new Date().toISOString(),
        pingMs: lastPing,
        heapUsedMb,
        cpuPercent,
        eventLoopLagMs: this.lastEventLoopLagMs,
        eventsPerMin: this.currentEventsPerMin,
      });
      if (this.performanceHistory.length > this.maxPerformanceSamples) {
        this.performanceHistory.shift();
      }
    });
  }

  /** CPU utilisé par le processus depuis la mesure précédente (et non la moyenne depuis le démarrage). */
  private measureCpuPercent(): number {
    const now = Date.now();
    const usage = process.cpuUsage();
    const cpuMicros = usage.user + usage.system - (this.lastCpu.user + this.lastCpu.system);
    const elapsedMicros = Math.max(1, now - this.lastCpuAt) * 1000;
    this.lastCpu = usage;
    this.lastCpuAt = now;
    return Math.min(100, Math.round((cpuMicros / elapsedMicros) * 1000) / 10);
  }

  public getPerformanceHistory(windowParam: string): BotPerformanceSample[] {
    const count = windowParam === '5m' ? 10 : windowParam === '1h' ? 120 : this.maxPerformanceSamples;
    return this.performanceHistory.slice(-count);
  }

  public static getInstance(): BotTelemetryService {
    if (!BotTelemetryService.instance) {
      BotTelemetryService.instance = new BotTelemetryService();
    }
    return BotTelemetryService.instance;
  }

  public recordPing(pingMs: number) {
    if (pingMs > 0 && isFinite(pingMs)) {
      this.pingHistory.push(pingMs);
      if (this.pingHistory.length > this.maxHistorySamples) {
        this.pingHistory.shift();
      }
    }
  }

  public incrementEventCount() {
    this.eventCounter++;
  }

  public incrementCommandCount() {
    this.commandCounter++;
  }

  // Called from utils/fsActivityCounter.ts's fs.readFileSync/writeFileSync
  // patch — this bot persists everything as JSON files, not a SQL/Mongo
  // database, so a real file-read/write count is the honest equivalent of
  // "DB queries" here. See that file for why a global patch was used
  // instead of instrumenting ~30 storage classes individually.
  public incrementDbQueryCount() {
    this.dbQueryCounter++;
  }

  private refreshThroughput() {
    const elapsedMinutes = Math.max(1, (Date.now() - this.lastThroughputReset) / 60000);
    this.currentEventsPerMin = Math.round(this.eventCounter / elapsedMinutes);
    this.currentCommandsPerMin = Math.round(this.commandCounter / elapsedMinutes);
    this.currentDbQueriesPerMin = Math.round(this.dbQueryCounter / elapsedMinutes);
    this.eventCounter = 0;
    this.commandCounter = 0;
    this.dbQueryCounter = 0;
    this.lastThroughputReset = Date.now();
  }

  /** Percentiles du ping mesuré. Sans aucune mesure : 0 partout (pas de valeurs plausibles inventées). */
  public getLatencyPercentiles(): { p50: number; p95: number; p99: number; avg: number } {
    if (this.pingHistory.length === 0) {
      return { p50: 0, p95: 0, p99: 0, avg: 0 };
    }
    const sorted = [...this.pingHistory].sort((a, b) => a - b);
    const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
    const sum = sorted.reduce((acc, val) => acc + val, 0);
    return { p50: at(0.5), p95: at(0.95), p99: at(0.99), avg: Math.round(sum / sorted.length) };
  }

  /**
   * Santé des sous-systèmes, déduite de mesures réelles. Un sous-système qu'on ne sait pas mesurer
   * n'est pas déclaré « opérationnel » : il est simplement déduit de ce qui l'alimente.
   */
  public getSubsystemsHealth(client?: Client): BotSubsystemHealth {
    const wsPing = client?.ws.ping ?? -1;
    const gatewayUp = Boolean(client?.isReady());
    const mem = process.memoryUsage();
    const heapPercent = BotTelemetryService.heapPercent();

    const dataOk = this.dataDirWritable();
    const jobs = BotJobSchedulerService.getInstance().getAllJobs();
    const jobFailing = jobs.some((j) => j.status === 'failed');
    const ai = BotIntegrationsService.getInstance().lastStatus('ai_gateway');

    let voice: SubsystemStatus = 'operational';
    if (lavalinkManager.enabled && !lavalinkManager.ready) voice = 'critical';

    return {
      gateway: !gatewayUp || wsPing < 0 ? 'critical' : wsPing >= 250 ? 'degraded' : 'operational',
      restApi: gatewayUp ? 'operational' : 'critical',
      database: dataOk ? 'operational' : 'critical',
      cache: heapPercent < 90 ? 'operational' : 'degraded',
      eventBus: heapPercent < 85 ? 'operational' : 'degraded',
      jobScheduler: jobFailing ? 'degraded' : 'operational',
      aiProvider: ai === 'offline' ? 'degraded' : ai === 'degraded' ? 'degraded' : 'operational',
      storage: dataOk ? 'operational' : 'critical',
      voiceEngine: voice,
    };
  }

  private dataDirWritable(): boolean {
    try {
      fs.accessSync(path.resolve(process.cwd(), 'data'), fs.constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  public getGlobalStatus(client?: Client, activeIncidentsCount = 0): BotGlobalStatus {
    const subsystems = this.getSubsystemsHealth(client);
    const statuses = Object.values(subsystems);

    let global: 'operational' | 'degraded' | 'critical' = 'operational';
    let statusMessage = 'Tous les sous-systèmes mesurés fonctionnent normalement';

    if (statuses.includes('critical') || activeIncidentsCount > 1) {
      global = 'critical';
      statusMessage = 'Un sous-système est en panne';
    } else if (statuses.includes('degraded') || activeIncidentsCount > 0) {
      global = 'degraded';
      statusMessage = 'Un sous-système est dégradé';
    }

    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);

    return {
      status: global,
      subsystems,
      statusMessage,
      uptimeSeconds,
      lastHeartbeat: new Date().toISOString(),
      activeIncidentsCount,
      activeModulesCount: countModules(),
      totalModulesCount: countModules(),
      version: readPackageVersion(),
    };
  }

  public getTelemetrySnapshot(client?: Client): BotTelemetrySnapshot {
    const mem = process.memoryUsage();
    const heapUsedMb = Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100;
    const heapTotalMb = Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100;
    const rssMb = Math.round((mem.rss / 1024 / 1024) * 100) / 100;
    const externalMb = Math.round((mem.external / 1024 / 1024) * 100) / 100;
    const heapPercent = Math.round(BotTelemetryService.heapPercent());

    const clientPing = client?.ws.ping ?? -1;
    if (clientPing > 0) {
      this.recordPing(clientPing);
    }
    const percentiles = this.getLatencyPercentiles();

    // CPU approximate usage
    const cpuPercent = this.lastCpuPercent;

    return {
      timestamp: new Date().toISOString(),
      memory: {
        heapUsedMb,
        heapTotalMb,
        heapPercent,
        rssMb,
        externalMb,
      },
      cpuPercent,
      eventLoopDelayMs: this.lastEventLoopLagMs,
      latency: {
        p50Ms: percentiles.p50,
        p95Ms: percentiles.p95,
        p99Ms: percentiles.p99,
        currentPingMs: Math.max(0, clientPing),
        avgPingMs: percentiles.avg,
      },
      throughput: {
        eventsPerMinute: this.currentEventsPerMin,
        commandsPerMinute: this.currentCommandsPerMin,
        dbQueriesPerMinute: this.currentDbQueriesPerMin,
        aiTokensPerMinute: BotAiMonitorService.getInstance().getTokensPerMinute(),
      },
      guildsCount: client?.guilds.cache.size ?? 0,
      cachedUsersCount: client?.users.cache.size ?? 0,
      shardsCount: client?.ws.shards.size ?? 0,
    };
  }
}

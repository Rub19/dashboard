import fs from 'node:fs';
import path from 'node:path';
import { Client, GatewayIntentBits, IntentsBitField } from 'discord.js';
import { BotDiagnosticResult } from '../types/index.js';
import { BotIntegrationsService } from './botIntegrationsService.js';
import { BotJobSchedulerService } from './botJobSchedulerService.js';
import { lavalinkManager } from '../../music/services/lavalinkManager.js';

const mb = (n: number) => Math.round(n / 1024 / 1024);

/**
 * Diagnostics : chaque contrôle est une vraie mesure ou un vrai test. Ce qu'on ne sait pas vérifier
 * n'apparaît pas (plus de « pass » écrits à la main avec des latences inventées).
 */
export class BotDiagnosticsService {
  private static instance: BotDiagnosticsService;

  public static getInstance(): BotDiagnosticsService {
    if (!BotDiagnosticsService.instance) {
      BotDiagnosticsService.instance = new BotDiagnosticsService();
    }
    return BotDiagnosticsService.instance;
  }

  public async runFullDiagnostics(client?: Client): Promise<BotDiagnosticResult[]> {
    const results: BotDiagnosticResult[] = [];

    // 1. Passerelle Discord
    const wsPing = client?.ws.ping ?? -1;
    const ready = Boolean(client?.isReady());
    results.push({
      id: 'diag_gateway_ws',
      name: 'Passerelle Discord (WebSocket)',
      category: 'network',
      status: !ready || wsPing < 0 ? 'critical' : wsPing < 200 ? 'pass' : wsPing < 500 ? 'warn' : 'critical',
      latencyMs: Math.max(0, wsPing),
      message: !ready ? 'Le bot n\'est pas connecté à Discord.' : `Battement de cœur : ${wsPing} ms.`,
      details: client ? `${client.guilds.cache.size} serveur(s), ${client.ws.shards.size} shard(s).` : undefined,
    });

    // 2. API REST Discord (requête réelle, chronométrée)
    if (client) {
      const start = Date.now();
      try {
        await client.rest.get('/users/@me');
        const ms = Date.now() - start;
        results.push({
          id: 'diag_discord_rest',
          name: 'API REST Discord',
          category: 'network',
          status: ms < 800 ? 'pass' : ms < 2000 ? 'warn' : 'critical',
          latencyMs: ms,
          message: `GET /users/@me a répondu en ${ms} ms.`,
        });
      } catch (err: any) {
        results.push({
          id: 'diag_discord_rest',
          name: 'API REST Discord',
          category: 'network',
          status: 'critical',
          latencyMs: Date.now() - start,
          message: `La requête a échoué : ${err?.message || 'erreur inconnue'}.`,
        });
      }
    }

    // 3. Mémoire
    const mem = process.memoryUsage();
    const heapPct = Math.round((mem.heapUsed / mem.heapTotal) * 100);
    results.push({
      id: 'diag_memory_heap',
      name: 'Mémoire Node.js (tas V8)',
      category: 'core',
      status: heapPct < 80 ? 'pass' : heapPct < 90 ? 'warn' : 'critical',
      latencyMs: 0,
      message: `Tas à ${heapPct} % (${mb(mem.heapUsed)} Mo / ${mb(mem.heapTotal)} Mo).`,
      details: `RSS : ${mb(mem.rss)} Mo, externe : ${mb(mem.external)} Mo.`,
    });

    // 4. Boucle d'événements (retard mesuré maintenant)
    const lagStart = Date.now();
    await new Promise<void>((r) => setImmediate(r));
    const lag = Date.now() - lagStart;
    results.push({
      id: 'diag_event_loop',
      name: "Boucle d'événements",
      category: 'core',
      status: lag < 50 ? 'pass' : lag < 200 ? 'warn' : 'critical',
      latencyMs: lag,
      message: `Retard de la boucle mesuré : ${lag} ms.`,
    });

    // 5. CPU du processus sur 250 ms
    const cpu0 = process.cpuUsage();
    const t0 = Date.now();
    await new Promise((r) => setTimeout(r, 250));
    const cpu1 = process.cpuUsage(cpu0);
    const cpuPct = Math.min(100, Math.round(((cpu1.user + cpu1.system) / 1000 / Math.max(1, Date.now() - t0)) * 1000) / 10);
    results.push({
      id: 'diag_cpu',
      name: 'Charge CPU du processus',
      category: 'core',
      status: cpuPct < 70 ? 'pass' : cpuPct < 90 ? 'warn' : 'critical',
      latencyMs: 250,
      message: `${cpuPct} % d'un cœur sur les 250 dernières ms.`,
    });

    // 6. Intents demandés
    if (client) {
      const bits = new IntentsBitField(client.options.intents);
      const needed: [string, GatewayIntentBits][] = [
        ['Membres du serveur', GatewayIntentBits.GuildMembers],
        ['Contenu des messages', GatewayIntentBits.MessageContent],
        ['Présences', GatewayIntentBits.GuildPresences],
      ];
      const missing = needed.filter(([, b]) => !bits.has(b)).map(([n]) => n);
      results.push({
        id: 'diag_privileged_intents',
        name: 'Intents privilégiés demandés',
        category: 'security',
        status: missing.length === 0 ? 'pass' : 'warn',
        latencyMs: 0,
        message: missing.length === 0 ? 'Les 3 intents privilégiés sont demandés à la connexion.' : `Non demandés : ${missing.join(', ')}.`,
        details: 'Vérifie aussi leur activation sur le portail développeur Discord.',
      });
    }

    // 7. Stockage : écriture/lecture/suppression réelles dans le dossier data
    const dir = path.resolve(process.cwd(), 'data');
    const file = path.join(dir, `.diag-${Date.now()}.tmp`);
    const fsStart = Date.now();
    try {
      fs.writeFileSync(file, 'ok');
      const back = fs.readFileSync(file, 'utf8');
      fs.unlinkSync(file);
      results.push({
        id: 'diag_storage',
        name: 'Stockage des données (dossier data)',
        category: 'storage',
        status: back === 'ok' ? 'pass' : 'critical',
        latencyMs: Date.now() - fsStart,
        message: `Écriture, lecture et suppression réussies en ${Date.now() - fsStart} ms.`,
      });
    } catch (err: any) {
      results.push({
        id: 'diag_storage',
        name: 'Stockage des données (dossier data)',
        category: 'storage',
        status: 'critical',
        latencyMs: Date.now() - fsStart,
        message: `Écriture impossible : ${err?.message || 'erreur inconnue'}.`,
      });
    }

    // 8. Intégrations sondées (IA, Lavalink, résolveur…)
    try {
      const integ = await BotIntegrationsService.getInstance().getAllIntegrations(client, true);
      for (const i of integ.filter((x) => x.type !== 'discord_api')) {
        results.push({
          id: `diag_${i.id}`,
          name: i.name,
          category: i.type === 'ai_gateway' ? 'ai' : 'network',
          status: i.status === 'healthy' ? 'pass' : i.status === 'degraded' ? 'warn' : 'critical',
          latencyMs: i.latencyMs,
          message: i.details,
        });
      }
    } catch {
      // les sondes d'intégration sont facultatives
    }

    // 9. Moteur audio
    if (lavalinkManager.enabled) {
      results.push({
        id: 'diag_voice_engine',
        name: 'Moteur audio (Lavalink)',
        category: 'core',
        status: lavalinkManager.ready ? 'pass' : 'critical',
        latencyMs: 0,
        message: lavalinkManager.ready ? 'Nœud Lavalink connecté.' : 'Nœud Lavalink déconnecté : la musique est indisponible.',
      });
    }

    // 10. Tâches planifiées
    const jobs = BotJobSchedulerService.getInstance().getAllJobs();
    if (jobs.length > 0) {
      const failed = jobs.filter((j) => j.status === 'failed');
      results.push({
        id: 'diag_jobs',
        name: 'Tâches planifiées',
        category: 'core',
        status: failed.length === 0 ? 'pass' : 'warn',
        latencyMs: 0,
        message: failed.length === 0 ? `${jobs.length} tâche(s) enregistrée(s), aucune en échec.` : `En échec : ${failed.map((j) => j.name).join(', ')}.`,
      });
    }

    return results;
  }
}

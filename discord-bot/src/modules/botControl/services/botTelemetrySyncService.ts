import { Client } from 'discord.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../../../config.js';
import { logger } from '../../../utils/logger.js';
import { BotTelemetryService } from './botTelemetryService.js';
import { PresenceService } from '../../presence/services/presenceService.js';
import { BotCommandStatsService } from './botCommandStatsService.js';
import { BotErrorIncidentService } from './botErrorIncidentService.js';
import { BotAiMonitorService } from './botAiMonitorService.js';
import { BotSecurityAuditService } from './botSecurityAuditService.js';

/**
 * Écrit régulièrement l'état du bot (télémétrie, serveurs, présence) dans Supabase
 * (table ethone_bot_telemetry) pour que le Centre de contrôle du dashboard puisse
 * lire directement une source protégée par RLS (owner only) plutôt que de dépendre
 * uniquement de checks isOwner côté React. Réutilise BotTelemetryService/PresenceService
 * — aucune mesure recalculée ici.
 *
 * Clé service_role : contourne RLS pour l'écriture (la policy select ne restreint que
 * la lecture, il n'y a volontairement pas de policy insert/update).
 */
let supabase: SupabaseClient | null = null;
if (config.supabaseUrl && config.supabaseServiceRoleKey) {
  supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function startBotTelemetrySync(client: Client, intervalSeconds = 30): void {
  if (!supabase) {
    logger.warn(
      '[TelemetrySync] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY absents : synchro désactivée, le dashboard retombe sur l’API REST du bot.'
    );
    return;
  }
  const db = supabase;

  const tick = async () => {
    try {
      const telemetry = BotTelemetryService.getInstance();
      const globalStatus = telemetry.getGlobalStatus(client);
      const snapshot = telemetry.getTelemetrySnapshot(client);
      const presence = PresenceService.getInstance().getCurrentState();

      const servers = Array.from(client.guilds.cache.values()).map((g) => ({
        id: g.id,
        name: g.name,
        icon: g.iconURL({ size: 64 }) ?? null,
        memberCount: g.memberCount ?? 0,
      }));

      const errorIncidents = BotErrorIncidentService.getInstance();

      const { error } = await db.from('ethone_bot_telemetry').upsert({
        id: 'global',
        status: {
          online: client.isReady(),
          uptimeSeconds: globalStatus.uptimeSeconds,
          pingMs: Math.max(0, snapshot.latency.currentPingMs),
          version: globalStatus.version,
          guildCount: snapshot.guildsCount,
          userCount: snapshot.cachedUsersCount,
          shardsCount: snapshot.shardsCount,
          memory: snapshot.memory,
          cpuPercent: snapshot.cpuPercent,
          eventLoopDelayMs: snapshot.eventLoopDelayMs,
          throughput: snapshot.throughput,
        },
        servers,
        presence,
        subsystems: Object.entries(globalStatus.subsystems).map(([id, status]) => ({ id, status })),
        commands: BotCommandStatsService.getInstance().getAllCommands(),
        errors: {
          fingerprints: errorIncidents.getAllFingerprints(),
          incidents: errorIncidents.getAllIncidents(),
        },
        ai_usage: BotAiMonitorService.getInstance().getAiStats(),
        security: BotSecurityAuditService.getInstance().getSecurityAudit(client),
        updated_at: new Date().toISOString(),
      });
      if (error) logger.error('[TelemetrySync] Upsert Supabase refusé :', error.message);
    } catch (err) {
      logger.error('[TelemetrySync] Échec de la synchro Supabase :', err);
    }
  };

  void tick();
  setInterval(tick, intervalSeconds * 1000).unref();
}

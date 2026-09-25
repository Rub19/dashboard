import express, { Request, Response } from 'express';
import { Client } from 'discord.js';
import { z } from 'zod';
import { reportsStorage } from '../../modules/reports/storage/reportsStorage.js';
import { reportsService } from '../../modules/reports/services/reportsService.js';
import { emitConfigUpdated } from '../../services/syncConfigEmitter.js';

const snowflake = z.string().regex(/^\d{5,25}$/);

/** API Dashboard du système de signalement (derrière authMiddleware + createGuildAuthMiddleware, cf. server/index.ts). */
export function createReportSystemRouter(client: Client) {
  const router = express.Router({ mergeParams: true });

  router.get('/config', (req: Request, res: Response): void => {
    res.json({ config: reportsStorage.getConfig(String(req.params.guildId)) });
  });

  router.put('/config', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const parsed = z
      .object({ enabled: z.boolean(), channelId: snowflake.nullable(), staffRoleId: snowflake.nullable(), pingStaff: z.boolean(), cooldownSeconds: z.number().int().min(0).max(3600) })
      .partial()
      .strict()
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Configuration invalide', details: parsed.error.flatten() });
      return;
    }
    const guild = client.guilds.cache.get(guildId);
    // Salon et rôle doivent exister sur CE serveur : jamais un identifiant quelconque.
    if (parsed.data.channelId && !guild?.channels.cache.get(parsed.data.channelId)?.isTextBased()) {
      res.status(400).json({ error: 'Salon introuvable sur ce serveur' });
      return;
    }
    if (parsed.data.staffRoleId && !guild?.roles.cache.has(parsed.data.staffRoleId)) {
      res.status(400).json({ error: 'Rôle introuvable sur ce serveur' });
      return;
    }
    if (parsed.data.enabled && !(parsed.data.channelId ?? reportsStorage.getConfig(guildId).channelId)) {
      res.status(400).json({ error: 'Choisissez d’abord le salon des signalements (ou utilisez l’installation en un clic).' });
      return;
    }
    const updated = reportsStorage.updateConfig(guildId, parsed.data);
    emitConfigUpdated('reports', guildId, updated, 'DASHBOARD', req.user?.id);
    res.json({ success: true, config: updated });
  });

  // Installation en un clic : crée le salon de l'équipe (ou utilise celui indiqué) et active le système.
  router.post('/setup', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const guild = client.guilds.cache.get(guildId);
    const parsed = z.object({ channelId: snowflake.nullable().optional(), staffRoleId: snowflake.nullable().optional() }).strict().safeParse(req.body ?? {});
    if (!guild || !parsed.success) {
      res.status(400).json({ error: 'Serveur ou paramètres invalides' });
      return;
    }
    if (parsed.data.staffRoleId && !guild.roles.cache.has(parsed.data.staffRoleId)) {
      res.status(400).json({ error: 'Rôle introuvable sur ce serveur' });
      return;
    }
    try {
      const out = await reportsService.setup(guild, { channelId: parsed.data.channelId ?? null, staffRoleId: parsed.data.staffRoleId });
      const config = reportsStorage.getConfig(guildId);
      emitConfigUpdated('reports', guildId, config, 'DASHBOARD', req.user?.id);
      res.json({ success: true, ...out, config });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Installation impossible' });
    }
  });

  return router;
}

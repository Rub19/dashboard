import { Router, Request, Response } from 'express';
import { Client, Guild } from 'discord.js';
import {
  NativeAutomodError,
  nativeAutomodService,
  PRESET_KEYS,
  PRESET_LABELS,
  TRIGGER_LABELS,
  TRIGGER_QUOTAS,
  TRIGGER_TYPES,
} from '../../modules/nativeAutomod/services/nativeAutomodService.js';
import { requireStringParam } from '../utils/params.js';
import { handleClientError, handleRouteError } from '../utils/routeError.js';
import { logger } from '../../utils/logger.js';

/**
 * API Dashboard de l'AutoMod natif de Discord (règles exécutées par Discord lui-même).
 * Montée derrière `authMiddleware` + `createGuildAuthMiddleware` (cf. server/index.ts).
 */
export function createNativeAutomodRouter(client: Client): Router {
  const router = Router({ mergeParams: true });

  const guildOf = (req: Request): Guild | null => client.guilds.cache.get(requireStringParam(req.params.guildId, 'guildId')) ?? null;
  const reasonOf = (req: Request): string => {
    const u = (req as any).user as { id?: string; username?: string } | undefined;
    return `Dashboard ETHONE${u?.username ? ` — ${u.username}` : ''}`.slice(0, 200);
  };
  const audit = (req: Request, guild: Guild, action: string, detail: string): void =>
    logger.info(`[NativeAutomod] ${guild.id} ${action} ${detail} (par ${(req as any).user?.id ?? 'dashboard'})`);

  const fail = (err: unknown, res: Response, fallback: string): void => {
    if (err instanceof NativeAutomodError) {
      res.status(err.httpStatus).json({ success: false, error: err.message });
      return;
    }
    handleClientError(err, res, fallback, { success: false });
  };

  // GET /presets — listes prédéfinies, types de déclencheurs et quotas
  router.get('/presets', (_req: Request, res: Response): void => {
    res.json({
      success: true,
      presets: PRESET_KEYS.map((id) => ({ id, label: PRESET_LABELS[id] })),
      triggerTypes: TRIGGER_TYPES.map((id) => ({ id, label: TRIGGER_LABELS[id], max: TRIGGER_QUOTAS[id] })),
    });
  });

  router.get('/', async (req: Request, res: Response): Promise<void> => {
    try {
      const guild = guildOf(req);
      if (!guild) {
        res.status(404).json({ success: false, error: 'Serveur introuvable : le bot n’y est pas présent.' });
        return;
      }
      res.json({ success: true, rules: await nativeAutomodService.list(guild) });
    } catch (err) {
      if (err instanceof NativeAutomodError) return fail(err, res, '');
      handleRouteError(err, res, 'Impossible de lister les règles AutoMod.', { success: false });
    }
  });

  router.post('/', async (req: Request, res: Response): Promise<void> => {
    try {
      const guild = guildOf(req);
      if (!guild) {
        res.status(404).json({ success: false, error: 'Serveur introuvable : le bot n’y est pas présent.' });
        return;
      }
      const rule = await nativeAutomodService.create(guild, req.body, reasonOf(req));
      audit(req, guild, 'create', `${rule.id} (${rule.triggerType})`);
      res.status(201).json({ success: true, rule });
    } catch (err) {
      fail(err, res, 'Impossible de créer la règle AutoMod.');
    }
  });

  // POST /recommended — jeu standard en un clic { alertChannelId? }
  router.post('/recommended', async (req: Request, res: Response): Promise<void> => {
    try {
      const guild = guildOf(req);
      if (!guild) {
        res.status(404).json({ success: false, error: 'Serveur introuvable : le bot n’y est pas présent.' });
        return;
      }
      const alertChannelId = typeof req.body?.alertChannelId === 'string' && req.body.alertChannelId ? req.body.alertChannelId : undefined;
      const result = await nativeAutomodService.createRecommended(guild, { alertChannelId, reason: reasonOf(req) });
      audit(req, guild, 'recommended', `${result.created.length} créée(s), ${result.skipped.length} ignorée(s)`);
      res.status(201).json({ success: true, ...result });
    } catch (err) {
      fail(err, res, 'Impossible de créer les règles recommandées.');
    }
  });

  router.put('/:ruleId', async (req: Request, res: Response): Promise<void> => {
    try {
      const guild = guildOf(req);
      if (!guild) {
        res.status(404).json({ success: false, error: 'Serveur introuvable : le bot n’y est pas présent.' });
        return;
      }
      const ruleId = requireStringParam(req.params.ruleId, 'ruleId');
      const rule = await nativeAutomodService.update(guild, ruleId, req.body, reasonOf(req));
      audit(req, guild, 'update', ruleId);
      res.json({ success: true, rule });
    } catch (err) {
      fail(err, res, 'Impossible de modifier la règle AutoMod.');
    }
  });

  router.patch('/:ruleId/toggle', async (req: Request, res: Response): Promise<void> => {
    try {
      const guild = guildOf(req);
      if (!guild) {
        res.status(404).json({ success: false, error: 'Serveur introuvable : le bot n’y est pas présent.' });
        return;
      }
      const ruleId = requireStringParam(req.params.ruleId, 'ruleId');
      const rule = await nativeAutomodService.toggle(guild, ruleId, req.body?.enabled, reasonOf(req));
      audit(req, guild, 'toggle', `${ruleId} -> ${rule.enabled}`);
      res.json({ success: true, rule });
    } catch (err) {
      fail(err, res, "Impossible de changer l'état de la règle.");
    }
  });

  router.delete('/:ruleId', async (req: Request, res: Response): Promise<void> => {
    try {
      const guild = guildOf(req);
      if (!guild) {
        res.status(404).json({ success: false, error: 'Serveur introuvable : le bot n’y est pas présent.' });
        return;
      }
      const ruleId = requireStringParam(req.params.ruleId, 'ruleId');
      await nativeAutomodService.remove(guild, ruleId, reasonOf(req));
      audit(req, guild, 'delete', ruleId);
      res.json({ success: true });
    } catch (err) {
      fail(err, res, 'Impossible de supprimer la règle AutoMod.');
    }
  });

  return router;
}

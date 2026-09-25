import { Client } from 'discord.js';
import express, { Request, Response } from 'express';
import { z } from 'zod';
import { guildConfigService } from '../../services/guildConfigService.js';
import { HexColorRegex } from '../../types/guildConfig.js';
import { collectIssues, notify } from '../../modules/health/services/emergencyService.js';
import { PREVIEW_CATEGORIES, sendPreview } from '../../modules/preview/services/messagePreviewService.js';
import { authMiddleware } from '../middleware/auth.js';
import { createGuildAuthMiddleware } from '../middleware/guildAuth.js';

const PatchSettingsSchema = z.object({
  botName: z.string().min(1).max(32).optional(),
  primaryColor: z.string().regex(HexColorRegex, 'Code HEX invalide').optional(),
  secondaryColor: z.string().regex(HexColorRegex, 'Code HEX invalide').optional(),
  successColor: z.string().regex(HexColorRegex, 'Code HEX invalide').optional(),
  errorColor: z.string().regex(HexColorRegex, 'Code HEX invalide').optional(),
  infoColor: z.string().regex(HexColorRegex, 'Code HEX invalide').optional(),
  prefix: z
    .string()
    .min(1, 'Le préfixe ne peut pas être vide')
    .max(5, 'Maximum 5 caractères')
    .refine((val) => !/\s/.test(val), 'Pas d\'espaces dans le préfixe')
    .optional(),
  prefixCommandsEnabled: z.boolean().optional(),
  slashCommandsEnabled: z.boolean().optional(),
  language: z.enum(['fr', 'en', 'es', 'de']).optional(),
  timezone: z
    .string()
    .refine((tz) => {
      try {
        new Intl.DateTimeFormat('fr-FR', { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    }, 'Fuseau horaire inconnu')
    .optional(),
  emergencyContacts: z
    .object({
      mode: z.enum(['admins', 'owner', 'custom']),
      userIds: z.array(z.string().regex(/^\d{5,25}$/)).max(10),
      roleIds: z.array(z.string().regex(/^\d{5,25}$/)).max(10),
    })
    .optional(),
  // These 3 already existed on GuildConfigSchema/guildConfigService and were
  // already read/written correctly server-side — they were just missing from
  // this PATCH schema, so z.object() silently stripped them before they ever
  // reached updateConfig(), making every Configuration-tab field except
  // language a silent no-op from the dashboard.
  botPersonality: z.enum(['FRIENDLY', 'PROFESSIONAL', 'HUMOROUS', 'CONCISE', 'CYBER']).optional(),
  commandCooldown: z.number().min(0).max(60).optional(),
  themePreset: z.enum(['DEFAULT', 'CYBERPUNK', 'EMERALD', 'SUNSET', 'DARK']).optional(),
  emojis: z
    .object({
      success: z.string().optional(),
      error: z.string().optional(),
      info: z.string().optional(),
      loading: z.string().optional(),
      settings: z.string().optional(),
      prefix: z.string().optional(),
      slash: z.string().optional(),
    })
    .optional(),
});

export function createSettingsRouter(client: Client): express.Router {
  const router = express.Router({ mergeParams: true });
  const guildAuth = createGuildAuthMiddleware(client);

  /**
   * GET /api/guilds/:guildId/settings
   */
  router.get('/:guildId/settings', authMiddleware, guildAuth, (req: Request, res: Response) => {
    const guildId = String(req.params.guildId);
    const config = guildConfigService.getConfig(guildId);
    res.json({ config });
  });

  /**
   * PATCH /api/guilds/:guildId/settings
   * Met à jour les réglages et synchronise instantanément le bot
   */
  router.patch('/:guildId/settings', authMiddleware, guildAuth, (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);

    const parsed = PatchSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Données de configuration invalides',
        details: parsed.error.format(),
      });
      return;
    }

    try {
      const updated = guildConfigService.updateConfig(guildId, parsed.data, {
        source: 'DASHBOARD',
        actorId: req.user?.id,
      });
      res.json({ success: true, config: updated });
    } catch (err) {
      res.status(500).json({ error: 'Erreur lors de la sauvegarde des paramètres' });
    }
  });

  /**
   * POST /api/guilds/:guildId/settings/emergency-test
   * Envoie un message de test aux contacts d'urgence (salon d'alerte + messages privés) et dit ce qui a réellement été livré.
   */
  router.post('/:guildId/settings/emergency-test', authMiddleware, guildAuth, async (req: Request, res: Response): Promise<void> => {
    const guild = client.guilds.cache.get(String(req.params.guildId));
    if (!guild) {
      res.status(404).json({ error: 'Serveur introuvable ou bot non connecté' });
      return;
    }
    const delivered = await notify(guild, [], true);
    res.json({ success: delivered.channel || delivered.dms > 0, ...delivered });
  });

  /**
   * POST /api/guilds/:guildId/settings/preview-messages
   * Envoie en message privé à la personne connectée un exemplaire de chaque message du bot (données d'exemple).
   */
  router.post('/:guildId/settings/preview-messages', authMiddleware, guildAuth, async (req: Request, res: Response): Promise<void> => {
    const guild = client.guilds.cache.get(String(req.params.guildId));
    const category = typeof req.body?.category === 'string' ? req.body.category : null;
    if (!guild || !req.user?.id) {
      res.status(404).json({ error: 'Serveur introuvable ou bot non connecté' });
      return;
    }
    if (category && !PREVIEW_CATEGORIES.some(([k]) => k === category)) {
      res.status(400).json({ error: 'Catégorie inconnue' });
      return;
    }
    try {
      res.json({ success: true, ...(await sendPreview(client, guild, req.user.id, category, 700)) });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Envoi impossible' });
    }
  });

  /** GET /api/guilds/:guildId/settings/health — problèmes sérieux actuellement détectés (même liste que l'alerte automatique). */
  router.get('/:guildId/settings/health', authMiddleware, guildAuth, (req: Request, res: Response): void => {
    const guild = client.guilds.cache.get(String(req.params.guildId));
    if (!guild) {
      res.status(404).json({ error: 'Serveur introuvable ou bot non connecté' });
      return;
    }
    res.json({ issues: collectIssues(guild) });
  });

  return router;
}

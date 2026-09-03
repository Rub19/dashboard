import { Client } from 'discord.js';
import express, { Request, Response } from 'express';
import { z } from 'zod';
import { guildConfigService } from '../../services/guildConfigService.js';
import { HexColorRegex } from '../../types/guildConfig.js';
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
  language: z.enum(['fr', 'en']).optional(),
  timezone: z.string().optional(),
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
      const updated = guildConfigService.updateConfig(guildId, parsed.data);
      res.json({ success: true, config: updated });
    } catch (err) {
      res.status(500).json({ error: 'Erreur lors de la sauvegarde des paramètres' });
    }
  });

  return router;
}

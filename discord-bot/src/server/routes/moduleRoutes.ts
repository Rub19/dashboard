import { Client } from 'discord.js';
import express, { Request, Response } from 'express';
import { z } from 'zod';
import { guildConfigService } from '../../services/guildConfigService.js';
import { GuildModules } from '../../types/guildConfig.js';
import { authMiddleware } from '../middleware/auth.js';
import { createGuildAuthMiddleware } from '../middleware/guildAuth.js';

interface ModuleDefinition {
  id: keyof GuildModules;
  name: string;
  description: string;
  icon: string;
  available: boolean;
}

export const AVAILABLE_MODULES: ModuleDefinition[] = [
  {
    id: 'moderation',
    name: 'Modération',
    description: 'Gestion des sanctions, purge de messages et sécurité du serveur.',
    icon: 'Shield',
    available: true,
  },
  {
    id: 'welcome',
    name: 'Bienvenue & Départs',
    description: 'Messages personnalisés avec cartes pour accueillir les nouveaux membres.',
    icon: 'UserPlus',
    available: true,
  },
  {
    id: 'logging',
    name: 'Journaux d\'événements',
    description: 'Logs détaillés des suppressions de messages, modifications de rôles et bans.',
    icon: 'Scroll',
    available: true,
  },
  {
    id: 'autoRoles',
    name: 'Rôles automatiques',
    description: 'Attribution automatique de rôles à l\'arrivée ou par réaction.',
    icon: 'Award',
    available: true,
  },
  {
    id: 'tickets',
    name: 'Système de Tickets',
    description: 'Support privé par salon éphémère pour vos membres avec boutons.',
    icon: 'Ticket',
    available: true,
  },
  {
    id: 'fun',
    name: 'Mini-jeux & Fun',
    description: 'Commandes interactives, divertissement, profils et badges pour la communauté.',
    icon: 'Gamepad2',
    available: true,
  },
  {
    id: 'music',
    name: 'Musique & Vocal',
    description: 'Lecture audio en streaming haute fidélité dans les salons vocaux.',
    icon: 'Music',
    available: false, // Bientôt disponible
  },
];

export function createModuleRouter(client: Client): express.Router {
  const router = express.Router({ mergeParams: true });
  const guildAuth = createGuildAuthMiddleware(client);

  /**
   * GET /api/guilds/:guildId/modules
   */
  router.get('/:guildId/modules', authMiddleware, guildAuth, (req: Request, res: Response) => {
    const guildId = String(req.params.guildId);
    const config = guildConfigService.getConfig(guildId);

    const modulesWithState = AVAILABLE_MODULES.map((mod) => ({
      ...mod,
      enabled: config.modules[mod.id] ?? false,
    }));

    res.json({ modules: modulesWithState });
  });

  /**
   * PATCH /api/guilds/:guildId/modules/:moduleId
   */
  router.patch('/:guildId/modules/:moduleId', authMiddleware, guildAuth, (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const moduleId = req.params.moduleId as keyof GuildModules;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      res.status(400).json({ error: 'La propriété "enabled" (boolean) est requise' });
      return;
    }

    const validModule = AVAILABLE_MODULES.find((m) => m.id === moduleId);
    if (!validModule) {
      res.status(404).json({ error: `Module introuvable : ${moduleId}` });
      return;
    }

    if (!validModule.available && enabled) {
      res.status(400).json({ error: `Le module ${validModule.name} sera bientôt disponible.` });
      return;
    }

    try {
      const updated = guildConfigService.updateConfig(guildId, {
        modules: {
          [moduleId]: enabled,
        },
      });

      res.json({
        success: true,
        module: {
          ...validModule,
          enabled: updated.modules[moduleId],
        },
        allModules: updated.modules,
      });
    } catch (err) {
      res.status(500).json({ error: 'Erreur lors de la mise à jour du module' });
    }
  });

  return router;
}

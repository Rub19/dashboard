import { Client } from 'discord.js';
import express, { Request, Response } from 'express';
import { z } from 'zod';
import { guildConfigService } from '../../services/guildConfigService.js';
import { GuildModules } from '../../types/guildConfig.js';
import { authMiddleware } from '../middleware/auth.js';
import { createGuildAuthMiddleware } from '../middleware/guildAuth.js';
import { getModule, isModuleEnabled, listModuleStates, setModuleEnabled } from '../../services/moduleRegistry.js';

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
    available: true,
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

    // Registre central (services/moduleRegistry.ts) : mêmes modules et mêmes états que le hub et que /module.
    const modulesWithState = listModuleStates(guildId).map((m) => ({
      id: m.id,
      name: m.label,
      description: m.description,
      icon: 'Puzzle',
      available: true,
      enabled: m.enabled,
    }));

    res.json({ modules: modulesWithState });
  });

  /**
   * PATCH /api/guilds/:guildId/modules/:moduleId
   */
  router.patch('/:guildId/modules/:moduleId', authMiddleware, guildAuth, (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const moduleId = String(req.params.moduleId);
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      res.status(400).json({ error: 'La propriété "enabled" (boolean) est requise' });
      return;
    }

    const def = getModule(moduleId);
    if (!def) {
      res.status(404).json({ error: `Module introuvable : ${moduleId}` });
      return;
    }

    try {
      setModuleEnabled(guildId, moduleId, enabled, 'DASHBOARD', req.user?.id);
      res.json({
        success: true,
        module: { id: def.id, name: def.label, description: def.description, icon: 'Puzzle', available: true, enabled: isModuleEnabled(guildId, moduleId) },
      });
    } catch (err) {
      res.status(500).json({ error: 'Erreur lors de la mise à jour du module' });
    }
  });

  return router;
}

import { Client } from 'discord.js';
import express, { Request, Response } from 'express';
import { commandRegistry } from '../../handlers/commandHandler.js';

/**
 * Données publiques pour la page vitrine du bot (aucune authentification, lecture seule, aucune donnée de serveur :
 * uniquement deux compteurs globaux et la liste des commandes slash réellement enregistrées).
 */

/** Commandes réservées au propriétaire du bot : jamais listées publiquement. */
const HIDDEN_COMMANDS = new Set(['godmode', 'rescue']);

/** Regroupe les catégories historiques (casse et langue variables selon les modules) en familles lisibles. */
const CATEGORY_MAP: Record<string, string> = {
  musique: 'Musique',
  music: 'Musique',
  modération: 'Modération',
  moderation: 'Modération',
  sécurité: 'Sécurité',
  security: 'Sécurité',
  économie: 'Économie',
  economy: 'Économie',
  leveling: 'Communauté',
  communauté: 'Communauté',
  community: 'Communauté',
  administration: 'Administration',
  serveur: 'Administration',
  server: 'Administration',
  management: 'Administration',
  général: 'Général',
  general: 'Général',
  core: 'Général',
  utilitaires: 'Utilitaires',
  utility: 'Utilitaires',
  support: 'Utilitaires',
  voice: 'Vocal',
  vocal: 'Vocal',
};

function familyOf(category: string | undefined): string {
  return CATEGORY_MAP[String(category ?? '').trim().toLowerCase()] ?? 'Autres';
}

interface PublicCommand {
  name: string;
  description: string;
  category: string;
  subcommands: Array<{ name: string; description: string }>;
}

function listPublicCommands(): PublicCommand[] {
  const out: PublicCommand[] = [];
  for (const command of commandRegistry.getAllCommands()) {
    if (!command.slashData || HIDDEN_COMMANDS.has(command.name.toLowerCase())) continue;
    const json = command.slashData.toJSON() as { description?: string; options?: Array<{ type: number; name: string; description: string }> };
    // type 1 = sous-commande, type 2 = groupe de sous-commandes
    const subcommands = (json.options ?? [])
      .filter((o) => o.type === 1 || o.type === 2)
      .map((o) => ({ name: o.name, description: o.description }));
    out.push({
      name: command.name,
      description: json.description || command.description,
      category: familyOf(command.category),
      subcommands,
    });
  }
  return out.sort((a, b) => a.category.localeCompare(b.category, 'fr') || a.name.localeCompare(b.name, 'fr'));
}

export function createPublicRouter(client: Client): express.Router {
  const router = express.Router();

  // Mise en cache courte côté navigateur/CDN : la vitrine n'a pas besoin de chiffres à la seconde.
  router.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'public, max-age=120');
    next();
  });

  /** Nombre de serveurs et de membres réellement vus par le bot (somme des memberCount des serveurs). */
  router.get('/stats', (_req: Request, res: Response) => {
    if (!client.isReady()) {
      res.status(503).json({ error: 'not_ready' });
      return;
    }
    const guilds = client.guilds.cache;
    res.json({
      guilds: guilds.size,
      members: guilds.reduce((sum, g) => sum + (g.memberCount || 0), 0),
      commands: listPublicCommands().length,
    });
  });

  router.get('/commands', (_req: Request, res: Response) => {
    res.json({ commands: listPublicCommands() });
  });

  return router;
}

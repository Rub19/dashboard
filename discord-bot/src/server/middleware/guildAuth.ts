import { NextFunction, Request, Response } from 'express';
import { Client, Guild, PermissionsBitField } from 'discord.js';
import { config } from '../../config.js';

interface CachedUserGuilds {
  timestamp: number;
  guilds: Array<{
    id: string;
    name: string;
    icon: string | null;
    owner: boolean;
    permissions: string;
  }>;
}

const userGuildsCache = new Map<string, CachedUserGuilds>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute

export async function fetchUserGuilds(accessToken: string, userId: string) {
  const cached = userGuildsCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.guilds;
  }

  const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Erreur récupération guilds Discord: ${res.statusText}`);
  }

  const guilds = (await res.json()) as CachedUserGuilds['guilds'];
  userGuildsCache.set(userId, { timestamp: Date.now(), guilds });
  return guilds;
}

export interface GuildAuthOptions {
  allowBotOwnerOverride?: boolean;
  requireOwner?: boolean;
}

export function createGuildAuthMiddleware(
  discordClient: Client,
  options: GuildAuthOptions = { allowBotOwnerOverride: true }
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const guildId = req.params.guildId;
    if (!guildId) {
      res.status(400).json({ error: 'guildId manquant' });
      return;
    }

    if (!req.user) {
      res.status(401).json({ error: 'Utilisateur non authentifié' });
      return;
    }

    // Bot Owner Override UNIQUEMENT si explicitement autorisé par la route (ex: config bot / presence)
    // Interdit pour les données privées des utilisateurs (Backups, Tickets, Logs)
    if (options.allowBotOwnerOverride && req.user.id === config.botOwnerId) {
      if (!discordClient.guilds.cache.has(guildId)) {
        res.status(404).json({ error: 'Le bot ETHONE n\'est pas installé sur ce serveur Discord.' });
        return;
      }
      next();
      return;
    }

    try {
      // 1. Récupérer les guilds de l'utilisateur avec ses permissions
      let userGuilds: CachedUserGuilds['guilds'];
      if (process.env.NODE_ENV === 'test' && (req.user as any)._testGuilds) {
        userGuilds = (req.user as any)._testGuilds;
      } else {
        userGuilds = await fetchUserGuilds(req.user.accessToken, req.user.id);
      }

      const targetGuild = userGuilds.find((g) => g.id === guildId);

      if (!targetGuild) {
        res.status(403).json({ error: 'Vous ne faites pas partie de ce serveur Discord.' });
        return;
      }

      // Si l'action requiert expressément d'être le propriétaire du serveur
      if (options.requireOwner && !targetGuild.owner) {
        res.status(403).json({
          error: 'Action strictement réservée au propriétaire du serveur Discord.',
        });
        return;
      }

      // 2. Vérifier si l'utilisateur est propriétaire ou a Administrator (0x8) ou ManageGuild (0x20)
      const perms = BigInt(targetGuild.permissions);
      const isAdmin = (perms & PermissionsBitField.Flags.Administrator) === PermissionsBitField.Flags.Administrator;
      const isManager = (perms & PermissionsBitField.Flags.ManageGuild) === PermissionsBitField.Flags.ManageGuild;

      if (!targetGuild.owner && !isAdmin && !isManager) {
        res.status(403).json({
          error: 'Permissions insuffisantes. Vous devez posséder la permission "Gérer le serveur" ou être Administrateur.',
        });
        return;
      }

      next();
    } catch (err) {
      res.status(500).json({ error: 'Erreur lors de la vérification des permissions Discord.' });
    }
  };
}

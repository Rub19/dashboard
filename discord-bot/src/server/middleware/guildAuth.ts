import { NextFunction, Request, Response } from 'express';
import { Client, Guild, PermissionsBitField } from 'discord.js';

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

export function createGuildAuthMiddleware(discordClient: Client) {
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

    // Bypass pour le mode test local
    if (req.user.id === 'dev-admin-user') {
      next();
      return;
    }

    try {
      // 1. Récupérer les guilds de l'utilisateur avec ses permissions
      const userGuilds = await fetchUserGuilds(req.user.accessToken, req.user.id);
      const targetGuild = userGuilds.find((g) => g.id === guildId);

      if (!targetGuild) {
        res.status(403).json({ error: 'Vous ne faites pas partie de ce serveur Discord.' });
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

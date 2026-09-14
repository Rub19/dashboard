import express, { Request, Response } from 'express';
import { ChannelType, Client } from 'discord.js';

export interface PickableChannel {
  id: string;
  name: string;
}

// Pure so it's testable without an Express request — {channels: []} when
// the bot isn't in that guild also doubles as the "bot absent" signal.
export function listPickableChannels(discordClient: Client, guildId: string): PickableChannel[] {
  const guild = discordClient.guilds.cache.get(guildId);
  if (!guild) return [];
  return guild.channels.cache
    .filter((c) => c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement)
    .map((c) => ({ id: c.id, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Salon picker pour le lien Espace Partagé <-> serveur Discord (dashboard).
// Même convention que giveawayRoutes.ts's /channels.
export function createSharedSpaceRouter(discordClient: Client) {
  const router = express.Router({ mergeParams: true });

  router.get('/channels', (req: Request, res: Response): void => {
    res.json({ channels: listPickableChannels(discordClient, String(req.params.guildId)) });
  });

  return router;
}

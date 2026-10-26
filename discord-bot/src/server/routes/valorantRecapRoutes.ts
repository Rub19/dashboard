import express, { Request, Response } from 'express';
import { Client, EmbedBuilder } from 'discord.js';
import { DESTINATION_CHANNEL_TYPES, canBotSendTo, isSendableTarget, sendToConfiguredChannel } from '../../utils/channelSend.js';
import { handleRouteError } from '../utils/routeError.js';
import { trq } from '../../utils/tr.js';
import { parsePlayers, parseRounds, recapButtons, valorantRecapStore } from '../../modules/valorantRecap/valorantRecapService.js';

const text = (value: unknown, max: number): string => String(value ?? '').slice(0, max);
const httpsUrl = (value: unknown): string | undefined => {
  const raw = String(value ?? '');
  return /^https:\/\/[^\s]+$/.test(raw) ? raw.slice(0, 500) : undefined;
};

export function createValorantRecapRouter(discordClient: Client) {
  const router = express.Router({ mergeParams: true });

  router.get('/channels', (req: Request, res: Response): void => {
    const guild = discordClient.guilds.cache.get(String(req.params.guildId));
    if (!guild) {
      res.json({ channels: [] });
      return;
    }
    const channels = guild.channels.cache
      .filter((c) => DESTINATION_CHANNEL_TYPES.includes(c.type))
      .map((c) => ({ id: c.id, name: c.name, type: c.type }))
      .sort((a, b) => a.name.localeCompare(b.name));
    res.json({ channels });
  });

  router.post('/recap', async (req: Request, res: Response): Promise<void> => {
    try {
      const guild = discordClient.guilds.cache.get(String(req.params.guildId));
      const channel = guild?.channels.cache.get(text(req.body?.channelId, 32));
      if (!guild || !channel || !isSendableTarget(channel) || !canBotSendTo(channel, guild.members.me)) {
        res.status(400).json({ success: false, error: trq('Salon introuvable ou inaccessible au bot.') });
        return;
      }
      const won = req.body?.won === true;
      const title = text(req.body?.title, 200);
      const embed = new EmbedBuilder()
        .setColor(won ? 0x35b86b : 0xe5484d)
        .setTitle(title)
        .setDescription(text(req.body?.description, 1000) || null)
        .setTimestamp(new Date());
      const author = text(req.body?.author, 200);
      if (author) embed.setAuthor({ name: author, iconURL: httpsUrl(req.body?.authorIcon) });
      const fields = Array.isArray(req.body?.fields) ? req.body.fields.slice(0, 15) : [];
      for (const field of fields) {
        const name = text(field?.name, 100);
        const value = text(field?.value, 300);
        if (name && value) embed.addFields({ name, value, inline: field?.inline !== false });
      }
      const thumbnail = httpsUrl(req.body?.thumbnail);
      if (thumbnail) embed.setThumbnail(thumbnail);
      const image = httpsUrl(req.body?.image);
      if (image) embed.setImage(image);
      const footer = text(req.body?.footer, 200);
      if (footer) embed.setFooter({ text: footer });
      const record = { title, won, players: parsePlayers(req.body?.players), rounds: parseRounds(req.body?.rounds), createdAt: Date.now() };
      const links = (Array.isArray(req.body?.links) ? req.body.links : [])
        .map((l: any) => ({ label: text(l?.label, 40), url: httpsUrl(l?.url) }))
        .filter((l: { label: string; url?: string }): l is { label: string; url: string } => !!l.label && !!l.url);
      const key = valorantRecapStore.add(record);
      await sendToConfiguredChannel(channel, { embeds: [embed], components: recapButtons(key, record, links) }, { reason: 'Récap de partie E:VAL' });
      res.json({ success: true });
    } catch (error) {
      handleRouteError(error, res, trq('Impossible de publier le récap.'));
    }
  });

  return router;
}
